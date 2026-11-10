// Déroulement d'une partie : bâtiments, étages, transitions, fin de niveau et fin de partie.
import { Level } from '../level.js';
import { Enemy } from '../enemies.js';
import { LEVELS, THEMES, ENEMY_TYPES, BOSSES, rng } from '../levels.js';
import { $, game, hud, sfx, music, input, save, fmtNum, fmtTime, acc, weaponName, diffName } from './state.js';
import { scene, gunHolder, fx, applyTheme, render } from './view.js';
import { updateCamera } from './combat.js';
import { buildGunModel, disposeGunModel } from './gunmodel.js';
import { EXTRA_TYPES, specialists } from './roster.js';
import { showScreen, showEnd } from '../ui/screens.js';
import { MIN_SPAWN_DIST } from '../core/grid.js';
import { generateFloor } from '../core/floorgen.js';
import { t } from '../core/i18n.js';

const TOTAL_BOSSES = LEVELS.reduce((n, l) => n + l.floors.reduce((m, f) => m + (f.bosses?.length || 0), 0), 0);
const MENU_SEED = 1; // l'étage affiché derrière les menus est toujours le même

function newStats() {
  return { kills: 0, bosses: 0, headshots: 0, shots: 0, hits: 0, bestCombo: 0, points: 0, time: 0 };
}

/** @param seed graine des étages de la partie ; tirée au hasard si elle n'est pas fournie */
export function newRun(seed = Math.floor(Math.random() * 0x7fffffff) + 1) {
  game.run = { levelIdx: 0, floorIdx: 0, levelStats: null, weapons: [], seed };
  game.stats = newStats();
  game.combo = { count: 0, last: -99 };
  game.time = 0;
  Enemy.reactionMul = game.diff.reaction;
  save.set('lastDiff', game.diff.id);
}

/** Lance le niveau courant (après le choix de l'arme). */
export function startLevel(floorIdx = 0) {
  const run = game.run, lv = LEVELS[run.levelIdx];
  equip(game.weapon);
  run.weapons[run.levelIdx] = weaponName(game.weapon);
  run.levelStats = { ...game.stats, bestCombo: 0 };
  game.player.health = 100;
  hud.clearTransient();
  hud.show(true);
  showScreen(null);
  music.setPaused(false);
  music.setIntensity(1);
  transition(lv.name.toUpperCase(), lv.floors[floorIdx].name, () => loadFloor(run.levelIdx, floorIdx));
}

function clearFloor() {
  for (const e of game.enemies) e.dispose();
  game.enemies = [];
  game.level?.dispose();
  game.level = null;
  game.layout = null;
  fx.clear();
}

function shuffle(arr, R) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

export function loadFloor(levelIdx, floorIdx) {
  clearFloor();
  const lv = LEVELS[levelIdx], fl = lv.floors[floorIdx], theme = THEMES[lv.theme];
  if (game.run) { game.run.levelIdx = levelIdx; game.run.floorIdx = floorIdx; }
  applyTheme(theme);
  // l'étage est assemblé à partir de salles, selon la graine de la partie
  const seed = game.run ? game.run.seed : MENU_SEED;
  const layout = generateFloor(levelIdx, floorIdx, seed);
  const L = game.level = new Level(scene, layout.rows, theme);
  game.layout = { level: L, rooms: layout.rooms, doors: layout.doors };
  const R = rng(seed * 31 + 1000 + levelIdx * 100 + floorIdx);
  const hpMul = game.diff.enemyHp;

  // emplacements : les cases « e » (+ les cases « B » si l'étage n'a pas de boss), loin de l'arrivée
  const bossKeys = fl.bosses || [];
  const far = s => Math.hypot(s.cx - L.start.cx, s.cz - L.start.cz) >= MIN_SPAWN_DIST;
  const spots = shuffle([...L.spawns, ...(bossKeys.length ? [] : L.bossSpots)].filter(far), R);
  const count = Math.min(fl.count, spots.length);

  // types tirés selon le mélange du bâtiment (toujours le même résultat pour une graine donnée)
  const mix = lv.mix;
  const nHeavy = Math.min(count, Math.round(count * (mix.heavy || 0)) + (fl.extraHeavy || 0));
  const nRusher = Math.min(count - nHeavy, Math.round(count * (mix.rusher || 0)));
  const types = shuffle([
    ...Array(nHeavy).fill('heavy'), ...Array(nRusher).fill('rusher'), ...Array(count - nHeavy - nRusher).fill('grunt'),
  ], R);
  // les spécialistes de l'étage prennent la place d'hommes de main
  for (const special of specialists(levelIdx, floorIdx)) {
    const i = types.indexOf('grunt');
    if (i >= 0) types[i] = special;
  }
  types.forEach((type, i) => {
    const s = spots[i];
    const def = ENEMY_TYPES[type] || EXTRA_TYPES[type];
    game.enemies.push(new Enemy(scene, s.x, s.z, Math.floor(R() * 4) * Math.PI / 2, def, { hpMul }));
  });
  bossKeys.forEach((key, i) => {
    const s = L.bossSpots[i] || spots[count + i];
    const def = { ...BOSSES[key], id: key };
    game.enemies.push(new Enemy(scene, s.x, s.z, Math.floor(R() * 4) * Math.PI / 2, def, { hpMul, boss: true, key }));
  });

  // joueur : dos à l'entrée, face à l'enfilade des salles
  const p = game.player;
  p.pos.set(L.start.x, 0, L.start.z);
  const goal = L.goalCenter || p.pos;
  p.yaw = Math.atan2(-(goal.x - p.pos.x), -(goal.z - p.pos.z));
  p.pitch = 0;
  p.lastHurt = -99;
  if (game.diff.floorHeal) p.health = 100;
  game.flow = L.flowFrom(p.pos.x, p.pos.z);
  game.flowTimer = 0;
  L.setLocked(game.enemies.some(e => e.boss));
  hud.floor(`${lv.name} · ${fl.name}`);
  if (game.ws) updateCamera(0);
}

/** Écran noir avec titre pendant le chargement de l'étage suivant. */
function transition(title, sub, load) {
  game.state = 'transition';
  input.enabled = false;
  input.reset();
  $('fadeTitle').textContent = title;
  $('fadeSub').textContent = sub;
  $('fade').classList.add('on');
  const finish = () => {
    $('fade').classList.remove('on');
    input.reset();
    input.enabled = true;
    game.state = 'play';
  };
  if (game.debug.instant) { load(); finish(); return; }
  setTimeout(() => {
    load();
    render();
    setTimeout(finish, 1100);
  }, 380);
}

export function nextFloor() {
  const run = game.run, lv = LEVELS[run.levelIdx], next = run.floorIdx + 1;
  sfx.stairs();
  transition(lv.name.toUpperCase(), lv.floors[next].name, () => loadFloor(run.levelIdx, next));
}

function equip(w) {
  game.weapon = w;
  if (game.gun) { gunHolder.remove(game.gun); disposeGunModel(game.gun); }
  game.gun = buildGunModel(w);
  gunHolder.add(game.gun);
  game.ws = {
    ammo: w.mag, reloading: false, reloadT: 0, cd: 0, spread: w.spread,
    kickPitch: 0, kickYaw: 0, gunKick: 0, flashT: 0,
    ads: false, adsT: 0,
  };
}

function leaveGame() {
  game.state = 'end';
  input.enabled = false;
  input.reset();
  music.setIntensity(0);
  music.setPaused(false);
}

const comboText = n => (n > 1 ? t('row.comboKills', { n }) : '-');

/** Bâtiment terminé : bilan du niveau, puis niveau suivant (ou victoire finale). */
export function levelComplete() {
  const run = game.run;
  if (run.levelIdx >= LEVELS.length - 1) { endRun(true); return; }
  leaveGame();
  sfx.extract();
  const lv = LEVELS[run.levelIdx], st = game.stats, s0 = run.levelStats;
  const rows = [
    [t('row.levelTime'), fmtTime(st.time - s0.time)],
    [t('row.kills'), st.kills - s0.kills],
    [t('row.bosses'), st.bosses - s0.bosses],
    [t('row.headshots'), st.headshots - s0.headshots],
    [t('row.accuracy'), acc(st.hits - s0.hits, st.shots - s0.shots)],
    [t('row.bestCombo'), comboText(s0.bestCombo)],
    [t('row.levelPoints'), fmtNum(st.points - s0.points)],
  ];
  run.levelIdx++;
  game.endAction = 'next';
  const title = t('end.levelDone', { name: lv.name.toUpperCase() });
  setTimeout(() => showEnd(title, true, rows, t('end.total'), st.points, '', t('end.next')), 400);
}

export function endRun(success) {
  if (game.state !== 'play' && game.state !== 'paused') return;
  leaveGame();
  if (success) sfx.extract(); else sfx.death();
  const st = game.stats, run = game.run, d = game.diff;
  const { prev, isBest } = save.submitScore(d.id, st.points);
  const lv = LEVELS[run.levelIdx];
  const rows = [
    success ? [t('row.totalTime'), fmtTime(st.time)] : [t('row.reached'), `${lv.name} · ${lv.floors[run.floorIdx].name}`],
    ...(success ? [] : [[t('row.survival'), fmtTime(st.time)]]),
    [t('row.kills'), st.kills],
    [t('row.bosses'), `${st.bosses} / ${TOTAL_BOSSES}`],
    [t('row.headshots'), st.headshots],
    [t('row.accuracy'), acc(st.hits, st.shots)],
    [t('row.bestCombo'), comboText(st.bestCombo)],
    [t('row.difficulty'), diffName(d)],
  ];
  game.endAction = 'again';
  const best = isBest ? t('end.newBest', { diff: diffName(d) }) : t('end.best', { diff: diffName(d), points: fmtNum(prev) });
  const title = t(success ? 'end.win' : 'end.lose');
  setTimeout(() => showEnd(title, success, rows, t('end.points'), st.points, best, t('end.again')), success ? 400 : 900);
}

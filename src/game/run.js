// Déroulement d'une partie de fuite sans fin : salles construites à l'avance, portes, compte à rebours,
// changement d'arme toutes les 10 éliminations, score, fin de partie.
import * as THREE from 'three';
import { World, CELL } from '../world.js';
import { Enemy } from '../enemies.js';
import { DIFFICULTIES, THEMES, ENEMY_TYPES, BOSSES } from '../levels.js';
import { weaponById } from '../weapons.js';
import { game, hud, sfx, music, input, save, fmtNum, fmtTime, acc, weaponName, diffName } from './state.js';
import { scene, camera, gunScene, gunCam, gunHolder, fx, hemi, renderer, applyTheme } from './view.js';
import { updateCamera } from './combat.js';
import { buildGunModel, disposeGunModel } from './gunmodel.js';
import { EXTRA_TYPES } from './roster.js';
import { roomSpec, placeEnemies, weaponAt, roomMult, streakName, themeOf } from '../core/endless.js';
import { ROOM_TIME, DRAIN, LOOKAHEAD, POINTS_PER_METER, CURVE } from '../content/endless.js';
import { settleDaily } from '../core/daily.js';
import { showScreen, showEnd } from '../ui/screens.js';
import { callout, headshotAt, updateRunHud, clearRunHud } from '../ui/runhud.js';
import { streakSound, tick } from './cues.js';
import { t, tr } from '../core/i18n.js';

const OPEN_DIST = 1.9;      // distance à laquelle le joueur enfonce une porte déverrouillée
const DROP_DELAY = 0.35;    // la salle quittée disparaît une fois sa porte refermée
const CORPSE_TIME = 4;      // un corps disparaît 4 s après sa chute (moins d'objets à afficher)
const MENU_SEED = 1;        // décor des menus, toujours le même
const FACING_FORWARD = -Math.PI / 2; // caméra : regard vers +x, le sens de la fuite
const ENEMY_FACING = -Math.PI / 2;   // ennemi : tourné vers -x, l'entrée de sa salle (convention de body.js)

const _a = new THREE.Color(), _b = new THREE.Color();

function newStats() {
  return { kills: 0, bosses: 0, headshots: 0, shots: 0, hits: 0, bestCombo: 0, points: 0, time: 0 };
}

/** Score affiché : points des éliminations, plus la distance. */
export const totalScore = () => (game.stats ? game.stats.points : 0) + Math.floor((game.run ? game.run.distance : 0) * POINTS_PER_METER);

/**
 * Prépare une partie.
 * @param seed  graine du parcours ; tirée au hasard si absente (celle du jour pour le défi)
 * @param daily clé du jour pour un défi du jour, sinon null
 */
export function newRun(seed = Math.floor(Math.random() * 0x7fffffff) + 1, daily = null) {
  const base = DIFFICULTIES[game.diff.id] || DIFFICULTIES.normal;
  game.run = { seed, daily, base, room: 0, timer: ROOM_TIME, distance: 0, startX: 0, weaponStep: -1, unlocked: false, dropAt: 0, lastTick: 0 };
  game.diff = base;
  game.stats = newStats();
  game.combo = { count: 0, last: -99 };
  game.time = 0;
  Enemy.reactionMul = base.reaction;
  save.set('lastDiff', base.id);
}

// ---------------------------------------------------------------- monde et ennemis
function buildWorld(seed) {
  game.world?.dispose();
  fx.clear();
  game.enemies = [];
  applyTheme(THEMES[themeOf(0)]);
  const W = game.world = game.level = new World(scene, seed);
  for (let i = 0; i <= LOOKAHEAD; i++) populate(W.buildNext());
  return W;
}

function spawn(room, spot, def, opts) {
  const p = room.spot(game.world, spot);
  const e = new Enemy(scene, p.x, p.z, ENEMY_FACING, def, opts);
  e.room = room;
  e.root.visible = false; // affiché quand sa salle devient accessible
  return e;
}

/** Ennemis d'une salle qui vient d'être construite (aucun derrière les menus). */
function populate(room) {
  const run = game.run;
  if (!run) return;
  const spec = roomSpec(run.seed, room.n, run.base.id);
  const { spots, bossSpot } = placeEnemies(room.layout, spec, run.seed, room.n);
  const opts = { hpMul: spec.hpMul * run.base.enemyHp, dmgMul: spec.dmgMul, speedMul: spec.speedMul };
  spots.forEach((s, i) => room.enemies.push(spawn(room, s, ENEMY_TYPES[spec.types[i]] || EXTRA_TYPES[spec.types[i]], opts)));
  if (spec.boss && bossSpot) {
    const def = { ...BOSSES[spec.boss], id: spec.boss, hp: BOSSES[spec.boss].hp * CURVE.bossHp };
    room.enemies.push(spawn(room, bossSpot, def, { ...opts, boss: true, key: spec.boss }));
  }
  room.need = Math.min(spec.need, spots.length);
}

/** Ennemis actifs : ceux de la salle du joueur, et ceux de la suivante dès que sa porte est ouverte. */
function activate() {
  const W = game.world, run = game.run;
  const here = W.room(run.room), next = W.room(run.room + 1), nextOpen = !!(next && next.door.open);
  game.enemies = [...here.enemies, ...(nextOpen ? next.enemies : [])];
  for (const e of game.enemies) if (e.alive) e.root.visible = true;
  // les salles derrière une porte fermée ne sont pas dessinées : elles sont prêtes, mais invisibles d'ici
  // (le mur d'entrée de la salle suivante, lui, reste affiché : c'est le fond de la salle du joueur)
  for (const r of W.rooms) {
    r.group.visible = r.n <= run.room || (r.n === run.room + 1 && nextOpen);
    r.gate.visible = r.n <= run.room + 1 + (nextOpen ? 1 : 0);
  }
}

/** Le joueur vient d'entrer dans la salle n : la porte se referme derrière lui, le compte à rebours repart. */
function enterRoom(n) {
  const run = game.run, W = game.world;
  run.room = n;
  run.timer = ROOM_TIME;
  run.unlocked = false;
  game.diff = { ...run.base, scoreMul: run.base.scoreMul * roomMult(n) };
  if (n > 0) {
    W.setDoor(W.room(n), 'closed');
    run.dropAt = game.time + DROP_DELAY;
    sfx.click(420, 0.6);
    if (run.base.floorHeal) game.player.health = 100;
    callout(t('run.room', { n: n + 1, mult: String(roomMult(n)).replace('.', ',') }), 'room');
  }
  activate();
  game.flowTimer = 0;
}

// ---------------------------------------------------------------- armes
/** Donne l'arme correspondant au nombre d'éliminations, chargeur plein. */
function equipFor(kills) {
  const wa = weaponAt(kills), run = game.run;
  const base = weaponById(wa.id);
  const w = wa.loop ? { ...base, damage: base.damage * wa.damageMul } : base;
  game.weapon = w;
  if (game.gun) { gunHolder.remove(game.gun); disposeGunModel(game.gun); }
  game.gun = buildGunModel(w);
  gunHolder.add(game.gun);
  game.ws = {
    ammo: w.mag, reloading: false, reloadT: 0, cd: 0, spread: w.spread,
    kickPitch: 0, kickYaw: 0, gunKick: 0, flashT: 0, ads: false, adsT: 0,
  };
  if (run.weaponStep >= 0) {
    callout(t('run.newWeapon', { name: weaponName(w).toUpperCase() }), 'weapon');
    sfx.extract();
  }
  run.weaponStep = wa.step;
}

// ---------------------------------------------------------------- partie
/** Lance la partie préparée par newRun. */
export function startRun() {
  const run = game.run, p = game.player;
  const W = buildWorld(run.seed);
  clearRunHud();
  equipFor(0);
  const s = W.start();
  p.pos.set(s.x, 0, s.z);
  p.yaw = FACING_FORWARD;
  p.pitch = 0;
  p.health = 100;
  p.lastHurt = -99;
  run.startX = s.x;
  enterRoom(0);
  hud.clearTransient();
  hud.show(true);
  showScreen(null);
  music.setPaused(false);
  music.setIntensity(1);
  input.reset();
  input.enabled = true;
  game.state = 'play';
  updateCamera(0);
  // matériaux prêts avant la première image : les ennemis cachés sont montrés le temps de la préparation
  const hidden = W.rooms.flatMap(r => r.enemies).filter(e => !e.root.visible);
  for (const e of hidden) e.root.visible = true;
  renderer.compile(scene, camera);
  renderer.compile(gunScene, gunCam);
  for (const e of hidden) e.root.visible = false;
}

/** Décor des menus : le début du parcours, sans ennemis. */
export function menuBackdrop() {
  game.run = null;
  const W = buildWorld(MENU_SEED), s = W.start();
  game.player.pos.set(s.x + 3, 0, s.z);
  game.player.yaw = FACING_FORWARD;
}

/** Appelé par le combat à chaque élimination. */
export function onKill(enemy, head, combo) {
  if (enemy.room) enemy.room.kills++;
  if (head) headshotAt(enemy);
  const name = streakName(combo);
  if (name) { callout(name, `streak s${Math.min(combo, 8)}`); streakSound(sfx, combo); }
}

/** À chaque image de jeu, après le combat. */
export function updateRun(dt) {
  const run = game.run, W = game.world, p = game.player;
  if (!run || game.state !== 'play') return;

  // une salle construite au plus par image, toujours LOOKAHEAD salles d'avance
  if (W.next <= run.room + LOOKAHEAD) populate(W.buildNext());
  if (run.dropAt && game.time >= run.dropAt) { W.dropBefore(run.room); run.dropAt = 0; }
  W.update(dt, p.pos.x);
  for (const e of game.enemies) {
    if (e.alive || !e.body.done || !e.root.visible) continue;
    e.goneT = (e.goneT || 0) + dt;
    if (e.goneT > CORPSE_TIME) e.root.visible = false;
  }

  // porte de sortie : déverrouillée quand assez d'ennemis sont abattus, enfoncée quand le joueur arrive dessus
  const here = W.room(run.room), next = W.room(run.room + 1);
  if (next && !next.door.open) {
    if (!run.unlocked && here.kills >= here.need && !here.enemies.some(e => e.boss && e.alive)) {
      run.unlocked = true;
      W.setDoor(next, 'unlocked');
      sfx.click(2400, 0.4);
    }
    if (run.unlocked && Math.hypot(p.pos.x - next.door.x, p.pos.z - next.door.z) < OPEN_DIST) {
      W.setDoor(next, 'open');
      sfx.click(420, 0.8);
      sfx.footstep('wood', 3);
      if (game.ws) game.ws.kickPitch += 0.035; // à-coup du coup de pied
      activate();
      game.flowTimer = 0;
    }
  }
  if (next && next.door.open && p.pos.x > (next.x0 + 1) * CELL + 0.5) enterRoom(run.room + 1);

  // compte à rebours : une fois écoulé, la vie se vide tant qu'on reste dans la salle
  run.timer -= dt;
  const sec = Math.ceil(run.timer);
  if (sec !== run.lastTick && sec <= 5 && sec >= 0) { run.lastTick = sec; tick(sfx, sec); }
  if (run.timer <= 0) {
    p.health -= DRAIN * dt;
    p.lastHurt = game.time;
    game.hurtFlash = Math.max(game.hurtFlash, 0.6);
    if (p.health <= 0) { p.health = 0; hud.health(0); endRun(); return; }
  }

  run.distance = Math.max(run.distance, p.pos.x - run.startX); // en mètres
  if (weaponAt(game.stats.kills).step !== run.weaponStep) equipFor(game.stats.kills);

  // le décor du secteur se fond dans le suivant
  const th = THEMES[(W.roomAt(p.pos.x) || here).theme], k = Math.min(1, dt * 1.5);
  hemi.color.lerp(_a.setHex(th.hemi[0]), k);
  hemi.groundColor.lerp(_a.setHex(th.hemi[1]), k);
  hemi.intensity += (th.hemi[2] - hemi.intensity) * k;
  scene.fog.color.lerp(_b.setHex(th.fog), k);
  renderer.setClearColor(scene.fog.color);

  const left = here.need - here.kills;
  hud.objective(run.unlocked || !next
    ? t('run.doorOpen')
    : left > 0 ? t('run.killMore', { n: left }) : t('run.killBoss'), run.unlocked ? '' : 'boss');
  updateRunHud(dt, totalScore());
}

function leaveGame() {
  game.state = 'end';
  input.enabled = false;
  input.reset();
  music.setIntensity(0);
  music.setPaused(false);
}

/** Fin de la partie (mort ou abandon) : records et tableau des scores. */
export function endRun() {
  if (game.state !== 'play' && game.state !== 'paused') return;
  leaveGame();
  sfx.death();
  const run = game.run, st = game.stats, d = run.base;
  const score = totalScore(), meters = Math.floor(run.distance);
  const rec = save.submitRun(d.id, score, meters);
  const rows = [
    [t('row.distance'), `${fmtNum(meters)} m`],
    [t('row.rooms'), run.room],
    [t('row.time'), fmtTime(st.time)],
    [t('row.kills'), st.kills],
    [t('row.headshots'), st.headshots],
    [t('row.accuracy'), acc(st.hits, st.shots)],
    [t('row.bestCombo'), st.bestCombo > 1 ? t('row.comboKills', { n: st.bestCombo }) : '-'],
    [t('row.weapon'), weaponName(game.weapon)],
    [t('row.difficulty'), diffName(d)],
  ];
  if (run.daily) {
    const day = settleDaily(save.data.daily, run.daily, score, meters);
    save.set('daily', day.state);
    rows.push([t('end.daily'), day.isBest ? t('end.dailyBest') : t('end.dailyPrev', { n: fmtNum(day.prev) })]);
  }
  const best = rec.isBestScore
    ? t('end.newBest', { diff: diffName(d) })
    : t('end.best', { diff: diffName(d), points: fmtNum(rec.prev.score), meters: fmtNum(rec.prev.distance) });
  const share = tr('share.text', '', { points: fmtNum(score), meters: fmtNum(meters), diff: diffName(d), kills: st.kills, combo: st.bestCombo });
  setTimeout(() => showEnd(t('end.title'), rows, score, best, share), 900);
}


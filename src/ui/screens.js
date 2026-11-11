// Écrans hors partie : titre, choix de l'arme, pause, tableau des scores.
import { WEAPONS, weaponBars, weaponById } from '../weapons.js';
import { LEVELS, DIFFICULTIES, DIFF_ORDER } from '../levels.js';
import { $, game, hud, music, input, save, fmtNum, weaponName, diffName, audioOn } from '../game/state.js';
import { newRun, startLevel, loadFloor, endRun } from '../game/floor.js';
import { levelName, levelBrief, weaponType, weaponDesc, diffDesc, barLabel } from '../game/texts.js';
import { updateTutorial, tutorialPending } from '../game/tutorial.js';
import { updateStory, clearStory } from '../game/story.js';
import { UNLOCK_COST, MASTERY, masteryLevel } from '../core/perks.js';
import { dayKey, daySeed, dailyWeapon, dailyMissions, settleMissions, settleDaily, MISSION_REWARD } from '../core/daily.js';
import { enterFullscreen } from '../core/platform.js';
import { t, tr, applyDom } from '../core/i18n.js';

const screens = { menu: $('screenMenu'), select: $('screenSelect'), pause: $('screenPause'), end: $('screenEnd') };
let shareText = '';

export function showScreen(name) {
  for (const [k, el] of Object.entries(screens)) el.classList.toggle('hidden', k !== name);
}

export function pause() {
  if (game.state !== 'play') return;
  game.state = 'paused';
  input.enabled = false;
  input.reset();
  music.setPaused(true);
  showScreen('pause');
}

export function resume() {
  if (game.state !== 'paused') return;
  showScreen(null);
  input.reset();
  input.enabled = true;
  music.setPaused(false);
  game.state = 'play';
}

/** Fond animé des menus : le premier étage du niveau à venir. */
export function menuBackdrop(levelIdx) {
  if (game.state === 'play' || game.state === 'transition') return;
  loadFloor(levelIdx, 0);
  for (const e of game.enemies) e.root.visible = false;
}

export function goSelect() {
  game.state = 'select';
  music.setIntensity(0);
  music.setPaused(false);
  hud.show(false);
  clearStory();
  menuBackdrop(game.run ? game.run.levelIdx : 0);
  renderSelect();
  showScreen('select');
}

const missionText = m => tr(`mission.${m.id}`, m.text, { n: fmtNum(m.target) });

function renderSelect() {
  const levelIdx = game.run ? game.run.levelIdx : 0, lv = LEVELS[levelIdx];
  const first = levelIdx === 0 && !game.run;
  const daily = !!(game.run && game.run.daily); // défi du jour : l'arme est imposée pour toute la partie
  $('lvlName').textContent = t('select.level', { n: levelIdx + 1, total: LEVELS.length, name: levelName(lv) });
  $('lvlBrief').textContent = first ? `${levelBrief(lv)} — ${diffDesc(game.diff)}` : levelBrief(lv);

  // difficulté : choisie au début de la partie, figée ensuite
  const chips = $('diffChips');
  chips.innerHTML = '';
  for (const id of DIFF_ORDER) {
    const d = DIFFICULTIES[id], selected = id === game.diff.id;
    if (game.run && !selected) continue;
    const b = document.createElement('button');
    b.className = `chip ${id}` + (selected ? ' sel' : '') + (game.run ? ' locked' : '');
    b.textContent = diffName(d).toUpperCase();
    b.addEventListener('click', () => { game.diff = d; renderSelect(); });
    chips.appendChild(b);
  }

  // armes : celles qui ne sont pas encore débloquées affichent leur prix en crédits
  document.querySelector('.selectHead').textContent = daily
    ? tr('select.dailyHead', 'Défi du jour · arme imposée')
    : `${t('select.head')} · ${tr('select.credits', '{n} crédits', { n: fmtNum(save.data.credits) })}`;
  const grid = $('weaponGrid');
  grid.innerHTML = '';
  for (const w of WEAPONS) {
    const locked = !daily && !save.isUnlocked(w.id);
    const b = document.createElement('button');
    b.className = 'wcard' + (w.id === game.weapon.id ? ' sel' : '') + (locked ? ' locked' : '');
    b.disabled = daily && w.id !== game.weapon.id;
    b.innerHTML = `<b>${weaponName(w)}</b><small>${locked ? tr('select.cost', '{n} crédits', { n: UNLOCK_COST[w.id] }) : weaponType(w)}</small>`;
    b.addEventListener('click', () => { game.weapon = w; renderSelect(); });
    grid.appendChild(b);
  }

  // fiche de l'arme : toujours ses valeurs d'origine, les atouts s'appliquent en partie
  const w = weaponById(game.weapon.id);
  const locked = !daily && !save.isUnlocked(w.id), cost = UNLOCK_COST[w.id];
  const kills = save.kills(w.id), level = masteryLevel(kills);
  const next = MASTERY[level];
  const mastery = next
    ? tr('select.mastery', 'Maîtrise {level}/{max} · prochain accessoire à {n} éliminations ({kills})', { level, max: MASTERY.length, n: next.kills, kills })
    : tr('select.masteryMax', 'Maîtrise complète');
  $('wName').textContent = weaponName(w);
  $('wType').textContent = t('select.zoom', { type: weaponType(w), zoom: String(w.zoom).replace('.', ',') });
  $('wDesc').textContent = `${weaponDesc(w)} ${mastery}.`;
  $('wBars').innerHTML = weaponBars(w).map(([label, v, txt]) =>
    `<div class="bar"><span>${barLabel(label)}</span><div class="track"><div class="fill" style="width:${(v * 100).toFixed(0)}%"></div></div><span class="val">${txt}</span></div>`
  ).join('');
  const go = $('btnGo');
  go.classList.toggle('ghost', locked && save.data.credits < cost);
  if (!locked) go.textContent = first ? t('select.go') : t('select.goLevel', { name: levelName(lv).toUpperCase() });
  else if (save.data.credits >= cost) go.textContent = tr('select.unlock', 'DÉBLOQUER · {n}', { n: cost });
  else go.textContent = tr('select.missing', 'IL MANQUE {n} CRÉDITS', { n: cost - save.data.credits });
}

/** Écran titre : records, défi du jour et missions (masqués tant que la première partie guidée n'est pas faite). */
function renderMenu() {
  const parts = DIFF_ORDER.map(id => {
    const b = save.best(id);
    return b ? `${diffName(DIFFICULTIES[id])} ${fmtNum(b)}` : null;
  }).filter(Boolean);
  $('bestScore').textContent = parts.length ? t('menu.records', { list: parts.join(' · ') }) : '';

  const extras = document.querySelector('.menuExtras');
  extras.classList.toggle('hidden', tutorialPending());
  const key = dayKey(), seed = daySeed(key);
  const weapon = weaponById(dailyWeapon(seed, WEAPONS.map(w => w.id)));
  const daily = save.data.daily && save.data.daily.date === key ? save.data.daily.best : 0;
  $('btnDaily').textContent = tr('menu.daily', 'DÉFI DU JOUR · {weapon}', { weapon: weaponName(weapon).toUpperCase() })
    + (daily ? ` · ${fmtNum(daily)}` : '');
  const done = save.data.missions && save.data.missions.date === key ? save.data.missions.done : [];
  $('missions').innerHTML = dailyMissions(seed).map(m =>
    `<div class="${done.includes(m.id) ? 'done' : ''}">${done.includes(m.id) ? '✓' : '○'} ${missionText(m)} · ${MISSION_REWARD}</div>`
  ).join('');
}

/** Fin de partie : missions du jour accomplies et record du défi. Renvoie les lignes à ajouter au tableau. */
function settleRun() {
  const key = dayKey(), st = game.stats, rows = [];
  const m = settleMissions(save.data.missions, key, st);
  save.data.missions = m.state;
  save.addCredits(m.reward);
  for (const mission of m.completed) rows.push([tr('end.mission', 'Mission accomplie'), `${missionText(mission)} · +${MISSION_REWARD}`]);
  if (game.run.daily === key) {
    const d = settleDaily(save.data.daily, key, st.points);
    save.set('daily', d.state);
    rows.push([tr('end.daily', 'Défi du jour'), d.isBest ? tr('end.dailyBest', 'nouveau record du jour') : tr('end.dailyPrev', 'record du jour : {n}', { n: fmtNum(d.prev) })]);
  }
  return rows;
}

export function showEnd(title, win, rows, ptsLabel, points, best, btn) {
  // partie terminée (et non simple fin de bâtiment) : on solde missions et défi, une seule fois
  if (game.endAction === 'again' && game.run && !game.run.settled) {
    game.run.settled = true;
    rows = [...rows, ...settleRun()];
    shareText = tr('share.text', 'Sütçü İmam Escape — {points} points en {diff}, {kills} éliminations, combo de {combo}', {
      points: fmtNum(points), diff: diffName(game.diff), kills: game.stats.kills, combo: game.stats.bestCombo,
    });
  }
  clearStory();
  const el = $('endTitle');
  el.textContent = title;
  el.classList.toggle('win', win);
  $('endTable').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  document.querySelector('.endPtsLabel').textContent = ptsLabel;
  $('endPoints').textContent = fmtNum(points);
  $('endBest').textContent = best;
  $('btnAgain').textContent = btn;
  const share = $('btnShare');
  share.classList.toggle('hidden', game.endAction !== 'again');
  share.textContent = tr('share.button', 'PARTAGER');
  hud.show(false);
  showScreen('end');
  renderMenu();
}

/** Première partie : pas de choix d'arme ni de difficulté, on joue tout de suite. */
function startFirstRun() {
  game.weapon = weaponById('m4');
  game.diff = DIFFICULTIES.normal;
  newRun();
  startLevel(0);
}

function startDaily() {
  const key = dayKey(), seed = daySeed(key);
  game.weapon = weaponById(dailyWeapon(seed, WEAPONS.map(w => w.id)));
  game.diff = DIFFICULTIES.normal;
  newRun(seed);
  game.run.daily = key;
  startLevel(0);
}

/** Partage le résultat par le menu du téléphone, ou le copie si le partage n'est pas disponible. */
async function share() {
  const btn = $('btnShare');
  try {
    if (navigator.share) await navigator.share({ text: shareText });
    else { await navigator.clipboard.writeText(shareText); btn.textContent = tr('share.copied', 'COPIÉ'); }
  } catch { /* partage annulé ou refusé */ }
}

/** Branche les boutons des écrans. Appelé une fois au démarrage. */
export function initScreens() {
  applyDom();
  game.systems.push(updateTutorial, updateStory);
  // une arme mémorisée mais pas débloquée (sauvegarde modifiée) ne doit pas être présélectionnée
  if (!save.isUnlocked(game.weapon.id)) game.weapon = weaponById('m4');

  const extras = document.createElement('div');
  extras.className = 'menuExtras';
  extras.innerHTML = '<button id="btnDaily" class="btn ghost"></button><div id="missions"></div>';
  extras.addEventListener('pointerup', e => e.stopPropagation()); // l'écran titre démarre le jeu au moindre toucher
  screens.menu.appendChild(extras);
  const shareBtn = document.createElement('button');
  shareBtn.id = 'btnShare';
  shareBtn.className = 'btn ghost hidden';
  shareBtn.addEventListener('click', share);
  document.querySelector('.endRight').appendChild(shareBtn);

  screens.menu.addEventListener('pointerup', () => {
    audioOn();
    enterFullscreen();
    if (tutorialPending()) startFirstRun(); else goSelect();
  });
  $('btnDaily').addEventListener('click', () => { audioOn(); enterFullscreen(); startDaily(); });
  $('btnGo').addEventListener('click', () => {
    audioOn();
    enterFullscreen();
    const id = game.weapon.id, daily = game.run && game.run.daily;
    if (!daily && !save.isUnlocked(id)) { // arme verrouillée : le bouton l'achète si les crédits suffisent
      save.unlock(id);
      renderSelect();
      return;
    }
    if (!daily) save.set('lastWeapon', id);
    if (!game.run) newRun();
    startLevel(0);
  });
  $('btnResume').addEventListener('click', () => { audioOn(); resume(); });
  $('btnQuit').addEventListener('click', () => endRun(false));
  $('btnAgain').addEventListener('click', () => {
    audioOn();
    enterFullscreen();
    if (game.endAction !== 'next') {
      // partie terminée : retour à l'écran titre, où l'on retrouve le défi du jour et les missions
      game.run = null;
      game.state = 'menu';
      music.setIntensity(0);
      menuBackdrop(0);
      renderMenu();
      showScreen('menu');
      return;
    }
    goSelect();
  });
  renderMenu();
}

// Écrans hors partie : titre, choix de l'arme, pause, tableau des scores.
import { WEAPONS, weaponBars, weaponById } from '../weapons.js';
import { LEVELS, DIFFICULTIES, DIFF_ORDER } from '../levels.js';
import { $, game, hud, music, input, save, fmtNum, weaponName, diffName, audioOn } from '../game/state.js';
import { newRun, startLevel, loadFloor, endRun } from '../game/floor.js';
import { UNLOCK_COST, MASTERY, masteryLevel } from '../core/perks.js';
import { enterFullscreen } from '../core/platform.js';
import { t, tr, applyDom } from '../core/i18n.js';

const screens = { menu: $('screenMenu'), select: $('screenSelect'), pause: $('screenPause'), end: $('screenEnd') };

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
  menuBackdrop(game.run ? game.run.levelIdx : 0);
  renderSelect();
  showScreen('select');
}

function renderSelect() {
  const levelIdx = game.run ? game.run.levelIdx : 0, lv = LEVELS[levelIdx];
  const first = levelIdx === 0 && !game.run;
  $('lvlName').textContent = t('select.level', { n: levelIdx + 1, total: LEVELS.length, name: lv.name });
  $('lvlBrief').textContent = first ? `${lv.brief} — ${game.diff.desc}` : lv.brief;

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
  document.querySelector('.selectHead').textContent =
    `${t('select.head')} · ${tr('select.credits', '{n} crédits', { n: fmtNum(save.data.credits) })}`;
  const grid = $('weaponGrid');
  grid.innerHTML = '';
  for (const w of WEAPONS) {
    const locked = !save.isUnlocked(w.id);
    const b = document.createElement('button');
    b.className = 'wcard' + (w.id === game.weapon.id ? ' sel' : '') + (locked ? ' locked' : '');
    b.innerHTML = `<b>${weaponName(w)}</b><small>${locked ? tr('select.cost', '{n} crédits', { n: UNLOCK_COST[w.id] }) : w.type}</small>`;
    b.addEventListener('click', () => { game.weapon = w; renderSelect(); });
    grid.appendChild(b);
  }

  // fiche de l'arme : toujours ses valeurs d'origine, les atouts s'appliquent en partie
  const w = weaponById(game.weapon.id);
  const locked = !save.isUnlocked(w.id), cost = UNLOCK_COST[w.id];
  const kills = save.kills(w.id), level = masteryLevel(kills);
  const next = MASTERY[level];
  const mastery = next
    ? tr('select.mastery', 'Maîtrise {level}/{max} · prochain accessoire à {n} éliminations ({kills})', { level, max: MASTERY.length, n: next.kills, kills })
    : tr('select.masteryMax', 'Maîtrise complète');
  $('wName').textContent = weaponName(w);
  $('wType').textContent = t('select.zoom', { type: w.type, zoom: String(w.zoom).replace('.', ',') });
  $('wDesc').textContent = `${w.desc} ${mastery}.`;
  $('wBars').innerHTML = weaponBars(w).map(([label, v, txt]) =>
    `<div class="bar"><span>${label}</span><div class="track"><div class="fill" style="width:${(v * 100).toFixed(0)}%"></div></div><span class="val">${txt}</span></div>`
  ).join('');
  const go = $('btnGo');
  go.classList.toggle('ghost', locked && save.data.credits < cost);
  if (!locked) go.textContent = first ? t('select.go') : t('select.goLevel', { name: lv.name.toUpperCase() });
  else if (save.data.credits >= cost) go.textContent = tr('select.unlock', 'DÉBLOQUER · {n}', { n: cost });
  else go.textContent = tr('select.missing', 'IL MANQUE {n} CRÉDITS', { n: cost - save.data.credits });
}

function updateMenuBest() {
  const parts = DIFF_ORDER.map(id => {
    const b = save.best(id);
    return b ? `${diffName(DIFFICULTIES[id])} ${fmtNum(b)}` : null;
  }).filter(Boolean);
  $('bestScore').textContent = parts.length ? t('menu.records', { list: parts.join(' · ') }) : '';
}

export function showEnd(title, win, rows, ptsLabel, points, best, btn) {
  const el = $('endTitle');
  el.textContent = title;
  el.classList.toggle('win', win);
  $('endTable').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  document.querySelector('.endPtsLabel').textContent = ptsLabel;
  $('endPoints').textContent = fmtNum(points);
  $('endBest').textContent = best;
  $('btnAgain').textContent = btn;
  hud.show(false);
  showScreen('end');
  updateMenuBest();
}

/** Branche les boutons des écrans. Appelé une fois au démarrage. */
export function initScreens() {
  applyDom();
  // une arme mémorisée mais pas débloquée (sauvegarde modifiée) ne doit pas être présélectionnée
  if (!save.isUnlocked(game.weapon.id)) game.weapon = weaponById('m4');
  screens.menu.addEventListener('pointerup', () => { audioOn(); enterFullscreen(); goSelect(); });
  $('btnGo').addEventListener('click', () => {
    audioOn();
    enterFullscreen();
    const id = game.weapon.id;
    if (!save.isUnlocked(id)) { // arme verrouillée : le bouton l'achète si les crédits suffisent
      save.unlock(id);
      renderSelect();
      return;
    }
    save.set('lastWeapon', id);
    if (!game.run) newRun();
    startLevel(0);
  });
  $('btnResume').addEventListener('click', () => { audioOn(); resume(); });
  $('btnQuit').addEventListener('click', () => endRun(false));
  $('btnAgain').addEventListener('click', () => {
    audioOn();
    enterFullscreen();
    if (game.endAction !== 'next') game.run = null;
    goSelect();
  });
  updateMenuBest();
}

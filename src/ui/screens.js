// Écrans hors partie : titre (difficulté, records, défi du jour), pause, tableau des scores.
import { DIFFICULTIES, DIFF_ORDER } from '../levels.js';
import { $, game, hud, music, input, save, fmtNum, diffName, audioOn } from '../game/state.js';
import { newRun, startRun, endRun, menuBackdrop } from '../game/run.js';
import { diffDesc } from '../game/texts.js';
import { updateTutorial } from '../game/tutorial.js';
import { updateStory, clearStory } from '../game/story.js';
import { dayKey, daySeed } from '../core/daily.js';
import { enterFullscreen } from '../core/platform.js';
import { t, applyDom } from '../core/i18n.js';

const screens = { menu: $('screenMenu'), pause: $('screenPause'), end: $('screenEnd') };
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

/** Écran titre : une puce par difficulté avec son meilleur score et sa meilleure distance. */
function renderMenu() {
  const chips = $('diffChips');
  chips.innerHTML = '';
  for (const id of DIFF_ORDER) {
    const d = DIFFICULTIES[id], best = save.best(id);
    const b = document.createElement('button');
    b.className = `chip ${id}` + (id === game.diff.id ? ' sel' : '');
    b.innerHTML = '<b></b><small></small>';
    b.firstChild.textContent = diffName(d).toUpperCase();
    b.lastChild.textContent = best.score
      ? t('menu.best', { points: fmtNum(best.score), meters: fmtNum(best.distance) })
      : t('menu.noBest');
    b.addEventListener('click', () => { game.diff = d; save.set('lastDiff', id); renderMenu(); });
    chips.appendChild(b);
  }
  $('menuDesc').textContent = diffDesc(game.diff);
  const key = dayKey(), today = save.data.daily && save.data.daily.date === key ? save.data.daily : null;
  $('btnDaily').textContent = today
    ? t('menu.dailyBest', { points: fmtNum(today.score), meters: fmtNum(today.distance) })
    : t('menu.daily');
}

/** Retour à l'écran titre. */
function goMenu() {
  game.state = 'menu';
  music.setIntensity(0);
  music.setPaused(false);
  hud.show(false);
  clearStory();
  menuBackdrop();
  renderMenu();
  showScreen('menu');
}

/** Lance une partie : la difficulté choisie, ou le défi du jour (même parcours pour tous, en Normal). */
function start(daily) {
  if (!game.assetsReady) return; // modèles 3D encore en chargement
  audioOn();
  enterFullscreen();
  if (daily) {
    game.diff = DIFFICULTIES.normal;
    newRun(daySeed(dayKey()), dayKey());
  } else newRun();
  startRun();
}

export function showEnd(title, rows, score, best, share) {
  shareText = share;
  clearStory();
  $('endTitle').textContent = title;
  $('endTable').innerHTML = '';
  for (const [k, v] of rows) {
    const tr = $('endTable').insertRow();
    tr.insertCell().textContent = k;
    tr.insertCell().textContent = v;
  }
  document.querySelector('.endPtsLabel').textContent = t('end.points');
  $('endPoints').textContent = fmtNum(score);
  $('endBest').textContent = best;
  $('btnShare').textContent = t('share.button');
  hud.show(false);
  showScreen('end');
}

/** Partage le résultat par le menu du téléphone, ou le copie si le partage n'est pas disponible. */
async function share() {
  try {
    if (navigator.share) await navigator.share({ text: shareText });
    else { await navigator.clipboard.writeText(shareText); $('btnShare').textContent = t('share.copied'); }
  } catch { /* partage annulé ou refusé */ }
}

/** Branche les boutons des écrans. Appelé une fois au démarrage. */
export function initScreens() {
  applyDom();
  game.systems.push(updateTutorial, updateStory);
  // l'écran titre lance la partie au moindre toucher, sauf sur ses boutons
  document.querySelector('.menuExtras').addEventListener('pointerup', e => e.stopPropagation());
  screens.menu.addEventListener('pointerup', () => start(false));
  $('btnDaily').addEventListener('click', () => start(true));
  $('btnResume').addEventListener('click', () => { audioOn(); resume(); });
  $('btnQuit').addEventListener('click', () => endRun());
  $('btnAgain').addEventListener('click', () => { audioOn(); goMenu(); });
  $('btnShare').addEventListener('click', share);
  menuBackdrop();
  renderMenu();
}

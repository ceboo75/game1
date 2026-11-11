// Annonces à l'écran : entrée dans un bâtiment, apparition d'un boss, et consigne du tutoriel en bas d'écran.
import { LEVELS } from '../levels.js';
import { $, game } from './state.js';
import { levelName, levelBrief, bossTitle } from './texts.js';

let banner = null, hint = null;
let bannerLeft = 0, lastFloor = '', seenBosses = new Set();

function element(id) {
  const el = document.createElement('div');
  el.id = id;
  el.className = 'hidden';
  $('app').appendChild(el);
  return el;
}

/** Grand bandeau au centre : titre, sous-titre, durée en secondes. */
export function showBanner(title, sub, seconds, kind = '') {
  banner ??= element('banner');
  banner.className = kind;
  banner.innerHTML = '<b></b><span></span>';
  banner.firstChild.textContent = title;
  banner.lastChild.textContent = sub;
  bannerLeft = seconds;
}

/** Consigne en bas d'écran ; null pour l'effacer. */
export function showHint(text) {
  hint ??= element('hint');
  hint.classList.toggle('hidden', !text);
  if (text) hint.textContent = text;
}

/** À appeler à chaque image de jeu. */
export function updateStory(dt) {
  const run = game.run;
  if (!run) return;

  const floor = `${run.seed}|${run.levelIdx}|${run.floorIdx}`;
  if (floor !== lastFloor) {
    lastFloor = floor;
    seenBosses = new Set();
    // premier étage d'un bâtiment : on rappelle où on est et qui on vient chercher
    if (run.floorIdx === 0) { const lv = LEVELS[run.levelIdx]; showBanner(levelName(lv), levelBrief(lv), 5); }
  }

  // première fois qu'on voit un boss : son nom et son rôle
  for (const e of game.enemies) {
    if (!e.boss || !e.alive || seenBosses.has(e) || !e.hasLOS || !e.root.visible) continue;
    seenBosses.add(e);
    showBanner(e.name, bossTitle(e.key, e.def), 3, 'boss');
    game.sfx.denied();
  }

  if (banner && bannerLeft > 0) {
    bannerLeft -= dt;
    if (bannerLeft <= 0) banner.className = 'hidden';
  }
}

/** Efface les annonces (fin de partie, retour au menu). */
export function clearStory() {
  if (banner) banner.className = 'hidden';
  bannerLeft = 0;
  showHint(null);
}

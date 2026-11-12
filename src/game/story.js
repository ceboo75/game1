// Annonces à l'écran : apparition d'un boss, et consigne du tutoriel en bas d'écran.
import { $, game } from './state.js';
import { bossTitle } from './texts.js';

let banner = null, hint = null, bannerLeft = 0;
const seen = new WeakSet();

function element(id) {
  const el = document.createElement('div');
  el.id = id;
  el.className = 'hidden';
  $('app').appendChild(el);
  return el;
}

/** Bandeau au centre : titre, sous-titre, durée en secondes. */
function showBanner(title, sub, seconds) {
  banner ??= element('banner');
  banner.className = 'boss';
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

/** À chaque image de jeu : la première fois qu'un boss est en vue, son nom et son rôle. */
export function updateStory(dt) {
  for (const e of game.enemies) {
    if (!e.boss || !e.alive || seen.has(e) || !e.hasLOS || !e.root.visible) continue;
    seen.add(e);
    showBanner(e.name, bossTitle(e.key, e.def), 3);
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

// Affichage propre à la fuite : compte à rebours, salle et distance, arme en cours, annonces d'éliminations.
import * as THREE from 'three';
import { $, game, hud, fmtNum, weaponName } from '../game/state.js';
import { camera } from '../game/view.js';
import { weaponAt, roomMult } from '../core/endless.js';
import { t } from '../core/i18n.js';

const HEAD_TIME = 0.9;   // durée d'une étiquette HEADSHOT (s)
const CALL_TIME = 1400;  // durée d'une annonce au centre (ms)

let timerEl = null, infoEl = null, weaponEl = null, callEl = null;
let shown = {};
const floating = [];     // étiquettes HEADSHOT : { el, enemy, t }
const v = new THREE.Vector3();

const set = (key, value, apply) => { if (shown[key] !== value) { shown[key] = value; apply(value); } };
const mult = n => String(roomMult(n)).replace('.', ',');

/** Crée les éléments d'affichage. Appelé une fois au démarrage. */
export function initRunHud() {
  const make = id => { const el = document.createElement('div'); el.id = id; $('hud').appendChild(el); return el; };
  timerEl = make('runTimer');
  infoEl = make('runInfo');
  weaponEl = make('runWeapon');
  callEl = make('callouts');
}

/** Annonce au centre haut de l'écran : série d'éliminations, nouvelle arme, nouvelle salle. */
export function callout(text, kind) {
  const el = document.createElement('div');
  el.className = `call ${kind}`;
  el.textContent = text;
  callEl.prepend(el);
  while (callEl.children.length > 3) callEl.lastChild.remove();
  setTimeout(() => el.remove(), CALL_TIME);
}

/** « HEADSHOT » écrit au-dessus de l'ennemi abattu, qui le suit pendant sa chute. */
export function headshotAt(enemy) {
  const el = document.createElement('div');
  el.className = 'headTag';
  el.textContent = t('call.headshot');
  $('hud').appendChild(el);
  floating.push({ el, enemy, t: HEAD_TIME });
}

/** Vide les annonces (nouvelle partie). */
export function clearRunHud() {
  for (const f of floating) f.el.remove();
  floating.length = 0;
  if (callEl) callEl.innerHTML = '';
  shown = {};
}

/** À chaque image de jeu. */
export function updateRunHud(dt, score) {
  const run = game.run;
  set('timer', Math.ceil(Math.max(0, run.timer)), s => {
    timerEl.textContent = s;
    timerEl.className = s <= 5 ? 'low' : '';
  });
  set('info', `${run.room}|${Math.floor(run.distance)}`, () => {
    infoEl.textContent = t('run.info', { n: run.room + 1, meters: fmtNum(run.distance), mult: mult(run.room) });
  });
  const left = weaponAt(game.stats.kills).left;
  set('weapon', `${game.weapon.id}|${left}`, () => {
    weaponEl.textContent = t('run.weapon', { name: weaponName(game.weapon).toUpperCase(), n: left });
  });
  hud.scoreValue(score);

  for (let i = floating.length - 1; i >= 0; i--) {
    const f = floating[i];
    f.t -= dt;
    if (f.t <= 0) { f.el.remove(); floating.splice(i, 1); continue; }
    const r = f.enemy.root.position;
    v.set(r.x, 2.1 * f.enemy.def.scale, r.z).project(camera);
    if (v.z > 1) { f.el.style.display = 'none'; continue; }
    const rise = (HEAD_TIME - f.t) * 40; // l'étiquette monte doucement
    f.el.style.display = '';
    f.el.style.left = `${((v.x + 1) / 2) * innerWidth}px`;
    f.el.style.top = `${((1 - v.y) / 2) * innerHeight - rise}px`;
    f.el.style.opacity = Math.min(1, f.t * 3).toFixed(2);
  }
}

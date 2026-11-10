// État partagé de la partie et services communs à tous les modules du jeu.
import * as THREE from 'three';
import { DIFFICULTIES } from '../levels.js';
import { weaponById } from '../weapons.js';
import { Input } from '../input.js';
import { Sfx } from '../audio.js';
import { Music } from '../music.js';
import { Hud } from '../hud.js';
import { Save } from '../core/save.js';
import { normalizeSettings, cleanValue } from '../core/settings.js';
import { tr, locale } from '../core/i18n.js';

export const params = new URLSearchParams(location.search);
export const $ = id => document.getElementById(id);
export const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
export const fmtNum = n => Math.round(n).toLocaleString(locale());
export function fmtTime(s) {
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
}
export const acc = (hits, shots) => (shots ? Math.round((hits / shots) * 100) : 0) + ' %';

/** Noms affichés : pris dans les textes traduits, sinon dans les fichiers de contenu. */
export const weaponName = w => tr(`weapon.${w.id}`, w.name);
export const diffName = d => tr(`diff.${d.id}.name`, d.name);

export const save = new Save();
/** Réglages du joueur (voir core/settings.js). À modifier par setSetting pour qu'ils soient enregistrés. */
export const settings = save.data.settings = normalizeSettings(save.data.settings);
export function setSetting(key, value) {
  settings[key] = cleanValue(key, value);
  save.write();
}

export const hud = new Hud();
export const sfx = new Sfx();
export const music = new Music(sfx);
/** Fonctions branchées au démarrage par main.js (évite que l'état dépende des écrans). */
export const hooks = { pause() {} };
export const input = new Input({ onPause: () => hooks.pause() });

const MUSIC_BASE = music.volume; // volumes d'origine, que les réglages viennent atténuer
const SFX_BASE = 0.7;

/** Applique les volumes choisis par le joueur. Sans effet tant que le son n'a pas démarré. */
export function applyAudio() {
  music.volume = MUSIC_BASE * settings.volMusic;
  if (music.started) {
    const duck = game.state === 'paused' ? 0.25 : 1; // la musique est atténuée pendant la pause
    music.out.gain.setTargetAtTime(Math.max(0.0001, music.volume * duck), music.c.currentTime, 0.1);
  }
  if (sfx.master) sfx.master.gain.value = SFX_BASE * settings.volSfx;
}

/** Démarre le son : doit être appelé pendant un geste de l'utilisateur. */
export function audioOn() {
  sfx.init();
  music.start();
  if (music.started) sfx.adoptMusic(music.out); // la musique passe par le mixage des bruitages
  applyAudio();
}

export const game = {
  state: 'menu',          // menu | select | play | transition | paused | end
  run: null,              // partie en cours : { levelIdx, floorIdx, levelStats, weapons[] }
  level: null,
  enemies: [],
  flow: null,
  flowTimer: 0,
  time: 0,
  diff: DIFFICULTIES[save.data.lastDiff] || DIFFICULTIES.normal,
  weapon: weaponById(save.data.lastWeapon || 'm4'),
  gun: null,
  ws: null,
  stats: null,
  combo: { count: 0, last: -99 },
  hurtFlash: 0,
  lastShot: -99,
  lastDenied: -99,
  endAction: 'again',
  lookSway: { x: 0, y: 0 },
  player: { pos: new THREE.Vector3(), yaw: 0, pitch: 0, health: 100, lastHurt: -99, moving: false, bobT: 0 },
  // utilisés par les ennemis ; fx, hurtPlayer et alertNear sont branchés par main.js
  fx: null, sfx, hud, music,
  hurtPlayer: null,
  alertNear: null,
  debug: null,
};

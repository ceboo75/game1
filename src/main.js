// Point d'entrée : assemble les modules, branche les événements du navigateur et lance la boucle d'affichage.
import * as THREE from 'three';
import { DIFFICULTIES } from './levels.js';
import { CELL } from './world.js';
import { $, params, game, hooks, sfx } from './game/state.js';
import { loadAssets } from './game/assets.js';
import { t } from './core/i18n.js';
import { renderer, camera, gunCam, fx, applyFov, render } from './game/view.js';
import { update, idleCamera, zoomNow, hurtPlayer, alertNear, hitEnemy } from './game/combat.js';
import { updateViewmodel } from './game/viewmodel.js';
import { updateAmbience } from './game/ambience.js';
import { newRun, startRun, updateRun } from './game/run.js';
import { applyQuality, frameGate, perfFrame, perfState } from './game/perf.js';
import { pause, initScreens } from './ui/screens.js';
import { initSettings } from './ui/settings.js';
import { initRunHud } from './ui/runhud.js';

const H_FOV = 100; // champ de vision horizontal (degrés)

game.fx = fx;
game.hurtPlayer = hurtPlayer;
game.alertNear = alertNear;
hooks.pause = pause;
window.game = game; // accès console pour le débogage

// Ce qui tourne à chaque image de jeu, dans l'ordre : le combat, la fuite (salles, portes, compte à rebours),
// puis ce qui en découle. Un module chargé plus tard peut s'ajouter à la liste (game.systems.push).
game.systems = [update, updateRun, updateViewmodel, updateAmbience];
function tick(dt) {
  for (const system of game.systems) system(dt);
}

// ---------------------------------------------------------------- crochets de test
game.debug = {
  start: (diffId = 'normal', seed = 1) => {
    game.diff = DIFFICULTIES[diffId];
    newRun(seed);
    startRun();
  },
  step: (frames = 1, dt = 1 / 60) => { for (let i = 0; i < frames && game.state === 'play'; i++) tick(dt); },
  render: () => render(),
  perf: () => perfState(),
  /**
   * Robot de test : traverse des salles en abattant les ennemis et en passant chaque porte.
   * Mesure le temps de chaque image et vérifie que le monde ne grossit pas avec la distance.
   */
  selfTest: (rooms = 200) => {
    const report = { rooms: 0, kills: 0, maxFrameMs: 0, slowFrames: [], problems: [], memory: {} };
    game.debug.start('normal', 1);
    const W = game.world, p = game.player;
    const snapshot = () => ({
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      objects: W.group.children.length, rooms: W.rooms.length, calls: perfState().calls,
    });
    const frame = () => {
      const t0 = performance.now();
      p.health = 100;
      tick(1 / 60);
      render();
      const ms = performance.now() - t0;
      report.maxFrameMs = Math.max(report.maxFrameMs, ms);
      if (ms > 50) report.slowFrames.push(`salle ${game.run.room} : ${Math.round(ms)} ms`);
    };
    for (let i = 0; i < rooms && game.state === 'play'; i++) {
      const run = game.run, here = W.room(run.room), next = W.room(run.room + 1);
      if (!next) { report.problems.push(`salle ${run.room + 1} non construite d'avance`); break; }
      for (const e of here.enemies) if (e.alive && hitEnemy(e, 1e6)) report.kills++;
      frame();
      if (!run.unlocked) report.problems.push(`salle ${run.room} : porte restée verrouillée`);
      p.pos.set(next.door.x - 1.2, 0, next.door.z);          // devant la porte : elle s'enfonce
      frame();
      p.pos.set((next.x0 + 1) * CELL + 1, 0, next.door.z);  // dans la salle suivante
      for (let f = 0; f < 30; f++) frame();
      if (game.run.room !== i + 1) { report.problems.push(`salle ${i + 1} : pas entré (salle ${game.run.room})`); break; }
      report.rooms++;
      if (i === 10) report.memory.room10 = snapshot();
    }
    report.memory.end = snapshot();
    report.distance = Math.floor(game.run.distance);
    report.weapon = game.weapon.id;
    return report;
  },
};

// ---------------------------------------------------------------- arrière-plan et perte de l'affichage
// appli en arrière-plan (appel, notification...) : pause et silence
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); sfx.ctx?.suspend(); }
  else sfx.ctx?.resume();
});
// le système peut reprendre la carte graphique : on met en pause, puis on recharge quand elle revient
$('c').addEventListener('webglcontextlost', e => { e.preventDefault(); pause(); });
$('c').addEventListener('webglcontextrestored', () => location.reload());

// ---------------------------------------------------------------- taille d'écran et orientation
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  camera.aspect = gunCam.aspect = aspect;
  const vfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(H_FOV / 2)) / aspect);
  camera.userData.baseFov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(vfov), 50, 80);
  camera.fov = 0; // force le recalcul
  applyFov(game.state === 'play' || game.state === 'paused' ? zoomNow() : 1);
  gunCam.updateProjectionMatrix();
  const portrait = h > w && matchMedia('(pointer: coarse)').matches;
  $('rotate').classList.toggle('on', portrait);
  if (portrait) pause();
}
window.addEventListener('resize', resize);

// ---------------------------------------------------------------- démarrage
initRunHud();
initScreens();
initSettings();
applyQuality();
resize();
game.state = 'menu';
// modèles 3D fournis (assets/manifest.json) ; « ?manifest=... » en charge un autre pour les essais
const tap = document.querySelector('.tapHint');
loadAssets(params.get('manifest') || undefined, k => { tap.textContent = t('menu.loading', { n: Math.round(k * 100) }); })
  .finally(() => { game.assetsReady = true; tap.textContent = t('menu.tap'); });

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (!frameGate(now)) return; // limite d'images par seconde
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const playing = game.state === 'play';
  if (playing) tick(dt);
  else if (game.state === 'menu') idleCamera(dt);
  render();
  perfFrame(dt, playing);
}
requestAnimationFrame(frame);

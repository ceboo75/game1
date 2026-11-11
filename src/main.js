// Point d'entrée : assemble les modules, branche les événements du navigateur et lance la boucle d'affichage.
import * as THREE from 'three';
import { LEVELS, DIFFICULTIES } from './levels.js';
import { weaponById } from './weapons.js';
import { $, game, hooks, sfx } from './game/state.js';
import { renderer, camera, gunCam, fx, applyFov, render } from './game/view.js';
import { update, updateCamera, idleCamera, zoomNow, hurtPlayer, alertNear } from './game/combat.js';
import { updateViewmodel } from './game/viewmodel.js';
import { updateAmbience } from './game/ambience.js';
import { updateDoors, doorState } from './game/doors.js';
import { updatePerks } from './game/perkflow.js';
import { applyQuality, frameGate, perfFrame, perfState } from './game/perf.js';
import { newRun, startLevel } from './game/floor.js';
import { pause, menuBackdrop, initScreens } from './ui/screens.js';
import { initSettings } from './ui/settings.js';

const H_FOV = 100; // champ de vision horizontal (degrés)

game.fx = fx;
game.hurtPlayer = hurtPlayer;
game.alertNear = alertNear;
hooks.pause = pause;
window.game = game; // accès console pour le débogage

// Ce qui tourne à chaque image de jeu, dans l'ordre : les portes, la simulation, puis ce qui en découle.
// Un module chargé plus tard peut s'ajouter à cette liste (game.systems.push).
game.systems = [updateDoors, update, updateViewmodel, updateAmbience, updatePerks];
function tick(dt) {
  for (const system of game.systems) system(dt);
}

// ---------------------------------------------------------------- crochets de test
game.debug = {
  instant: false, // transitions immédiates et aucun écran intermédiaire (tests automatisés)
  start: (weaponId = 'm4', diffId = 'normal', levelIdx = 0, floorIdx = 0, seed = 1) => {
    game.weapon = weaponById(weaponId);
    game.diff = DIFFICULTIES[diffId];
    newRun(seed);
    game.run.levelIdx = levelIdx;
    startLevel(floorIdx);
  },
  step: (frames = 1, dt = 1 / 60) => { for (let i = 0; i < frames && game.state === 'play'; i++) tick(dt); },
  render: () => render(),
  perf: () => perfState(),
  doors: () => doorState(),
  /** Charge chaque étage, le fait tourner quelques secondes et signale tout problème. */
  selfTest: (frames = 120) => {
    const report = { floors: 0, enemies: 0, bosses: 0, maxCalls: 0, maxTriangles: 0, problems: [] };
    const was = game.debug.instant;
    game.debug.instant = true;
    LEVELS.forEach((lv, li) => lv.floors.forEach((fl, fi) => {
      const where = `${lv.name}, étage ${fi + 1}`;
      try {
        game.debug.start('m4', 'normal', li, fi);
        const bosses = game.enemies.filter(e => e.boss).length;
        const normals = game.enemies.length - bosses;
        if (bosses !== (fl.bosses?.length || 0)) report.problems.push(`${where} : ${bosses} boss au lieu de ${fl.bosses?.length || 0}`);
        if (normals !== fl.count) report.problems.push(`${where} : ${normals} ennemis au lieu de ${fl.count}`);
        report.enemies += normals;
        report.bosses += bosses;
        for (let i = 0; i < frames; i++) { game.player.health = 100; game.debug.step(1); }
        render();
        const cost = perfState();
        report.maxCalls = Math.max(report.maxCalls, cost.calls);
        report.maxTriangles = Math.max(report.maxTriangles, cost.triangles);
        if (game.state !== 'play') report.problems.push(`${where} : état « ${game.state} » après ${frames} images`);
        report.floors++;
      } catch (e) {
        report.problems.push(`${where} : ${e.message}`);
      }
    }));
    game.debug.instant = was;
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
initScreens();
initSettings();
applyQuality();
resize();
menuBackdrop(0);
game.state = 'menu';

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (!frameGate(now)) return; // limite d'images par seconde
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const playing = game.state === 'play';
  if (playing) tick(dt);
  else if (game.state === 'menu' || game.state === 'select') idleCamera(dt);
  else if (game.state === 'transition' && game.ws) updateCamera(0);
  render();
  perfFrame(dt, playing);
}
requestAnimationFrame(frame);

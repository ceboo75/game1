// Aides de contrôle optionnelles : visée au gyroscope et tir automatique.
import * as THREE from 'three';
import { game, settings } from './state.js';
import { camera } from './view.js';

// ---------------------------------------------------------------- gyroscope
const DEG = Math.PI / 180;
const GYRO_DEADZONE = 0.6; // degrés par seconde : en dessous, c'est le tremblement de la main
let gyroYaw = 0, gyroPitch = 0;

// Téléphone tenu à l'horizontale : tourner à gauche ou à droite fait pivoter autour de l'axe x de l'appareil,
// lever ou baisser autour de son axe y. Le sens s'inverse selon le côté vers lequel le téléphone est couché.
window.addEventListener('devicemotion', e => {
  if (!settings.gyro || game.state !== 'play') return;
  const r = e.rotationRate;
  if (!r || r.alpha == null || r.beta == null) return;
  const dt = Math.min(0.05, (e.interval || 16) / 1000);
  const flip = (screen.orientation?.angle ?? 90) === 270 ? -1 : 1;
  if (Math.abs(r.alpha) > GYRO_DEADZONE) gyroYaw += flip * r.alpha * DEG * dt;
  if (Math.abs(r.beta) > GYRO_DEADZONE) gyroPitch -= flip * r.beta * DEG * dt;
});

/** Rotation (radians) accumulée par le gyroscope depuis le dernier appel. */
export function consumeGyro() {
  const out = { yaw: gyroYaw * settings.gyroSens, pitch: gyroPitch * settings.gyroSens };
  gyroYaw = gyroPitch = 0;
  return out;
}

// ---------------------------------------------------------------- tir automatique
const AUTO_DELAY = 0.08; // le viseur doit rester sur la cible ce temps-là avant le premier tir
const fwd = new THREE.Vector3(), v = new THREE.Vector3();
let onTarget = 0;

/** Vrai si la ligne de visée passe par la tête, le torse ou les jambes d'un ennemi visible et à portée. */
function crosshairOnEnemy() {
  camera.getWorldDirection(fwd);
  const maxD = Math.min(70, game.weapon.range * 1.5);
  for (const e of game.enemies) {
    if (!e.alive || !e.hasLOS) continue;
    const s = e.def.scale;
    for (const [y, radius] of [[1.64 * s, 0.15 * s], [1.15 * s, 0.26 * s], [0.6 * s, 0.2 * s]]) {
      v.set(e.pos.x - camera.position.x, y - camera.position.y, e.pos.z - camera.position.z);
      const along = v.dot(fwd);
      if (along <= 0 || along > maxD) continue;
      if (v.lengthSq() - along * along < radius * radius) return true;
    }
  }
  return false;
}

/** Vrai quand le tir automatique doit presser la détente à cette image. */
export function autoFire(dt) {
  if (!settings.autoFire) { onTarget = 0; return false; }
  onTarget = crosshairOnEnemy() ? onTarget + dt : 0;
  return onTarget >= AUTO_DELAY;
}

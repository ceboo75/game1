// Boucle de jeu : déplacement, visée, tir, dégâts, score et caméra.
import * as THREE from 'three';
import { CELL } from '../level.js';
import { game, hud, sfx, music, input, settings, fmtNum, wrapAngle } from './state.js';
import { camera, worldFlash, gunHolder, GUN_POS, fx, applyFov } from './view.js';
import { nextFloor, levelComplete, endRun } from './floor.js';
import { consumeGyro, autoFire } from './controls.js';
import { COMBO_WINDOW, HEAD_DMG, comboMult, nextCombo, killPoints } from '../core/score.js';
import { vibrate } from '../core/platform.js';
import { t } from '../core/i18n.js';

const PLAYER_SPEED = 5.2;
const PLAYER_RADIUS = 0.35;
const EYE = 1.6;
const LOOK_SENS = 0.0055;           // radians par pixel de glissé, à sensibilité 100 %
const MAX_PITCH = 1.35;
const ASSIST_COS = Math.cos(THREE.MathUtils.degToRad(4)); // cône de l'aide à la visée
const ASSIST_SLOW = 0.5;            // à force 100 %, la visée ralentit de moitié sur un ennemi
const ADS_TIME = 0.18;              // durée pour épauler (s)
const ADS_SPEED = 0.6;              // vitesse de déplacement en visée
const ADS_POS = new THREE.Vector3(0, -0.115, -0.3);

const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
const dir = new THREE.Vector3(), tmp = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

/** Progression de la visée, adoucie (0 = arme à la hanche, 1 = épaulée). */
export function adsK() {
  const k = game.ws ? game.ws.adsT : 0;
  return k * k * (3 - 2 * k);
}
/** Facteur de zoom courant (1 = sans visée). */
export function zoomNow() {
  return 1 + (game.weapon.zoom - 1) * adsK();
}

/** Un ennemi qui donne l'alerte prévient ceux qui le voient à proximité. */
export function alertNear(src) {
  for (const o of game.enemies) {
    if (o === src || !o.alive || o.state !== 'idle') continue;
    if (o.pos.distanceTo(src.pos) < 14 && game.level.los(o.pos.x, o.pos.z, src.pos.x, src.pos.z)) o.alert(0.5 + Math.random() * 0.6);
  }
}

export function update(dt) {
  game.time += dt;
  game.stats.time += dt;
  const p = game.player, w = game.weapon, ws = game.ws, L = game.level;

  // visée : glissé du doigt (réglé par les sensibilités et l'aide à la visée), plus le gyroscope s'il est activé
  const assist = aimAssist();
  const look = input.consumeLook();
  const zoom = zoomNow();
  const userSens = settings.sens + (settings.sensAds - settings.sens) * adsK();
  const slow = assist ? Math.max(0.2, 1 - (1 - ASSIST_SLOW) * settings.assist) : 1;
  const sens = (LOOK_SENS * userSens * slow) / zoom; // visée plus fine quand on zoome
  const gyro = consumeGyro();
  p.yaw += -look.dx * sens + gyro.yaw / zoom;
  p.pitch = THREE.MathUtils.clamp(p.pitch - look.dy * sens + gyro.pitch / zoom, -MAX_PITCH, MAX_PITCH);
  game.lookSway.x += (THREE.MathUtils.clamp(-look.dx * 0.0006, -0.03, 0.03) - game.lookSway.x) * Math.min(1, dt * 10);
  game.lookSway.y += (THREE.MathUtils.clamp(look.dy * 0.0006, -0.03, 0.03) - game.lookSway.y) * Math.min(1, dt * 10);

  // déplacement
  const mv = input.getMove();
  const mvLen = Math.hypot(mv.x, mv.y);
  const sp = PLAYER_SPEED * w.speed * (1 - (1 - ADS_SPEED) * adsK());
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  L.move(p.pos, (-sy * mv.y + cy * mv.x) * sp * dt, (-cy * mv.y - sy * mv.x) * sp * dt, PLAYER_RADIUS);
  p.moving = mvLen > 0.1;
  if (p.moving) p.bobT += dt * sp * 1.9 * mvLen;

  game.flowTimer -= dt;
  if (game.flowTimer <= 0) { game.flowTimer = 0.25; game.flow = L.flowFrom(p.pos.x, p.pos.z); }

  updateWeapon(dt, input.firing || autoFire(dt));
  for (const e of game.enemies) e.update(dt, game);
  fx.update(dt);
  L.update(dt);
  if (game.state !== 'play') return; // mort pendant la mise à jour des ennemis

  if (game.time - p.lastHurt > game.diff.regenDelay) p.health = Math.min(100, p.health + game.diff.regenRate * dt);
  if (game.time - game.combo.last > COMBO_WINDOW) game.combo.count = 0;

  // escalier / sortie
  const goal = L.goalAt(p.pos.x, p.pos.z);
  if (goal) {
    if (L.locked) {
      if (game.time - game.lastDenied > 2.5) {
        game.lastDenied = game.time;
        sfx.denied();
        const boss = game.enemies.find(e => e.boss && e.alive);
        hud.toast(t('hud.denied', { name: boss ? boss.name : t('hud.theBoss') }), 'red');
      }
    } else if (goal === 'D') { nextFloor(); return; }
    else { levelComplete(); return; }
  }

  // interface
  const st = game.stats;
  hud.health(p.health);
  hud.ammoState(ws.ammo, w.mag, ws.reloading);
  hud.scoreValue(st.points);
  const left = COMBO_WINDOW - (game.time - game.combo.last);
  hud.comboState(game.combo.count >= 2 && left > 0 ? comboMult(game.combo.count) : 1, Math.max(0, left) / COMBO_WINDOW);
  const spreadPx = Math.tan(THREE.MathUtils.degToRad(ws.spread)) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (window.innerHeight / 2);
  hud.crosshair(4 + spreadPx, assist);
  hud.aim(adsK(), w.reticle, ws.ads);
  const normals = game.enemies.filter(e => !e.boss);
  hud.enemies(normals.filter(e => e.alive).length, normals.length);
  const boss = game.enemies.find(e => e.boss && e.alive);
  if (boss) hud.objective(t('hud.objective.boss', { name: boss.name }), 'boss');
  else hud.objective(t(L.goalType === 'D' ? 'hud.objective.stairs' : 'hud.objective.exit'));
  const shownBoss = boss && (boss.state === 'alert' || boss.hasLOS) ? boss : null;
  hud.boss(shownBoss ? `${shownBoss.name} · ${shownBoss.def.title}` : '', shownBoss ? Math.max(0, shownBoss.hp) / shownBoss.maxHp : null);
  game.hurtFlash = Math.max(0, game.hurtFlash - dt * 3);
  hud.vignetteLevel(Math.min(1, Math.max(0, 1 - p.health / 60) * 0.75 + game.hurtFlash * 0.45));

  // musique : passe en mode combat dès qu'on échange des tirs
  const fighting = game.time - game.lastShot < 3 || game.time - p.lastHurt < 3
    || game.enemies.some(e => e.alive && e.state === 'alert' && e.hasLOS);
  music.setIntensity(fighting ? 2 : 1);

  updateCamera(dt);
}

function aimAssist() {
  camera.getWorldDirection(fwd);
  const p = game.player;
  for (const e of game.enemies) {
    if (!e.alive || !e.hasLOS) continue;
    const s = e.def.scale;
    for (const y of [1.2 * s, 1.64 * s]) {
      tmp.set(e.pos.x - p.pos.x, y - EYE, e.pos.z - p.pos.z);
      const d = tmp.length();
      if (d > 40) break;
      if (tmp.dot(fwd) / d > ASSIST_COS) return true;
    }
  }
  return false;
}

/** @param trigger vrai si la détente est pressée (bouton de tir ou tir automatique) */
function updateWeapon(dt, trigger) {
  const w = game.weapon, ws = game.ws;
  ws.cd -= dt;

  // visée : le bouton bascule ; on baisse l'arme pendant un rechargement
  if (input.consumeAim()) ws.ads = !ws.ads;
  const adsTarget = ws.ads && !ws.reloading ? 1 : 0;
  if (adsTarget > ws.adsT) ws.adsT = Math.min(1, ws.adsT + dt / ADS_TIME);
  else if (adsTarget < ws.adsT) ws.adsT = Math.max(0, ws.adsT - dt / ADS_TIME);

  const spreadMul = 1 - (1 - w.adsSpread) * adsK();
  const baseSpread = (w.spread + (game.player.moving ? 0.6 : 0)) * spreadMul;
  ws.spread += (baseSpread - ws.spread) * Math.min(1, dt * 5);
  const rec = Math.min(1, dt * 9);
  ws.kickPitch -= ws.kickPitch * rec;
  ws.kickYaw -= ws.kickYaw * rec;
  ws.gunKick -= ws.gunKick * Math.min(1, dt * 14);

  if (input.consumeReload()) startReload();
  if (ws.reloading) {
    ws.reloadT -= dt;
    if (ws.reloadT <= 0) {
      if (w.shellReload) {
        ws.ammo++;
        sfx.click(2600, 0.25);
        if (ws.ammo < w.mag) ws.reloadT = w.reload; else ws.reloading = false;
      } else {
        ws.ammo = w.mag;
        ws.reloading = false;
        sfx.click(2200, 0.35);
      }
    }
  }

  if (trigger) {
    // le fusil à pompe peut tirer en interrompant son rechargement
    if (w.shellReload && ws.reloading && ws.ammo > 0) ws.reloading = false;
    if (!ws.reloading && ws.cd <= 0 && ws.ammo > 0) fire();
  }
  if (ws.ammo === 0 && !ws.reloading) startReload(); // rechargement automatique

  ws.flashT -= dt;
  game.gun.userData.flash.visible = ws.flashT > 0;
  if (ws.flashT > 0) game.gun.userData.flash.rotation.z = Math.random() * Math.PI;
  worldFlash.intensity = ws.flashT > 0 ? (game.weapon.silenced ? 6 : 30) : 0;
}

function startReload() {
  const w = game.weapon, ws = game.ws;
  if (ws.reloading || ws.ammo >= w.mag) return;
  ws.reloading = true;
  ws.reloadT = w.shellReload ? w.reload + 0.15 : w.reload;
  sfx.click(1800, 0.3);
}

function fire() {
  const w = game.weapon, ws = game.ws, p = game.player, st = game.stats;
  ws.ammo--;
  ws.cd = 60 / w.rpm;
  ws.flashT = 0.045;
  ws.gunKick = 1;
  st.shots++;
  game.lastShot = game.time;
  sfx.shot(w);

  // le bruit alerte les ennemis proches (distance de chemin, pas à vol d'oiseau)
  const hearCells = (w.silenced ? 6 : 34) / CELL;
  for (const e of game.enemies) {
    if (!e.alive || e.state !== 'idle') continue;
    const d = game.level.distAt(game.flow, e.pos.x, e.pos.z);
    if (d >= 0 && d <= hearCells) e.alert(0.3 + Math.random() * 0.4);
  }

  camera.updateMatrixWorld();
  camera.getWorldDirection(fwd);
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  up.setFromMatrixColumn(camera.matrixWorld, 1);
  const targets = [game.level.walls, game.level.windows, game.level.covers];
  for (const e of game.enemies) {
    if (!e.alive) continue;
    e.root.updateMatrixWorld(true); // position exacte de cette image, pas celle du dernier rendu
    targets.push(...e.hitboxes);
  }
  const k = adsK();
  const muzzle = camera.position.clone().addScaledVector(right, 0.16 * (1 - k)).addScaledVector(up, -0.12 + 0.06 * k).addScaledVector(fwd, 0.5);

  const dmgByEnemy = new Map();
  for (let i = 0; i < w.pellets; i++) {
    const a = THREE.MathUtils.degToRad(ws.spread) * Math.sqrt(Math.random());
    const ang = Math.random() * Math.PI * 2, r = Math.tan(a);
    dir.copy(fwd).addScaledVector(right, Math.cos(ang) * r).addScaledVector(up, Math.sin(ang) * r).normalize();
    raycaster.set(camera.position, dir);
    raycaster.far = 90;
    const hit = raycaster.intersectObjects(targets, false)[0];
    const end = hit ? hit.point.clone() : camera.position.clone().addScaledVector(dir, 60);
    if (i < 3) fx.tracer(muzzle, end, 0xfff0c0, 0.04);
    if (!hit) continue;
    const ud = hit.object.userData;
    if (ud.enemy) {
      const head = ud.part === 'head';
      const falloff = hit.distance <= w.range ? 1 : Math.max(w.minFalloff, w.range / hit.distance);
      const rec = dmgByEnemy.get(ud.enemy) || { dmg: 0, head: false };
      rec.dmg += w.damage * falloff * (head ? HEAD_DMG : 1);
      rec.head ||= head;
      dmgByEnemy.set(ud.enemy, rec);
      fx.sparks(hit.point, head ? 6 : 4, head ? 0xffcc33 : 0xa0102a, 2.2);
    } else {
      fx.sparks(hit.point, 4, 0xffd9a0, 2.5, hit.face ? hit.face.normal : null);
    }
  }

  if (dmgByEnemy.size) st.hits++;
  let killed = false;
  for (const [e, rec] of dmgByEnemy) {
    if (e.damage(rec.dmg, p.pos.x, p.pos.z)) { onKill(e, rec.head); killed = true; }
  }
  if (dmgByEnemy.size && !killed) { hud.hitmarker('hit'); sfx.hit(); }

  const steady = 1 - 0.35 * k; // épaulé, l'arme est mieux tenue
  ws.spread = Math.min(w.maxSpread * (1 - (1 - w.adsSpread) * k), ws.spread + w.spreadPerShot * steady);
  ws.kickPitch += w.recoil * 0.012 * steady;
  ws.kickYaw += (Math.random() - 0.5) * w.recoil * 0.008 * steady;
}

function onKill(enemy, head) {
  const st = game.stats, c = game.combo, ls = game.run.levelStats;
  st.kills++;
  if (head) st.headshots++;
  if (enemy.boss) st.bosses++;
  c.count = nextCombo(c.count, game.time - c.last);
  c.last = game.time;
  st.bestCombo = Math.max(st.bestCombo, c.count);
  ls.bestCombo = Math.max(ls.bestCombo, c.count);
  const pts = killPoints({ boss: enemy.boss, head, combo: c.count, scoreMul: game.diff.scoreMul });
  st.points += pts;
  hud.hitmarker(head ? 'head' : 'kill');
  const label = enemy.boss ? t(head ? 'popup.bossHead' : 'popup.boss') : head ? t('popup.head') : '';
  hud.popup(fmtNum(pts), label, head || enemy.boss ? 'head' : 'kill');
  if (head) sfx.headshot(c.count); else sfx.kill(c.count);
  vibrate(enemy.boss ? 150 : head ? 60 : 35);

  if (enemy.boss) {
    sfx.bossDown();
    const stillBoss = game.enemies.some(e => e.boss && e.alive);
    const down = t(enemy.def.fem ? 'hud.bossDown.f' : 'hud.bossDown.m', { name: enemy.name });
    if (!stillBoss) {
      game.level.setLocked(false);
      hud.toast(t('hud.wayClear', { down }), 'gold', 2600);
    } else hud.toast(down, 'gold', 2000);
  }
}

export function hurtPlayer(dmg, from) {
  if (game.state !== 'play') return;
  const p = game.player;
  p.health -= dmg;
  p.lastHurt = game.time;
  game.hurtFlash = 1;
  sfx.hurt();
  vibrate(20);
  const rel = wrapAngle(Math.atan2(from.x - p.pos.x, from.z - p.pos.z) - (p.yaw + Math.PI));
  hud.damageFrom(-rel);
  if (p.health <= 0) { p.health = 0; hud.health(0); endRun(false); }
}

export function updateCamera(dt) {
  const p = game.player, ws = game.ws;
  const bob = p.moving ? Math.sin(p.bobT) * 0.035 : 0;
  camera.position.set(p.pos.x, EYE + bob, p.pos.z);
  camera.rotation.set(p.pitch + ws.kickPitch, p.yaw + ws.kickYaw, 0);
  worldFlash.position.copy(camera.position);

  const k = adsK();
  applyFov(zoomNow());

  ws.reloadAnim += ((ws.reloading ? 1 : 0) - ws.reloadAnim) * Math.min(1, dt * 10);
  const m = p.moving ? 1 - k * 0.7 : 0;
  const sway = 1 - k * 0.8;
  tmp.lerpVectors(GUN_POS, ADS_POS, k); // l'arme remonte au centre quand on épaule
  gunHolder.position.set(
    tmp.x + Math.sin(p.bobT * 0.5) * 0.012 * m + game.lookSway.x * sway,
    tmp.y - Math.abs(Math.cos(p.bobT * 0.5)) * 0.012 * m - ws.reloadAnim * 0.12 + game.lookSway.y * sway,
    tmp.z + ws.gunKick * 0.05 * (1 - k * 0.5),
  );
  gunHolder.rotation.set(ws.gunKick * 0.1 * (1 - k * 0.6) - ws.reloadAnim * 0.7, 0, ws.reloadAnim * 0.35);
  gunHolder.visible = k < 0.85; // en visée complète, seul le réticule reste
}

/** Caméra des menus : tourne lentement sur place. */
export function idleCamera(dt) {
  const p = game.player;
  applyFov(1);
  p.yaw += dt * 0.12;
  camera.position.set(p.pos.x, EYE, p.pos.z);
  camera.rotation.set(0.05, p.yaw, 0);
}

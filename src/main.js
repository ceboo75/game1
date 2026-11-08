import * as THREE from 'three';
import { Level, CELL } from './level.js';
import { Enemy } from './enemies.js';
import { WEAPONS, weaponById, weaponBars, buildGunModel } from './weapons.js';
import { LEVELS, THEMES, DIFFICULTIES, DIFF_ORDER, ENEMY_TYPES, BOSSES, rng } from './levels.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { Music } from './music.js';
import { Hud } from './hud.js';
import { Fx } from './fx.js';

// ---------------------------------------------------------------- réglages
const PLAYER_SPEED = 5.2;
const PLAYER_RADIUS = 0.35;
const EYE = 1.6;
const LOOK_SENS = 0.0055;           // radians par pixel de glissé
const ASSIST_COS = Math.cos(THREE.MathUtils.degToRad(4)); // cône de l'aide à la visée
const ASSIST_FACTOR = 0.5;          // la visée ralentit de moitié sur un ennemi
const H_FOV = 100;                  // champ de vision horizontal (degrés)
const ADS_TIME = 0.18;              // durée pour épauler (s)
const ADS_SPEED = 0.6;              // vitesse de déplacement en visée
const ADS_POS = new THREE.Vector3(0, -0.115, -0.3);
const COMBO_WINDOW = 3;             // secondes entre deux kills pour enchaîner le combo
const HEAD_DMG = 3;                 // dégâts x3 à la tête
const HEAD_PTS = 1.5;               // points x1,5 pour un headshot
const KILL_PTS = 100;
const BOSS_PTS = 1000;
const MIN_SPAWN_DIST = 5;           // aucun ennemi à moins de 5 cases de l'arrivée sur l'étage
const comboMult = n => 1 + 0.5 * Math.min(Math.max(n - 1, 0), 4); // x1, x1,5, x2 ... x3
const TOTAL_BOSSES = LEVELS.reduce((n, l) => n + l.floors.reduce((m, f) => m + (f.bosses?.length || 0), 0), 0);

const params = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const vibrate = ms => { try { navigator.vibrate?.(ms); } catch { /* non supporté */ } };
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
const fmtNum = n => Math.round(n).toLocaleString('fr-FR');

// ---------------------------------------------------------------- rendu
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, parseFloat(params.get('dpr')) || 2));
renderer.setClearColor(0x07060b);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x110e18, 20, 60);
const hemi = new THREE.HemisphereLight(0xb4b0cc, 0x2a1c2e, 1.35);
scene.add(hemi);
const worldFlash = new THREE.PointLight(0xffb060, 0, 10, 1.5);
scene.add(worldFlash);

const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 120);
camera.rotation.order = 'YXZ';

// L'arme est rendue dans une seconde passe pour ne jamais traverser les murs.
const gunScene = new THREE.Scene();
const gunCam = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
gunScene.add(new THREE.AmbientLight(0xffffff, 1.1));
const gunKey = new THREE.DirectionalLight(0xffffff, 2.2); gunKey.position.set(0.6, 1, 0.5); gunScene.add(gunKey);
const gunRim = new THREE.DirectionalLight(0xff2d78, 0.6); gunRim.position.set(-1, 0.4, -0.6); gunScene.add(gunRim);
const gunFill = new THREE.DirectionalLight(0x22e4ff, 0.6); gunFill.position.set(1, -0.3, -0.4); gunScene.add(gunFill);
const gunHolder = new THREE.Group();
gunScene.add(gunHolder);
const GUN_POS = new THREE.Vector3(0.24, -0.22, -0.36);

// ---------------------------------------------------------------- modules
const hud = new Hud();
const sfx = new Sfx();
const music = new Music(sfx);
const fx = new Fx(scene);
/** Démarre le son : doit être appelé pendant un geste de l'utilisateur. */
function audioOn() { sfx.init(); music.start(); }
const input = new Input({ onPause: () => pause() });

const game = {
  state: 'menu',          // menu | select | play | transition | paused | end
  run: null,              // partie en cours : { levelIdx, floorIdx, levelStats, weapons[] }
  level: null,
  enemies: [],
  flow: null,
  flowTimer: 0,
  time: 0,
  diff: DIFFICULTIES[localStorage.getItem('lastDiff')] || DIFFICULTIES.normal,
  weapon: weaponById(localStorage.getItem('lastWeapon') || 'm4'),
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
  fx, sfx, hud, music,
  hurtPlayer,
  alertNear,
};
window.game = game; // accès console pour le débogage
game.debug = {
  instant: false, // transitions immédiates (tests automatisés)
  start: (weaponId = 'm4', diffId = 'normal', levelIdx = 0, floorIdx = 0) => {
    game.weapon = weaponById(weaponId);
    game.diff = DIFFICULTIES[diffId];
    newRun();
    game.run.levelIdx = levelIdx;
    startLevel(floorIdx);
  },
  step: (frames = 1, dt = 1 / 60) => { for (let i = 0; i < frames && game.state === 'play'; i++) update(dt); },
  render: () => render(),
};

// ---------------------------------------------------------------- partie, niveaux, étages
function newStats() {
  return { kills: 0, bosses: 0, headshots: 0, shots: 0, hits: 0, bestCombo: 0, points: 0, time: 0 };
}

function newRun() {
  game.run = { levelIdx: 0, floorIdx: 0, levelStats: null, weapons: [] };
  game.stats = newStats();
  game.combo = { count: 0, last: -99 };
  game.time = 0;
  Enemy.reactionMul = game.diff.reaction;
  localStorage.setItem('lastDiff', game.diff.id);
}

/** Lance le niveau courant (après le choix de l'arme). */
function startLevel(floorIdx = 0) {
  const run = game.run, lv = LEVELS[run.levelIdx];
  equip(game.weapon);
  run.weapons[run.levelIdx] = game.weapon.name;
  run.levelStats = { ...game.stats, bestCombo: 0 };
  game.player.health = 100;
  hud.clearTransient();
  hud.show(true);
  showScreen(null);
  music.setPaused(false);
  music.setIntensity(1);
  transition(lv.name.toUpperCase(), lv.floors[floorIdx].name, () => loadFloor(run.levelIdx, floorIdx));
}

function applyTheme(theme) {
  hemi.color.setHex(theme.hemi[0]);
  hemi.groundColor.setHex(theme.hemi[1]);
  hemi.intensity = theme.hemi[2];
  scene.fog.color.setHex(theme.fog);
  renderer.setClearColor(theme.fog);
}

function clearFloor() {
  for (const e of game.enemies) e.dispose();
  game.enemies = [];
  game.level?.dispose();
  game.level = null;
  fx.clear();
}

function shuffle(arr, R) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function loadFloor(levelIdx, floorIdx) {
  clearFloor();
  const lv = LEVELS[levelIdx], fl = lv.floors[floorIdx], theme = THEMES[lv.theme];
  if (game.run) { game.run.levelIdx = levelIdx; game.run.floorIdx = floorIdx; }
  applyTheme(theme);
  const L = game.level = new Level(scene, fl.rows, theme);
  const R = rng(1000 + levelIdx * 100 + floorIdx);
  const hpMul = game.diff.enemyHp;

  // emplacements : les cases « e » (+ les cases « B » si l'étage n'a pas de boss), loin de l'arrivée
  const bossKeys = fl.bosses || [];
  const far = s => Math.hypot(s.cx - L.start.cx, s.cz - L.start.cz) >= MIN_SPAWN_DIST;
  const spots = shuffle([...L.spawns, ...(bossKeys.length ? [] : L.bossSpots)].filter(far), R);
  const count = Math.min(fl.count, spots.length);

  // types tirés selon le mélange du bâtiment (toujours le même résultat pour un étage donné)
  const mix = lv.mix;
  const nHeavy = Math.min(count, Math.round(count * (mix.heavy || 0)) + (fl.extraHeavy || 0));
  const nRusher = Math.min(count - nHeavy, Math.round(count * (mix.rusher || 0)));
  const types = shuffle([
    ...Array(nHeavy).fill('heavy'), ...Array(nRusher).fill('rusher'), ...Array(count - nHeavy - nRusher).fill('grunt'),
  ], R);
  types.forEach((type, i) => {
    const s = spots[i];
    game.enemies.push(new Enemy(scene, s.x, s.z, Math.floor(R() * 4) * Math.PI / 2, ENEMY_TYPES[type], { hpMul }));
  });
  bossKeys.forEach((key, i) => {
    const s = L.bossSpots[i] || spots[count + i];
    const def = { ...BOSSES[key], id: key };
    game.enemies.push(new Enemy(scene, s.x, s.z, Math.floor(R() * 4) * Math.PI / 2, def, { hpMul, boss: true, key }));
  });

  // joueur : face à l'escalier / la sortie pour s'orienter
  const p = game.player;
  p.pos.set(L.start.x, 0, L.start.z);
  const goal = L.goalCenter || p.pos;
  p.yaw = Math.atan2(-(goal.x - p.pos.x), -(goal.z - p.pos.z));
  p.pitch = 0;
  p.lastHurt = -99;
  if (game.diff.floorHeal) p.health = 100;
  game.flow = L.flowFrom(p.pos.x, p.pos.z);
  game.flowTimer = 0;
  L.setLocked(game.enemies.some(e => e.boss));
  hud.floor(`${lv.name} · ${fl.name}`);
  if (game.ws) updateCamera(0);
}

/** Écran noir avec titre pendant le chargement de l'étage suivant. */
function transition(title, sub, load) {
  game.state = 'transition';
  input.enabled = false;
  input.reset();
  $('fadeTitle').textContent = title;
  $('fadeSub').textContent = sub;
  $('fade').classList.add('on');
  const finish = () => {
    $('fade').classList.remove('on');
    input.reset();
    input.enabled = true;
    game.state = 'play';
  };
  if (game.debug.instant) { load(); finish(); return; }
  setTimeout(() => {
    load();
    render();
    setTimeout(finish, 1100);
  }, 380);
}

function nextFloor() {
  const run = game.run, lv = LEVELS[run.levelIdx], next = run.floorIdx + 1;
  sfx.stairs();
  transition(lv.name.toUpperCase(), lv.floors[next].name, () => loadFloor(run.levelIdx, next));
}

function equip(w) {
  game.weapon = w;
  if (game.gun) gunHolder.remove(game.gun);
  game.gun = buildGunModel(w);
  gunHolder.add(game.gun);
  game.ws = {
    ammo: w.mag, reloading: false, reloadT: 0, cd: 0, spread: w.spread,
    kickPitch: 0, kickYaw: 0, gunKick: 0, flashT: 0, reloadAnim: 0,
    ads: false, adsT: 0,
  };
}

/** Facteur de zoom courant (1 = sans visée). */
function zoomNow() {
  const k = adsK();
  return 1 + (game.weapon.zoom - 1) * k;
}
function adsK() {
  const t = game.ws ? game.ws.adsT : 0;
  return t * t * (3 - 2 * t);
}
function applyFov(zoom) {
  const base = camera.userData.baseFov || 70;
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(base / 2)) / zoom));
  if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

/** Un ennemi qui donne l'alerte prévient ceux qui le voient à proximité. */
function alertNear(src) {
  for (const o of game.enemies) {
    if (o === src || !o.alive || o.state !== 'idle') continue;
    if (o.pos.distanceTo(src.pos) < 14 && game.level.los(o.pos.x, o.pos.z, src.pos.x, src.pos.z)) o.alert(0.5 + Math.random() * 0.6);
  }
}

// ---------------------------------------------------------------- boucle de jeu
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
const dir = new THREE.Vector3(), tmp = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

function update(dt) {
  game.time += dt;
  game.stats.time += dt;
  const p = game.player, w = game.weapon, ws = game.ws, L = game.level;

  // visée
  const assist = aimAssist();
  const look = input.consumeLook();
  const sens = (LOOK_SENS * (assist ? ASSIST_FACTOR : 1)) / zoomNow(); // visée plus fine quand on zoome
  p.yaw -= look.dx * sens;
  p.pitch = THREE.MathUtils.clamp(p.pitch - look.dy * sens, -1.35, 1.35);
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

  updateWeapon(dt);
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
        hud.toast(`Élimine d'abord ${boss ? boss.name : 'le boss'}`, 'red');
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
  if (boss) hud.objective(`Élimine ${boss.name}`, 'boss');
  else hud.objective(L.goalType === 'D' ? "Descends par l'escalier" : 'Atteins la sortie');
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

function updateWeapon(dt) {
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

  if (input.firing) {
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
    const t = Math.random() * Math.PI * 2, r = Math.tan(a);
    dir.copy(fwd).addScaledVector(right, Math.cos(t) * r).addScaledVector(up, Math.sin(t) * r).normalize();
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
  c.count = game.time - c.last <= COMBO_WINDOW ? c.count + 1 : 1;
  c.last = game.time;
  st.bestCombo = Math.max(st.bestCombo, c.count);
  ls.bestCombo = Math.max(ls.bestCombo, c.count);
  const base = enemy.boss ? BOSS_PTS : KILL_PTS;
  const pts = Math.round(base * (head ? HEAD_PTS : 1) * comboMult(c.count) * game.diff.scoreMul);
  st.points += pts;
  hud.hitmarker(head ? 'head' : 'kill');
  hud.popup(fmtNum(pts), enemy.boss ? (head ? 'BOSS · HEADSHOT' : 'BOSS') : head ? 'HEADSHOT' : '', head || enemy.boss ? 'head' : 'kill');
  if (head) sfx.headshot(c.count); else sfx.kill(c.count);
  vibrate(enemy.boss ? 150 : head ? 60 : 35);

  if (enemy.boss) {
    sfx.bossDown();
    const stillBoss = game.enemies.some(e => e.boss && e.alive);
    const down = `${enemy.name} ${enemy.def.fem ? 'est éliminée' : 'est éliminé'}`;
    if (!stillBoss) {
      game.level.setLocked(false);
      hud.toast(`${down} · la voie est libre`, 'gold', 2600);
    } else hud.toast(down, 'gold', 2000);
  }
}

function hurtPlayer(dmg, from) {
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

function updateCamera(dt) {
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

function idleCamera(dt) {
  const p = game.player;
  applyFov(1);
  p.yaw += dt * 0.12;
  camera.position.set(p.pos.x, EYE, p.pos.z);
  camera.rotation.set(0.05, p.yaw, 0);
}

// ---------------------------------------------------------------- fin de niveau / de partie
function fmtTime(s) {
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, '0')}`;
}
const acc = (hits, shots) => (shots ? Math.round((hits / shots) * 100) : 0) + ' %';

function leaveGame() {
  game.state = 'end';
  input.enabled = false;
  input.reset();
  music.setIntensity(0);
  music.setPaused(false);
}

/** Bâtiment terminé : bilan du niveau, puis niveau suivant (ou victoire finale). */
function levelComplete() {
  const run = game.run;
  if (run.levelIdx >= LEVELS.length - 1) { endRun(true); return; }
  leaveGame();
  sfx.extract();
  const lv = LEVELS[run.levelIdx], st = game.stats, s0 = run.levelStats;
  const rows = [
    ['Temps du niveau', fmtTime(st.time - s0.time)],
    ['Ennemis tués', st.kills - s0.kills],
    ['Boss tués', st.bosses - s0.bosses],
    ['Headshots', st.headshots - s0.headshots],
    ['Précision', acc(st.hits - s0.hits, st.shots - s0.shots)],
    ['Plus long combo', s0.bestCombo > 1 ? `${s0.bestCombo} kills` : '-'],
    ['Points du niveau', fmtNum(st.points - s0.points)],
  ];
  run.levelIdx++;
  game.endAction = 'next';
  setTimeout(() => showEnd(`${lv.name.toUpperCase()} · EXTRACTION RÉUSSIE`, true, rows, 'TOTAL', st.points, '', 'NIVEAU SUIVANT'), 400);
}

function endRun(success) {
  if (game.state !== 'play' && game.state !== 'paused') return;
  leaveGame();
  if (success) sfx.extract(); else sfx.death();
  const st = game.stats, run = game.run, d = game.diff;
  const key = `best_${d.id}`;
  const prev = Number(localStorage.getItem(key)) || 0;
  const isBest = st.points > prev;
  if (isBest) localStorage.setItem(key, String(st.points));
  const lv = LEVELS[run.levelIdx];
  const rows = [
    success ? ['Temps total', fmtTime(st.time)] : ['Niveau atteint', `${lv.name} · ${lv.floors[run.floorIdx].name}`],
    ...(success ? [] : [['Temps de survie', fmtTime(st.time)]]),
    ['Ennemis tués', st.kills],
    ['Boss tués', `${st.bosses} / ${TOTAL_BOSSES}`],
    ['Headshots', st.headshots],
    ['Précision', acc(st.hits, st.shots)],
    ['Plus long combo', st.bestCombo > 1 ? `${st.bestCombo} kills` : '-'],
    ['Difficulté', d.name],
  ];
  game.endAction = 'again';
  const best = isBest ? `Nouveau record en ${d.name} !` : `Record en ${d.name} : ${fmtNum(prev)}`;
  setTimeout(() => showEnd(success ? 'VENGEANCE ACCOMPLIE' : 'EXTRACTION ÉCHOUÉE', success, rows, 'POINTS', st.points, best, 'REJOUER'), success ? 400 : 900);
}

function showEnd(title, win, rows, ptsLabel, points, best, btn) {
  const t = $('endTitle');
  t.textContent = title;
  t.classList.toggle('win', win);
  $('endTable').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  document.querySelector('.endPtsLabel').textContent = ptsLabel;
  $('endPoints').textContent = fmtNum(points);
  $('endBest').textContent = best;
  $('btnAgain').textContent = btn;
  hud.show(false);
  showScreen('end');
  updateMenuBest();
}

// ---------------------------------------------------------------- écrans
const screens = { menu: $('screenMenu'), select: $('screenSelect'), pause: $('screenPause'), end: $('screenEnd') };
function showScreen(name) { for (const [k, el] of Object.entries(screens)) el.classList.toggle('hidden', k !== name); }

function pause() {
  if (game.state !== 'play') return;
  game.state = 'paused';
  input.enabled = false;
  input.reset();
  music.setPaused(true);
  showScreen('pause');
}
function resume() {
  if (game.state !== 'paused') return;
  showScreen(null);
  input.reset();
  input.enabled = true;
  music.setPaused(false);
  game.state = 'play';
}
// appli en arrière-plan (appel, notification...) : pause et silence
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); sfx.ctx?.suspend(); }
  else sfx.ctx?.resume();
});

function enterFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen || !matchMedia('(pointer: coarse)').matches) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
    .catch(() => {});
}

/** Fond animé des menus : le premier étage du niveau à venir. */
function menuBackdrop(levelIdx) {
  if (game.state === 'play' || game.state === 'transition') return;
  loadFloor(levelIdx, 0);
  for (const e of game.enemies) e.root.visible = false;
}

function goSelect() {
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
  $('lvlName').textContent = `Niveau ${levelIdx + 1} / ${LEVELS.length} · ${lv.name}`;
  $('lvlBrief').textContent = levelIdx === 0 && !game.run ? `${lv.brief} — ${game.diff.desc}` : lv.brief;

  // difficulté : choisie au début de la partie, figée ensuite
  const chips = $('diffChips');
  chips.innerHTML = '';
  for (const id of DIFF_ORDER) {
    const d = DIFFICULTIES[id];
    if (game.run && d !== game.diff) continue;
    const b = document.createElement('button');
    b.className = `chip ${id}` + (d === game.diff ? ' sel' : '') + (game.run ? ' locked' : '');
    b.textContent = d.name.toUpperCase();
    b.addEventListener('click', () => { game.diff = d; renderSelect(); });
    chips.appendChild(b);
  }

  const grid = $('weaponGrid');
  grid.innerHTML = '';
  for (const w of WEAPONS) {
    const b = document.createElement('button');
    b.className = 'wcard' + (w.id === game.weapon.id ? ' sel' : '');
    b.innerHTML = `<b>${w.name}</b><small>${w.type}</small>`;
    b.addEventListener('click', () => { game.weapon = w; renderSelect(); });
    grid.appendChild(b);
  }
  const w = game.weapon;
  $('wName').textContent = w.name;
  $('wType').textContent = `${w.type} · zoom x${String(w.zoom).replace('.', ',')}`;
  $('wDesc').textContent = w.desc;
  $('wBars').innerHTML = weaponBars(w).map(([label, v, txt]) =>
    `<div class="bar"><span>${label}</span><div class="track"><div class="fill" style="width:${(v * 100).toFixed(0)}%"></div></div><span class="val">${txt}</span></div>`
  ).join('');
  $('btnGo').textContent = levelIdx === 0 && !game.run ? 'ENTRER' : `ENTRER · ${lv.name.toUpperCase()}`;
}

function updateMenuBest() {
  const parts = DIFF_ORDER.map(id => {
    const b = Number(localStorage.getItem(`best_${id}`)) || 0;
    return b ? `${DIFFICULTIES[id].name} ${fmtNum(b)}` : null;
  }).filter(Boolean);
  $('bestScore').textContent = parts.length ? `Records · ${parts.join(' · ')}` : '';
}

screens.menu.addEventListener('pointerup', () => { audioOn(); enterFullscreen(); goSelect(); });
$('btnGo').addEventListener('click', () => {
  audioOn();
  enterFullscreen();
  localStorage.setItem('lastWeapon', game.weapon.id);
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
resize();

// ---------------------------------------------------------------- compteur d'images (?fps=1)
let fpsEl = null, fpsFrames = 0, fpsT = 0;
if (params.get('fps')) {
  fpsEl = document.createElement('div');
  fpsEl.style.cssText = 'position:fixed;left:50%;bottom:6px;transform:translateX(-50%);font:12px monospace;color:#0f8;z-index:40;pointer-events:none';
  document.body.appendChild(fpsEl);
}

// ---------------------------------------------------------------- démarrage
function render() {
  renderer.clear();
  renderer.render(scene, camera);
  if (game.state === 'play' || game.state === 'paused' || game.state === 'transition') {
    renderer.clearDepth();
    renderer.render(gunScene, gunCam);
  }
}

menuBackdrop(0);
game.state = 'menu';
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'play') update(dt);
  else if (game.state === 'menu' || game.state === 'select') idleCamera(dt);
  else if (game.state === 'transition' && game.ws) updateCamera(0);
  render();
  if (fpsEl) {
    fpsFrames++; fpsT += dt;
    if (fpsT >= 0.5) { fpsEl.textContent = `${Math.round(fpsFrames / fpsT)} ips`; fpsFrames = 0; fpsT = 0; }
  }
}
requestAnimationFrame(frame);

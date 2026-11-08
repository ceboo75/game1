// Ennemis : hommes de main, rushers, lourds et boss. Corps en blocs, zones de touche tête / corps.
import * as THREE from 'three';
import { ENEMY_WEAPONS } from './levels.js';

const SKIN = new THREE.MeshStandardMaterial({ color: 0xb98e6e, roughness: 0.8 });
const HAIR = new THREE.MeshStandardMaterial({ color: 0x141012, roughness: 0.9 });
const GUN = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.5, metalness: 0.15 });
const HELMET = new THREE.MeshStandardMaterial({ color: 0x1c1f1a, roughness: 0.5, metalness: 0.2 });
const HITBOX = new THREE.MeshBasicMaterial({ visible: false });
const matCache = new Map();
const flat = (color, basic = false) => {
  const k = `${color}|${basic}`;
  if (!matCache.has(k)) matCache.set(k, basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  return matCache.get(k);
};

const geoCache = new Map();
function box(w, h, d, mat, x, y, z, parent) {
  const key = `${w}|${h}|${d}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.BoxGeometry(w, h, d));
  const m = new THREE.Mesh(geoCache.get(key), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

const tmp = new THREE.Vector3();
const lerpAngle = (a, b, t) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};
const rand = (a, b) => a + Math.random() * (b - a);

export class Enemy {
  /**
   * @param def   type d'ennemi ou boss (levels.js)
   * @param opts  { hpMul, boss: bool, key }
   */
  constructor(scene, x, z, yaw, def, opts = {}) {
    this.def = def;
    this.boss = !!opts.boss;
    this.key = opts.key || def.id;
    this.name = def.name || '';
    this.pos = new THREE.Vector3(x, 0, z);
    this.yaw = yaw;
    this.maxHp = this.hp = Math.round(def.hp * (opts.hpMul || 1));
    this.alive = true;
    this.state = 'idle';
    this.reaction = 0;
    this.fireCd = 0;
    this.burst = 0;
    this.hasLOS = false;
    this.losTimer = Math.random() * 0.2;
    this.strafeTimer = 0;
    this.strafeDir = 0;
    this.prefDist = def.pref[0];
    this.walkT = Math.random() * 6;
    this.flashT = 0;
    this.deathT = 0;
    this.aimT = 0;           // visée laser (tireuse d'élite)
    this.called = false;     // a déjà prévenu ses voisins
    this.radius = 0.3 * def.scale;
    this.weaponKey = def.weapon === 'combo' ? 'rifle' : def.weapon;

    const r = this.root = new THREE.Group();
    r.rotation.order = 'YXZ';
    this.suit = new THREE.MeshStandardMaterial({ color: def.suit, roughness: 0.7, emissive: 0x0c0c12 });

    this.legL = new THREE.Group(); this.legL.position.set(-0.11, 0.86, 0); r.add(this.legL);
    this.legR = new THREE.Group(); this.legR.position.set(0.11, 0.86, 0); r.add(this.legR);
    box(0.17, 0.86, 0.2, this.suit, 0, -0.43, 0, this.legL);
    box(0.17, 0.86, 0.2, this.suit, 0, -0.43, 0, this.legR);
    box(0.5, 0.62, 0.28, this.suit, 0, 1.17, 0, r);                       // torse
    box(0.18, 0.5, 0.01, flat(def.shirt), 0, 1.24, 0.145, r);             // chemise
    if (def.tie) box(0.05, 0.36, 0.012, flat(def.tie), 0, 1.22, 0.152, r); // cravate
    if (def.vest) box(0.56, 0.46, 0.36, flat(0x2a2e26), 0, 1.2, 0, r);     // gilet pare-balles
    box(0.13, 0.13, 0.5, this.suit, 0.21, 1.32, 0.2, r);                  // bras
    box(0.13, 0.13, 0.5, this.suit, -0.12, 1.3, 0.25, r);
    const wp = ENEMY_WEAPONS[this.weaponKey];
    const gunLen = def.weapon === 'combo' ? 0.55 : wp.len;
    box(def.weapon === 'lmg' ? 0.11 : 0.07, def.weapon === 'lmg' ? 0.14 : 0.1, gunLen, GUN, 0.06, 1.35, 0.2 + gunLen / 2, r);
    this.muzzleLocal = new THREE.Vector3(0.06, 1.35, 0.25 + gunLen);
    box(0.24, 0.27, 0.25, SKIN, 0, 1.63, 0, r);                           // tête
    if (def.helmet) box(0.29, 0.13, 0.3, HELMET, 0, 1.79, -0.01, r);
    else box(0.25, 0.07, 0.26, HAIR, 0, 1.78, -0.01, r);
    box(0.25, 0.04, 0.02, flat(def.visor, true), 0, 1.66, 0.13, r);       // lunettes néon

    // Zones de touche invisibles (un peu plus larges que le modèle : plus confortable au tactile).
    const head = box(0.38, 0.36, 0.38, HITBOX, 0, 1.64, 0, r);
    const body = box(0.62, 1.46, 0.45, HITBOX, 0, 0.73, 0, r);
    head.userData = { enemy: this, part: 'head' };
    body.userData = { enemy: this, part: 'body' };
    this.hitboxes = [head, body];

    r.scale.setScalar(def.scale);
    r.position.copy(this.pos);
    r.rotation.y = yaw;
    scene.add(r);

    if (wp.laser) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]);
      this.laser = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xff1030, transparent: true, opacity: 0.85, fog: false }));
      this.laser.visible = false;
      scene.add(this.laser);
    }
  }

  alert(delay = 0.4) {
    if (!this.alive || this.state !== 'idle') return;
    this.state = 'alert';
    this.reaction = delay * Enemy.reactionMul;
    this.prefDist = rand(this.def.pref[0], this.def.pref[1]);
  }

  /** Applique des dégâts ; renvoie true si l'ennemi meurt. */
  damage(amount, fromX, fromZ) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.flashT = 0.08;
    this.alert(0.15);
    if (this.hp <= 0) {
      this.alive = false;
      this.yaw = Math.atan2(fromX - this.pos.x, fromZ - this.pos.z);
      this.legL.rotation.x = this.legR.rotation.x = 0;
      if (this.laser) this.laser.visible = false;
      return true;
    }
    return false;
  }

  update(dt, g) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT > 0) this.suit.emissive.setScalar(0.9);
      else this.suit.emissive.setHex(0x0c0c12);
    }
    if (!this.alive) return this._updateDeath(dt);

    const p = g.player.pos;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const dist = Math.hypot(dx, dz) || 0.001;

    this.losTimer -= dt;
    if (this.losTimer <= 0) {
      this.losTimer = 0.15 + Math.random() * 0.1;
      this.hasLOS = dist < 45 && g.level.los(this.pos.x, this.pos.z, p.x, p.z);
    }

    if (this.state === 'idle') {
      if (this.hasLOS && dist < 26) this.alert(rand(0.35, 0.75));
      this._pose(dt, 0);
      return;
    }
    if (!this.called) { this.called = true; g.alertNear(this); }

    this.reaction -= dt;
    this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));

    // Varga change d'arme selon la distance
    if (this.def.weapon === 'combo' && this.burst <= 0) this.weaponKey = dist < 8 ? 'shotgun' : 'lmg';
    const wp = ENEMY_WEAPONS[this.weaponKey];

    let mx = 0, mz = 0, speed = this.def.speed * 0.45;
    const approach = !this.hasLOS || dist > this.prefDist;
    if (this.aimT > 0) {
      // immobile pendant la visée laser
    } else if (approach) {
      const n = g.level.nextStep(this.pos.x, this.pos.z, g.flow);
      if (n) { mx = n.x - this.pos.x; mz = n.z - this.pos.z; speed = this.def.speed; }
    } else {
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = rand(0.8, 2.4);
        this.strafeDir = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? -1 : 1);
      }
      mx = (-dz / dist) * this.strafeDir;
      mz = (dx / dist) * this.strafeDir;
      if (dist < Math.min(4, this.prefDist * 0.6)) { mx -= dx / dist; mz -= dz / dist; }
    }
    for (const o of g.enemies) {
      if (o === this || !o.alive) continue;
      const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z;
      const d = Math.hypot(ox, oz);
      if (d < 0.9 && d > 0.001) { mx += (ox / d) * 1.5; mz += (oz / d) * 1.5; }
    }
    const ml = Math.hypot(mx, mz);
    let moving = 0;
    if (ml > 0.05) {
      const s = (speed * dt) / ml;
      g.level.move(this.pos, mx * s, mz * s, this.radius);
      moving = speed;
    }

    // tir
    this.fireCd -= dt;
    const canShoot = this.hasLOS && this.reaction <= 0 && dist < wp.range;
    if (this.aimT > 0) {
      if (!this.hasLOS) { this.aimT = 0; this.laser.visible = false; }
      else {
        this.aimT -= dt;
        this._updateLaser(g);
        if (this.aimT <= 0) { this.laser.visible = false; this._shoot(g, dist, wp); this.fireCd = rand(wp.gap[0], wp.gap[1]); }
      }
    } else if (canShoot && this.fireCd <= 0) {
      if (wp.laser) { this.aimT = wp.laser; this.laser.visible = true; this._updateLaser(g); }
      else {
        if (this.burst <= 0) this.burst = Math.round(rand(wp.burst[0], wp.burst[1]));
        this._shoot(g, dist, wp);
        this.burst--;
        this.fireCd = this.burst > 0 ? wp.every : rand(wp.gap[0], wp.gap[1]);
      }
    }
    this._pose(dt, moving);
  }

  _updateLaser(g) {
    const a = this.root.localToWorld(tmp.copy(this.muzzleLocal));
    const pos = this.laser.geometry.attributes.position;
    pos.setXYZ(0, a.x, a.y, a.z);
    pos.setXYZ(1, g.player.pos.x, 1.45, g.player.pos.z);
    pos.needsUpdate = true;
    this.laser.geometry.computeBoundingSphere();
    this.laser.material.opacity = 0.5 + 0.5 * Math.sin(performance.now() / 40);
  }

  _shoot(g, dist, wp) {
    this.root.updateMatrixWorld(true);
    const muzzle = this.root.localToWorld(tmp.copy(this.muzzleLocal)).clone();
    let chance = g.diff.enemyAcc * wp.acc * Math.min(1, Math.max(0.2, 1.15 - dist / 28));
    if (wp.laser) chance = Math.min(0.9, g.diff.enemyAcc * wp.acc);
    if (g.player.moving) chance *= 0.7;
    chance = Math.min(0.95, chance);
    let dmg = g.diff.enemyDmg * wp.dmg;
    if (wp.close) dmg *= dist < 6 ? 2.6 : dist < 10 ? 1.4 : 0.5;
    const pellets = wp.close ? 4 : 1;
    const hit = Math.random() < chance;
    for (let i = 0; i < pellets; i++) {
      const target = new THREE.Vector3(g.player.pos.x, 1.3, g.player.pos.z);
      const spread = hit && i === 0 ? 0 : wp.close ? 0.9 : 1.2;
      if (!(hit && i === 0)) {
        target.x += (Math.random() - 0.5) * 2 * spread;
        target.y += (Math.random() - 0.3) * spread;
        target.z += (Math.random() - 0.5) * 2 * spread;
      }
      const end = hit && i === 0 ? target : target.clone().sub(muzzle).multiplyScalar(1.6).add(muzzle);
      g.fx.tracer(muzzle.clone(), end, wp.laser ? 0xff4060 : 0xffb070, 0.07);
    }
    g.fx.muzzle(muzzle);
    g.sfx.enemyShot(dist, this.weaponKey);
    if (hit) g.hurtPlayer(dmg, this.pos);
  }

  _pose(dt, speed) {
    if (speed > 0) this.walkT += dt * speed * 2.6;
    const a = speed > 0 ? Math.sin(this.walkT) * 0.55 : 0;
    this.legL.rotation.x = a;
    this.legR.rotation.x = -a;
    this.root.position.set(this.pos.x, speed > 0 ? Math.abs(Math.cos(this.walkT)) * 0.04 : 0, this.pos.z);
    this.root.rotation.y = this.yaw;
  }

  _updateDeath(dt) {
    if (this.deathT >= 1) return;
    this.deathT = Math.min(1, this.deathT + dt / 0.42);
    const k = this.deathT * this.deathT;
    this.root.rotation.y = this.yaw;
    this.root.rotation.x = -k * Math.PI / 2;
    const back = 0.5 * k;
    this.root.position.set(this.pos.x - Math.sin(this.yaw) * back, 0.15 * k * this.def.scale, this.pos.z - Math.cos(this.yaw) * back);
  }

  dispose() {
    this.root.removeFromParent();
    this.suit.dispose();
    if (this.laser) { this.laser.removeFromParent(); this.laser.geometry.dispose(); this.laser.material.dispose(); }
  }
}
Enemy.reactionMul = 1;

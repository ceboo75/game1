// Ennemis : hommes de main, rushers, lourds et boss. Comportement et tir ; le corps animé est dans game/body.js.
import * as THREE from 'three';
import { ENEMY_WEAPONS } from './levels.js';
import { Body } from './game/body.js';

const HITBOX = new THREE.MeshBasicMaterial({ visible: false });
const HEAD_BOX = new THREE.BoxGeometry(0.38, 0.36, 0.38);
const BODY_BOX = new THREE.BoxGeometry(0.62, 1.46, 0.45);
const PLAYER_CHEST = 1.45; // hauteur visée sur le joueur (m)
const GUN_HEIGHT = 1.45;   // hauteur de l'arme épaulée, pour un ennemi de taille 1

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
    this.dist = 99;          // distance au joueur, mise à jour à chaque image
    this.flashT = 0;
    this.aimT = 0;           // visée laser (tireuse d'élite)
    this.called = false;     // a déjà prévenu ses voisins
    this.radius = 0.3 * def.scale;
    this.weaponKey = def.weapon === 'combo' ? 'rifle' : def.weapon;

    const wp = ENEMY_WEAPONS[this.weaponKey];
    const gunLen = def.weapon === 'combo' ? 0.55 : wp.len;
    this.body = new Body(def, gunLen, def.weapon === 'lmg');
    const r = this.root = this.body.root;

    // Zones de touche invisibles (un peu plus larges que le modèle : plus confortable au tactile).
    const head = new THREE.Mesh(HEAD_BOX, HITBOX); head.position.set(0, 1.64, 0); r.add(head);
    const body = new THREE.Mesh(BODY_BOX, HITBOX); body.position.set(0, 0.73, 0); r.add(body);
    head.userData = { enemy: this, part: 'head' };
    body.userData = { enemy: this, part: 'body' };
    this.hitboxes = [head, body];

    scene.add(r);
    this._pose(0, 0);

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
      if (this.laser) this.laser.visible = false;
      this.body.die(amount >= this.maxHp * 0.9); // tué d'un seul coup : projeté en arrière
      return true;
    }
    this.body.flinch(Math.min(1, (amount / this.maxHp) * 3));
    return false;
  }

  update(dt, g) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT > 0) this.body.material.emissive.setScalar(0.9);
      else this.body.material.emissive.setHex(0x0c0c12);
    }
    if (!this.alive) { this._pose(dt, 0); return; }

    const p = g.player.pos;
    const dx = p.x - this.pos.x, dz = p.z - this.pos.z;
    const dist = this.dist = Math.hypot(dx, dz) || 0.001;

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

  /** Bout du canon dans le monde (met à jour les matrices du corps). */
  _muzzle(out) {
    this.root.updateMatrixWorld(true);
    return this.body.muzzleWorld(out);
  }

  _updateLaser(g) {
    const a = this._muzzle(tmp);
    const pos = this.laser.geometry.attributes.position;
    pos.setXYZ(0, a.x, a.y, a.z);
    pos.setXYZ(1, g.player.pos.x, PLAYER_CHEST, g.player.pos.z);
    pos.needsUpdate = true;
    this.laser.geometry.computeBoundingSphere();
    this.laser.material.opacity = 0.5 + 0.5 * Math.sin(performance.now() / 40);
  }

  _shoot(g, dist, wp) {
    const muzzle = this._muzzle(new THREE.Vector3());
    this.body.kick();
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

  /** Transmet au corps animé ce que fait l'ennemi à cette image. */
  _pose(dt, speed) {
    const alert = this.state === 'alert';
    this.body.update(dt, {
      x: this.pos.x, z: this.pos.z, yaw: this.yaw, speed,
      alert,
      aim: alert && this.hasLOS,
      aimPitch: Math.atan2(PLAYER_CHEST - GUN_HEIGHT * this.def.scale, this.dist),
    });
  }

  dispose() {
    this.body.dispose();
    if (this.laser) { this.laser.removeFromParent(); this.laser.geometry.dispose(); this.laser.material.dispose(); }
  }
}
Enemy.reactionMul = 1;

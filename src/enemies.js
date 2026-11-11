// Ennemis : hommes de main, rushers, lourds, spécialistes et boss. Comportement et tir ; le corps animé est dans game/body.js.
import * as THREE from 'three';
import { ENEMY_WEAPONS } from './levels.js';
import { Body } from './game/body.js';
import { AttackTokens, MAX_SHOOTERS } from './core/tactics.js';
import { alertBark, telegraph, whizz } from './game/cues.js';
import { tr } from './core/i18n.js';

const HITBOX = new THREE.MeshBasicMaterial({ visible: false });
const HEAD_BOX = new THREE.BoxGeometry(0.38, 0.36, 0.38);
const BODY_BOX = new THREE.BoxGeometry(0.62, 1.46, 0.45);
const SHIELD_GEO = new THREE.BoxGeometry(0.62, 1.02, 0.05);
const SHIELD_MAT = new THREE.MeshStandardMaterial({ color: 0x11161f, roughness: 0.5, metalness: 0.2 });
const SHIELD_TRIM_GEO = new THREE.BoxGeometry(0.5, 0.03, 0.06);
const SHIELD_TRIM_MAT = new THREE.MeshBasicMaterial({ color: 0x22e4ff });
const PLAYER_CHEST = 1.45; // hauteur visée sur le joueur (m)
const GUN_HEIGHT = 1.45;   // hauteur de l'arme épaulée, pour un ennemi de taille 1
const WINDUP = 0.4;        // annonce avant une rafale qui peut toucher (s), raccourcie par la difficulté
const BIG_WINDUP = 1.0;    // annonce de la grande salve d'un boss
const ACCURATE_BONUS = 1.3; // ceux qui ont le droit de toucher visent mieux, pour compenser leur petit nombre
const SUPPRESS_GAP = 1.6;   // les tirs de couverture sont plus espacés
const BASE_GLOW = 0x0c0c12;

const tokens = new AttackTokens();
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
   * @param def   type d'ennemi ou boss (levels.js, game/roster.js)
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
    this.burst = 0;          // tirs restants dans la rafale en cours
    this.accurate = false;   // la rafale en cours peut toucher (jeton d'attaque)
    this.windup = 0;         // annonce en cours avant une rafale qui peut toucher
    this.tokenCd = 0;        // délai avant de redemander un jeton : les tireurs dangereux tournent
    this.hasLOS = false;
    this.losTimer = Math.random() * 0.2;
    this.strafeTimer = 0;
    this.strafeDir = 0;
    this.prefDist = def.pref[0];
    this.dist = 99;          // distance au joueur, mise à jour à chaque image
    this.flashT = 0;
    this.aimT = 0;           // visée laser (tir de précision)
    this.called = false;     // a déjà prévenu ses voisins
    this.radius = 0.3 * def.scale;
    this.weaponKey = def.weapon === 'combo' ? 'rifle' : def.weapon;
    // les hommes de main prudents se mettent à l'abri entre deux rafales dangereuses
    this.cautious = !this.boss && !def.shield && def.weapon === 'rifle' && Math.random() < 0.6;
    this.cover = null;       // point d'abri visé
    this.hurt = false;       // blessé : garde ses distances
    this.enraged = false;    // boss : deuxième phase, sous la moitié de sa vie
    this.bigT = 0;           // boss enragé : délai avant la prochaine grande salve
    this.big = false;        // grande salve annoncée ou en cours

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

    if (def.shield) {
      // Le bouclier fait partie des cibles du tir mais n'appartient à aucun ennemi : il arrête la balle comme un mur.
      // Il couvre du genou à l'épaule ; la tête et les pieds dépassent, et il ne protège pas les flancs.
      const shield = new THREE.Mesh(SHIELD_GEO, SHIELD_MAT);
      shield.position.set(0, 0.86, 0.36);
      for (const y of [0.34, -0.34]) { const trim = new THREE.Mesh(SHIELD_TRIM_GEO, SHIELD_TRIM_MAT); trim.position.y = y; shield.add(trim); }
      r.add(shield);
      this.hitboxes.push(shield);
    }

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
      this.windup = 0;
      tokens.release(this);
      this.yaw = Math.atan2(fromX - this.pos.x, fromZ - this.pos.z);
      if (this.laser) this.laser.visible = false;
      this.body.die(amount >= this.maxHp * 0.9); // tué d'un seul coup : projeté en arrière
      return true;
    }
    this.body.flinch(Math.min(1, (amount / this.maxHp) * 3));
    // blessé, un ennemi ordinaire recule et tire de plus loin
    if (!this.hurt && !this.boss && !this.def.shield && this.hp < this.maxHp * 0.4) {
      this.hurt = true;
      this.prefDist = Math.max(this.prefDist, this.def.pref[1] * 1.3);
    }
    return false;
  }

  /** Position de l'ennemi dans le champ stéréo du joueur : -1 à gauche, 1 à droite. */
  _pan(g) {
    const p = g.player;
    return ((this.pos.x - p.pos.x) * Math.cos(p.yaw) - (this.pos.z - p.pos.z) * Math.sin(p.yaw)) / Math.max(1, this.dist);
  }

  /** Lueur du corps : éclair blanc à l'impact, pulsation pendant l'annonce (rose : rafale, rouge vif : grande salve). */
  _glow(dt) {
    const em = this.body.material.emissive;
    if (this.flashT > 0) { this.flashT -= dt; em.setScalar(0.9); }
    else if (this.windup > 0) {
      const k = 0.55 + 0.45 * Math.sin(performance.now() / (this.big ? 18 : 28));
      if (this.big) em.setRGB(1.3 * k, 0.16 * k, 0.04 * k); else em.setRGB(0.95 * k, 0.1 * k, 0.32 * k);
    } else em.setHex(BASE_GLOW);
  }

  /** Cherche tout près un point d'où le joueur ne voit plus l'ennemi. Renvoie { x, z } ou null. */
  _findCover(g) {
    const L = g.level, p = g.player.pos;
    const start = Math.random() * Math.PI * 2;
    for (const radius of [2, 4]) {
      for (let i = 0; i < 8; i++) {
        const a = start + (i / 8) * Math.PI * 2;
        const x = this.pos.x + Math.cos(a) * radius, z = this.pos.z + Math.sin(a) * radius;
        if (L.collides(x, z, this.radius)) continue;
        if (!L.los(this.pos.x, this.pos.z, x, z)) continue; // il faut pouvoir y aller tout droit
        if (!L.los(x, z, p.x, p.z)) return { x, z };
      }
    }
    return null;
  }

  update(dt, g) {
    this._glow(dt);
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
    if (!this.called) {
      this.called = true;
      g.alertNear(this);
      alertBark(g.sfx, this._pan(g), dist);
    }

    // boss : deuxième phase sous la moitié de sa vie (plus rapide, annonces plus courtes, grandes salves)
    if (this.boss && !this.enraged && this.hp < this.maxHp * 0.5) {
      this.enraged = true;
      this.bigT = 1.5;
      g.sfx.denied();
      g.hud.toast(tr('boss.phase2', '{name} · deuxième manche', { name: this.name }), 'red', 2200);
    }

    this.reaction -= dt;
    // le porteur de bouclier pivote lentement : on peut le prendre de flanc
    this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-(this.def.shield ? 2.2 : 8) * dt));

    // Varga change d'arme selon la distance
    if (this.def.weapon === 'combo' && this.burst <= 0 && this.windup <= 0) this.weaponKey = dist < 8 ? 'shotgun' : 'lmg';
    const wp = ENEMY_WEAPONS[this.weaponKey];

    const fast = this.enraged ? 1.2 : 1;
    let mx = 0, mz = 0, speed = this.def.speed * 0.45 * fast;
    const approach = !this.hasLOS || dist > this.prefDist;
    // prudent : file à l'abri juste après sa rafale dangereuse, le temps de pouvoir en retenter une
    const hiding = this.cautious && this.tokenCd > 0.3 && this.windup <= 0 && !this.accurate;
    if (!hiding) this.cover = null;
    else if (!this.cover) this.cover = this._findCover(g);

    if (this.aimT > 0) {
      // immobile pendant la visée laser
    } else if (hiding && this.cover) {
      mx = this.cover.x - this.pos.x; mz = this.cover.z - this.pos.z;
      speed = this.def.speed;
      if (Math.hypot(mx, mz) < 0.3) mx = mz = 0;
    } else if (approach) {
      const n = g.level.nextStep(this.pos.x, this.pos.z, g.flow);
      if (n) { mx = n.x - this.pos.x; mz = n.z - this.pos.z; speed = this.def.speed * fast; }
    } else {
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) {
        this.strafeTimer = rand(0.8, 2.4);
        this.strafeDir = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? -1 : 1);
      }
      mx = (-dz / dist) * this.strafeDir;
      mz = (dx / dist) * this.strafeDir;
      const tooClose = this.hurt ? dist < this.prefDist * 0.8 : dist < Math.min(4, this.prefDist * 0.6);
      if (tooClose) { mx -= dx / dist; mz -= dz / dist; }
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

    this._fire(dt, g, dist, wp);
    this._pose(dt, moving);
  }

  /** Abandonne la rafale dangereuse en cours ou annoncée et rend le jeton. */
  _dropToken() {
    tokens.release(this);
    this.windup = 0;
    this.big = false;
    if (this.accurate) { this.accurate = false; this.burst = 0; }
  }

  /**
   * Décision de tir. Une rafale qui peut toucher demande un jeton d'attaque (sauf pour les boss) et s'annonce
   * par une lueur et un son ; sans jeton, l'ennemi tire à côté pour maintenir la pression.
   */
  _fire(dt, g, dist, wp) {
    this.fireCd -= dt;
    this.tokenCd -= dt;
    if (this.enraged) this.bigT -= dt;
    const canShoot = this.hasLOS && this.reaction <= 0 && dist < wp.range;

    if (this.aimT > 0) {
      // tir de précision : le laser est déjà son annonce
      if (!this.hasLOS) { this.aimT = 0; this.laser.visible = false; return; }
      this.aimT -= dt;
      this._updateLaser(g);
      if (this.aimT <= 0) { this.laser.visible = false; this._shoot(g, dist, wp, true); this.fireCd = rand(wp.gap[0], wp.gap[1]); }
      return;
    }
    if (!canShoot) {
      if (this.windup > 0 || this.accurate) this._dropToken(); // le joueur s'est mis à l'abri
      return;
    }
    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0) {
        this.accurate = true;
        this.burst = Math.round(rand(wp.burst[0], wp.burst[1]));
        if (this.big) this.burst = Math.max(3, this.burst * 2);
        this.fireCd = 0;
      }
      return;
    }

    // boss enragé : grande salve, longuement annoncée, qu'on évite en se mettant à couvert
    if (this.enraged && this.bigT <= 0 && this.burst <= 0 && !wp.laser) {
      this.bigT = rand(6, 8);
      this.big = true;
      this.windup = BIG_WINDUP;
      telegraph(g.sfx, this._pan(g));
      g.sfx.denied();
      return;
    }
    if (this.fireCd > 0) return;

    if (wp.laser) { this.aimT = wp.laser; this.laser.visible = true; this._updateLaser(g); return; }

    if (this.burst <= 0) {
      // nouvelle rafale : dangereuse si un jeton est libre, de couverture sinon
      const max = MAX_SHOOTERS[g.diff.id] ?? MAX_SHOOTERS.normal;
      if (this.tokenCd <= 0 && (this.boss || tokens.request(this, max, g.enemies))) {
        this.windup = WINDUP * Enemy.reactionMul * (this.enraged ? 0.7 : 1);
        telegraph(g.sfx, this._pan(g));
        return;
      }
      this.accurate = false;
      this.burst = Math.max(1, Math.round(rand(wp.burst[0], wp.burst[1]) / 2));
    }

    this._shoot(g, dist, wp, this.accurate);
    this.burst--;
    if (this.burst > 0) { this.fireCd = wp.every || (this.big ? 0.22 : 0); return; }
    const gap = rand(wp.gap[0], wp.gap[1]);
    if (this.accurate) {
      this.accurate = false;
      this.big = false;
      tokens.release(this);
      this.tokenCd = rand(1.2, 2.2);
      this.fireCd = gap;
    } else this.fireCd = gap * SUPPRESS_GAP;
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

  /** @param accurate faux pour un tir de couverture, qui ne touche jamais */
  _shoot(g, dist, wp, accurate) {
    const muzzle = this._muzzle(new THREE.Vector3());
    this.body.kick();
    let chance = 0;
    if (accurate) {
      chance = g.diff.enemyAcc * wp.acc * Math.min(1, Math.max(0.2, 1.15 - dist / 28)) * ACCURATE_BONUS;
      if (wp.laser) chance = Math.min(0.9, g.diff.enemyAcc * wp.acc);
      if (g.player.moving) chance *= 0.7;
      chance = Math.min(0.95, chance);
    }
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
    else if (dist < 30) whizz(g.sfx, this._pan(g)); // la balle manquée siffle du côté du tireur
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
    tokens.release(this);
    this.body.dispose();
    if (this.laser) { this.laser.removeFromParent(); this.laser.geometry.dispose(); this.laser.material.dispose(); }
  }
}
Enemy.reactionMul = 1;
/** Jetons d'attaque partagés par tous les ennemis (exposés pour les tests). */
Enemy.tokens = tokens;

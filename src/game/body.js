// Corps articulé des ennemis : squelette low-poly construit par le code et animé sans fichier d'animation.
// Marche, mise en joue, recul du tir, sursaut à l'impact et trois chutes. Les mains suivent l'arme (cinématique inverse).
import * as THREE from 'three';

const HIP_Y = 0.94, THIGH = 0.44, SHIN = 0.44, UPPER = 0.29, FORE = 0.27;
const SHOULDER_X = 0.23, SHOULDER_Y = 0.45;
const SKIN = 0xb98e6e, HAIR = 0x141012, HELMET = 0x1c1f1a, VEST = 0x2a2e26, SHOES = 0x0c0c10;
const DOWN = new THREE.Vector3(0, -1, 0);
const HALF_PI = Math.PI / 2;

// Poses de l'arme dans le repère du torse : basse (au repos) et épaulée.
const GUN_LOW = new THREE.Vector3(-0.09, 0.2, 0.2);
const GUN_AIM = new THREE.Vector3(-0.07, 0.45, 0.22);
const POLE_R = new THREE.Vector3(-0.6, -1, -0.2).normalize(); // direction vers laquelle pointent les coudes
const POLE_L = new THREE.Vector3(0.6, -1, 0).normalize();

const GUN_MAT = new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.5, metalness: 0.15, flatShading: true });
const visorMats = new Map();
const visorGeo = new THREE.BoxGeometry(0.2, 0.034, 0.04);

// ---------------------------------------------------------------- géométries
const cyl = (rTop, rBot, h, seg = 6) => new THREE.CylinderGeometry(rTop, rBot, h, seg);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

const _mat4 = new THREE.Matrix4(), _quat = new THREE.Quaternion(), _euler = new THREE.Euler(), _color = new THREE.Color();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

/** Fond plusieurs pièces colorées en une seule géométrie : un seul appel d'affichage par os. */
function merge(parts) {
  const pos = [], nor = [], col = [];
  for (const part of parts) {
    const g = part.geo.index ? part.geo.toNonIndexed() : part.geo;
    _quat.setFromEuler(_euler.set(...(part.rot || [0, 0, 0])));
    _mat4.compose(_p.set(...part.pos), _quat, _s.set(...(part.scale || [1, 1, 1])));
    g.applyMatrix4(_mat4);
    _color.set(part.color ?? 0xffffff);
    const P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      col.push(_color.r, _color.g, _color.b);
    }
    if (g !== part.geo) g.dispose();
    part.geo.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

const bodyCache = new Map();
/** Géométries des os pour une tenue donnée (partagées entre tous les ennemis qui la portent). */
function bodyGeos(def) {
  const key = [def.suit, def.shirt, def.tie, def.vest, def.helmet].join('|');
  if (bodyCache.has(key)) return bodyCache.get(key);
  const suit = def.suit;
  const spine = [
    { geo: cyl(0.2, 0.165, 0.5, 8), pos: [0, 0.27, 0], scale: [1, 1, 0.62], color: suit },  // torse
    { geo: box(0.5, 0.09, 0.2), pos: [0, 0.46, 0], color: suit },                           // épaules
    { geo: box(0.13, 0.26, 0.02), pos: [0, 0.36, 0.112], color: def.shirt },                // chemise
    { geo: cyl(0.05, 0.055, 0.09), pos: [0, 0.55, 0], color: SKIN },                        // cou
  ];
  if (def.tie) spine.push({ geo: box(0.045, 0.24, 0.02), pos: [0, 0.35, 0.122], color: def.tie });
  if (def.vest) spine.push({ geo: cyl(0.225, 0.2, 0.34, 8), pos: [0, 0.3, 0], scale: [1, 1, 0.68], color: VEST });
  const head = [{ geo: new THREE.IcosahedronGeometry(0.125, 1), pos: [0, 0.115, 0], scale: [0.9, 1.1, 0.98], color: SKIN }];
  if (def.helmet) head.push({ geo: new THREE.SphereGeometry(0.152, 8, 3, 0, Math.PI * 2, 0, 1.6), pos: [0, 0.125, -0.005], color: HELMET });
  else head.push({ geo: new THREE.SphereGeometry(0.13, 7, 3, 0, Math.PI * 2, 0, 1.45), pos: [0, 0.13, -0.012], scale: [0.94, 1, 1.02], color: HAIR });
  const geos = {
    hips: merge([{ geo: box(0.34, 0.17, 0.21), pos: [0, 0.01, 0], color: suit }]),
    spine: merge(spine),
    head: merge(head),
    upper: merge([
      { geo: new THREE.IcosahedronGeometry(0.068, 0), pos: [0, 0, 0], color: suit },
      { geo: cyl(0.06, 0.048, UPPER), pos: [0, -UPPER / 2, 0], color: suit },
    ]),
    fore: merge([
      { geo: cyl(0.046, 0.038, FORE - 0.05), pos: [0, -(FORE - 0.05) / 2, 0], color: suit },
      { geo: box(0.06, 0.09, 0.075), pos: [0, -FORE + 0.02, 0], color: SKIN },
    ]),
    thigh: merge([{ geo: cyl(0.085, 0.062, THIGH), pos: [0, -THIGH / 2, 0], color: suit }]),
    shin: merge([
      { geo: cyl(0.06, 0.046, SHIN - 0.06), pos: [0, -(SHIN - 0.06) / 2, 0], color: suit },
      { geo: box(0.095, 0.07, 0.25), pos: [0, -SHIN + 0.035, 0.055], color: SHOES },
    ]),
  };
  bodyCache.set(key, geos);
  return geos;
}

const gunCache = new Map();
/** Arme tenue par l'ennemi : poignée à l'origine, canon vers +z. */
function gunGeo(len, heavy) {
  const key = `${len}|${heavy}`;
  if (gunCache.has(key)) return gunCache.get(key);
  const w = heavy ? 0.085 : 0.055, h = heavy ? 0.12 : 0.09;
  const geo = merge([
    { geo: box(w, h, len * 0.55), pos: [0, 0.03, len * 0.22] },          // boîtier
    { geo: box(0.028, 0.028, len * 0.5), pos: [0, 0.045, len * 0.75] },  // canon
    { geo: box(w * 0.8, h * 0.9, 0.2), pos: [0, 0.02, -0.1] },           // crosse
    { geo: box(w * 0.7, 0.12, 0.05), pos: [0, -0.05, len * 0.22] },      // chargeur
    { geo: box(0.035, 0.09, 0.04), pos: [0, -0.05, 0] },                 // poignée
  ]);
  gunCache.set(key, geo);
  return geo;
}

// ---------------------------------------------------------------- cinématique inverse d'un bras
const _dir = new THREE.Vector3(), _axis = new THREE.Vector3(), _upperDir = new THREE.Vector3();
const _elbow = new THREE.Vector3(), _foreDir = new THREE.Vector3(), _inv = new THREE.Quaternion();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Oriente le bras (épaule + coude) pour que la main atteigne `target`, donné dans le repère du torse. */
function solveArm(upper, fore, target, pole) {
  _dir.copy(target).sub(upper.position);
  const d = clamp(_dir.length(), 0.06, UPPER + FORE - 0.002);
  _dir.normalize();
  const a = Math.acos(clamp((UPPER * UPPER + d * d - FORE * FORE) / (2 * UPPER * d), -1, 1));
  _axis.crossVectors(_dir, pole);
  if (_axis.lengthSq() < 1e-6) _axis.set(1, 0, 0);
  _upperDir.copy(_dir).applyAxisAngle(_axis.normalize(), a);
  upper.quaternion.setFromUnitVectors(DOWN, _upperDir);
  _elbow.copy(upper.position).addScaledVector(_upperDir, UPPER);
  _foreDir.copy(upper.position).addScaledVector(_dir, d).sub(_elbow).normalize();
  _foreDir.applyQuaternion(_inv.copy(upper.quaternion).invert());
  fore.quaternion.setFromUnitVectors(DOWN, _foreDir);
}

// ---------------------------------------------------------------- corps
const _grip = new THREE.Vector3();
const DEATHS = { back: 0.5, knees: 0.85, side: 0.6 };

export class Body {
  /**
   * @param def     type d'ennemi ou boss (couleurs, casque, gilet, taille)
   * @param gunLen  longueur de l'arme (m)
   * @param heavy   arme épaisse (mitrailleuse)
   */
  constructor(def, gunLen, heavy) {
    this.scale = def.scale;
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75, emissive: 0x0c0c12 });
    const geos = bodyGeos(def);
    const bone = (geo, parent, x = 0, y = 0, z = 0) => {
      const m = geo ? new THREE.Mesh(geo, this.material) : new THREE.Group();
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    };

    const r = this.root = new THREE.Group();
    r.rotation.order = 'YXZ';
    r.scale.setScalar(def.scale);
    this.hips = bone(geos.hips, r, 0, HIP_Y, 0);
    this.spine = bone(geos.spine, this.hips, 0, 0.06, 0);
    this.head = bone(geos.head, this.spine, 0, 0.57, 0);
    if (!visorMats.has(def.visor)) visorMats.set(def.visor, new THREE.MeshBasicMaterial({ color: def.visor }));
    const visor = new THREE.Mesh(visorGeo, visorMats.get(def.visor)); // lunettes néon : toujours lumineuses
    visor.position.set(0, 0.13, 0.1);
    this.head.add(visor);

    // le personnage regarde vers +z : son côté droit est donc du côté des x négatifs
    this.upperR = bone(geos.upper, this.spine, -SHOULDER_X, SHOULDER_Y, 0);
    this.foreR = bone(geos.fore, this.upperR, 0, -UPPER, 0);
    this.upperL = bone(geos.upper, this.spine, SHOULDER_X, SHOULDER_Y, 0);
    this.foreL = bone(geos.fore, this.upperL, 0, -UPPER, 0);
    this.legL = bone(geos.thigh, this.hips, 0.095, 0, 0);
    this.kneeL = bone(geos.shin, this.legL, 0, -THIGH, 0);
    this.legR = bone(geos.thigh, this.hips, -0.095, 0, 0);
    this.kneeR = bone(geos.shin, this.legR, 0, -THIGH, 0);

    this.gun = new THREE.Mesh(gunGeo(gunLen, heavy), GUN_MAT);
    this.spine.add(this.gun);
    this.muzzle = new THREE.Object3D();
    this.muzzle.position.set(0, 0.045, gunLen);
    this.gun.add(this.muzzle);
    this.foreGrip = Math.min(0.24, gunLen * 0.45);

    this.seed = Math.random() * 10;
    this.t = 0;
    this.phase = Math.random() * 6;
    this.moveK = 0;
    this.aimK = 0;
    this.alertK = 0;
    this.kickK = 0;
    this.flinchX = 0;
    this.flinchZ = 0;
    this.dead = false;
    this.done = false;
    this.deathT = 0;
    this.variant = 'back';
    this.side = 1;
    this.snap = 1;
  }

  /** Recul d'un tir. */
  kick() { this.kickK = 1; }

  /** Sursaut à l'impact d'une balle (force de 0 à 1). */
  flinch(strength) {
    this.flinchX = Math.min(0.55, this.flinchX + 0.2 + 0.35 * strength);
    this.flinchZ = (Math.random() - 0.5) * 0.5 * (0.4 + strength);
  }

  /** Lance la chute. `violent` : tué d'un seul coup, projeté en arrière. */
  die(violent) {
    this.dead = true;
    this.variant = violent ? 'back' : ['back', 'knees', 'side'][Math.floor(Math.random() * 3)];
    this.side = Math.random() < 0.5 ? -1 : 1;
    this.snap = violent ? 1.6 : 1;
    this.deathDur = DEATHS[this.variant] / (violent ? 1.3 : 1);
  }

  /** Position du bout du canon dans le monde. Les matrices du corps doivent être à jour. */
  muzzleWorld(out) { return this.muzzle.getWorldPosition(out); }

  /**
   * @param s { x, z, yaw, speed (m/s), aim (bool), aimPitch (rad), alert (bool) }
   */
  update(dt, s) {
    if (this.dead) { this._death(dt, s); return; }
    const ease = (cur, target, rate) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
    this.t += dt;
    const moving = s.speed > 0.05;
    if (moving) this.phase += dt * s.speed * 3.4;
    this.moveK = ease(this.moveK, moving ? 1 : 0, 10);
    this.aimK = ease(this.aimK, s.aim ? 1 : 0, 9);
    this.alertK = ease(this.alertK, s.alert ? 1 : 0, 6);
    this.kickK *= Math.exp(-14 * dt);
    this.flinchX *= Math.exp(-8 * dt);
    this.flinchZ *= Math.exp(-8 * dt);

    const amp = this.moveK * Math.min(1.15, 0.55 + s.speed / 6);
    const sn = Math.sin(this.phase), cs = Math.cos(this.phase);

    // jambes : la cuisse balance, le genou plie pendant que la jambe revient vers l'avant
    this.legL.rotation.x = -sn * 0.62 * amp;
    this.legR.rotation.x = sn * 0.62 * amp;
    this.kneeL.rotation.x = amp * (0.15 + 0.95 * Math.max(0, cs));
    this.kneeR.rotation.x = amp * (0.15 + 0.95 * Math.max(0, -cs));
    this.hips.position.y = HIP_Y - 0.03 * amp * Math.abs(sn);
    this.hips.rotation.set(0, sn * 0.1 * amp, 0);

    // torse : penché en avant en courant, respiration au repos, recul et impacts
    const lean = 0.1 * amp + 0.05 * this.aimK + Math.sin(this.t * 1.7 + this.seed) * 0.012 - this.kickK * 0.05 - this.flinchX;
    const twist = -sn * 0.16 * amp;
    this.spine.rotation.set(lean, twist, this.flinchZ);
    // tête : regarde autour d'elle tant que l'ennemi n'est pas alerté, puis suit la ligne de visée
    this.head.rotation.set(
      -s.aimPitch * this.aimK * 0.7 - 0.1 * amp - this.flinchX * 0.6,
      (1 - this.alertK) * Math.sin(this.t * 0.45 + this.seed) * 0.4 - twist,
      0.1 * this.aimK,
    );

    // arme : basse au repos, épaulée vers le joueur quand il est en vue
    const k = this.aimK;
    this.gun.position.lerpVectors(GUN_LOW, GUN_AIM, k);
    this.gun.position.y += Math.abs(sn) * 0.02 * amp * (1 - k);
    this.gun.position.z -= this.kickK * 0.05;
    this.gun.rotation.set(
      0.9 * (1 - k) + (-s.aimPitch - lean) * k - this.kickK * 0.1,
      0.3 * (1 - k) - twist * k,
      0,
    );
    this._hands();

    this.root.position.set(s.x, 0, s.z);
    this.root.rotation.set(0, s.yaw, 0);
  }

  _hands() {
    this.gun.updateMatrix();
    solveArm(this.upperR, this.foreR, _grip.set(0, -0.04, 0).applyMatrix4(this.gun.matrix), POLE_R);
    solveArm(this.upperL, this.foreL, _grip.set(0, 0, this.foreGrip).applyMatrix4(this.gun.matrix), POLE_L);
  }

  _death(dt, s) {
    if (this.done) return;
    const t = this.deathT = Math.min(1, this.deathT + dt / this.deathDur);
    const k = t * t; // la chute accélère
    const buckle = Math.sin(Math.PI * Math.min(1, t * 1.15)); // les jambes cèdent puis se détendent
    const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw); // l'ennemi fait face au tireur
    const r = this.root;
    let x = s.x, y = 0, z = s.z;
    r.rotation.set(0, s.yaw, 0);
    this.hips.position.y = HIP_Y;
    this.hips.rotation.set(0, 0, 0);

    if (this.variant === 'knees') {
      // tombe à genoux, puis bascule face contre terre
      const k1 = Math.min(1, t / 0.4);
      let k2 = Math.max(0, (t - 0.35) / 0.65); k2 *= k2;
      const kb = k1 * (1 - k2);
      this.hips.position.y = HIP_Y - 0.47 * kb;
      this.legL.rotation.x = this.legR.rotation.x = -0.25 * kb;
      this.kneeL.rotation.x = this.kneeR.rotation.x = 1.75 * kb;
      this.spine.rotation.set(0.35 * kb, 0, 0);
      this.head.rotation.set(0.4 * kb, 0, 0);
      r.rotation.x = k2 * HALF_PI;
      x += fx * 0.35 * k2; z += fz * 0.35 * k2;
      y = 0.12 * k2;
    } else {
      this.legL.rotation.x = -0.5 * buckle;
      this.legR.rotation.x = -0.3 * buckle;
      this.kneeL.rotation.x = 0.9 * buckle;
      this.kneeR.rotation.x = 0.6 * buckle;
      this.spine.rotation.set(-0.25 * buckle * this.snap, 0, 0);
      this.head.rotation.set(-0.6 * buckle * this.snap, 0, 0);
      if (this.variant === 'side') {
        // vrille et s'effondre sur le flanc
        r.rotation.y = s.yaw + this.side * 0.8 * k;
        r.rotation.z = this.side * k * HALF_PI;
        y = 0.17 * k;
      } else {
        // projeté sur le dos
        r.rotation.x = -k * HALF_PI;
        x -= fx * 0.5 * k; z -= fz * 0.5 * k;
        y = 0.13 * k;
      }
    }

    // les bras lâchent prise : l'arme s'écarte du corps
    this.gun.position.set(GUN_LOW.x - 0.1 * k, GUN_LOW.y + 0.15 * buckle, GUN_LOW.z);
    this.gun.rotation.set(0.9 + 0.4 * k, 0.3, 0.5 * k);
    this._hands();

    r.position.set(x, y * this.scale, z);
    if (t >= 1) this.done = true;
  }

  dispose() {
    this.root.removeFromParent();
    this.material.dispose(); // les géométries sont partagées et conservées
  }
}

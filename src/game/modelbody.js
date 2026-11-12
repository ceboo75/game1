// Corps d'un ennemi à partir d'un modèle 3D fourni (glTF), avec la même interface que Body (body.js) :
// update, kick, flinch, die, muzzleWorld, material.emissive, done, dispose.
// Les animations attendues sont décrites dans docs/modeles.md ; une animation absente est simplement ignorée.
import * as THREE from 'three';

const LOOPS = ['idle', 'walk', 'run', 'aim'];
const DEATHS = ['death1', 'death2', 'death3'];
const RUN_SPEED = 3; // m/s : au-delà, l'animation de course remplace la marche

export class ModelBody {
  /** @param model { scene, animations } renvoyé par modelOf (assets.js) */
  constructor(def, model) {
    this.root = new THREE.Group();
    this.root.rotation.order = 'YXZ';
    this.root.scale.setScalar(def.scale);
    this.root.add(model.scene);
    this.mixer = new THREE.AnimationMixer(model.scene);
    this.actions = {};
    for (const clip of model.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    // matériaux propres à cet ennemi : son éclair d'impact et sa lueur d'annonce ne touchent que lui
    this.mats = [];
    model.scene.traverse(o => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      if (o.material.emissive) this.mats.push(o.material);
    });
    this.material = { emissive: new THREE.Color(0x0c0c12) }; // modifié par enemies.js, recopié à chaque image
    this.muzzle = model.scene.getObjectByName('muzzle');
    if (!this.muzzle) { // repère absent : à hauteur d'arme épaulée, devant le personnage
      this.muzzle = new THREE.Object3D();
      this.muzzle.position.set(0, 1.45, 0.7);
      this.root.add(this.muzzle);
    }
    this.loop = null;
    this.dead = false;
    this.done = false;
  }

  /** Joue une animation une fois, par-dessus la boucle en cours. */
  _once(name) {
    const a = this.actions[name];
    if (!a) return null;
    a.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.05).play();
    a.clampWhenFinished = true;
    return a;
  }

  kick() { this._once('shoot'); }
  flinch() { this._once('hit'); }

  die() {
    this.dead = true;
    const name = DEATHS.filter(n => this.actions[n])[Math.floor(Math.random() * 3)] || DEATHS.find(n => this.actions[n]) || 'death';
    if (this.loop) this.actions[this.loop].fadeOut(0.15);
    const a = this._once(name);
    if (!a) { this.done = true; return; }
    this.mixer.addEventListener('finished', e => { if (e.action === a) this.done = true; });
  }

  muzzleWorld(out) { return this.muzzle.getWorldPosition(out); }

  /** @param s { x, z, yaw, speed, aim, aimPitch, alert } — voir Body.update */
  update(dt, s) {
    if (!this.dead) {
      const want = s.speed > RUN_SPEED ? 'run' : s.speed > 0.05 ? 'walk' : s.aim ? 'aim' : 'idle';
      const name = LOOPS.includes(want) && this.actions[want] ? want : this.actions.idle ? 'idle' : null;
      if (name !== this.loop) {
        if (this.loop) this.actions[this.loop].fadeOut(0.2);
        if (name) this.actions[name].reset().fadeIn(0.2).play();
        this.loop = name;
      }
    }
    this.mixer.update(dt);
    for (const m of this.mats) m.emissive.copy(this.material.emissive);
    this.root.position.set(s.x, 0, s.z);
    this.root.rotation.y = s.yaw;
  }

  dispose() {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    for (const m of this.mats) m.dispose();
  }
}

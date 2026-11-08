// Effets éphémères : traçantes, étincelles, flammes de bouche des ennemis.
import * as THREE from 'three';

const sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
const matCache = new Map();
const basic = color => {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshBasicMaterial({ color }));
  return matCache.get(color);
};

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.flashMat = new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.flashGeo = new THREE.SphereGeometry(0.09, 6, 4);
  }

  tracer(a, b, color = 0xffd9a0, life = 0.06) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.items.push({ obj: line, life, max: life, kind: 'line' });
  }

  sparks(p, n, color, speed = 3, normal = null) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(sparkGeo, basic(color));
      m.position.copy(p);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random()));
      if (normal) v.addScaledVector(normal, speed * 0.6);
      this.scene.add(m);
      const life = 0.2 + Math.random() * 0.2;
      this.items.push({ obj: m, v, life, max: life, kind: 'spark' });
    }
  }

  muzzle(p) {
    const m = new THREE.Mesh(this.flashGeo, this.flashMat);
    m.position.copy(p);
    m.scale.setScalar(0.8 + Math.random() * 0.6);
    this.scene.add(m);
    this.items.push({ obj: m, life: 0.05, max: 0.05, kind: 'flash' });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      const k = Math.max(0, it.life / it.max);
      if (it.kind === 'spark') {
        it.v.y -= 9.8 * dt;
        it.obj.position.addScaledVector(it.v, dt);
        if (it.obj.position.y < 0.02) { it.obj.position.y = 0.02; it.v.multiplyScalar(0.4); it.v.y = Math.abs(it.v.y); }
        it.obj.scale.setScalar(k);
      } else if (it.kind === 'line') {
        it.obj.material.opacity = 0.9 * k;
      }
      if (it.life <= 0) this._remove(i);
    }
  }

  _remove(i) {
    const it = this.items[i];
    it.obj.removeFromParent();
    if (it.kind === 'line') { it.obj.geometry.dispose(); it.obj.material.dispose(); }
    this.items.splice(i, 1);
  }

  clear() { for (let i = this.items.length - 1; i >= 0; i--) this._remove(i); }
}

// Fixed-size ember field. One draw call, no per-frame allocations or room resources.
import * as THREE from 'three';
import { game, settings } from './state.js';
import { scene } from './view.js';
const count = 72, positions = new Float32Array(count * 3);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({ color: 0xff9149, size: .035, transparent: true, opacity: .65, depthWrite: false, blending: THREE.AdditiveBlending });
const embers = new THREE.Points(geometry, material);
embers.frustumCulled = false;
scene.add(embers);
let time = 0;
export function updateEmbers(dt) {
  embers.visible = game.state === 'play' && settings.quality !== 'low';
  if (!embers.visible) return;
  time += dt;
  const p = game.player.pos;
  embers.position.set(p.x, 0, p.z);
  for (let i = 0; i < count; i++) {
    positions[i*3] = ((i * 7.137) % 20) - 10 + Math.sin(time*.3+i)*.3;
    positions[i*3+1] = ((i*.713 + time*(.12+(i%5)*.02)) % 3.1);
    positions[i*3+2] = ((i * 3.319) % 20) - 10;
  }
  geometry.attributes.position.needsUpdate = true;
}

// Rigid low-poly skin: one draw call for all eleven animated body parts.
// Each vertex follows exactly one bone, preserving the existing articulated poses.
import * as THREE from 'three';
const cache = new WeakMap();
export function skinBody(root, bones, geos, material) {
  root.updateMatrixWorld(true);
  let geometry = cache.get(geos);
  if (!geometry) {
    const positions = [], normals = [], colors = [], indices = [], weights = [];
    bones.forEach((bone, index) => {
      const part = bone.userData.geometry.clone().applyMatrix4(bone.matrixWorld);
      const p = part.attributes.position, n = part.attributes.normal, c = part.attributes.color;
      for (let v = 0; v < p.count; v++) {
        positions.push(p.getX(v), p.getY(v), p.getZ(v));
        normals.push(n.getX(v), n.getY(v), n.getZ(v));
        colors.push(c.getX(v), c.getY(v), c.getZ(v));
        indices.push(index, 0, 0, 0); weights.push(1, 0, 0, 0);
      }
      part.dispose();
    });
    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    cache.set(geos, geometry);
  }
  const mesh = new THREE.SkinnedMesh(geometry, material);
  const skeleton = new THREE.Skeleton(bones);
  root.add(mesh);
  mesh.bind(skeleton);
  // Enemy visibility is managed by room activation. Avoid stale animated bounds.
  mesh.frustumCulled = false;
  return mesh;
}

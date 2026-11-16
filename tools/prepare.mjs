// Copies the pinned engine into the offline game. No runtime CDN requests.
import { mkdir, copyFile } from 'node:fs/promises';
const files = [['LICENSE', 'LICENSE-three.txt'], ['build/three.module.js', 'three.module.js'], ...['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js'].map(p => [`examples/jsm/${p}`, `addons/${p}`])];
for (const [source, target] of files) {
  const dest = new URL(`../vendor/${target}`, import.meta.url);
  await mkdir(new URL('.', dest), { recursive: true });
  await copyFile(new URL(`../node_modules/three/${source}`, import.meta.url), dest);
}
console.log('Offline engine ready.');

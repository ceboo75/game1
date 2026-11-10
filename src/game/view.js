// Rendu : scène du monde, scène de l'arme, caméras.
import * as THREE from 'three';
import { Fx } from '../fx.js';
import { $, params, game } from './state.js';

export const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, parseFloat(params.get('dpr')) || 2));
renderer.setClearColor(0x07060b);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.autoClear = false;

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x110e18, 20, 60);
export const hemi = new THREE.HemisphereLight(0xb4b0cc, 0x2a1c2e, 1.35);
scene.add(hemi);
export const worldFlash = new THREE.PointLight(0xffb060, 0, 10, 1.5);
scene.add(worldFlash);

export const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 120);
camera.rotation.order = 'YXZ';

// L'arme est rendue dans une seconde passe pour ne jamais traverser les murs.
export const gunScene = new THREE.Scene();
export const gunCam = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
gunScene.add(new THREE.AmbientLight(0xffffff, 1.1));
const gunKey = new THREE.DirectionalLight(0xffffff, 2.2); gunKey.position.set(0.6, 1, 0.5); gunScene.add(gunKey);
const gunRim = new THREE.DirectionalLight(0xff2d78, 0.6); gunRim.position.set(-1, 0.4, -0.6); gunScene.add(gunRim);
const gunFill = new THREE.DirectionalLight(0x22e4ff, 0.6); gunFill.position.set(1, -0.3, -0.4); gunScene.add(gunFill);
export const gunHolder = new THREE.Group();
gunScene.add(gunHolder);
export const GUN_POS = new THREE.Vector3(0.24, -0.22, -0.36);

export const fx = new Fx(scene);

export function applyTheme(theme) {
  hemi.color.setHex(theme.hemi[0]);
  hemi.groundColor.setHex(theme.hemi[1]);
  hemi.intensity = theme.hemi[2];
  scene.fog.color.setHex(theme.fog);
  renderer.setClearColor(theme.fog);
}

/** Règle le champ de vision pour un facteur de zoom donné (1 = sans visée). */
export function applyFov(zoom) {
  const base = camera.userData.baseFov || 70;
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(base / 2)) / zoom));
  if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

export function render() {
  renderer.clear();
  renderer.render(scene, camera);
  if (game.state === 'play' || game.state === 'paused' || game.state === 'transition') {
    renderer.clearDepth();
    renderer.render(gunScene, gunCam);
  }
}

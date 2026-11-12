// Modèles des armes du joueur, vus à la première personne. Le canon pointe vers -z.
// Les pièces mobiles (culasse, chargeur, pompe, lame-chargeur) sont séparées pour être animées par viewmodel.js.
// Si un modèle a été fourni pour l'arme (assets/manifest.json), il remplace celui construit ici.
import * as THREE from 'three';
import { modelOf } from './assets.js';

const NEON = new THREE.MeshBasicMaterial({ color: 0xff2d78 });
const BRASS = new THREE.MeshStandardMaterial({ color: 0xc9a23a, roughness: 0.4, metalness: 0.3, flatShading: true });
const SHARED = new Set([NEON, BRASS]);

function flashTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,230,1)');
  grd.addColorStop(0.25, 'rgba(255,200,90,0.9)');
  grd.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = grd;
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, r = i % 2 ? 12 : 32;
    g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let FLASH_TEX = null;

/**
 * Construit le modèle d'une arme.
 * userData : flash (flamme de bouche), kind, eject (position de la fenêtre d'éjection),
 * parts { bolt, boltTravel, mag, pump, pumpTravel, clip } ; chaque pièce mobile garde sa position de repos dans userData.rest.
 */
export function buildGunModel(w) {
  const custom = modelOf(`weapons:${w.id}`);
  if (custom) return fromModel(custom.scene, w);
  const m = w.model;
  const g = new THREE.Group();
  // métal peu réfléchissant : sans carte d'environnement, un métal fort paraîtrait noir
  const mat = (color, roughness = 0.55, metalness = 0.15) => new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
  const body = mat(m.color), dark = mat(0x16161a, 0.6, 0.1), steel = mat(0x3a3c44, 0.4, 0.25), wood = mat(0x5b2f18, 0.75, 0);
  const bx = (parent, sx, sy, sz, x, y, z, material, rx = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    b.position.set(x, y, z); b.rotation.x = rx; parent.add(b); return b;
  };
  /** Cylindre couché dans l'axe du canon. */
  const cz = (parent, r, len, x, y, z, material, seg = 8) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), material);
    c.rotation.x = Math.PI / 2; c.position.set(x, y, z); parent.add(c); return c;
  };
  const group = (x, y, z, rx = 0) => {
    const p = new THREE.Group();
    p.position.set(x, y, z); p.rotation.x = rx; g.add(p); return p;
  };
  const parts = {};
  const eject = new THREE.Vector3();
  let muzzleZ;

  if (m.kind === 'pistol') {
    const slide = parts.bolt = group(0, 0, 0);                // culasse : recule à chaque tir
    parts.boltTravel = 0.035;
    bx(slide, 0.05, 0.05, 0.22, 0, 0, -0.11, body);
    bx(slide, 0.012, 0.012, 0.012, 0, 0.03, -0.21, dark);     // guidon
    bx(slide, 0.03, 0.012, 0.012, 0, 0.03, -0.012, dark);     // hausse
    bx(slide, 0.006, 0.006, 0.18, 0.026, 0.006, -0.11, NEON);
    cz(g, 0.012, 0.03, 0, 0.002, -0.225, steel);              // bouche du canon
    bx(g, 0.045, 0.04, 0.19, 0, -0.043, -0.1, dark);          // carcasse
    bx(g, 0.044, 0.13, 0.06, 0, -0.11, -0.02, dark, 0.25);    // poignée
    bx(g, 0.012, 0.008, 0.06, 0, -0.078, -0.075, dark);       // pontet
    const mag = parts.mag = group(0, -0.11, -0.02, 0.25);     // chargeur, dans la poignée
    bx(mag, 0.036, 0.12, 0.045, 0, -0.012, 0, steel);
    bx(mag, 0.042, 0.012, 0.052, 0, -0.076, 0, dark);
    muzzleZ = -0.24;
    eject.set(0.03, 0.02, -0.06);
  } else {
    const L = m.len, B = m.barrel || 0;
    bx(g, 0.065, 0.085, L, 0, 0, -L / 2, body);                       // boîtier
    bx(g, 0.04, 0.02, L * 0.85, 0, 0.052, -L / 2, dark);              // rail
    if (B > 0) cz(g, 0.014, B, 0, 0.012, -L - B / 2, steel);          // canon
    let end = L + B;
    if (m.suppressor) { cz(g, 0.03, m.suppressor, 0, 0.012, -L - m.suppressor / 2, dark, 10); end = L + m.suppressor; }
    if (m.kind === 'shotgun') {
      cz(g, 0.016, B * 0.92, 0, -0.03, -L - B * 0.46, dark);          // tube magasin
      const pump = parts.pump = group(0, -0.035, -L + 0.02);          // pompe : coulisse après chaque tir
      parts.pumpTravel = 0.07;
      bx(pump, 0.06, 0.06, 0.17, 0, 0, 0, dark);
      for (const z of [-0.05, 0, 0.05]) bx(pump, 0.066, 0.05, 0.012, 0, 0, z, steel);
    } else if (B > 0) {
      bx(g, 0.056, 0.058, B * 0.55, 0, 0.006, -L - B * 0.28, m.wood ? wood : dark); // garde-main
      bx(g, 0.008, 0.036, 0.008, 0, 0.04, -L - B * 0.86, dark);                     // guidon
    }
    if (m.wood) bx(g, 0.072, 0.07, L * 0.42, 0, -0.005, -L * 0.8, wood);
    bx(g, 0.045, 0.12, 0.055, 0, -0.1, -0.06, dark, 0.3);             // poignée
    bx(g, 0.012, 0.008, 0.07, 0, -0.064, -0.125, dark);               // pontet
    if (m.mag === 'straight') {
      const mag = parts.mag = group(0, -0.045, -0.19);
      bx(mag, 0.05, 0.17, 0.07, 0, -0.085, 0, steel);
    } else if (m.mag === 'curved') {
      const mag = parts.mag = group(0, -0.045, -0.2);
      bx(mag, 0.05, 0.11, 0.07, 0, -0.05, 0, steel, -0.2);
      bx(mag, 0.05, 0.1, 0.068, 0, -0.135, -0.032, steel, -0.55);
    } else if (m.mag === 'grip') {
      const mag = parts.mag = group(0, -0.1, -0.06, 0.3);             // chargeur dans la poignée
      bx(mag, 0.036, 0.15, 0.04, 0, -0.075, 0, steel);
    } else if (m.mag === 'none') {
      bx(g, 0.05, 0.06, 0.1, 0, -0.07, -0.2, dark);                   // magasin fixe
      const clip = parts.clip = group(0, 0.07, -L * 0.42);            // lame-chargeur, insérée par le dessus
      bx(clip, 0.02, 0.06, 0.07, 0, 0, 0, BRASS);
      clip.visible = false;
    }
    if (m.stock) {
      bx(g, 0.05, 0.075, 0.2, 0, -0.015, 0.1, m.wood ? wood : dark);
      bx(g, 0.052, 0.11, 0.03, 0, -0.03, 0.205, dark);                // plaque de couche
    }
    if (w.zoom > 2) {
      cz(g, 0.02, 0.17, 0, 0.09, -L * 0.5, dark, 10);                 // lunette
      cz(g, 0.026, 0.03, 0, 0.09, -L * 0.5 - 0.085, dark, 10);
      bx(g, 0.02, 0.03, 0.02, 0, 0.068, -L * 0.5 - 0.04, steel);
      bx(g, 0.02, 0.03, 0.02, 0, 0.068, -L * 0.5 + 0.04, steel);
    } else {
      bx(g, 0.036, 0.006, 0.03, 0, 0.065, -L * 0.45, dark);           // viseur point rouge
      bx(g, 0.004, 0.03, 0.03, 0.018, 0.08, -L * 0.45, dark);
      bx(g, 0.004, 0.03, 0.03, -0.018, 0.08, -L * 0.45, dark);
      bx(g, 0.036, 0.004, 0.03, 0, 0.096, -L * 0.45, dark);
    }
    parts.bolt = bx(g, 0.012, 0.02, 0.05, 0.036, 0.02, -L * 0.45, steel); // levier d'armement : recule à chaque tir
    parts.boltTravel = 0.04;
    bx(g, 0.006, 0.006, L * 0.7, 0.034, -0.012, -L / 2, NEON);
    muzzleZ = -end;
    eject.set(0.045, 0.03, -L * 0.45);
  }

  return finish(g, w, parts, eject, new THREE.Vector3(0, 0.012, muzzleZ));
}

/**
 * Arme à partir d'un modèle fourni (voir docs/modeles.md) : pièces mobiles et repères trouvés par leur nom.
 * Une pièce absente n'est simplement pas animée.
 */
function fromModel(scene, w) {
  const g = new THREE.Group();
  g.add(scene);
  const find = name => scene.getObjectByName(name) || null;
  const parts = { bolt: find('bolt'), boltTravel: 0.035, mag: find('mag'), pump: find('pump'), pumpTravel: 0.07, clip: find('clip') };
  const eject = find('eject') ? find('eject').position.clone() : new THREE.Vector3(0.04, 0.03, -0.15);
  const muzzle = find('muzzle') ? find('muzzle').position.clone() : new THREE.Vector3(0, 0.012, -0.6);
  g.userData.custom = true;
  return finish(g, w, parts, eject, muzzle);
}

/** Positions de repos des pièces mobiles, flamme de bouche (deux plans croisés, invisibles hors tir). */
function finish(g, w, parts, eject, muzzle) {
  for (const p of [parts.bolt, parts.mag, parts.pump, parts.clip]) if (p) p.userData.rest = p.position.clone();
  FLASH_TEX ??= flashTexture();
  const fm = new THREE.MeshBasicMaterial({ map: FLASH_TEX, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = new THREE.Group();
  const s = w.silenced ? 0.5 : 1;
  const a = new THREE.Mesh(new THREE.PlaneGeometry(0.22 * s, 0.22 * s), fm);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(0.34 * s, 0.14 * s), fm);
  b.rotation.y = Math.PI / 2; b.position.z = -0.08 * s;
  a.userData.flash = b.userData.flash = true;
  flash.add(a, b);
  flash.position.copy(muzzle).z -= 0.06;
  flash.visible = false;
  g.add(flash);
  g.userData = { ...g.userData, flash, parts, eject, kind: w.model.kind };
  return g;
}

/** Libère la mémoire graphique d'un modèle qu'on remplace. */
export function disposeGunModel(g) {
  g.traverse(o => {
    // un modèle fourni partage géométries et matériaux avec l'original chargé : seule la flamme lui est propre
    if (g.userData.custom && !o.userData.flash) return;
    if (!o.isMesh) return;
    o.geometry.dispose();
    if (!SHARED.has(o.material)) o.material.dispose(); // la texture de la flamme est partagée et conservée
  });
}

// Caractéristiques des 9 armes et construction de leur modèle 3D (vue à la 1re personne).
// Valeurs de départ, à équilibrer en jouant.
//  damage      dégâts par balle (par plomb pour le fusil à pompe) ; la tête prend x3
//  rpm         cadence en coups par minute
//  spread      dispersion de base (degrés) ; spreadPerShot / maxSpread : ouverture en rafale
//  recoil      recul visuel du viseur
//  reload      temps de rechargement (s) ; shellReload : cartouche par cartouche
//  speed       multiplicateur de vitesse de déplacement (poids de l'arme)
//  range       portée efficace (m) ; au-delà les dégâts baissent jusqu'à minFalloff
import * as THREE from 'three';

export const WEAPONS = [
  {
    id: 'fn57', name: 'FN-57', type: 'Pistolet', desc: 'Très maniable, rechargement rapide. La plus mobile de toutes.',
    mag: 20, rpm: 420, damage: 26, pellets: 1, spread: 0.8, spreadPerShot: 0.5, maxSpread: 4, recoil: 0.5,
    reload: 1.2, speed: 1.15, range: 25, minFalloff: 0.5,
    sound: { freq: 2600, decay: 0.11, thump: 150 }, model: { kind: 'pistol', color: 0x2b2b30 },
  },
  {
    id: 'benelli', name: 'Benelli', type: 'Fusil à pompe', desc: 'Un tir suffit au contact, inutile à distance. Recharge cartouche par cartouche.',
    mag: 7, rpm: 140, damage: 17, pellets: 9, spread: 5.5, spreadPerShot: 0, maxSpread: 5.5, recoil: 3.0,
    reload: 0.45, shellReload: true, speed: 0.95, range: 8, minFalloff: 0.1,
    sound: { freq: 1300, decay: 0.35, thump: 80 }, model: { kind: 'shotgun', len: 0.5, barrel: 0.34, color: 0x1d1d22 },
  },
  {
    id: 'uzi', name: 'Uzi', type: 'Pistolet-mitrailleur', desc: 'Arrose tout de près, imprécis au-delà.',
    mag: 32, rpm: 950, damage: 17, pellets: 1, spread: 2.4, spreadPerShot: 0.35, maxSpread: 7, recoil: 0.8,
    reload: 1.7, speed: 1.1, range: 14, minFalloff: 0.45,
    sound: { freq: 3000, decay: 0.08, thump: 150 }, model: { kind: 'smg', len: 0.26, barrel: 0.06, mag: 'grip', color: 0x26262b },
  },
  {
    id: 'ump45', name: 'UMP45', type: 'Pistolet-mitrailleur', desc: 'Le pistolet-mitrailleur le plus puissant.',
    mag: 25, rpm: 650, damage: 27, pellets: 1, spread: 1.8, spreadPerShot: 0.4, maxSpread: 6, recoil: 1.1,
    reload: 2.0, speed: 1.05, range: 18, minFalloff: 0.5,
    sound: { freq: 2200, decay: 0.1, thump: 120 }, model: { kind: 'smg', len: 0.38, barrel: 0.08, mag: 'straight', stock: true, color: 0x1f1f24 },
  },
  {
    id: 'm4', name: 'M4', type: "Fusil d'assaut", desc: 'Polyvalent et facile à contrôler.',
    mag: 30, rpm: 800, damage: 26, pellets: 1, spread: 1.0, spreadPerShot: 0.25, maxSpread: 4.5, recoil: 0.9,
    reload: 2.1, speed: 1.0, range: 40, minFalloff: 0.6,
    sound: { freq: 2800, decay: 0.12, thump: 120 }, model: { kind: 'rifle', len: 0.42, barrel: 0.26, mag: 'straight', stock: true, color: 0x24242b },
  },
  {
    id: 'ak47', name: 'AK47', type: "Fusil d'assaut", desc: 'Puissant, difficile à tenir. Un headshot suffit.',
    mag: 30, rpm: 600, damage: 35, pellets: 1, spread: 1.4, spreadPerShot: 0.5, maxSpread: 6.5, recoil: 1.8,
    reload: 2.4, speed: 0.95, range: 40, minFalloff: 0.6,
    sound: { freq: 2000, decay: 0.16, thump: 100 }, model: { kind: 'rifle', len: 0.44, barrel: 0.28, mag: 'curved', stock: true, wood: true, color: 0x2a2a2c },
  },
  {
    id: 'scarh', name: 'SCAR-H', type: 'Fusil de combat', desc: 'Chargeur court mais frappe très fort.',
    mag: 20, rpm: 550, damage: 46, pellets: 1, spread: 1.2, spreadPerShot: 0.6, maxSpread: 6, recoil: 2.2,
    reload: 2.5, speed: 0.9, range: 50, minFalloff: 0.7,
    sound: { freq: 1700, decay: 0.22, thump: 85 }, model: { kind: 'rifle', len: 0.46, barrel: 0.3, mag: 'straight', stock: true, color: 0x6e5c40 },
  },
  {
    id: 'sks', name: 'SKS', type: 'Fusil semi-auto', desc: 'Précis à distance. Un headshot suffit toujours.',
    mag: 10, rpm: 300, damage: 58, pellets: 1, spread: 0.3, spreadPerShot: 0.8, maxSpread: 3, recoil: 1.6,
    reload: 2.6, speed: 0.92, range: 60, minFalloff: 0.8,
    sound: { freq: 2000, decay: 0.25, thump: 90 }, model: { kind: 'rifle', len: 0.5, barrel: 0.36, mag: 'none', stock: true, wood: true, color: 0x2a2a2c },
  },
  {
    id: 'asval', name: 'AS-VAL', type: 'Fusil silencieux', desc: "Silencieux : les ennemis éloignés n'entendent pas tes tirs.",
    mag: 20, rpm: 900, damage: 25, pellets: 1, spread: 1.4, spreadPerShot: 0.35, maxSpread: 5, recoil: 0.7,
    reload: 2.0, speed: 1.0, range: 22, minFalloff: 0.5, silenced: true,
    sound: null, model: { kind: 'rifle', len: 0.38, barrel: 0, suppressor: 0.34, mag: 'straight', stock: true, color: 0x1b1b1f },
  },
];

// Visée : zoom x2,5 avec lunette pour les armes de précision, x1,5 avec point rouge pour les autres.
// adsSpread : dispersion restante en visée (le fusil à pompe reste large).
const SCOPED = ['sks', 'scarh', 'asval'];
for (const w of WEAPONS) {
  w.zoom = SCOPED.includes(w.id) ? 2.5 : 1.5;
  w.reticle = SCOPED.includes(w.id) ? 'scope' : w.id === 'benelli' ? 'ring' : 'dot';
  w.adsSpread = w.id === 'benelli' ? 0.75 : 0.35;
}

export const weaponById =id => WEAPONS.find(w => w.id === id) || WEAPONS[4];

/** Barres affichées sur l'écran de choix (0..1) + valeur lisible. */
export function weaponBars(w) {
  const clamp = v => Math.max(0.05, Math.min(1, v));
  const burst = w.damage * w.pellets;
  return [
    ['Dégâts', clamp(burst / 60), w.pellets > 1 ? `${w.pellets}×${w.damage}` : String(w.damage)],
    ['Cadence', clamp(w.rpm / 1000), String(w.rpm)],
    ['Chargeur', clamp(w.mag / 32), String(w.mag)],
    ['Contrôle', clamp(1 - w.recoil / 3.3), ''],
    ['Portée', clamp(w.range / 60), w.range + ' m'],
    ['Mobilité', clamp((w.speed - 0.82) / 0.35), ''],
  ];
}

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

/** Modèle d'arme en blocs low-poly. Le canon pointe vers -z. */
export function buildGunModel(w) {
  const m = w.model;
  const g = new THREE.Group();
  // métal peu réfléchissant : sans carte d'environnement, un métal fort paraîtrait noir
  const body = new THREE.MeshStandardMaterial({ color: m.color, roughness: 0.5, metalness: 0.15 });
  const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.6, metalness: 0.1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b2f18, roughness: 0.7 });
  const neon = new THREE.MeshBasicMaterial({ color: 0xff2d78 });
  const add = (sx, sy, sz, x, y, z, mat, rx = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    b.position.set(x, y, z); b.rotation.x = rx; g.add(b); return b;
  };

  let muzzleZ;
  if (m.kind === 'pistol') {
    add(0.05, 0.05, 0.22, 0, 0, -0.11, body);            // culasse
    add(0.045, 0.04, 0.19, 0, -0.043, -0.1, black);      // carcasse
    add(0.044, 0.13, 0.06, 0, -0.11, -0.02, black, 0.25); // poignée
    add(0.006, 0.006, 0.18, 0.026, 0.006, -0.11, neon);
    muzzleZ = -0.23;
  } else {
    const L = m.len, B = m.barrel || 0;
    add(0.065, 0.085, L, 0, 0, -L / 2, body);                  // boîtier
    add(0.04, 0.025, L * 0.85, 0, 0.055, -L / 2, black);       // rail
    if (B > 0) add(0.03, 0.03, B, 0, 0.012, -L - B / 2, black); // canon
    let end = L + B;
    if (m.suppressor) { add(0.056, 0.056, m.suppressor, 0, 0.012, -L - m.suppressor / 2, black); end = L + m.suppressor; }
    if (m.kind === 'shotgun') {
      add(0.034, 0.034, B * 0.92, 0, -0.03, -L - B * 0.46, black);  // tube magasin
      add(0.06, 0.06, 0.17, 0, -0.035, -L + 0.02, black);           // pompe
    }
    if (m.wood) add(0.072, 0.07, L * 0.42, 0, -0.005, -L * 0.8, wood); // garde-main
    add(0.045, 0.12, 0.055, 0, -0.1, -0.06, black, 0.3);             // poignée
    if (m.mag === 'straight') add(0.05, 0.17, 0.07, 0, -0.13, -0.19, black);
    if (m.mag === 'curved') add(0.05, 0.18, 0.07, 0, -0.13, -0.21, black, -0.38);
    if (m.mag === 'grip') add(0.04, 0.08, 0.045, 0, -0.19, -0.07, black, 0.3);
    if (m.stock) add(0.05, 0.09, 0.22, 0, -0.02, 0.1, m.wood ? wood : black);
    add(0.006, 0.006, L * 0.7, 0.034, 0.01, -L / 2, neon);
    muzzleZ = -end;
  }

  // Flamme de bouche (deux plans croisés, invisibles hors tir).
  FLASH_TEX ??= flashTexture();
  const fm = new THREE.MeshBasicMaterial({ map: FLASH_TEX, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = new THREE.Group();
  const s = w.silenced ? 0.5 : 1;
  const a = new THREE.Mesh(new THREE.PlaneGeometry(0.22 * s, 0.22 * s), fm);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(0.34 * s, 0.14 * s), fm);
  b.rotation.y = Math.PI / 2; b.position.z = -0.08 * s;
  flash.add(a, b);
  flash.position.set(0, 0.012, muzzleZ - 0.06);
  flash.visible = false;
  g.add(flash);
  g.userData.flash = flash;
  return g;
}

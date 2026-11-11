// Mobilier : remplace à l'affichage les blocs servant d'abri par un meuble propre à chaque bâtiment.
// Les collisions et l'arrêt des balles restent ceux du bloc d'origine (level.js), simplement rendu invisible.
import * as THREE from 'three';
import { THEMES } from '../levels.js';
import { game } from './state.js';

const SIZE = 1.7; // emprise au sol d'un meuble, un peu moins qu'une case de 2 m
const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 });

const _m = new THREE.Matrix4(), _c = new THREE.Color();
/** Fond des boîtes colorées [largeur, hauteur, profondeur, x, y, z, couleur] en une seule géométrie. */
function boxes(list) {
  const pos = [], nor = [], col = [];
  for (const [w, h, d, x, y, z, color] of list) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.applyMatrix4(_m.makeTranslation(x, y, z));
    _c.set(color);
    const P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i++) {
      pos.push(P.getX(i), P.getY(i), P.getZ(i));
      nor.push(N.getX(i), N.getY(i), N.getZ(i));
      col.push(_c.r, _c.g, _c.b);
    }
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

// Un meuble par bâtiment, de hauteur h (celle de l'abri). Le grand axe est x.
const FURNITURE = {
  // Villa : deux canapés dos à dos
  villa: h => boxes([
    [SIZE, 0.16, SIZE, 0, 0.08, 0, 0x2a1a12],                     // socle en bois
    [SIZE - 0.36, 0.3, SIZE - 0.1, 0, 0.31, 0, 0x1f5c63],         // assises
    [SIZE, h - 0.16, 0.34, 0, 0.16 + (h - 0.16) / 2, 0, 0x17474d], // dossier commun
    [0.18, 0.62, SIZE, -SIZE / 2 + 0.09, 0.47, 0, 0x17474d],      // accoudoirs
    [0.18, 0.62, SIZE, SIZE / 2 - 0.09, 0.47, 0, 0x17474d],
    [SIZE - 0.5, 0.1, 0.5, 0, 0.5, 0.44, 0x2b7a82],               // coussins
    [SIZE - 0.5, 0.1, 0.5, 0, 0.5, -0.44, 0x2b7a82],
  ]),
  // Hôtel : comptoir en bois sombre, plateau de marbre, filet de laiton
  hotel: h => boxes([
    [SIZE, 0.1, SIZE, 0, 0.05, 0, 0x0e0a0a],                      // plinthe
    [SIZE - 0.06, h - 0.18, SIZE - 0.06, 0, 0.1 + (h - 0.18) / 2, 0, 0x3a1418],
    [SIZE - 0.02, 0.04, SIZE - 0.02, 0, h * 0.55, 0, 0xc9a23a],   // filet de laiton
    [SIZE + 0.06, 0.08, SIZE + 0.06, 0, h - 0.04, 0, 0xd8d2c4],   // plateau
  ]),
  // Tour : baie de serveurs, façades à voyants
  tower: h => boxes([
    [SIZE, h, SIZE, 0, h / 2, 0, 0x14171d],
    [SIZE - 0.2, h - 0.2, 0.04, 0, h / 2, SIZE / 2, 0x242a33],    // façades
    [SIZE - 0.2, h - 0.2, 0.04, 0, h / 2, -SIZE / 2, 0x242a33],
    [SIZE - 0.4, 0.03, 0.05, 0, h * 0.75, SIZE / 2 + 0.01, 0x22e4ff], // voyants
    [SIZE - 0.4, 0.03, 0.05, 0, h * 0.5, SIZE / 2 + 0.01, 0xff2d78],
    [SIZE - 0.4, 0.03, 0.05, 0, h * 0.75, -SIZE / 2 - 0.01, 0x22e4ff],
    [SIZE - 0.4, 0.03, 0.05, 0, h * 0.5, -SIZE / 2 - 0.01, 0xff2d78],
    [SIZE + 0.04, 0.05, SIZE + 0.04, 0, h - 0.025, 0, 0x0b0d11],
  ]),
};

let current = null, mesh = null;

/** Met le mobilier en accord avec l'étage affiché. Appelé avant chaque rendu ; ne fait rien si l'étage n'a pas changé. */
export function syncDecor() {
  const L = game.level;
  if (L === current) return;
  current = L;
  if (mesh) { mesh.geometry.dispose(); mesh = null; } // l'ancien étage l'a déjà retiré de la scène avec son groupe
  if (!L) return;

  const cells = [];
  L.grid.forEach((row, z) => row.forEach((ch, x) => { if (ch === 'c') cells.push([x, z]); }));
  const key = Object.keys(THEMES).find(k => THEMES[k] === L.theme);
  if (!cells.length || !FURNITURE[key]) return;

  mesh = new THREE.InstancedMesh(FURNITURE[key](L.theme.cover.h), material, cells.length);
  cells.forEach(([x, z], i) => {
    // le grand axe suit la rangée quand plusieurs meubles se touchent
    const alongZ = (L.cell(x, z - 1) === 'c' || L.cell(x, z + 1) === 'c') && L.cell(x - 1, z) !== 'c' && L.cell(x + 1, z) !== 'c';
    _m.makeRotationY(alongZ ? Math.PI / 2 : 0).setPosition(L.center(x), 0, L.center(z));
    mesh.setMatrixAt(i, _m);
  });
  L.group.add(mesh);
  L.covers.visible = false; // le bloc d'origine continue d'arrêter les balles
}

// Portes entre les salles d'un étage : fermées, elles bloquent le passage et la vue ; le joueur les enfonce en arrivant dessus.
// Tant qu'une salle n'est pas ouverte, ses ennemis ne sont pas affichés (et ne voient ni n'entendent rien).
import * as THREE from 'three';
import { CELL, WALL_H } from '../level.js';
import { game } from './state.js';

const DOOR_H = 2.3;      // hauteur du passage (m)
const OPEN_DIST = 1.9;   // distance à laquelle le joueur enfonce la porte
const OPEN_TIME = 0.22;  // durée de l'ouverture (s)
const SWING = 1.75;      // angle d'ouverture (rad)

const panelGeo = new THREE.BoxGeometry(0.12, DOOR_H, CELL - 0.1);
const lintelGeo = new THREE.BoxGeometry(CELL, WALL_H - DOOR_H, CELL);
const handleGeo = new THREE.BoxGeometry(0.16, 0.06, 0.3);
const panelMat = new THREE.MeshStandardMaterial({ color: 0x2a1d16, roughness: 0.6 });
const lintelMat = new THREE.MeshStandardMaterial({ color: 0x1a1518, roughness: 0.9 });
const handleMat = new THREE.MeshBasicMaterial({ color: 0xff2d78 });

let current = null, doors = [], rooms = [];

function setup(L) {
  current = L;
  const layout = game.layout && game.layout.level === L ? game.layout : null;
  rooms = layout ? layout.rooms : [];
  doors = (layout ? layout.doors : []).map(({ cx, cz }) => {
    L.grid[cz][cx] = '#'; // fermée : un mur pour les déplacements, la vue et l'ouïe des ennemis
    const x = L.center(cx), z = L.center(cz);
    // le battant pivote autour d'un de ses bords et s'ouvre vers la salle suivante
    const hinge = new THREE.Group();
    hinge.position.set(x, 0, z - CELL / 2 + 0.05);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, DOOR_H / 2, CELL / 2 - 0.05);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0, 1.05, CELL - 0.45);
    hinge.add(panel, handle);
    const lintel = new THREE.Mesh(lintelGeo, lintelMat);
    lintel.position.set(x, DOOR_H + (WALL_H - DOOR_H) / 2, z);
    L.group.add(hinge, lintel);
    return { cx, cz, x, z, hinge, open: false, k: 0 };
  });
}

function open(L, d) {
  d.open = true;
  L.grid[d.cz][d.cx] = '.';
  game.flowTimer = 0; // les ennemis recalculent tout de suite leur chemin vers le joueur
  game.sfx.click(420, 0.8);
  game.sfx.footstep('wood', 3);
  if (game.ws) game.ws.kickPitch += 0.035; // à-coup du coup de pied
}

/** Numéro de la salle (0 = première) où se trouve une position. */
function roomAt(L, x) {
  const cx = L.toCell(x);
  for (let i = 0; i < rooms.length; i++) if (cx <= rooms[i].x1) return i;
  return rooms.length - 1;
}

/** À appeler à chaque image de jeu, avant la mise à jour du combat. */
export function updateDoors(dt) {
  const L = game.level;
  if (!L) return;
  if (L !== current) setup(L);
  if (!doors.length) return;

  const p = game.player.pos;
  let opened = 0;
  for (const d of doors) {
    if (!d.open && Math.hypot(p.x - d.x, p.z - d.z) < OPEN_DIST) open(L, d);
    if (!d.open) continue;
    opened++;
    if (d.k < 1) {
      d.k = Math.min(1, d.k + dt / OPEN_TIME);
      d.hinge.rotation.y = SWING * (1 - (1 - d.k) ** 3); // part vite, finit en douceur
    }
  }
  // les portes s'ouvrent dans l'ordre : la n-ième donne accès à la salle n
  for (const e of game.enemies) e.root.visible = roomAt(L, e.pos.x) <= opened;
}

/** État des portes, pour les tests. */
export const doorState = () => ({ total: doors.length, open: doors.filter(d => d.open).length });

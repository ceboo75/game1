// Décor actif : des bonbonnes de gaz qui explosent quand on tire dessus.
// Une par salle après la première, toujours au même endroit pour une graine donnée.
import * as THREE from 'three';
import { rng } from '../levels.js';
import { game } from './state.js';
import { fx } from './view.js';
import { hitEnemy } from './combat.js';
import { explosion } from './cues.js';

const RADIUS = 4.2;        // rayon de l'explosion (m)
const DAMAGE = 170;        // dégâts au centre ; 40 % au bord
const PLAYER_RADIUS = 3;   // le joueur est touché de moins loin que les ennemis
const PLAYER_DAMAGE = 35;
const DOOR_ROW = 5;        // ligne des portes : on n'y pose rien, c'est le passage

const bodyGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.9, 10);
const capGeo = new THREE.CylinderGeometry(0.12, 0.2, 0.16, 10);
const bandGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.1, 10);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0xb01818, roughness: 0.5, emissive: 0x300404 });
const capMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5 });
const bandMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });

let current = null, props = [];

function setup(L) {
  current = L;
  props = [];
  const layout = game.layout && game.layout.level === L ? game.layout : null;
  if (!layout || !game.run) return; // pas de bonbonnes derrière les menus
  const R = rng(game.run.seed * 17 + game.run.levelIdx * 53 + game.run.floorIdx * 7 + 3);
  const taken = new Set(game.enemies.map(e => `${L.toCell(e.pos.x)},${L.toCell(e.pos.z)}`));
  layout.rooms.slice(1).forEach(room => {
    const free = [];
    for (let cz = 1; cz < L.h - 1; cz++) {
      if (cz === DOOR_ROW) continue;
      for (let cx = room.x0 + 1; cx < room.x1; cx++) if (L.cell(cx, cz) === '.' && !taken.has(`${cx},${cz}`)) free.push([cx, cz]);
    }
    if (!free.length) return;
    const [cx, cz] = free[Math.floor(R() * free.length)];
    const mesh = new THREE.Mesh(bodyGeo, bodyMat);
    const cap = new THREE.Mesh(capGeo, capMat); cap.position.y = 0.53;
    const band = new THREE.Mesh(bandGeo, bandMat); band.position.y = 0.2;
    mesh.add(cap, band);
    mesh.position.set(L.center(cx), 0.45, L.center(cz));
    L.group.add(mesh);
    // la case devient un obstacle ; le mobilier, lui, a déjà été posé au premier affichage de l'étage
    L.grid[cz][cx] = 'c';
    const prop = { cx, cz, x: mesh.position.x, z: mesh.position.z, mesh, alive: true };
    mesh.userData.onShot = () => explode(prop);
    props.push(prop);
  });
}

function explode(prop) {
  if (!prop.alive) return;
  const L = game.level;
  prop.alive = false;
  prop.mesh.visible = false;
  L.grid[prop.cz][prop.cx] = '.';
  const at = new THREE.Vector3(prop.x, 0.6, prop.z);
  fx.sparks(at, 26, 0xffb040, 7);
  fx.sparks(at, 14, 0xff4020, 4);
  fx.muzzle(at);
  explosion(game.sfx);

  for (const e of game.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.pos.x - prop.x, e.pos.z - prop.z);
    if (d < RADIUS && L.los(prop.x, prop.z, e.pos.x, e.pos.z)) hitEnemy(e, DAMAGE * (1 - 0.6 * d / RADIUS));
  }
  const p = game.player.pos, dp = Math.hypot(p.x - prop.x, p.z - prop.z);
  if (dp < PLAYER_RADIUS) game.hurtPlayer(PLAYER_DAMAGE * (1 - 0.5 * dp / PLAYER_RADIUS), prop);
  // réaction en chaîne
  for (const other of props) if (other.alive && Math.hypot(other.x - prop.x, other.z - prop.z) < RADIUS) explode(other);
}

/** À appeler à chaque image de jeu : pose les bonbonnes quand un nouvel étage est chargé. */
export function updateProps() {
  if (game.level && game.level !== current) setup(game.level);
}

/** Objets du décor sur lesquels on peut tirer (leur userData.onShot est appelé à l'impact). */
export function shootables() {
  return props.filter(p => p.alive).map(p => p.mesh);
}

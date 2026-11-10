// Générateur d'étages : assemble des salles en enfilade à partir d'une graine.
// La même graine redonne exactement le même étage. Logique pure, testée automatiquement.
// Le résultat est une carte texte au format de levels.js, plus la position des portes et des salles.
import { LEVELS, rng } from '../levels.js';
import { ROOMS } from '../content/rooms.js';
import { parseMap, farSpots } from './grid.js';

export const ROOM_H = 9;      // hauteur intérieure d'une salle (cases)
const DOOR_ROW = 1 + 4;       // ligne des portes dans la carte complète : milieu de la salle, après le mur du haut

/** Nombre de salles d'un étage : les derniers étages de la Tour sont plus longs. */
export function roomCount(levelIdx, floorIdx) {
  return levelIdx === 2 && floorIdx >= 4 ? 5 : 4;
}

function shuffled(list, R) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Une salle, éventuellement retournée de haut en bas et de gauche à droite. */
function variant(tpl, R) {
  let rows = tpl;
  if (R() < 0.5) rows = [...rows].reverse();
  if (R() < 0.5) rows = rows.map(r => [...r].reverse().join(''));
  return rows;
}

/**
 * Assemble des salles en un étage.
 * @param templates salles, dans l'ordre de traversée
 * @param opts { count: ennemis prévus, bosses: nombre de boss, goal: 'D' escalier ou 'X' sortie }
 * @returns { rows, rooms: [{ x0, x1 }], doors: [{ cx, cz }] } ; les portes sont notées « P » dans la carte
 */
export function buildFloor(templates, { count = 0, bosses = 0, goal = 'D' } = {}, R = Math.random) {
  const widths = templates.map(t => t[0].length);
  const W = 1 + widths.reduce((s, w) => s + w + 1, 0), H = ROOM_H + 2;
  const g = Array.from({ length: H }, () => Array(W).fill('#'));
  const rooms = [], doors = [];
  let x = 1;
  templates.forEach((tpl, i) => {
    variant(tpl, R).forEach((row, r) => { for (let c = 0; c < row.length; c++) g[r + 1][x + c] = row[c]; });
    rooms.push({ x0: x, x1: x + widths[i] - 1 });
    x += widths[i];
    if (i < templates.length - 1) { g[DOOR_ROW][x] = 'P'; doors.push({ cx: x, cz: DOOR_ROW }); }
    x += 1;
  });
  // fenêtres régulières sur les deux grands murs extérieurs
  for (let c = 2; c < W - 2; c += 3) { g[0][c] = 'W'; g[H - 1][c] = 'W'; }

  // départ juste derrière l'entrée de la première salle ; escalier ou sortie au fond de la dernière
  g[DOOR_ROW][1] = 'S';
  const last = rooms[rooms.length - 1];
  for (const dz of [-1, 0, 1]) g[DOOR_ROW + dz][last.x1] = goal;

  // boss : au plus près du centre de la dernière salle
  if (bosses) {
    const cx = (last.x0 + last.x1) / 2, free = [];
    for (let r = 1; r <= ROOM_H; r++) for (let c = last.x0; c < last.x1 - 1; c++) if (g[r][c] === '.') free.push([c, r]);
    free.sort((a, b) => Math.hypot(a[0] - cx, a[1] - DOOR_ROW) - Math.hypot(b[0] - cx, b[1] - DOOR_ROW));
    for (const [c, r] of free.slice(0, bosses)) g[r][c] = 'B';
  }

  // assez d'emplacements loin du départ pour l'effectif prévu : on en ajoute au besoin, hors de la première salle
  const toRows = () => g.map(r => r.join(''));
  const capacity = () => {
    const map = parseMap(toRows());
    return farSpots(map, bosses ? map.spawns : [...map.spawns, ...map.bossSpots]).length;
  };
  let missing = count - capacity();
  if (missing > 0) {
    const free = [];
    for (let r = 1; r <= ROOM_H; r++) for (let c = rooms[0].x1 + 2; c < W - 1; c++) if (g[r][c] === '.') free.push([c, r]);
    for (const [c, r] of shuffled(free, R)) {
      if (missing <= 0) break;
      g[r][c] = 'e';
      missing--;
    }
  }
  return { rows: toRows(), rooms, doors };
}

/** Étage d'un bâtiment pour une graine donnée (une graine par partie, ou celle du défi du jour). */
export function generateFloor(levelIdx, floorIdx, seed) {
  const lv = LEVELS[levelIdx], fl = lv.floors[floorIdx];
  const R = rng((seed >>> 0) * 7919 + levelIdx * 101 + floorIdx * 13 + 1);
  const templates = shuffled(ROOMS[lv.theme], R).slice(0, roomCount(levelIdx, floorIdx));
  return buildFloor(templates, {
    count: fl.count,
    bosses: fl.bosses?.length || 0,
    goal: floorIdx === lv.floors.length - 1 ? 'X' : 'D',
  }, R);
}

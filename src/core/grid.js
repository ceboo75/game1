// Lecture et validation des cartes texte (voir la légende dans levels.js).
// Logique pure, sans Three.js : sert aux tests automatiques.
// En plus de la légende de levels.js : « P » est une porte (franchissable) posée par le générateur d'étages.

export const MIN_SPAWN_DIST = 5; // aucun ennemi à moins de 5 cases de l'arrivée sur l'étage

const SOLID = '#Wc';
const KNOWN = '#W.cSeBDXP';
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function parseMap(rows) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const grid = rows.map(r => r.padEnd(w, '#').split(''));
  const map = { w, h, grid, starts: [], spawns: [], bossSpots: [], goals: [], unknown: [] };
  for (let cz = 0; cz < h; cz++) {
    for (let cx = 0; cx < w; cx++) {
      const ch = grid[cz][cx];
      if (!KNOWN.includes(ch)) map.unknown.push({ cx, cz, ch });
      else if (ch === 'S') map.starts.push({ cx, cz });
      else if (ch === 'e') map.spawns.push({ cx, cz });
      else if (ch === 'B') map.bossSpots.push({ cx, cz });
      else if (ch === 'D' || ch === 'X') map.goals.push({ cx, cz, type: ch });
    }
  }
  return map;
}

const key = (cx, cz) => `${cx},${cz}`;

/** Ensemble des cases atteignables à pied depuis `from` (déplacements en croix). */
export function reachable(map, from) {
  const seen = new Set([key(from.cx, from.cz)]);
  const queue = [from];
  while (queue.length) {
    const c = queue.shift();
    for (const [dx, dz] of DIRS4) {
      const cx = c.cx + dx, cz = c.cz + dz;
      if (cx < 0 || cz < 0 || cx >= map.w || cz >= map.h) continue;
      if (SOLID.includes(map.grid[cz][cx]) || seen.has(key(cx, cz))) continue;
      seen.add(key(cx, cz));
      queue.push({ cx, cz });
    }
  }
  return seen;
}

/** Emplacements d'ennemis assez loin de l'arrivée du joueur. */
export function farSpots(map, spots) {
  const s = map.starts[0];
  return spots.filter(p => Math.hypot(p.cx - s.cx, p.cz - s.cz) >= MIN_SPAWN_DIST);
}

/**
 * Vérifie qu'une carte est jouable. Renvoie la liste des problèmes (vide si tout va bien).
 * @param count  nombre d'ennemis normaux prévus sur l'étage
 * @param bosses nombre de boss prévus sur l'étage
 */
export function validateMap(rows, { count = 0, bosses = 0 } = {}) {
  const map = parseMap(rows);
  const errors = [];
  for (const u of map.unknown) errors.push(`caractère inconnu « ${u.ch} » en ${u.cx},${u.cz}`);
  if (map.starts.length !== 1) { errors.push(`${map.starts.length} départ(s) « S » au lieu d'un seul`); return errors; }
  if (!map.goals.length) errors.push('aucun escalier « D » ni sortie « X »');
  if (new Set(map.goals.map(g => g.type)).size > 1) errors.push('escalier et sortie sur le même étage');

  const reach = reachable(map, map.starts[0]);
  const ok = p => reach.has(key(p.cx, p.cz));
  if (map.goals.length && !map.goals.some(ok)) errors.push("l'escalier ou la sortie est inatteignable depuis le départ");
  for (const p of map.spawns) if (!ok(p)) errors.push(`emplacement d'ennemi inatteignable en ${p.cx},${p.cz}`);
  for (const p of map.bossSpots) if (!ok(p)) errors.push(`emplacement de boss inatteignable en ${p.cx},${p.cz}`);

  // même règle que le chargement d'un étage : les cases « B » servent aux ennemis normaux s'il n'y a pas de boss
  const spots = farSpots(map, bosses ? map.spawns : [...map.spawns, ...map.bossSpots]);
  if (spots.length < count) errors.push(`${spots.length} emplacement(s) loin du départ pour ${count} ennemis`);
  const spare = Math.max(0, spots.length - count);
  if (bosses > map.bossSpots.length + spare) errors.push(`${map.bossSpots.length} emplacement(s) de boss pour ${bosses} boss`);
  return errors;
}

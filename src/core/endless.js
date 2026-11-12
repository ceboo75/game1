// Logique de la fuite sans fin : forme de chaque salle, effectif et force des ennemis, suite des armes, score.
// Logique pure, sans affichage, testée automatiquement. Tout découle de la graine de la partie et du numéro
// de la salle (0 = départ) : la même graine redonne exactement le même parcours.
import { rng, BOSSES } from '../levels.js';
import { ROOMS } from '../content/rooms.js';
import {
  SECTOR_LENGTH, SECTOR_THEMES, KILLS_TO_OPEN, ROOM_MULT_STEP, KILLS_PER_WEAPON, WEAPON_ORDER, CYCLE_DAMAGE,
  CURVE, TYPE_INTRO, DIFF_START, STREAKS,
} from '../content/endless.js';

export const ROOM_H = 9;     // hauteur intérieure d'une salle (cases)
export const DOOR_ROW = 4;   // ligne des portes, dans l'intérieur de la salle
const ENTRY_CLEAR = 3;       // aucun ennemi dans les 3 premières colonnes : on n'apparaît pas sous le feu

const BOSS_KEYS = Object.keys(BOSSES);
const seeded = (seed, n, salt) => rng(((seed >>> 0) * 7919 + n * 104729 + salt) >>> 0);

function shuffle(a, R) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Thème visuel de la salle n (clé de THEMES). */
export const themeOf = n => SECTOR_THEMES[Math.floor(n / SECTOR_LENGTH) % SECTOR_THEMES.length];

/**
 * Forme de la salle n : son intérieur (ROOM_H lignes de même longueur), sans les murs.
 * Les emplacements possibles d'ennemis sont rendus à part et remplacés par du sol.
 * @returns { theme, w, rows: [string], spawns: [[colonne, ligne]] } en coordonnées intérieures
 */
export function roomLayout(seed, n) {
  const R = seeded(seed, n, 11), theme = themeOf(n);
  const list = ROOMS[theme];
  let rows = list[Math.floor(R() * list.length)];
  if (R() < 0.5) rows = [...rows].reverse();
  if (R() < 0.5) rows = rows.map(r => [...r].reverse().join(''));
  const spawns = [];
  rows = rows.map((r, z) => [...r].map((ch, x) => { if (ch === 'e') { spawns.push([x, z]); return '.'; } return ch; }).join(''));
  return { theme, w: rows[0].length, rows, spawns };
}

/** Effectif et force des ennemis de la salle n. */
export function roomSpec(seed, n, diffId = 'normal') {
  const R = seeded(seed, n, 23), c = CURVE;
  const eff = n + (DIFF_START[diffId] ?? 0);
  const count = Math.min(c.maxCount, c.baseCount + Math.floor(eff / c.countEvery));
  const open = TYPE_INTRO.filter(t => eff >= t.from);
  const types = Array.from({ length: count }, () => {
    let roll = R();
    for (const t of open) { if (roll < t.share) return t.type; roll -= t.share; }
    return 'grunt';
  });
  const boss = n % c.bossEvery === c.bossEvery - 1 ? BOSS_KEYS[Math.floor(n / c.bossEvery) % BOSS_KEYS.length] : null;
  return {
    count, types, boss,
    hpMul: 1 + c.hpPerRoom * eff,
    dmgMul: 1 + c.dmgPerRoom * eff,
    speedMul: Math.min(c.maxSpeed, 1 + c.speedPerRoom * eff),
    need: Math.ceil(count * KILLS_TO_OPEN), // le boss, s'il y en a un, doit être abattu en plus
  };
}

/**
 * Emplacements des ennemis d'une salle : d'abord ceux prévus par le gabarit, puis des cases libres,
 * jamais près de l'entrée. Le boss prend la case libre la plus proche du centre.
 * @returns { spots: [[colonne, ligne]], bossSpot: [colonne, ligne] | null }
 */
export function placeEnemies(layout, spec, seed, n) {
  const R = seeded(seed, n, 37);
  const free = [];
  layout.rows.forEach((r, z) => [...r].forEach((ch, x) => { if (ch === '.' && x >= ENTRY_CLEAR) free.push([x, z]); }));
  const key = ([x, z]) => `${x},${z}`;
  const planned = shuffle(layout.spawns.filter(([x]) => x >= ENTRY_CLEAR), R);
  const used = new Set();
  let bossSpot = null;
  if (spec.boss) {
    const cx = layout.w / 2, cz = ROOM_H / 2;
    bossSpot = [...free].sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz))[0] || null;
    if (bossSpot) used.add(key(bossSpot));
  }
  const spots = [];
  for (const s of [...planned, ...shuffle([...free], R)]) {
    if (spots.length >= spec.count) break;
    if (used.has(key(s))) continue;
    used.add(key(s));
    spots.push(s);
  }
  return { spots, bossSpot };
}

/** Arme en main après un nombre d'éliminations dans la partie. */
export function weaponAt(kills) {
  const step = Math.floor(kills / KILLS_PER_WEAPON);
  const loop = Math.floor(step / WEAPON_ORDER.length);
  return {
    step,
    id: WEAPON_ORDER[step % WEAPON_ORDER.length],
    loop,
    damageMul: 1 + CYCLE_DAMAGE * loop,
    left: KILLS_PER_WEAPON - (kills % KILLS_PER_WEAPON), // éliminations avant la suivante
  };
}

/** Multiplicateur de points dans la salle n (chaque salle franchie l'augmente). */
export const roomMult = n => Math.round((1 + ROOM_MULT_STEP * n) * 100) / 100;

/** Texte de l'annonce pour un combo donné, ou null en dessous du premier palier. */
export function streakName(combo) {
  let name = null;
  for (const [n, text] of STREAKS) if (combo >= n) name = text;
  return name;
}

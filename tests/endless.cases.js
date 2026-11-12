// Tests de la fuite sans fin : salles, courbe de difficulté, armes, multiplicateur, annonces.
import { test, eq, ok } from './cases.js';
import { ROOMS } from '../src/content/rooms.js';
import { roomLayout, roomSpec, placeEnemies, weaponAt, roomMult, streakName, themeOf, ROOM_H, DOOR_ROW } from '../src/core/endless.js';
import { validateMap } from '../src/core/grid.js';
import { SECTOR_THEMES, WEAPON_ORDER, KILLS_PER_WEAPON, CURVE, ROOM_TIME } from '../src/content/endless.js';
import { DIFF_ORDER, ENEMY_TYPES, BOSSES } from '../src/levels.js';
import { EXTRA_TYPES } from '../src/game/roster.js';

/** Salle n avec ses ennemis placés, entourée de murs, entrée « S » à gauche et sortie « X » à droite. */
function roomMap(seed, n, diff = 'normal') {
  const lay = roomLayout(seed, n), spec = roomSpec(seed, n, diff);
  const { spots, bossSpot } = placeEnemies(lay, spec, seed, n);
  const rows = lay.rows.map(r => [...r]);
  for (const [x, z] of spots) rows[z][x] = 'e';
  if (bossSpot) rows[bossSpot[1]][bossSpot[0]] = 'B';
  const wall = '#'.repeat(lay.w + 2);
  const map = [wall, ...rows.map((r, z) => (z === DOOR_ROW ? 'S' : '#') + r.join('') + (z === DOOR_ROW ? 'X' : '#')), wall];
  return { map, spec, spots, bossSpot };
}

test('salles : 8 gabarits par décor, bien formés, portes dégagées', () => {
  const problems = [];
  for (const theme of SECTOR_THEMES) {
    const rooms = ROOMS[theme] || [];
    if (rooms.length !== 8) problems.push(`${theme} : ${rooms.length} gabarits`);
    rooms.forEach((room, i) => {
      const where = `${theme} ${i + 1}`;
      if (room.length !== ROOM_H) problems.push(`${where} : ${room.length} lignes`);
      if (new Set(room.map(r => r.length)).size !== 1) problems.push(`${where} : lignes de longueurs différentes`);
      if (room.join('').replace(/[.#Wce]/g, '')) problems.push(`${where} : caractère interdit`);
      const mid = room[DOOR_ROW];
      if (mid[0] !== '.' || mid[mid.length - 1] !== '.') problems.push(`${where} : porte bouchée`);
    });
  }
  eq(problems, [], 'gabarits');
});

test('salles générées : 3000 salles, toutes traversables, ennemis et boss atteignables, effectif complet', () => {
  const problems = [];
  for (let seed = 1; seed <= 30 && problems.length < 5; seed++) {
    for (let n = 0; n < 100 && problems.length < 5; n++) {
      const { map, spec, spots, bossSpot } = roomMap(seed, n, DIFF_ORDER[seed % 3]);
      for (const e of validateMap(map)) problems.push(`graine ${seed}, salle ${n} : ${e}`);
      if (spots.length !== spec.count) problems.push(`graine ${seed}, salle ${n} : ${spots.length} ennemis placés sur ${spec.count}`);
      if (spec.boss && !bossSpot) problems.push(`graine ${seed}, salle ${n} : boss sans place`);
      if (spots.some(([x]) => x < 3)) problems.push(`graine ${seed}, salle ${n} : ennemi collé à l'entrée`);
    }
  }
  if (problems.length) throw new Error('\n  ' + problems.join('\n  '));
});

test('salles générées : même graine, même parcours ; graines différentes, parcours variés', () => {
  const run = seed => Array.from({ length: 12 }, (_, n) => roomMap(seed, n).map.join('\n')).join('|');
  eq(run(42), run(42), 'reproductibilité');
  const distinct = new Set(Array.from({ length: 30 }, (_, s) => run(s + 1)));
  ok(distinct.size >= 28, `seulement ${distinct.size} parcours différents sur 30 graines`);
  eq([0, 4, 5, 9, 10, 15].map(themeOf), ['villa', 'villa', 'hotel', 'hotel', 'tower', 'villa'], 'secteurs');
});

test('difficulté : croissante salle après salle, vitesse plafonnée, début doux', () => {
  const at = n => roomSpec(1, n, 'normal');
  eq([at(0).count, at(1).count], [CURVE.baseCount, CURVE.baseCount], 'deux premières salles douces');
  for (let n = 1; n < 300; n++) {
    const a = at(n - 1), b = at(n);
    ok(b.count >= a.count && b.hpMul > a.hpMul && b.dmgMul > a.dmgMul && b.speedMul >= a.speedMul, `salle ${n} moins dure que la précédente`);
  }
  eq(at(500).speedMul, CURVE.maxSpeed, 'vitesse plafonnée');
  eq(at(500).count, CURVE.maxCount, 'effectif plafonné');
  ok(roomSpec(1, 0, 'suicide').count > at(0).count, 'Cauchemar commence plus fort');
});

test('difficulté : types introduits un par un, petit boss toutes les 10 salles', () => {
  const types = n => new Set(Array.from({ length: 40 }, (_, s) => roomSpec(s + 1, n, 'normal').types).flat());
  eq([...types(0)], ['grunt'], 'salle 0 : hommes de main seulement');
  ok(types(30).has('sniper') && types(30).has('shield') && types(30).has('heavy'), 'tous les types plus loin');
  for (const n of [0, 30]) for (const t of types(n)) ok(ENEMY_TYPES[t] || EXTRA_TYPES[t], `type inconnu : ${t}`);
  const bosses = Array.from({ length: 60 }, (_, n) => roomSpec(1, n, 'normal').boss);
  eq(bosses.map((b, n) => (b ? n : null)).filter(n => n !== null), [9, 19, 29, 39, 49, 59], 'salles des boss');
  ok(bosses.filter(Boolean).every(b => BOSSES[b]), 'boss connus');
  ok(Array.from({ length: 50 }, (_, n) => roomSpec(1, n)).every(s => s.need === Math.ceil(s.count / 2)), 'porte : la moitié des ennemis');
});

test('armes : une nouvelle toutes les 10 éliminations, puis le cycle reprend plus fort', () => {
  eq(weaponAt(0), { step: 0, id: 'fn57', loop: 0, damageMul: 1, left: KILLS_PER_WEAPON }, 'départ au pistolet');
  eq([9, 10, 19, 20].map(k => weaponAt(k).id), ['fn57', 'uzi', 'uzi', 'benelli'], 'changement à 10');
  eq(Array.from({ length: 9 }, (_, i) => weaponAt(i * 10).id), WEAPON_ORDER, 'ordre complet');
  const lap = weaponAt(90);
  eq([lap.id, lap.loop, lap.damageMul], ['fn57', 1, 1.15], 'deuxième tour');
  eq(weaponAt(17).left, 3, 'éliminations avant la suivante');
});

test('score : multiplicateur de salle, annonces de série', () => {
  eq([0, 1, 5, 12].map(roomMult), [1, 1.1, 1.5, 2.2], 'multiplicateur');
  eq([1, 2, 3, 4, 5, 6, 7, 8, 12].map(streakName), [null, 'DOUBLE KILL', 'TRIPLE KILL', 'MONSTER KILL', 'RAMPAGE', 'UNSTOPPABLE', 'UNSTOPPABLE', 'GODLIKE', 'GODLIKE'], 'annonces');
  ok(ROOM_TIME === 20, 'compte à rebours de 20 secondes');
});

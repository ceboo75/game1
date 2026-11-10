// Tests des salles et du générateur d'étages. S'ajoutent à la liste de tests/cases.js.
import { cases } from './cases.js';
import { ROOMS } from '../src/content/rooms.js';
import { generateFloor, roomCount, ROOM_H } from '../src/core/floorgen.js';
import { validateMap, parseMap } from '../src/core/grid.js';
import { LEVELS } from '../src/levels.js';

function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
}

cases.push({ name: 'salles : 8 par bâtiment, bien formées, portes dégagées', fn: () => {
  const problems = [];
  for (const lv of LEVELS) {
    const rooms = ROOMS[lv.theme] || [];
    if (rooms.length !== 8) problems.push(`${lv.theme} : ${rooms.length} salles`);
    rooms.forEach((room, i) => {
      const where = `${lv.theme} salle ${i + 1}`;
      if (room.length !== ROOM_H) problems.push(`${where} : ${room.length} lignes`);
      if (new Set(room.map(r => r.length)).size !== 1) problems.push(`${where} : lignes de longueurs différentes`);
      const bad = room.join('').replace(/[.#Wce]/g, '');
      if (bad) problems.push(`${where} : caractères interdits « ${bad} »`);
      const mid = room[4] || '';
      if (mid[0] !== '.' || mid[mid.length - 1] !== '.') problems.push(`${where} : porte bouchée`);
      if ((room.join('').match(/e/g) || []).length < 3) problems.push(`${where} : moins de 3 emplacements d'ennemi`);
    });
  }
  eq(problems, [], 'salles');
} });

cases.push({ name: 'étages générés : 1000 graines par bâtiment, tous jouables et à effectif complet', fn: () => {
  const problems = [];
  LEVELS.forEach((lv, li) => {
    const seeds = Math.ceil(1000 / lv.floors.length);
    lv.floors.forEach((fl, fi) => {
      for (let seed = 1; seed <= seeds && problems.length < 5; seed++) {
        const { rows, rooms, doors } = generateFloor(li, fi, seed);
        const errors = validateMap(rows, { count: fl.count, bosses: fl.bosses?.length || 0 });
        if (rooms.length !== roomCount(li, fi) || doors.length !== rooms.length - 1) errors.push('nombre de salles ou de portes');
        const goal = fi === lv.floors.length - 1 ? 'X' : 'D';
        if (!parseMap(rows).goals.every(g => g.type === goal)) errors.push(`fin d'étage attendue : ${goal}`);
        for (const e of errors) problems.push(`${lv.name}, étage ${fi + 1}, graine ${seed} : ${e}`);
      }
    });
  });
  if (problems.length) throw new Error('\n  ' + problems.join('\n  '));
} });

cases.push({ name: 'étages générés : même graine, même étage ; graines différentes, étages variés', fn: () => {
  eq(generateFloor(1, 2, 42).rows, generateFloor(1, 2, 42).rows, 'reproductibilité');
  const distinct = new Set();
  for (let seed = 1; seed <= 50; seed++) distinct.add(generateFloor(2, 0, seed).rows.join('\n'));
  if (distinct.size < 40) throw new Error(`seulement ${distinct.size} étages différents sur 50 graines`);
} });

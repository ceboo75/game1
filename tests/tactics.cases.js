// Tests des jetons d'attaque. S'ajoutent à la liste de tests/cases.js.
import { cases } from './cases.js';
import { AttackTokens, MAX_SHOOTERS } from '../src/core/tactics.js';
import { DIFF_ORDER } from '../src/levels.js';

function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
}

cases.push({ name: 'jetons : pas plus de tireurs dangereux que le maximum', fn: () => {
  const t = new AttackTokens();
  const roster = [1, 2, 3, 4].map(id => ({ id, alive: true }));
  eq(roster.map(e => t.request(e, 2, roster)), [true, true, false, false], 'deux places');
  eq(t.request(roster[0], 2, roster), true, 'un détenteur garde son jeton');
  t.release(roster[0]);
  eq(t.request(roster[3], 2, roster), true, 'une place rendue est reprise');
  eq(t.holders.size, 2, 'nombre de détenteurs');
} });

cases.push({ name: 'jetons : ceux des morts et des étages précédents sont repris', fn: () => {
  const t = new AttackTokens();
  const a = { alive: true }, b = { alive: true }, c = { alive: true };
  t.request(a, 2, [a, b, c]);
  t.request(b, 2, [a, b, c]);
  a.alive = false;
  eq(t.request(c, 2, [a, b, c]), true, 'jeton du mort repris');
  const d = { alive: true }, e = { alive: true };
  eq([t.request(d, 2, [d, e]), t.request(e, 2, [d, e])], [true, true], 'nouvel étage : tout est libre');
} });

cases.push({ name: 'jetons : un maximum par difficulté, croissant', fn: () => {
  const max = DIFF_ORDER.map(id => MAX_SHOOTERS[id]);
  eq(max.every(n => Number.isInteger(n) && n > 0), true, 'valeurs définies');
  eq([...max].sort((x, y) => x - y), max, 'ordre croissant');
} });

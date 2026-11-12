// Tests du défi du jour.
import { test, eq } from './cases.js';
import { dayKey, daySeed, settleDaily } from '../src/core/daily.js';

test('défi du jour : la date donne la graine', () => {
  eq(dayKey(new Date(2026, 10, 9)), '2026-11-09', 'clé du jour');
  eq(daySeed('2026-11-09'), 20261109, 'graine');
});

test('défi du jour : record du jour au score, remis à zéro le lendemain', () => {
  const a = settleDaily(undefined, '2026-11-09', 4000, 300);
  eq([a.prev, a.isBest, a.state], [0, true, { date: '2026-11-09', score: 4000, distance: 300 }], 'premier score');
  const b = settleDaily(a.state, '2026-11-09', 3000, 500);
  eq([b.prev, b.isBest, b.state], [4000, false, { date: '2026-11-09', score: 4000, distance: 300 }], 'score inférieur');
  const c = settleDaily(a.state, '2026-11-10', 100, 20);
  eq([c.prev, c.isBest, c.state.score], [0, true, 100], 'lendemain');
});

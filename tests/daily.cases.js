// Tests du défi du jour et des missions. S'ajoutent à la liste de tests/cases.js.
import { cases } from './cases.js';
import { dayKey, daySeed, dailyWeapon, dailyMissions, missionDone, settleMissions, settleDaily, MISSIONS, MISSION_REWARD } from '../src/core/daily.js';

function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
}
const STATS = { kills: 45, headshots: 3, bestCombo: 6, bosses: 1, points: 5200, shots: 100, hits: 40 };

cases.push({ name: 'défi du jour : la date donne la graine, l\'arme et trois missions, toujours les mêmes', fn: () => {
  eq(dayKey(new Date(2026, 10, 9)), '2026-11-09', 'clé du jour');
  eq(daySeed('2026-11-09'), 20261109, 'graine');
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
  eq(dailyWeapon(20261109, ids), ids[20261109 % 9], 'arme du jour');
  const m1 = dailyMissions(20261109).map(m => m.id), m2 = dailyMissions(20261109).map(m => m.id);
  eq(m1, m2, 'missions reproductibles');
  eq([m1.length, new Set(m1).size], [3, 3], 'trois missions distinctes');
  const days = new Set();
  for (let d = 1; d <= 28; d++) days.add(dailyMissions(20261100 + d).map(m => m.id).join());
  if (days.size < 10) throw new Error(`missions trop peu variées : ${days.size} tirages différents sur 28 jours`);
} });

cases.push({ name: 'missions : accomplies sur les statistiques d\'une partie, récompensées une seule fois par jour', fn: () => {
  const by = id => MISSIONS.find(m => m.id === id);
  eq(['kills40', 'kills80', 'combo5', 'boss1', 'points6k', 'acc50'].map(id => missionDone(by(id), STATS)), [true, false, true, true, false, false], 'missions');
  eq(missionDone(by('acc50'), { shots: 10, hits: 10 }), false, 'précision : 20 tirs au moins');
  eq(missionDone(by('acc50'), { shots: 40, hits: 20 }), true, 'précision atteinte');
  const key = '2026-11-09';
  const all = { kills: 999, headshots: 999, bestCombo: 99, bosses: 9, points: 99999, shots: 100, hits: 100 };
  const first = settleMissions(undefined, key, all);
  eq([first.completed.length, first.reward, first.state.done.length], [3, 3 * MISSION_REWARD, 3], 'premier passage');
  const again = settleMissions(first.state, key, all);
  eq([again.completed.length, again.reward], [0, 0], 'pas de double récompense');
  eq(settleMissions(first.state, '2026-11-10', all).completed.length, 3, 'le lendemain, tout repart');
  eq(settleMissions(undefined, key, { kills: 0 }).reward, 0, 'rien d\'accompli');
} });

cases.push({ name: 'défi du jour : record du jour, remis à zéro le lendemain', fn: () => {
  const a = settleDaily(undefined, '2026-11-09', 4000);
  eq([a.prev, a.isBest, a.state.best], [0, true, 4000], 'premier score');
  const b = settleDaily(a.state, '2026-11-09', 3000);
  eq([b.prev, b.isBest, b.state.best], [4000, false, 4000], 'score inférieur');
  const c = settleDaily(a.state, '2026-11-10', 100);
  eq([c.prev, c.isBest, c.state.best], [0, true, 100], 'lendemain');
} });

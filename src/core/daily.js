// Défi du jour et missions quotidiennes. Logique pure, testée automatiquement.
// Tout découle de la date : le même jour, tous les joueurs ont le même immeuble, la même arme et les mêmes missions.
import { rng } from '../levels.js';

/** Jour local au format AAAA-MM-JJ. */
export function dayKey(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Graine du jour : sert aux étages du défi, à l'arme imposée et au tirage des missions. */
export const daySeed = key => Number(key.replaceAll('-', ''));

/** Arme imposée du défi du jour, parmi la liste d'identifiants fournie. */
export const dailyWeapon = (seed, ids) => ids[seed % ids.length];

// stat : champ des statistiques de fin de partie ; « accuracy » est calculée (20 tirs au moins).
export const MISSIONS = [
  { id: 'kills40', stat: 'kills', target: 40, text: 'Élimine {n} ennemis en une partie' },
  { id: 'kills80', stat: 'kills', target: 80, text: 'Élimine {n} ennemis en une partie' },
  { id: 'heads10', stat: 'headshots', target: 10, text: 'Réussis {n} tirs à la tête en une partie' },
  { id: 'combo5', stat: 'bestCombo', target: 5, text: 'Atteins un combo de {n}' },
  { id: 'boss1', stat: 'bosses', target: 1, text: 'Abats un boss' },
  { id: 'boss3', stat: 'bosses', target: 3, text: 'Abats {n} boss en une partie' },
  { id: 'points6k', stat: 'points', target: 6000, text: 'Marque {n} points en une partie' },
  { id: 'acc50', stat: 'accuracy', target: 50, text: 'Termine une partie avec {n} % de précision' },
];
export const MISSION_REWARD = 50; // crédits par mission accomplie

/** Les missions du jour : toujours les mêmes pour une graine donnée. */
export function dailyMissions(seed, n = 3) {
  const R = rng(seed * 13 + 5);
  const pool = [...MISSIONS];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}

export function missionDone(mission, stats) {
  const value = mission.stat === 'accuracy'
    ? (stats.shots >= 20 ? (stats.hits / stats.shots) * 100 : 0)
    : (stats[mission.stat] || 0);
  return value >= mission.target;
}

/**
 * Fin de partie : quelles missions du jour viennent d'être accomplies ?
 * @param state { date, done: [ids] } lu dans la sauvegarde (peut être absent ou d'un autre jour)
 * @returns { state, completed: [missions], reward }
 */
export function settleMissions(state, key, stats) {
  const done = state && state.date === key && Array.isArray(state.done) ? [...state.done] : [];
  const completed = dailyMissions(daySeed(key)).filter(m => !done.includes(m.id) && missionDone(m, stats));
  for (const m of completed) done.push(m.id);
  return { state: { date: key, done }, completed, reward: completed.length * MISSION_REWARD };
}

/**
 * Fin d'un défi du jour : record du jour.
 * @param state { date, best } lu dans la sauvegarde
 * @returns { state, prev, isBest }
 */
export function settleDaily(state, key, points) {
  const prev = state && state.date === key ? Number(state.best) || 0 : 0;
  const isBest = points > prev;
  return { state: { date: key, best: isBest ? points : prev }, prev, isBest };
}

// Défi du jour : le même parcours pour tous les joueurs ce jour-là, avec son propre record.
// Logique pure, testée automatiquement.

/** Jour local au format AAAA-MM-JJ. */
export function dayKey(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Graine du parcours du jour. */
export const daySeed = key => Number(key.replaceAll('-', ''));

/**
 * Fin d'un défi du jour : record du jour (au score ; la distance du meilleur score est gardée avec lui).
 * @param state { date, score, distance } lu dans la sauvegarde
 * @returns { state, prev, isBest }
 */
export function settleDaily(state, key, score, distance) {
  const prev = state && state.date === key ? Number(state.score) || 0 : 0;
  const isBest = score > prev;
  const next = isBest ? { date: key, score, distance } : { date: key, score: prev, distance: Number(state && state.distance) || 0 };
  return { state: next, prev, isBest };
}

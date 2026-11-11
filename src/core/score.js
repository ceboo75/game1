// Règles de score : logique pure, sans affichage, testée automatiquement.

export const COMBO_WINDOW = 3; // secondes entre deux kills pour enchaîner le combo
export const HEAD_DMG = 3;     // dégâts x3 à la tête
export const HEAD_PTS = 1.5;   // points x1,5 pour un tir à la tête
export const KILL_PTS = 100;
export const BOSS_PTS = 1000;

/** Multiplicateur de combo : x1, x1,5, x2 ... plafonné à x3. */
export const comboMult = n => 1 + 0.5 * Math.min(Math.max(n - 1, 0), 4);

/** Nouveau compteur de combo après un kill survenu `sinceLast` secondes après le précédent. */
export const nextCombo = (count, sinceLast) => (sinceLast <= COMBO_WINDOW ? count + 1 : 1);

/** Points rapportés par un kill. */
export function killPoints({ boss = false, head = false, combo = 1, scoreMul = 1 } = {}) {
  return Math.round((boss ? BOSS_PTS : KILL_PTS) * (head ? HEAD_PTS : 1) * comboMult(combo) * scoreMul);
}

// Ennemis spécialisés ajoutés aux trois types de base, et règle qui les place dans les étages.
// Ils remplacent des hommes de main : le nombre d'ennemis par étage ne change pas.

export const EXTRA_TYPES = {
  // Avance derrière un bouclier qui arrête les balles : viser la tête, les pieds, ou le contourner.
  shield: {
    id: 'shield', hp: 150, speed: 2.7, pref: [3, 6], weapon: 'rifle', points: 100,
    suit: 0x1b2230, shirt: 0x10141c, tie: null, visor: 0x22e4ff, scale: 1.04, helmet: true, vest: true, shield: true,
  },
  // Fragile, reste loin, un tir très dangereux annoncé par un laser.
  sniper: {
    id: 'sniper', hp: 70, speed: 2.8, pref: [16, 26], weapon: 'marksman', points: 100,
    suit: 0x3a3340, shirt: 0xd8d8e0, tie: 0x202028, visor: 0xff1030, scale: 0.98,
  },
};

/**
 * Spécialistes présents sur un étage. La Villa sert d'apprentissage : aucun au premier étage, un bouclier ensuite.
 * @returns liste d'identifiants de EXTRA_TYPES
 */
export function specialists(levelIdx, floorIdx) {
  if (levelIdx === 0) return floorIdx === 0 ? [] : ['shield'];
  if (levelIdx === 1) return floorIdx % 2 ? ['shield', 'sniper'] : ['shield'];
  return floorIdx >= 4 ? ['shield', 'shield', 'sniper'] : ['shield', 'sniper'];
}

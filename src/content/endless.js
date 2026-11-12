// Réglages de la fuite sans fin. Toutes les valeurs d'équilibrage sont ici : chacune se change en une ligne.

// ---------------------------------------------------------------- salles et compte à rebours
export const ROOM_TIME = 20;         // secondes par salle, les mêmes pour toutes
export const DRAIN = 25;             // points de vie perdus par seconde une fois le temps écoulé
export const LOOKAHEAD = 3;          // salles construites d'avance devant le joueur
export const SECTOR_LENGTH = 5;      // salles par secteur ; le décor change à chaque secteur
export const SECTOR_THEMES = ['villa', 'hotel', 'tower'];
export const KILLS_TO_OPEN = 0.5;    // part des ennemis d'une salle à abattre pour ouvrir sa porte de sortie

// ---------------------------------------------------------------- score
export const POINTS_PER_METER = 1;   // points de distance, hors multiplicateurs
export const ROOM_MULT_STEP = 0.1;   // multiplicateur de points gagné à chaque salle franchie (x1, x1,1, x1,2...)

// ---------------------------------------------------------------- armes
export const KILLS_PER_WEAPON = 10;  // éliminations avant de passer à l'arme suivante
export const WEAPON_ORDER = ['fn57', 'uzi', 'benelli', 'ump45', 'm4', 'ak47', 'scarh', 'sks', 'asval'];
export const CYCLE_DAMAGE = 0.15;    // dégâts en plus à chaque tour complet de la liste

// ---------------------------------------------------------------- difficulté selon la salle
// Salle n (0 = départ). Les deux premières salles servent de prise en main.
export const CURVE = {
  baseCount: 2,        // ennemis en salle 0
  countEvery: 3,       // +1 ennemi toutes les 3 salles...
  maxCount: 9,         // ...jusqu'à 9
  hpPerRoom: 0.04,     // vie des ennemis : +4 % par salle
  dmgPerRoom: 0.03,    // dégâts des ennemis : +3 % par salle
  speedPerRoom: 0.015, // vitesse des ennemis : +1,5 % par salle...
  maxSpeed: 1.4,       // ...plafonnée à +40 % (au-delà, on ne peut plus esquiver)
  bossEvery: 10,       // un petit boss dans la dernière salle de chaque dizaine (salles 9, 19, 29...)
  bossHp: 0.6,         // vie d'un petit boss par rapport au boss d'origine
};
// Salle à partir de laquelle chaque type peut apparaître, et sa part une fois introduit.
export const TYPE_INTRO = [
  { type: 'rusher', from: 2, share: 0.25 },
  { type: 'heavy', from: 5, share: 0.18 },
  { type: 'shield', from: 8, share: 0.12 },
  { type: 'sniper', from: 12, share: 0.1 },
];
// Départ selon la difficulté : la courbe commence plus loin (ennemis de plus).
export const DIFF_START = { normal: 0, difficile: 4, suicide: 8 };

// ---------------------------------------------------------------- annonces d'éliminations en série
// Combo -> texte affiché. Au-delà du dernier palier, le dernier texte reste.
export const STREAKS = [
  [2, 'DOUBLE KILL'],
  [3, 'TRIPLE KILL'],
  [4, 'MONSTER KILL'],
  [5, 'RAMPAGE'],
  [6, 'UNSTOPPABLE'],
  [8, 'GODLIKE'],
];

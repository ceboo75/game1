// Contenu du jeu : difficultés, armes des ennemis, types d'ennemis, boss, thèmes visuels des décors.
// Les salles sont dans content/rooms.js, les réglages de la fuite dans content/endless.js.

// ------------------------------------------------------------------ difficultés
export const DIFFICULTIES = {
  normal: {
    id: 'normal', name: 'Normal', desc: 'Ennemis standard, la vie remonte vite.',
    enemyAcc: 0.28, enemyDmg: 7.5, enemyHp: 1, reaction: 1, regenDelay: 4, regenRate: 20, floorHeal: false, scoreMul: 1,
  },
  difficile: {
    id: 'difficile', name: 'Difficile', desc: 'Ennemis plus précis et plus résistants, la vie remonte lentement. Points x1,5.',
    enemyAcc: 0.36, enemyDmg: 10, enemyHp: 1.3, reaction: 0.8, regenDelay: 6, regenRate: 10, floorHeal: false, scoreMul: 1.5,
  },
  suicide: {
    id: 'suicide', name: 'Suicide', desc: "Deux balles et c'est fini. Pas de régénération : la vie revient seulement à chaque nouvelle salle. Points x2.",
    enemyAcc: 0.4, enemyDmg: 50, enemyHp: 1.5, reaction: 0.65, regenDelay: Infinity, regenRate: 0, floorHeal: true, scoreMul: 2,
  },
};
export const DIFF_ORDER = ['normal', 'difficile', 'suicide'];

// ------------------------------------------------------------------ armes des ennemis
// burst : nombre de tirs par rafale ; gap : pause entre rafales (s) ; range : portée max de tir (m)
export const ENEMY_WEAPONS = {
  rifle: { burst: [2, 4], every: 0.13, gap: [0.9, 1.8], dmg: 1, acc: 1, range: 35, len: 0.45 },
  shotgun: { burst: [1, 1], every: 0, gap: [0.9, 1.3], dmg: 1, acc: 1.25, range: 16, len: 0.6, close: true },
  lmg: { burst: [6, 10], every: 0.09, gap: [1.5, 2.2], dmg: 0.8, acc: 0.85, range: 38, len: 0.7 },
  marksman: { burst: [1, 1], every: 0, gap: [1.1, 1.5], dmg: 3, acc: 1.7, range: 60, len: 0.8, laser: 0.7 },
};

// ------------------------------------------------------------------ ennemis
export const ENEMY_TYPES = {
  grunt: {
    id: 'grunt', hp: 100, speed: 3.4, pref: [6, 14], weapon: 'rifle', points: 100,
    suit: 0x2c2f3c, shirt: 0xe4e4ec, tie: 0x9a1028, visor: 0xff2a3a, scale: 1,
  },
  rusher: {
    id: 'rusher', hp: 90, speed: 4.8, pref: [1.5, 4], weapon: 'shotgun', points: 100,
    suit: 0x6a2a1c, shirt: 0x1a1a1e, tie: null, visor: 0xff8a1a, scale: 1,
  },
  heavy: {
    id: 'heavy', hp: 220, speed: 2.4, pref: [8, 14], weapon: 'lmg', points: 100,
    suit: 0x3e4a36, shirt: 0x2a2f26, tie: null, visor: 0x7aff5a, scale: 1.08, helmet: true, vest: true,
  },
};

// ------------------------------------------------------------------ boss (1000 points)
export const BOSSES = {
  kessler: {
    name: 'Dario Kessler', title: 'Le bras droit', hp: 700, speed: 3.3, pref: [2, 5], weapon: 'shotgun',
    suit: 0xe9e4d8, shirt: 0x1a1a1e, tie: 0xd4a017, visor: 0xffcc33, scale: 1.22,
  },
  lenzA: {
    name: 'Anton Lenz', title: 'Le frère aîné', hp: 850, speed: 2.3, pref: [8, 13], weapon: 'lmg',
    suit: 0x8a1a2c, shirt: 0xe4e4ec, tie: 0x111111, visor: 0xffcc33, scale: 1.25, vest: true,
  },
  lenzB: {
    name: 'Erik Lenz', title: 'Le frère cadet', hp: 850, speed: 3.4, pref: [2, 5], weapon: 'shotgun',
    suit: 0x8a1a2c, shirt: 0x111111, tie: 0xe4e4ec, visor: 0xffcc33, scale: 1.22,
  },
  kask: {
    name: 'Bruno Kask', title: 'Le garde du corps', hp: 1100, speed: 2.2, pref: [8, 12], weapon: 'lmg',
    suit: 0x22252c, shirt: 0x22252c, tie: null, visor: 0xffcc33, scale: 1.32, helmet: true, vest: true,
  },
  veuve: {
    name: 'La Veuve', title: "La tireuse d'élite", hp: 800, speed: 2.8, pref: [14, 22], weapon: 'marksman',
    suit: 0x101012, shirt: 0x9a1028, tie: null, visor: 0xff2a3a, scale: 1.15, fem: true,
  },
  varga: {
    name: 'Viktor Varga', title: 'Le chef', hp: 1400, speed: 3.6, pref: [4, 10], weapon: 'combo',
    suit: 0xf2f2f2, shirt: 0x111111, tie: 0xd4a017, visor: 0xffcc33, scale: 1.28, vest: true,
  },
};

// ------------------------------------------------------------------ thèmes visuels
export const THEMES = {
  villa: {
    wall: { base: '#d6c9b2', low: '#b39f80', dado: '#6b5a44', plinth: '#3a2e22', seam: '#c4b498' },
    floor: { type: 'parquet', a: '#6a4528', b: '#57391f', line: '#2e1d10' },
    ceiling: 0x4a423a, cover: { color: 0x6a4030, w: 1.7, h: 0.9 },
    neon: [0xffb347, 0x22e4ff], lights: [0xffb070, 0xffd8a8, 0x7ad8ff],
    window: 'garden', hemi: [0xffe6c8, 0x2a1c14, 1.25], fog: 0x14100c,
  },
  hotel: {
    wall: { base: '#e2d4bc', low: '#8e2a3a', dado: '#c9a04a', plinth: '#2a0a10', seam: '#cfbfa4' },
    floor: { type: 'carpet', a: '#5a1424', b: '#c9a04a', line: '#3a0c16' },
    ceiling: 0x3a2428, cover: { color: 0xb8903e, w: 1.4, h: 1.0 },
    neon: [0xff2d78, 0xffcc33], lights: [0xff5a90, 0xffcc70, 0xc060ff],
    window: 'city', hemi: [0xffd0dc, 0x200810, 1.2], fog: 0x16080c,
  },
  tower: {
    wall: { base: '#c2cad4', low: '#a2acb8', dado: '#5a6672', plinth: '#2a3038', seam: '#b0bac4' },
    floor: { type: 'tiles', a: '#3e4a58', b: '#36414e', line: '#1c232c' },
    ceiling: 0x323a44, cover: { color: 0xdde2e8, w: 1.7, h: 0.95 },
    neon: [0x22e4ff, 0xe8f4ff], lights: [0xa8ecff, 0xffffff, 0x6a9cff],
    window: 'city', hemi: [0xcfe4ff, 0x101820, 1.3], fog: 0x0a0e14,
  },
};

// ------------------------------------------------------------------ hasard reproductible
/** Générateur pseudo-aléatoire déterministe : la même graine redonne toujours la même suite (parcours, ennemis). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

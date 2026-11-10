// Réglages du joueur : valeurs par défaut, bornes et nettoyage. Logique pure, testée automatiquement.

export const SETTINGS = {
  sens:       { def: 1, min: 0.4, max: 2.5, step: 0.05 },  // sensibilité de la visée à la hanche
  sensAds:    { def: 1, min: 0.4, max: 2.5, step: 0.05 },  // sensibilité en visée épaulée
  assist:     { def: 1, min: 0, max: 1.5, step: 0.25 },    // force de l'aide à la visée (0 = aucune)
  autoFire:   { def: false },                              // l'arme tire seule quand le viseur est sur un ennemi
  gyro:       { def: false },                              // visée en inclinant le téléphone
  gyroSens:   { def: 1, min: 0.3, max: 2.5, step: 0.05 },
  btnScale:   { def: 1, min: 0.7, max: 1.4, step: 0.05 },  // taille des boutons tactiles
  btnOpacity: { def: 1, min: 0.3, max: 1, step: 0.05 },
  volMusic:   { def: 1, min: 0, max: 1, step: 0.05 },
  volSfx:     { def: 1, min: 0, max: 1, step: 0.05 },
};

/** Ramène une valeur dans le type et les bornes du réglage ; valeur par défaut si elle est inutilisable. */
export function cleanValue(key, value) {
  const s = SETTINGS[key];
  if (!s) return undefined;
  if (typeof s.def === 'boolean') return typeof value === 'boolean' ? value : s.def;
  const n = Number(value);
  if (value === null || value === '' || !Number.isFinite(n)) return s.def;
  return Math.min(s.max, Math.max(s.min, n));
}

/** Réglages complets et valides à partir de ce qui a été lu dans la sauvegarde. */
export function normalizeSettings(saved) {
  const src = saved && typeof saved === 'object' ? saved : {};
  const out = {};
  for (const key of Object.keys(SETTINGS)) out[key] = cleanValue(key, src[key]);
  return out;
}

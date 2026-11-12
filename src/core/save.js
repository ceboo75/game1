// Sauvegarde du joueur : un seul objet versionné, enregistré sur le téléphone.
// Version 2 (fuite sans fin) : meilleur score et meilleure distance par difficulté, record du défi du jour.

export const SAVE_KEY = 'sie_save';
export const SAVE_VERSION = 2;

const blank = () => ({ v: SAVE_VERSION, best: {}, daily: null, lastDiff: null, lang: null, settings: {}, tutorialDone: false });

/** Stockage en mémoire : pour les tests, ou quand le navigateur refuse localStorage. */
export function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
  };
}

function defaultStorage() {
  try {
    const s = globalThis.localStorage;
    s.getItem(SAVE_KEY);
    return s;
  } catch { return memStorage(); }
}

const num = v => Math.max(0, Math.floor(Number(v) || 0));

/**
 * Amène n'importe quelle sauvegarde lue au format courant.
 * Les records de l'ancien jeu (version 1 et avant) ne sont pas comparables : ils ne sont pas repris.
 * Réglages, difficulté choisie et tutoriel déjà fait sont conservés.
 */
export function upgrade(data) {
  const src = data && typeof data === 'object' ? data : {};
  const out = blank();
  if (src.settings && typeof src.settings === 'object') out.settings = src.settings;
  if (typeof src.lastDiff === 'string') out.lastDiff = src.lastDiff;
  if (typeof src.lang === 'string') out.lang = src.lang;
  out.tutorialDone = src.tutorialDone === true;
  if (src.v === SAVE_VERSION) {
    for (const [id, b] of Object.entries(src.best && typeof src.best === 'object' ? src.best : {})) {
      if (b && typeof b === 'object') out.best[id] = { score: num(b.score), distance: num(b.distance) };
    }
    if (src.daily && typeof src.daily.date === 'string') out.daily = { date: src.daily.date, score: num(src.daily.score), distance: num(src.daily.distance) };
  }
  return out;
}

export class Save {
  constructor(storage = defaultStorage()) {
    this.storage = storage;
    let data = null;
    try { data = JSON.parse(storage.getItem(SAVE_KEY)); } catch { /* sauvegarde illisible : on repart de zéro */ }
    this.data = upgrade(data);
  }

  write() {
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch { /* stockage plein ou interdit */ }
  }

  set(key, value) { this.data[key] = value; this.write(); }

  /** Meilleur score et meilleure distance d'une difficulté (0 si jamais jouée). */
  best(diffId) { return this.data.best[diffId] || { score: 0, distance: 0 }; }

  /**
   * Enregistre une fin de partie. Score et distance sont deux records indépendants.
   * @returns { prev, isBestScore, isBestDistance }
   */
  submitRun(diffId, score, distance) {
    const prev = { ...this.best(diffId) };
    const isBestScore = score > prev.score, isBestDistance = distance > prev.distance;
    if (isBestScore || isBestDistance) {
      this.data.best[diffId] = { score: Math.max(score, prev.score), distance: Math.max(distance, prev.distance) };
      this.write();
    }
    return { prev, isBestScore, isBestDistance };
  }
}

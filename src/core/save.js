// Sauvegarde du joueur : un seul objet versionné, avec reprise des anciennes clés éparses.

export const SAVE_KEY = 'sie_save';
export const SAVE_VERSION = 1;

const blank = () => ({ v: SAVE_VERSION, best: {}, lastWeapon: null, lastDiff: null, lang: null, settings: {} });

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

/** Version 0 : clés séparées best_<difficulté>, lastDiff, lastWeapon. */
function fromLegacy(storage) {
  const data = blank();
  for (const id of ['normal', 'difficile', 'suicide']) {
    const b = Number(storage.getItem(`best_${id}`)) || 0;
    if (b > 0) data.best[id] = b;
  }
  data.lastDiff = storage.getItem('lastDiff');
  data.lastWeapon = storage.getItem('lastWeapon');
  return data;
}

/** Amène n'importe quelle sauvegarde lue au format courant. */
function upgrade(data) {
  const out = { ...blank(), ...data, v: SAVE_VERSION };
  if (!out.best || typeof out.best !== 'object') out.best = {};
  if (!out.settings || typeof out.settings !== 'object') out.settings = {};
  return out;
}

export class Save {
  constructor(storage = defaultStorage()) {
    this.storage = storage;
    let data = null;
    try { data = JSON.parse(storage.getItem(SAVE_KEY)); } catch { /* sauvegarde illisible : on repart des anciennes clés */ }
    this.data = upgrade(data && typeof data === 'object' ? data : fromLegacy(storage));
  }

  write() {
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch { /* stockage plein ou interdit */ }
  }

  set(key, value) { this.data[key] = value; this.write(); }

  best(diffId) { return Number(this.data.best[diffId]) || 0; }

  /** Enregistre un score de fin de partie. Renvoie l'ancien record et si celui-ci est battu. */
  submitScore(diffId, points) {
    const prev = this.best(diffId);
    const isBest = points > prev;
    if (isBest) { this.data.best[diffId] = points; this.write(); }
    return { prev, isBest };
  }
}

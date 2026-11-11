// Atouts choisis entre les étages, crédits, déblocage et maîtrise des armes.
// Logique pure, testée automatiquement. Un atout ne modifie jamais les règles en place : il produit une copie
// modifiée de l'arme ou de la difficulté, que le reste du jeu utilise comme d'habitude.

// mods : multiplicateurs (mag, reload, damage, recoil, spread, speed, range, rpm, adsSpread, armor, regenDelay,
// regenRate, score), ajouts (healOnKill, healOnHead, ammoOnKill) ou silenced.
export const PERKS = [
  { id: 'bigmag', name: 'Chargeur étendu', desc: '+40 % de balles par chargeur.', mods: { mag: 1.4 } },
  { id: 'fasthands', name: 'Mains rapides', desc: 'Rechargement 30 % plus court.', mods: { reload: 0.7 } },
  { id: 'heavy', name: 'Balles lourdes', desc: '+20 % de dégâts.', mods: { damage: 1.2 } },
  { id: 'grip', name: 'Poigne de fer', desc: 'Recul réduit de 35 %.', mods: { recoil: 0.65 } },
  { id: 'barrel', name: 'Canon long', desc: '+40 % de portée, dispersion réduite de 20 %.', mods: { range: 1.4, spread: 0.8 } },
  { id: 'legs', name: 'Jambes légères', desc: 'Déplacement 12 % plus rapide.', mods: { speed: 1.12 } },
  { id: 'trigger', name: 'Détente sensible', desc: '+15 % de cadence de tir.', mods: { rpm: 1.15 } },
  { id: 'vest', name: 'Gilet pare-balles', desc: 'Dégâts reçus réduits de 20 %.', mods: { armor: 0.8 } },
  { id: 'breath', name: 'Second souffle', desc: 'La vie remonte 40 % plus tôt.', mods: { regenDelay: 0.6 } },
  { id: 'cool', name: 'Sang-froid', desc: 'La vie remonte 60 % plus vite.', mods: { regenRate: 1.6 } },
  { id: 'leech', name: 'Sans pitié', desc: '+6 points de vie par ennemi abattu.', mods: { healOnKill: 6 } },
  { id: 'hunter', name: 'Chasseur de têtes', desc: '+15 points de vie par tir à la tête mortel.', mods: { healOnHead: 15 } },
  { id: 'scavenger', name: 'Récupération', desc: '+3 balles dans le chargeur par ennemi abattu.', mods: { ammoOnKill: 3 } },
  { id: 'bounty', name: 'Prime', desc: '+15 % de points.', mods: { score: 1.15 } },
  { id: 'steady', name: 'Œil de lynx', desc: 'Tirs 40 % plus groupés en visant.', mods: { adsSpread: 0.6 } },
  { id: 'quiet', name: 'Silencieux improvisé', desc: 'Les ennemis éloignés ne t’entendent plus. −10 % de dégâts.', mods: { silenced: true, damage: 0.9 } },
];
const BY_ID = new Map(PERKS.map(p => [p.id, p]));
export const perkById = id => BY_ID.get(id);

const ADDITIVE = ['healOnKill', 'healOnHead', 'ammoOnKill'];

/** Effet cumulé d'une liste d'atouts : les multiplicateurs se multiplient, les ajouts s'additionnent. */
export function combine(ids = []) {
  const m = {
    mag: 1, reload: 1, damage: 1, recoil: 1, spread: 1, speed: 1, range: 1, rpm: 1, adsSpread: 1,
    armor: 1, regenDelay: 1, regenRate: 1, score: 1, healOnKill: 0, healOnHead: 0, ammoOnKill: 0, silenced: false,
  };
  for (const id of ids) {
    const perk = BY_ID.get(id);
    if (!perk) continue;
    for (const [k, v] of Object.entries(perk.mods)) {
      if (k === 'silenced') m.silenced = m.silenced || v;
      else if (ADDITIVE.includes(k)) m[k] += v;
      else m[k] *= v;
    }
  }
  return m;
}

// ---------------------------------------------------------------- maîtrise
/** Ennemis à abattre avec une arme pour atteindre chaque niveau de maîtrise, et l'accessoire gagné. */
export const MASTERY = [
  { kills: 25, name: 'Chargeur renforcé', mods: { mag: 1.1 } },
  { kills: 75, name: 'Poignée ergonomique', mods: { reload: 0.9 } },
  { kills: 150, name: 'Canon match', mods: { damage: 1.08 } },
];
export const masteryLevel = kills => MASTERY.filter(s => kills >= s.kills).length;

/** Copie de l'arme avec les atouts de la partie et les accessoires de maîtrise. */
export function moddedWeapon(base, perkIds = [], mastery = 0) {
  const m = combine(perkIds);
  for (const step of MASTERY.slice(0, mastery)) for (const [k, v] of Object.entries(step.mods)) m[k] *= v;
  return {
    ...base,
    mag: Math.max(1, Math.round(base.mag * m.mag)),
    reload: base.reload * m.reload,
    damage: base.damage * m.damage,
    recoil: base.recoil * m.recoil,
    spread: base.spread * m.spread,
    maxSpread: base.maxSpread * m.spread,
    speed: base.speed * m.speed,
    range: base.range * m.range,
    rpm: base.rpm * m.rpm,
    adsSpread: base.adsSpread * m.adsSpread,
    silenced: !!base.silenced || m.silenced,
  };
}

/** Copie de la difficulté avec les atouts défensifs et la prime de points. */
export function moddedDiff(base, perkIds = []) {
  const m = combine(perkIds);
  return {
    ...base,
    enemyDmg: base.enemyDmg * m.armor,
    regenDelay: base.regenDelay * m.regenDelay,
    regenRate: base.regenRate * m.regenRate,
    scoreMul: base.scoreMul * m.score,
  };
}

/** Propose n atouts que le joueur n'a pas encore. */
export function offer(owned = [], R = Math.random, n = 3) {
  const pool = PERKS.map(p => p.id).filter(id => !owned.includes(id));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}

// ---------------------------------------------------------------- crédits et déblocages
export const START_WEAPONS = ['fn57', 'uzi', 'm4'];
export const UNLOCK_COST = { benelli: 300, ump45: 300, ak47: 500, asval: 500, scarh: 700, sks: 700 };
/** Crédits gagnés pour un nombre de points : 1 crédit pour 100 points. */
export const creditsFor = points => Math.max(0, Math.round(points / 100));

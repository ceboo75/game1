// Tests des atouts, de la maîtrise, des crédits et des déblocages. S'ajoutent à la liste de tests/cases.js.
import { cases } from './cases.js';
import { PERKS, combine, moddedWeapon, moddedDiff, offer, masteryLevel, MASTERY, START_WEAPONS, UNLOCK_COST, creditsFor } from '../src/core/perks.js';
import { Save, memStorage } from '../src/core/save.js';
import { DIFFICULTIES, rng } from '../src/levels.js';

function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
}
const GUN = { id: 'm4', mag: 30, reload: 2, damage: 25, recoil: 1, spread: 1, maxSpread: 4, speed: 1, range: 40, rpm: 800, adsSpread: 0.35 };

cases.push({ name: 'atouts : 16, identifiants uniques, nom et description', fn: () => {
  eq(PERKS.length, 16, 'nombre');
  eq(new Set(PERKS.map(p => p.id)).size, 16, 'identifiants uniques');
  eq(PERKS.filter(p => !p.name || !p.desc || !Object.keys(p.mods).length).map(p => p.id), [], 'atouts incomplets');
} });

cases.push({ name: 'atouts : effets sur l\'arme et la difficulté, sans toucher aux originaux', fn: () => {
  const w = moddedWeapon(GUN, ['bigmag', 'fasthands', 'heavy']);
  eq([w.mag, +w.reload.toFixed(2), w.damage], [42, 1.4, 30], 'arme modifiée');
  eq([GUN.mag, GUN.reload, GUN.damage], [30, 2, 25], 'arme d\'origine intacte');
  eq(moddedWeapon(GUN, []).mag, 30, 'sans atout');
  eq(moddedWeapon(GUN, ['quiet']).silenced, true, 'silencieux');
  const d = moddedDiff(DIFFICULTIES.normal, ['vest', 'bounty']);
  eq([d.enemyDmg, +d.scoreMul.toFixed(2)], [6, 1.15], 'difficulté modifiée');
  eq(DIFFICULTIES.normal.enemyDmg, 7.5, 'difficulté d\'origine intacte');
  eq(moddedDiff(DIFFICULTIES.suicide, ['breath']).regenDelay, Infinity, 'pas de régénération en Cauchemar');
  const m = combine(['leech', 'hunter', 'scavenger', 'inconnu']);
  eq([m.healOnKill, m.healOnHead, m.ammoOnKill], [6, 15, 3], 'ajouts');
} });

cases.push({ name: 'atouts : trois propositions distinctes, jamais un atout déjà pris', fn: () => {
  const owned = ['bigmag', 'heavy', 'vest'];
  for (let seed = 1; seed <= 200; seed++) {
    const o = offer(owned, rng(seed));
    if (o.length !== 3 || new Set(o).size !== 3 || o.some(id => owned.includes(id))) throw new Error(`graine ${seed} : ${o}`);
  }
  eq(offer(PERKS.map(p => p.id)).length, 0, 'plus rien à proposer');
  eq(offer(PERKS.slice(0, 14).map(p => p.id)).length, 2, 'fin de liste');
} });

cases.push({ name: 'maîtrise : trois niveaux, accessoires appliqués à l\'arme', fn: () => {
  eq([0, 24, 25, 74, 75, 150, 9999].map(masteryLevel), [0, 0, 1, 1, 2, 3, 3], 'niveaux');
  eq(MASTERY.length, 3, 'paliers');
  const w = moddedWeapon(GUN, [], 3);
  eq([w.mag, +w.reload.toFixed(2), +w.damage.toFixed(1)], [33, 1.8, 27], 'arme maîtrisée');
} });

cases.push({ name: 'crédits : gain, achat d\'arme, armes de départ toujours là', fn: () => {
  eq([creditsFor(0), creditsFor(1234), creditsFor(-5)], [0, 12, 0], 'crédits pour des points');
  const store = memStorage();
  const s = new Save(store);
  eq(START_WEAPONS.every(id => s.isUnlocked(id)), true, 'armes de départ');
  eq(s.unlock('ak47'), false, 'trop cher');
  s.addCredits(UNLOCK_COST.ak47 + 20);
  eq([s.unlock('ak47'), s.data.credits, s.isUnlocked('ak47')], [true, 20, true], 'achat');
  eq([s.unlock('ak47'), s.unlock('m4'), s.unlock('inconnue')], [false, false, false], 'achats refusés');
  s.addKills('ak47', 30);
  const again = new Save(store);
  eq([again.data.credits, again.isUnlocked('ak47'), again.kills('ak47')], [20, true, 30], 'relecture');
  const old = new Save(memStorage({ sie_save: '{"v":1,"best":{"normal":900},"unlocked":"x","credits":-4}' }));
  eq([old.best('normal'), old.data.credits, old.data.unlocked], [900, 0, START_WEAPONS], 'ancienne sauvegarde réparée');
  eq(Object.keys(UNLOCK_COST).length + START_WEAPONS.length, 9, 'les 9 armes sont couvertes');
} });

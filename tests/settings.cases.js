// Tests des réglages du joueur. S'ajoutent à la liste de tests/cases.js.
import { cases } from './cases.js';
import { SETTINGS, cleanValue, normalizeSettings } from '../src/core/settings.js';
import { Save, memStorage } from '../src/core/save.js';
import { t } from '../src/core/i18n.js';

function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
}

cases.push({ name: 'réglages : valeurs par défaut quand rien n\'est enregistré', fn: () => {
  const s = normalizeSettings(undefined);
  eq(Object.keys(s), Object.keys(SETTINGS), 'liste des réglages');
  eq([s.sens, s.assist, s.autoFire, s.gyro, s.btnScale, s.volMusic], [1, 1, false, false, 1, 1], 'valeurs');
  eq([s.quality, s.fpsCap, s.showPerf], ['auto', '60', false], 'affichage');
} });

cases.push({ name: 'réglages : valeurs bornées, valeurs absurdes remplacées', fn: () => {
  eq(cleanValue('sens', 99), SETTINGS.sens.max, 'trop grand');
  eq(cleanValue('sens', -3), SETTINGS.sens.min, 'trop petit');
  eq(cleanValue('sens', '1.5'), 1.5, 'texte numérique (curseur)');
  eq(cleanValue('sens', 'abc'), 1, 'texte quelconque');
  eq(cleanValue('volMusic', null), 1, 'valeur absente');
  eq(cleanValue('volMusic', 0), 0, 'zéro est une vraie valeur');
  eq(cleanValue('autoFire', 'oui'), false, 'booléen invalide');
  eq(cleanValue('autoFire', true), true, 'booléen valide');
  eq(cleanValue('quality', 'low'), 'low', 'choix valide');
  eq(cleanValue('quality', 'ultra'), 'auto', 'choix inconnu');
  eq(cleanValue('fpsCap', 30), '60', 'choix du mauvais type');
  eq(cleanValue('inconnu', 1), undefined, 'réglage inconnu');
  eq(normalizeSettings({ sens: 2, pirate: 1 }).pirate, undefined, 'clé inconnue écartée');
} });

cases.push({ name: 'réglages : conservés dans la sauvegarde', fn: () => {
  const store = memStorage();
  const a = new Save(store);
  a.data.settings = normalizeSettings({ sens: 1.8, autoFire: true, quality: 'high' });
  a.write();
  const b = normalizeSettings(new Save(store).data.settings);
  eq([b.sens, b.autoFire, b.volSfx, b.quality], [1.8, true, 1, 'high'], 'relecture');
} });

cases.push({ name: 'réglages : chaque réglage et chaque choix a son texte', fn: () => {
  const missing = [];
  for (const [key, def] of Object.entries(SETTINGS)) {
    const keys = [`settings.${key}`, ...(def.options || []).map(o => `settings.${key}.${o}`)];
    for (const k of keys) if (t(k) === k) missing.push(k);
  }
  eq(missing, [], 'textes manquants');
} });

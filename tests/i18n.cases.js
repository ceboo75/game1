// Tests des traductions.
import { test, eq } from './cases.js';
import { DICTS, detectLang, setLang, t, tr } from '../src/core/i18n.js';
import { BOSSES, DIFF_ORDER } from '../src/levels.js';

const vars = s => (String(s).match(/\{\w+\}/g) || []).sort().join();

test('langues : anglais et turc ont les mêmes clés et couvrent tout le français', () => {
  const en = Object.keys(DICTS.en).sort(), trKeys = Object.keys(DICTS.tr).sort();
  eq(trKeys.filter(k => !en.includes(k)), [], 'clés turques absentes de l\'anglais');
  eq(en.filter(k => !trKeys.includes(k)), [], 'clés anglaises absentes du turc');
  // les noms d'armes sont des noms propres : seuls eux peuvent manquer aux autres langues
  eq(Object.keys(DICTS.fr).filter(k => !k.startsWith('weapon.') && !en.includes(k)), [], 'clés françaises non traduites');
});

test('langues : mêmes {variables} dans toutes les langues', () => {
  const bad = [];
  for (const k of Object.keys(DICTS.en)) {
    if (vars(DICTS.en[k]) !== vars(DICTS.tr[k])) bad.push(`${k} (en/tr)`);
    if (k in DICTS.fr && vars(DICTS.en[k]) !== vars(DICTS.fr[k])) bad.push(`${k} (en/fr)`);
  }
  eq(bad, [], 'variables différentes');
});

test('langues : le contenu est traduit (boss, difficultés)', () => {
  const keys = [...Object.keys(BOSSES).map(b => `boss.${b}.title`), ...DIFF_ORDER.flatMap(d => [`diff.${d}.name`, `diff.${d}.desc`])];
  eq(keys.filter(k => !(k in DICTS.en)), [], 'contenu non traduit');
});

test('langues : choix d\'après le téléphone, repli sur le français pour une clé absente', () => {
  eq([detectLang(['tr-TR', 'en']), detectLang(['de-DE', 'fr-FR']), detectLang(['ja']), detectLang([])], ['tr', 'fr', 'en', 'en'], 'détection');
  setLang('en');
  eq([t('pause.resume'), t('weapon.m4'), tr('cle.absente', 'repli')], ['RESUME', 'Sentinelle', 'repli'], 'anglais');
  setLang('tr');
  eq(t('run.killMore', { n: 3 }), 'Kapıyı açmak için 3 düşman daha indir', 'turc');
  eq(setLang('xx'), 'tr', 'langue inconnue ignorée');
  setLang('fr');
  eq(t('pause.resume'), 'REPRENDRE', 'retour au français');
});

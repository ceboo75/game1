// Tests des traductions. S'ajoutent à la liste de tests/cases.js.
import { cases } from './cases.js';
import { DICTS, detectLang, setLang, t, tr } from '../src/core/i18n.js';
import { PERKS } from '../src/core/perks.js';
import { MISSIONS } from '../src/core/daily.js';
import { LEVELS, BOSSES, DIFF_ORDER } from '../src/levels.js';

function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
}
const vars = s => (String(s).match(/\{\w+\}/g) || []).sort().join();

cases.push({ name: 'langues : anglais et turc ont les mêmes clés et couvrent tout le français', fn: () => {
  const en = Object.keys(DICTS.en).sort(), trKeys = Object.keys(DICTS.tr).sort();
  eq(trKeys.filter(k => !en.includes(k)), [], 'clés turques absentes de l\'anglais');
  eq(en.filter(k => !trKeys.includes(k)), [], 'clés anglaises absentes du turc');
  // les noms d'armes sont des noms propres : seuls eux peuvent manquer aux autres langues
  const missing = Object.keys(DICTS.fr).filter(k => !k.startsWith('weapon.') && !en.includes(k));
  eq(missing, [], 'clés françaises non traduites');
} });

cases.push({ name: 'langues : mêmes {variables} dans toutes les langues', fn: () => {
  const bad = [];
  for (const k of Object.keys(DICTS.en)) {
    if (vars(DICTS.en[k]) !== vars(DICTS.tr[k])) bad.push(`${k} (en/tr)`);
    if (k in DICTS.fr && vars(DICTS.en[k]) !== vars(DICTS.fr[k])) bad.push(`${k} (en/fr)`);
  }
  eq(bad, [], 'variables différentes');
} });

cases.push({ name: 'langues : tout le contenu est traduit (bâtiments, étages, boss, atouts, missions, difficultés)', fn: () => {
  const keys = [];
  for (const lv of LEVELS) {
    keys.push(`level.${lv.id}.name`, `level.${lv.id}.brief`);
    lv.floors.forEach((f, i) => keys.push(`floor.${lv.id}.${i}`));
  }
  for (const b of Object.keys(BOSSES)) keys.push(`boss.${b}.title`);
  for (const p of PERKS) keys.push(`perk.${p.id}.name`, `perk.${p.id}.desc`);
  for (const m of MISSIONS) keys.push(`mission.${m.id}`);
  for (const d of DIFF_ORDER) keys.push(`diff.${d}.name`, `diff.${d}.desc`);
  for (const w of ['fn57', 'benelli', 'uzi', 'ump45', 'm4', 'ak47', 'scarh', 'sks', 'asval']) keys.push(`wtype.${w}`, `wdesc.${w}`);
  eq(keys.filter(k => !(k in DICTS.en)), [], 'contenu non traduit');
} });

cases.push({ name: 'langues : choix d\'après le téléphone, repli sur le français pour une clé absente', fn: () => {
  eq([detectLang(['tr-TR', 'en']), detectLang(['de-DE', 'fr-FR']), detectLang(['ja']), detectLang([])], ['tr', 'fr', 'en', 'en'], 'détection');
  setLang('en');
  eq([t('pause.resume'), t('weapon.m4'), tr('cle.absente', 'repli')], ['RESUME', 'Sentinelle', 'repli'], 'anglais');
  setLang('tr');
  eq(t('hud.enemies', { left: 3, total: 10 }), 'Düşman: 3 / 10', 'turc');
  eq(setLang('xx'), 'tr', 'langue inconnue ignorée');
  setLang('fr');
  eq(t('pause.resume'), 'REPRENDRE', 'retour au français');
} });

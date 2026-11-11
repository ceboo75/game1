// Tests de la logique pure. Lancés par Node (tests/run.mjs) et par le navigateur (tests/index.html).
import { comboMult, nextCombo, killPoints, COMBO_WINDOW } from '../src/core/score.js';
import { validateMap, parseMap, farSpots } from '../src/core/grid.js';
import { Save, SAVE_KEY, SAVE_VERSION, memStorage } from '../src/core/save.js';
import { t, tr } from '../src/core/i18n.js';
import { LEVELS, DIFFICULTIES, DIFF_ORDER, BOSSES, rng } from '../src/levels.js';

function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
}
function ok(cond, what) { if (!cond) throw new Error(what); }

export const cases = [];
const test = (name, fn) => cases.push({ name, fn });

/** Nombre d'ennemis normaux qu'un étage peut réellement accueillir (même règle que le chargement d'un étage). */
function capacity(fl) {
  const map = parseMap(fl.rows);
  return farSpots(map, fl.bosses?.length ? map.spawns : [...map.spawns, ...map.bossSpots]).length;
}

// ---------------------------------------------------------------- score
test('combo : x1 puis +0,5 par kill, plafonné à x3', () => {
  eq([0, 1, 2, 3, 4, 5, 6, 20].map(comboMult), [1, 1, 1.5, 2, 2.5, 3, 3, 3], 'multiplicateurs');
});
test('combo : la fenêtre de 3 secondes', () => {
  eq(nextCombo(2, COMBO_WINDOW), 3, 'kill dans la fenêtre');
  eq(nextCombo(2, COMBO_WINDOW + 0.01), 1, 'kill trop tardif');
});
test('points : 100 par ennemi, 1000 par boss, x1,5 à la tête', () => {
  eq(killPoints(), 100, 'ennemi');
  eq(killPoints({ head: true }), 150, 'ennemi, tête');
  eq(killPoints({ boss: true }), 1000, 'boss');
  eq(killPoints({ boss: true, head: true }), 1500, 'boss, tête');
  eq(killPoints({ combo: 5 }), 300, 'combo de 5');
  eq(killPoints({ head: true, combo: 2, scoreMul: 2 }), 450, 'tête, combo de 2, points x2');
});

// ---------------------------------------------------------------- hasard reproductible
test('rng : même graine, même suite, valeurs entre 0 et 1', () => {
  const a = rng(42), b = rng(42), c = rng(43);
  const sa = Array.from({ length: 50 }, () => a()), sb = Array.from({ length: 50 }, () => b());
  eq(sa, sb, 'suites');
  ok(sa.every(v => v >= 0 && v < 1), 'valeur hors de [0, 1[');
  ok(sa[0] !== c(), 'deux graines différentes donnent la même valeur');
});

// ---------------------------------------------------------------- sauvegarde
test('sauvegarde : reprise des anciennes clés', () => {
  const s = new Save(memStorage({ best_normal: '1200', best_suicide: '50', lastDiff: 'difficile', lastWeapon: 'ak47' }));
  eq(s.data.v, SAVE_VERSION, 'version');
  eq([s.best('normal'), s.best('difficile'), s.best('suicide')], [1200, 0, 50], 'records');
  eq([s.data.lastDiff, s.data.lastWeapon], ['difficile', 'ak47'], 'derniers choix');
});
test('sauvegarde : un record ne peut que monter, et il est relu', () => {
  const store = memStorage();
  const s = new Save(store);
  eq(s.submitScore('normal', 500), { prev: 0, isBest: true }, 'premier score');
  eq(s.submitScore('normal', 300), { prev: 500, isBest: false }, 'score inférieur');
  s.set('lastWeapon', 'sks');
  const again = new Save(store);
  eq([again.best('normal'), again.data.lastWeapon], [500, 'sks'], 'relecture');
});
test('sauvegarde : un contenu illisible ne fait pas planter', () => {
  const s = new Save(memStorage({ [SAVE_KEY]: '{pas du json' }));
  eq(s.best('normal'), 0, 'record');
  eq(new Save(memStorage({ [SAVE_KEY]: '{"v":1,"best":null}' })).best('normal'), 0, 'records absents');
});

// ---------------------------------------------------------------- textes
test('textes : variables, repli, clé inconnue', () => {
  eq(t('hud.objective.boss', { name: 'Kessler' }), 'Élimine Kessler', 'variable');
  eq(t('cle.inconnue'), 'cle.inconnue', 'clé inconnue');
  eq(tr('cle.inconnue', 'repli {n}', { n: 2 }), 'repli 2', 'repli');
  eq(tr('diff.suicide.name', 'Suicide'), 'Cauchemar', 'difficulté renommée');
});
test('textes : les 9 armes ont un nom', () => {
  for (const id of ['fn57', 'benelli', 'uzi', 'ump45', 'm4', 'ak47', 'scarh', 'sks', 'asval']) {
    ok(t(`weapon.${id}`) !== `weapon.${id}`, `nom manquant pour ${id}`);
  }
});

// ---------------------------------------------------------------- contenu
test('contenu : 3 bâtiments, 15 étages, 143 ennemis en jeu, 6 boss', () => {
  const floors = LEVELS.flatMap(l => l.floors);
  eq(LEVELS.map(l => l.floors.length), [2, 5, 8], 'étages par bâtiment');
  eq(floors.reduce((n, f) => n + Math.min(f.count, capacity(f)), 0), 143, 'ennemis réellement présents');
  eq(floors.reduce((n, f) => n + (f.bosses?.length || 0), 0), 6, 'boss');
  for (const f of floors) for (const b of f.bosses || []) ok(BOSSES[b], `boss inconnu : ${b}`);
  eq(DIFF_ORDER.every(id => DIFFICULTIES[id]?.id === id), true, 'difficultés');
});
test('cartes : chaque étage est jouable (sortie, ennemis et boss atteignables)', () => {
  const problems = [];
  LEVELS.forEach(lv => lv.floors.forEach((fl, i) => {
    for (const e of validateMap(fl.rows, { bosses: fl.bosses?.length || 0 })) {
      problems.push(`${lv.name}, étage ${i + 1} (${fl.name}) : ${e}`);
    }
  }));
  ok(!problems.length, '\n  ' + problems.join('\n  '));
});
// Défaut connu du contenu d'origine : 7 étages annoncent un ennemi de plus qu'ils n'ont d'emplacements
// assez loin du départ (150 annoncés, 143 présents). Les cartes seront reconstruites en phase 3 ; d'ici là
// ce test empêche l'écart de s'aggraver sans qu'on le voie. Format : « bâtiment/étage », à partir de 1.
test('cartes : écart connu entre effectifs annoncés et emplacements', () => {
  const short = [];
  LEVELS.forEach((lv, li) => lv.floors.forEach((fl, fi) => {
    const missing = fl.count - capacity(fl);
    if (missing > 0) short.push(`${li + 1}/${fi + 1}:${missing}`);
  }));
  eq(short, ['1/2:1', '2/3:1', '2/4:1', '2/5:1', '3/5:1', '3/6:1', '3/7:1'], 'étages en sous-effectif');
});
test('cartes : la validation détecte une sortie ou un ennemi muré', () => {
  eq(validateMap(['#####', '#S.e#', '#...#', '#..X#', '#####']), [], 'carte saine');
  eq(validateMap(['#####', '#S#e#', '#.c.#', '#..X#', '#####']), [], 'abri contournable');
  ok(validateMap(['#####', '#S#e#', '#.#.#', '#.#X#', '#####']).length >= 2, 'sortie et ennemi murés non détectés');
  ok(validateMap(['#####', '#S.e#', '#####']).length === 1, 'absence de sortie non détectée');
  ok(validateMap(['###', '#S#', '#X#', '###'], { count: 1 }).length === 1, "manque d'emplacements non détecté");
});

/** Lance tous les tests. Renvoie { passed, failed: [{ name, error }] }. */
export function runAll() {
  const failed = [];
  for (const c of cases) {
    try { c.fn(); } catch (e) { failed.push({ name: c.name, error: e.message }); }
  }
  return { passed: cases.length - failed.length, failed };
}

// Tests de la logique pure. Lancés par Node (tests/run.mjs) et par le navigateur (tests/index.html).
// Les autres fichiers *.cases.js ajoutent leurs tests à la même liste.
import { comboMult, nextCombo, killPoints, COMBO_WINDOW } from '../src/core/score.js';
import { validateMap } from '../src/core/grid.js';
import { Save, SAVE_KEY, SAVE_VERSION, memStorage } from '../src/core/save.js';
import { t, tr } from '../src/core/i18n.js';
import { DIFFICULTIES, DIFF_ORDER, rng } from '../src/levels.js';

export function eq(actual, expected, what = '') {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what} : attendu ${e}, obtenu ${a}`);
}
export function ok(cond, what) { if (!cond) throw new Error(what); }

export const cases = [];
export const test = (name, fn) => cases.push({ name, fn });

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
test('sauvegarde : score et distance, deux records indépendants, relus au lancement', () => {
  const store = memStorage();
  const s = new Save(store);
  eq(s.best('normal'), { score: 0, distance: 0 }, 'jamais jouée');
  eq(s.submitRun('normal', 5000, 300), { prev: { score: 0, distance: 0 }, isBestScore: true, isBestDistance: true }, 'première partie');
  eq(s.submitRun('normal', 4000, 420), { prev: { score: 5000, distance: 300 }, isBestScore: false, isBestDistance: true }, 'plus loin, moins de points');
  eq(new Save(store).best('normal'), { score: 5000, distance: 420 }, 'relecture');
  eq(new Save(store).best('difficile'), { score: 0, distance: 0 }, 'autre difficulté');
});
test('sauvegarde : passage de la version 1 à la version 2', () => {
  const v1 = { v: 1, best: { normal: 9000 }, credits: 300, unlocked: ['m4', 'ak47'], mastery: { m4: 40 }, settings: { sens: 1.5 }, lastDiff: 'difficile', tutorialDone: true };
  const s = new Save(memStorage({ [SAVE_KEY]: JSON.stringify(v1) }));
  eq(s.data.v, SAVE_VERSION, 'version');
  eq([s.data.settings.sens, s.data.lastDiff, s.data.tutorialDone], [1.5, 'difficile', true], 'réglages, difficulté et tutoriel conservés');
  eq(s.best('normal'), { score: 0, distance: 0 }, 'anciens records non repris');
  eq(['credits', 'unlocked', 'mastery', 'missions'].filter(k => k in s.data), [], 'progression retirée');
});
test('sauvegarde : un contenu illisible ou faux ne fait pas planter', () => {
  eq(new Save(memStorage({ [SAVE_KEY]: '{pas du json' })).best('normal'), { score: 0, distance: 0 }, 'illisible');
  const bad = new Save(memStorage({ [SAVE_KEY]: '{"v":2,"best":{"normal":{"score":"abc","distance":-5}},"daily":7}' }));
  eq([bad.best('normal'), bad.data.daily], [{ score: 0, distance: 0 }, null], 'valeurs absurdes');
});

// ---------------------------------------------------------------- textes
test('textes : variables, repli, clé inconnue', () => {
  eq(t('row.comboKills', { n: 4 }), '4 kills', 'variable');
  eq(t('cle.inconnue'), 'cle.inconnue', 'clé inconnue');
  eq(tr('cle.inconnue', 'repli {n}', { n: 2 }), 'repli 2', 'repli');
  eq(tr('diff.suicide.name', 'Suicide'), 'Cauchemar', 'difficulté renommée');
});
test('textes : les 9 armes ont un nom', () => {
  for (const id of ['fn57', 'benelli', 'uzi', 'ump45', 'm4', 'ak47', 'scarh', 'sks', 'asval']) {
    ok(t(`weapon.${id}`) !== `weapon.${id}`, `nom manquant pour ${id}`);
  }
});
test('difficultés : trois, dans l\'ordre', () => {
  eq(DIFF_ORDER, ['normal', 'difficile', 'suicide'], 'ordre');
  ok(DIFF_ORDER.every(id => DIFFICULTIES[id]?.id === id), 'définitions');
});

// ---------------------------------------------------------------- validation d'une carte
test('cartes : la validation détecte une sortie ou un ennemi muré', () => {
  eq(validateMap(['#####', '#S.e#', '#...#', '#..X#', '#####']), [], 'carte saine');
  eq(validateMap(['#####', '#S#e#', '#.c.#', '#..X#', '#####']), [], 'abri contournable');
  ok(validateMap(['#####', '#S#e#', '#.#.#', '#.#X#', '#####']).length >= 2, 'sortie et ennemi murés non détectés');
  ok(validateMap(['#####', '#S.e#', '#####']).length === 1, 'absence de sortie non détectée');
});

/** Lance tous les tests. Renvoie { passed, failed: [{ name, error }] }. */
export function runAll() {
  const failed = [];
  for (const c of cases) {
    try { c.fn(); } catch (e) { failed.push({ name: c.name, error: e.message }); }
  }
  return { passed: cases.length - failed.length, failed };
}

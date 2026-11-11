// Textes du jeu par langue. Une clé absente de la langue courante retombe sur le français.
import fr from '../lang/fr.js';
import en from '../lang/en.js';
import tr_ from '../lang/tr.js';

export const DICTS = { fr, en, tr: tr_ };
const LOCALES = { fr: 'fr-FR', en: 'en-US', tr: 'tr-TR' };
let lang = 'fr';

export function setLang(code) { if (DICTS[code]) lang = code; return lang; }
export const getLang = () => lang;
export const locale = () => LOCALES[lang] || 'fr-FR';

/** Langue à utiliser d'après celles du téléphone : la première qui est traduite, sinon l'anglais. */
export function detectLang(preferred = []) {
  for (const p of preferred) {
    const code = String(p).slice(0, 2).toLowerCase();
    if (DICTS[code]) return code;
  }
  return 'en';
}

const lookup = key => DICTS[lang][key] ?? DICTS.fr[key];
const fill = (s, vars) => (vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : String(s));

/** Texte d'une clé, avec remplacement des {variables}. Une clé inconnue est renvoyée telle quelle. */
export function t(key, vars) {
  const s = lookup(key);
  return s === undefined ? key : fill(s, vars);
}

/** Comme t(), mais avec une valeur de repli (texte français encore écrit dans le code ou les fichiers de contenu). */
export function tr(key, fallback, vars) {
  const s = lookup(key);
  return fill(s === undefined ? fallback : s, vars);
}

/** Remplit les éléments marqués data-i18n (texte) et data-i18n-aria (libellé d'accessibilité). */
export function applyDom(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
}

// Textes du contenu (boss, difficultés) : pris dans la langue du joueur par identifiant,
// avec repli sur le texte français écrit dans les fichiers de contenu.
import { tr } from '../core/i18n.js';

export const bossTitle = (key, def) => tr(`boss.${key}.title`, def.title);
export const diffDesc = d => tr(`diff.${d.id}.desc`, d.desc);

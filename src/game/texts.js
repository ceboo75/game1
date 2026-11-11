// Textes du contenu (bâtiments, étages, boss, armes, difficultés) : pris dans la langue du joueur par identifiant,
// avec repli sur le texte français écrit dans les fichiers de contenu.
import { tr } from '../core/i18n.js';

export const levelName = lv => tr(`level.${lv.id}.name`, lv.name);
export const levelBrief = lv => tr(`level.${lv.id}.brief`, lv.brief);
export const floorName = (lv, i) => tr(`floor.${lv.id}.${i}`, lv.floors[i].name);
export const bossTitle = (key, def) => tr(`boss.${key}.title`, def.title);
export const weaponType = w => tr(`wtype.${w.id}`, w.type);
export const weaponDesc = w => tr(`wdesc.${w.id}`, w.desc);
export const diffDesc = d => tr(`diff.${d.id}.desc`, d.desc);
export const barLabel = label => tr(`bar.${label}`, label);

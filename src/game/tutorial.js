// Tutoriel de la toute première partie : une consigne à la fois, qui passe à la suivante quand le geste est fait.
// Aucun écran de texte : le joueur apprend en jouant le premier étage de la Villa.
import { game, save } from './state.js';
import { doorState } from './doors.js';
import { showHint } from './story.js';
import { tr } from '../core/i18n.js';

const STEPS = [
  { id: 'move', text: 'Pouce gauche : glisse pour te déplacer', done: s => s.moved > 3 },
  { id: 'look', text: 'Pouce droit : glisse pour regarder autour de toi', done: s => s.turned > 1.2 },
  { id: 'door', text: 'Avance jusqu’à la porte pour l’enfoncer', done: () => doorState().open > 0 },
  { id: 'fire', text: 'Bouton rouge : tire. À la tête, les dégâts sont triplés', done: s => s.kills > 0 },
  { id: 'aim', text: 'Bouton bleu : vise pour être plus précis', done: s => s.aimed },
  { id: 'combo', text: 'Enchaîne deux éliminations en moins de 3 secondes : c’est le combo', done: s => s.combo >= 2 },
  { id: 'exit', text: 'Nettoie l’étage, puis rejoins l’escalier au fond', done: () => false },
];

let step = 0, shown = -1, runSeed = null;
let seen = { moved: 0, turned: 0, kills: 0, aimed: false, combo: 0 };
const last = { x: 0, z: 0, yaw: 0 };

/** Vrai tant que le joueur n'a jamais terminé le premier étage. */
export const tutorialPending = () => !save.data.tutorialDone;

/** À appeler à chaque image de jeu. */
export function updateTutorial() {
  const run = game.run;
  if (!run || !tutorialPending() || run.daily) return;
  const p = game.player;

  if (run.seed !== runSeed) { // nouvelle partie : on reprend au début
    runSeed = run.seed;
    step = 0; shown = -1;
    seen = { moved: 0, turned: 0, kills: game.stats.kills, aimed: false, combo: 0 };
    last.x = p.pos.x; last.z = p.pos.z; last.yaw = p.yaw;
  }
  // le premier étage est passé : le tutoriel est acquis pour de bon
  if (run.levelIdx > 0 || run.floorIdx > 0) {
    save.set('tutorialDone', true);
    showHint(null);
    return;
  }

  const jump = Math.hypot(p.pos.x - last.x, p.pos.z - last.z);
  if (jump < 1) seen.moved += jump; // un grand saut est un changement d'étage, pas un déplacement
  seen.turned += Math.abs(p.yaw - last.yaw);
  last.x = p.pos.x; last.z = p.pos.z; last.yaw = p.yaw;
  const state = {
    moved: seen.moved, turned: seen.turned,
    kills: game.stats.kills - seen.kills,
    aimed: seen.aimed ||= !!(game.ws && game.ws.ads),
    combo: seen.combo = Math.max(seen.combo, game.combo.count),
  };

  while (step < STEPS.length - 1 && STEPS[step].done(state)) step++;
  if (step !== shown) {
    shown = step;
    showHint(tr(`tuto.${STEPS[step].id}`, STEPS[step].text));
  }
}

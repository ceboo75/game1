// Tutoriel de la toute première partie : une consigne à la fois, qui passe à la suivante quand le geste est fait.
// Aucun écran de texte : le joueur apprend en jouant les premières salles.
import { game, save } from './state.js';
import { showHint } from './story.js';
import { t } from '../core/i18n.js';
import { ROOM_TIME } from '../content/endless.js';

const DONE_ROOM = 2; // le tutoriel est acquis une fois la salle 3 atteinte
const STEPS = [
  { id: 'move', done: s => s.moved > 3 },
  { id: 'look', done: s => s.turned > 1.2 },
  { id: 'fire', done: s => s.kills > 0 },
  { id: 'aim', done: s => s.aimed },
  { id: 'door', done: s => s.room > 0 },
  { id: 'timer', done: () => false },
];

let step = 0, shown = -1, runSeed = null;
let seen = { moved: 0, turned: 0, aimed: false };
const last = { x: 0, yaw: 0, z: 0 };

/** Vrai tant que le joueur n'a jamais atteint la troisième salle. */
export const tutorialPending = () => !save.data.tutorialDone;

/** À chaque image de jeu. */
export function updateTutorial() {
  const run = game.run;
  if (!run || !tutorialPending() || run.daily) return;
  const p = game.player;
  if (run.seed !== runSeed) { // nouvelle partie : on reprend au début
    runSeed = run.seed;
    step = 0; shown = -1;
    seen = { moved: 0, turned: 0, aimed: false };
    last.x = p.pos.x; last.z = p.pos.z; last.yaw = p.yaw;
  }
  if (run.room >= DONE_ROOM) { save.set('tutorialDone', true); showHint(null); return; }

  seen.moved += Math.hypot(p.pos.x - last.x, p.pos.z - last.z);
  seen.turned += Math.abs(p.yaw - last.yaw);
  seen.aimed ||= !!(game.ws && game.ws.ads);
  last.x = p.pos.x; last.z = p.pos.z; last.yaw = p.yaw;
  const state = { ...seen, kills: game.stats.kills, room: run.room };
  while (step < STEPS.length - 1 && STEPS[step].done(state)) step++;
  if (step !== shown) {
    shown = step;
    showHint(t(`tuto.${STEPS[step].id}`, { n: ROOM_TIME }));
  }
}

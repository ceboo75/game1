// Sons liés à l'état du joueur : pas selon le sol, battement de cœur et son étouffé à faible vie.
// Comme viewmodel.js, ce module observe l'état du jeu à chaque image au lieu de recevoir des événements.
import { LEVELS } from '../levels.js';
import { game, sfx } from './state.js';

const SURFACES = { villa: 'wood', hotel: 'carpet', tower: 'tile' };
const LOW_HEALTH = 40;
let lastStep = 0, beatIn = 0;

/** À appeler à chaque image de jeu, après la mise à jour du combat. */
export function updateAmbience(dt) {
  const p = game.player;

  // un pas à chaque demi-cycle du balancement de la marche ; plus discret en visant
  const step = Math.floor(p.bobT / Math.PI);
  if (step !== lastStep) {
    lastStep = step;
    if (p.moving) {
      const theme = game.run ? LEVELS[game.run.levelIdx].theme : 'villa';
      sfx.footstep(SURFACES[theme] || 'wood', game.ws && game.ws.ads ? 0.6 : 1);
    }
  }

  sfx.setHealth(p.health);
  if (p.health < LOW_HEALTH && p.health > 0) {
    beatIn -= dt;
    if (beatIn <= 0) {
      beatIn = 0.55 + p.health / 100; // le cœur s'emballe quand la vie baisse
      sfx.heartbeat(1 - p.health / LOW_HEALTH);
    }
  } else beatIn = 0;
}

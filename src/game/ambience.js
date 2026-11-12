// Sons liés à l'état du joueur : pas selon le sol, battement de cœur et son étouffé à faible vie.
// Comme viewmodel.js, ce module observe l'état du jeu à chaque image au lieu de recevoir des événements.
import { game, sfx } from './state.js';

// Sol de chaque bâtiment et niveau de ses pas. Mesuré en sortie de mixage : sans cette correction, la moquette
// et le carrelage sont presque inaudibles à côté du parquet. À reporter dans audio.js à sa prochaine réécriture.
const SURFACES = {
  villa: { kind: 'wood', level: 1 },
  hotel: { kind: 'carpet', level: 4 },
  tower: { kind: 'tile', level: 4 },
};
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
      const room = game.world && game.world.roomAt(p.pos.x);
      const surface = SURFACES[room ? room.theme : 'villa'] || SURFACES.villa;
      sfx.footstep(surface.kind, surface.level * (game.ws && game.ws.ads ? 0.6 : 1));
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

// Atouts et progression en jeu : écran de choix entre deux étages, application des effets,
// soins et munitions gagnés sur les éliminations, crédits et maîtrise versés à la sauvegarde.
import { DIFFICULTIES } from '../levels.js';
import { weaponById } from '../weapons.js';
import { $, game, save, input } from './state.js';
import { perkById, offer, combine, moddedWeapon, moddedDiff, masteryLevel, creditsFor } from '../core/perks.js';
import { tr } from '../core/i18n.js';

let screen = null;
let seen = { kills: 0, heads: 0 };

/** Recalcule l'arme et la difficulté de la partie à partir des atouts pris et de la maîtrise de l'arme. */
export function applyRunMods() {
  const perks = game.run ? game.run.perks : [];
  const base = weaponById(game.weapon.id);
  game.weapon = moddedWeapon(base, perks, masteryLevel(save.kills(base.id)));
  game.diff = moddedDiff(DIFFICULTIES[game.diff.id], perks);
  game.mods = combine(perks);
  if (game.ws) game.ws.ammo = Math.min(game.ws.ammo, game.weapon.mag);
}

/**
 * Propose trois atouts, puis appelle `then` une fois le choix fait.
 * Passe directement à la suite en test automatique ou quand tous les atouts sont pris.
 */
export function choosePerk(then) {
  const options = offer(game.run.perks);
  if (game.debug.instant || !options.length) { then(); return; }
  game.state = 'perk';
  input.enabled = false;
  input.reset();

  if (!screen) {
    screen = document.createElement('div');
    screen.id = 'screenPerk';
    screen.className = 'screen hidden';
    $('app').appendChild(screen);
  }
  screen.innerHTML = `<div class="title small">${tr('perk.title', 'CHOISIS UN ATOUT')}</div><div class="perkRow"></div>`;
  const row = screen.querySelector('.perkRow');
  for (const id of options) {
    const perk = perkById(id);
    const card = document.createElement('button');
    card.className = 'perkCard';
    card.innerHTML = `<b>${tr(`perk.${id}.name`, perk.name)}</b><span>${tr(`perk.${id}.desc`, perk.desc)}</span>`;
    card.addEventListener('click', () => {
      game.run.perks.push(id);
      applyRunMods();
      screen.classList.add('hidden');
      then();
    });
    row.appendChild(card);
  }
  screen.classList.remove('hidden');
}

/** À appeler à chaque image de jeu : effets des atouts déclenchés par les éliminations, et compte pour la maîtrise. */
export function updatePerks() {
  const st = game.stats, run = game.run;
  if (!st || !run) return;
  const kills = st.kills - seen.kills, heads = st.headshots - seen.heads;
  seen = { kills: st.kills, heads: st.headshots };
  if (kills <= 0) return; // rien de neuf, ou nouvelle partie (compteurs repartis de zéro)

  const id = game.weapon.id;
  run.pendingKills[id] = (run.pendingKills[id] || 0) + kills;

  const m = game.mods, p = game.player, ws = game.ws;
  if (!m) return;
  const heal = kills * m.healOnKill + Math.max(0, heads) * m.healOnHead;
  if (heal && p.health > 0) p.health = Math.min(100, p.health + heal);
  if (m.ammoOnKill && ws && !ws.reloading) ws.ammo = Math.min(game.weapon.mag, ws.ammo + kills * m.ammoOnKill);
}

/** Verse à la sauvegarde les crédits et les éliminations gagnés depuis le dernier versement. Renvoie les crédits versés. */
export function bankRun() {
  const run = game.run, st = game.stats;
  if (!run || !st) return 0;
  const gained = creditsFor(st.points - run.bankedPoints);
  run.bankedPoints = st.points;
  save.addCredits(gained);
  for (const [id, n] of Object.entries(run.pendingKills)) save.addKills(id, n);
  run.pendingKills = {};
  return gained;
}

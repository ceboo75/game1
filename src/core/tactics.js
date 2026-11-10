// Jetons d'attaque : seuls quelques ennemis à la fois ont le droit de tirer pour toucher.
// Les autres continuent de tirer, mais à côté : la pression reste, le combat à dix reste lisible et juste.
// Logique pure, testée automatiquement.

/** Nombre d'ennemis qui peuvent viser juste en même temps, par difficulté. Les boss ne comptent pas. */
export const MAX_SHOOTERS = { normal: 2, difficile: 3, suicide: 4 };

export class AttackTokens {
  constructor() { this.holders = new Set(); }

  /**
   * Demande le droit de tirer juste. Vrai si l'ennemi l'a déjà ou s'il reste une place.
   * @param roster ennemis de l'étage en cours : les jetons des morts et des étages précédents sont repris
   */
  request(enemy, max, roster) {
    for (const h of this.holders) if (!h.alive || !roster.includes(h)) this.holders.delete(h);
    if (this.holders.has(enemy)) return true;
    if (this.holders.size >= max) return false;
    this.holders.add(enemy);
    return true;
  }

  release(enemy) { this.holders.delete(enemy); }
}

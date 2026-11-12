// Ennemis spécialisés, ajoutés aux trois types de base. Leur arrivée dans la fuite est réglée dans content/endless.js.

export const EXTRA_TYPES = {
  // Avance derrière un bouclier qui arrête les balles : viser la tête, les pieds, ou le contourner.
  shield: {
    id: 'shield', hp: 150, speed: 2.7, pref: [3, 6], weapon: 'rifle', points: 100,
    suit: 0x1b2230, shirt: 0x10141c, tie: null, visor: 0x22e4ff, scale: 1.04, helmet: true, vest: true, shield: true,
  },
  // Fragile, reste loin, un tir très dangereux annoncé par un laser.
  sniper: {
    id: 'sniper', hp: 70, speed: 2.8, pref: [16, 26], weapon: 'marksman', points: 100,
    suit: 0x3a3340, shirt: 0xd8d8e0, tie: 0x202028, visor: 0xff1030, scale: 0.98,
  },
};

// Caractéristiques des 9 armes. Leur modèle 3D est construit par game/gunmodel.js.
// Valeurs de départ, à équilibrer en jouant.
//  damage      dégâts par balle (par plomb pour le fusil à pompe) ; la tête prend x3
//  rpm         cadence en coups par minute
//  spread      dispersion de base (degrés) ; spreadPerShot / maxSpread : ouverture en rafale
//  recoil      recul visuel du viseur
//  reload      temps de rechargement (s) ; shellReload : cartouche par cartouche
//  speed       multiplicateur de vitesse de déplacement (poids de l'arme)
//  range       portée efficace (m) ; au-delà les dégâts baissent jusqu'à minFalloff
export const WEAPONS = [
  {
    id: 'fn57', name: 'FN-57', type: 'Pistolet', desc: 'Très maniable, rechargement rapide. La plus mobile de toutes.',
    mag: 20, rpm: 420, damage: 26, pellets: 1, spread: 0.8, spreadPerShot: 0.5, maxSpread: 4, recoil: 0.5,
    reload: 1.2, speed: 1.15, range: 25, minFalloff: 0.5,
    sound: { freq: 2600, decay: 0.11, thump: 150 }, model: { kind: 'pistol', color: 0x2b2b30 },
  },
  {
    id: 'benelli', name: 'Benelli', type: 'Fusil à pompe', desc: 'Un tir suffit au contact, inutile à distance. Recharge cartouche par cartouche.',
    mag: 7, rpm: 140, damage: 17, pellets: 9, spread: 5.5, spreadPerShot: 0, maxSpread: 5.5, recoil: 3.0,
    reload: 0.45, shellReload: true, speed: 0.95, range: 8, minFalloff: 0.1,
    sound: { freq: 1300, decay: 0.35, thump: 80 }, model: { kind: 'shotgun', len: 0.5, barrel: 0.34, color: 0x1d1d22 },
  },
  {
    id: 'uzi', name: 'Uzi', type: 'Pistolet-mitrailleur', desc: 'Arrose tout de près, imprécis au-delà.',
    mag: 32, rpm: 950, damage: 17, pellets: 1, spread: 2.4, spreadPerShot: 0.35, maxSpread: 7, recoil: 0.8,
    reload: 1.7, speed: 1.1, range: 14, minFalloff: 0.45,
    sound: { freq: 3000, decay: 0.08, thump: 150 }, model: { kind: 'smg', len: 0.26, barrel: 0.06, mag: 'grip', color: 0x26262b },
  },
  {
    id: 'ump45', name: 'UMP45', type: 'Pistolet-mitrailleur', desc: 'Le pistolet-mitrailleur le plus puissant.',
    mag: 25, rpm: 650, damage: 27, pellets: 1, spread: 1.8, spreadPerShot: 0.4, maxSpread: 6, recoil: 1.1,
    reload: 2.0, speed: 1.05, range: 18, minFalloff: 0.5,
    sound: { freq: 2200, decay: 0.1, thump: 120 }, model: { kind: 'smg', len: 0.38, barrel: 0.08, mag: 'straight', stock: true, color: 0x1f1f24 },
  },
  {
    id: 'm4', name: 'M4', type: "Fusil d'assaut", desc: 'Polyvalent et facile à contrôler.',
    mag: 30, rpm: 800, damage: 26, pellets: 1, spread: 1.0, spreadPerShot: 0.25, maxSpread: 4.5, recoil: 0.9,
    reload: 2.1, speed: 1.0, range: 40, minFalloff: 0.6,
    sound: { freq: 2800, decay: 0.12, thump: 120 }, model: { kind: 'rifle', len: 0.42, barrel: 0.26, mag: 'straight', stock: true, color: 0x24242b },
  },
  {
    id: 'ak47', name: 'AK47', type: "Fusil d'assaut", desc: 'Puissant, difficile à tenir. Un headshot suffit.',
    mag: 30, rpm: 600, damage: 35, pellets: 1, spread: 1.4, spreadPerShot: 0.5, maxSpread: 6.5, recoil: 1.8,
    reload: 2.4, speed: 0.95, range: 40, minFalloff: 0.6,
    sound: { freq: 2000, decay: 0.16, thump: 100 }, model: { kind: 'rifle', len: 0.44, barrel: 0.28, mag: 'curved', stock: true, wood: true, color: 0x2a2a2c },
  },
  {
    id: 'scarh', name: 'SCAR-H', type: 'Fusil de combat', desc: 'Chargeur court mais frappe très fort.',
    mag: 20, rpm: 550, damage: 46, pellets: 1, spread: 1.2, spreadPerShot: 0.6, maxSpread: 6, recoil: 2.2,
    reload: 2.5, speed: 0.9, range: 50, minFalloff: 0.7,
    sound: { freq: 1700, decay: 0.22, thump: 85 }, model: { kind: 'rifle', len: 0.46, barrel: 0.3, mag: 'straight', stock: true, color: 0x6e5c40 },
  },
  {
    id: 'sks', name: 'SKS', type: 'Fusil semi-auto', desc: 'Précis à distance. Un headshot suffit toujours.',
    mag: 10, rpm: 300, damage: 58, pellets: 1, spread: 0.3, spreadPerShot: 0.8, maxSpread: 3, recoil: 1.6,
    reload: 2.6, speed: 0.92, range: 60, minFalloff: 0.8,
    sound: { freq: 2000, decay: 0.25, thump: 90 }, model: { kind: 'rifle', len: 0.5, barrel: 0.36, mag: 'none', stock: true, wood: true, color: 0x2a2a2c },
  },
  {
    id: 'asval', name: 'AS-VAL', type: 'Fusil silencieux', desc: "Silencieux : les ennemis éloignés n'entendent pas tes tirs.",
    mag: 20, rpm: 900, damage: 25, pellets: 1, spread: 1.4, spreadPerShot: 0.35, maxSpread: 5, recoil: 0.7,
    reload: 2.0, speed: 1.0, range: 22, minFalloff: 0.5, silenced: true,
    sound: null, model: { kind: 'rifle', len: 0.38, barrel: 0, suppressor: 0.34, mag: 'straight', stock: true, color: 0x1b1b1f },
  },
];

// Visée : zoom x2,5 avec lunette pour les armes de précision, x1,5 avec point rouge pour les autres.
// adsSpread : dispersion restante en visée (le fusil à pompe reste large).
const SCOPED = ['sks', 'scarh', 'asval'];
for (const w of WEAPONS) {
  w.zoom = SCOPED.includes(w.id) ? 2.5 : 1.5;
  w.reticle = SCOPED.includes(w.id) ? 'scope' : w.id === 'benelli' ? 'ring' : 'dot';
  w.adsSpread = w.id === 'benelli' ? 0.75 : 0.35;
}

export const weaponById = id => WEAPONS.find(w => w.id === id) || WEAPONS[4];

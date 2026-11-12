// Signaux sonores de combat. Ceux qui désignent un ennemi sont placés à gauche ou à droite selon sa position :
// alerte d'un ennemi qui vient de repérer le joueur, annonce d'une rafale dangereuse, balle qui siffle.
// pan : -1 (tout à gauche) à 1 (tout à droite).

function pannedOut(sfx, pan) {
  const p = sfx.ctx.createStereoPanner();
  p.pan.value = Math.min(1, Math.max(-1, pan));
  p.connect(sfx.world);
  return p;
}

function envelope(sfx, t, gain, decay, dest) {
  const g = sfx.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.004 + decay);
  g.connect(dest);
  return g;
}

function blip(sfx, dest, t, type, from, to, gain, decay) {
  const osc = sfx.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + decay);
  osc.connect(envelope(sfx, t, gain, decay, dest));
  osc.start(t);
  osc.stop(t + decay + 0.06);
}

/** Bruit filtré dont la fréquence glisse de `from` à `to`. */
function sweep(sfx, dest, t, type, q, from, to, gain, decay) {
  const c = sfx.ctx;
  const src = c.createBufferSource();
  src.buffer = sfx.noise;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + decay);
  src.connect(f);
  f.connect(envelope(sfx, t, gain, decay, dest));
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.08);
}

/** Un ennemi vient de repérer le joueur : deux notes brèves de radio, plus faibles de loin. */
export function alertBark(sfx, pan, dist) {
  if (!sfx.ok) return;
  const out = pannedOut(sfx, pan), t = sfx.now;
  const gain = 0.16 * Math.max(0.25, 1 - dist / 40);
  blip(sfx, out, t, 'square', 520, 560, gain, 0.07);
  blip(sfx, out, t + 0.09, 'square', 780, 820, gain, 0.09);
}

/** Un ennemi s'apprête à tirer pour toucher : note montante, juste avant la rafale. */
export function telegraph(sfx, pan) {
  if (!sfx.ok) return;
  blip(sfx, pannedOut(sfx, pan), sfx.now, 'sine', 1200, 1900, 0.13, 0.12);
}

/** Une balle passe tout près : sifflement bref. */
export function whizz(sfx, pan) {
  if (!sfx.ok) return;
  sweep(sfx, pannedOut(sfx, pan), sfx.now + 0.02, 'bandpass', 6, 3200, 900, 0.28, 0.12);
}

/** Une balle du joueur frappe un mur ou un meuble : claquement sec, plus faible de loin. */
export function impact(sfx, dist) {
  if (!sfx.ok || dist > 30) return;
  const t = sfx.now + Math.min(dist / 340, 0.08);
  sweep(sfx, sfx.world, t, 'bandpass', 2.5, 2100, 1200, 0.16 * (1 - dist / 40), 0.035);
}

/** Série d'éliminations : arpège qui monte d'un cran à chaque palier. */
export function streakSound(sfx, combo) {
  if (!sfx.ok) return;
  const t = sfx.now, base = 440 * Math.pow(2, Math.min(combo - 2, 6) / 6);
  [1, 1.26, 1.5, 2].forEach((f, i) => blip(sfx, sfx.master, t + i * 0.05, 'triangle', base * f, base * f * 1.01, 0.16, 0.14));
}

/** Compte à rebours : un bip par seconde sur les cinq dernières, plus grave à zéro. */
export function tick(sfx, sec) {
  if (!sfx.ok) return;
  if (sec === 0) blip(sfx, sfx.master, sfx.now, 'square', 220, 180, 0.16, 0.35);
  else blip(sfx, sfx.master, sfx.now, 'square', 880, 880, 0.08, 0.05);
}

// Signaux sonores de combat, placés à gauche ou à droite selon la position de l'ennemi :
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
  const c = sfx.ctx, t = sfx.now + 0.02;
  const src = c.createBufferSource();
  src.buffer = sfx.noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 6;
  f.frequency.setValueAtTime(3200, t);
  f.frequency.exponentialRampToValueAtTime(900, t + 0.12);
  src.connect(f);
  f.connect(envelope(sfx, t, 0.28, 0.12, pannedOut(sfx, pan)));
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.2);
}

// Sons synthétisés avec Web Audio (aucun fichier audio).
export class Sfx {
  constructor() { this.ctx = null; }

  /** À appeler sur un geste de l'utilisateur (exigence des navigateurs). */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain();
    this.master.gain.value = 0.7;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 5;
    this.master.connect(comp); comp.connect(c.destination);
    const len = c.sampleRate;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  get ok() { return !!this.ctx && this.ctx.state === 'running'; }
  get now() { return this.ctx.currentTime; }

  _env(t, gain, attack, decay) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.master);
    return g;
  }

  _noise(t, { type = 'lowpass', freq = 2000, q = 0.7, gain = 0.5, attack = 0.002, decay = 0.1, sweep = null } = {}) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + attack + decay);
    src.connect(f); f.connect(this._env(t, gain, attack, decay));
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + decay + 0.05);
  }

  _tone(t, { type = 'sine', freq = 440, to = null, gain = 0.3, attack = 0.002, decay = 0.1 } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    o.connect(this._env(t, gain, attack, decay));
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  }

  shot(w) {
    if (!this.ok) return;
    const t = this.now, s = w.sound;
    if (w.silenced) {
      this._noise(t, { type: 'bandpass', freq: 1500, q: 0.8, gain: 0.45, decay: 0.07 });
      this._noise(t, { type: 'highpass', freq: 4000, gain: 0.12, decay: 0.03 });
      this._tone(t, { type: 'triangle', freq: 300, to: 120, gain: 0.18, decay: 0.05 });
      return;
    }
    this._noise(t, { freq: s.freq, sweep: s.freq * 0.25, gain: 1.0, decay: s.decay });
    this._noise(t, { type: 'highpass', freq: 3500, gain: 0.25, decay: s.decay * 0.3 });
    this._tone(t, { freq: s.thump, to: 38, gain: 0.8, decay: s.decay * 0.9 });
    // queue de réverbération courte (intérieur)
    this._noise(t + 0.03, { freq: 900, gain: 0.12, attack: 0.02, decay: s.decay * 2.5 });
  }

  enemyShot(dist, kind = 'rifle') {
    if (!this.ok) return;
    const t = this.now + Math.min(dist / 340, 0.15);
    const k = Math.max(0.12, 1 - dist / 45);
    const p = {
      rifle: { freq: 1800, decay: 0.14, thump: 110 },
      lmg: { freq: 1500, decay: 0.12, thump: 95 },
      shotgun: { freq: 1100, decay: 0.3, thump: 75 },
      marksman: { freq: 2400, decay: 0.4, thump: 80 },
    }[kind] || { freq: 1800, decay: 0.14, thump: 110 };
    this._noise(t, { freq: p.freq * k + 400, gain: 0.55 * k, decay: p.decay });
    this._tone(t, { freq: p.thump, to: 40, gain: 0.4 * k, decay: p.decay * 0.9 });
  }

  /** Alerte : l'escalier ou la sortie est verrouillé. */
  denied() {
    if (!this.ok) return;
    const t = this.now;
    this._tone(t, { type: 'square', freq: 220, gain: 0.12, decay: 0.12 });
    this._tone(t + 0.13, { type: 'square', freq: 180, gain: 0.12, decay: 0.16 });
  }

  /** Changement d'étage. */
  stairs() {
    if (!this.ok) return;
    const t = this.now;
    for (let i = 0; i < 4; i++) this._noise(t + i * 0.11, { freq: 700, gain: 0.25, decay: 0.08 });
  }

  /** Boss abattu : gong grave. */
  bossDown() {
    if (!this.ok) return;
    const t = this.now;
    this._tone(t, { type: 'sine', freq: 82, to: 60, gain: 0.7, decay: 1.6 });
    this._tone(t, { type: 'triangle', freq: 330, gain: 0.2, decay: 1.2 });
    this._tone(t, { type: 'triangle', freq: 494, gain: 0.14, decay: 1.0 });
  }

  /** Touche sans tuer : petit « tic » sec. */
  hit() {
    if (!this.ok) return;
    const t = this.now;
    this._tone(t, { type: 'square', freq: 2300, gain: 0.07, decay: 0.03 });
    this._noise(t, { type: 'highpass', freq: 5000, gain: 0.12, decay: 0.025 });
  }

  /** Élimination : impact grave + note qui monte avec le combo. */
  kill(combo = 1) {
    if (!this.ok) return;
    const t = this.now, up = 1 + Math.min(combo - 1, 6) * 0.09;
    this._tone(t, { freq: 160, to: 70, gain: 0.55, decay: 0.16 });
    this._noise(t, { freq: 900, gain: 0.25, decay: 0.06 });
    this._tone(t + 0.015, { type: 'triangle', freq: 700 * up, gain: 0.16, decay: 0.12 });
    this._tone(t + 0.07, { type: 'triangle', freq: 1050 * up, gain: 0.13, decay: 0.16 });
  }

  /** Headshot : tintement métallique en plus du son d'élimination. */
  headshot(combo = 1) {
    if (!this.ok) return;
    this.kill(combo);
    const t = this.now;
    this._tone(t, { type: 'triangle', freq: 1760, gain: 0.22, decay: 0.5 });
    this._tone(t, { type: 'sine', freq: 2640, gain: 0.12, decay: 0.38 });
    this._tone(t, { type: 'sine', freq: 3960, gain: 0.05, decay: 0.25 });
  }

  click(freq = 3000, gain = 0.3) {
    if (!this.ok) return;
    this._noise(this.now, { type: 'highpass', freq, gain, decay: 0.03 });
  }

  empty() {
    if (!this.ok) return;
    this._tone(this.now, { type: 'square', freq: 1400, gain: 0.08, decay: 0.02 });
  }

  hurt() {
    if (!this.ok) return;
    const t = this.now;
    this._noise(t, { freq: 500, gain: 0.5, decay: 0.12 });
    this._tone(t, { freq: 120, to: 55, gain: 0.45, decay: 0.16 });
  }

  extract() {
    if (!this.ok) return;
    const t = this.now;
    [523, 659, 784, 1047].forEach((f, i) => this._tone(t + i * 0.09, { type: 'triangle', freq: f, gain: 0.2, decay: 0.35 }));
  }

  death() {
    if (!this.ok) return;
    const t = this.now;
    this._tone(t, { type: 'sawtooth', freq: 220, to: 40, gain: 0.3, decay: 1.2 });
    this._noise(t, { freq: 400, gain: 0.4, decay: 0.6 });
  }
}

// Bruitages synthétisés avec Web Audio (aucun fichier audio) et mixage général.
//
// Chaîne du son :
//   bruits du monde -> world -> filtre « faible vie » -> master (volume des bruitages) -> limiteur -> sortie
//   bruits d'interface (touches, kills) -----------------> master
//   réverbération d'intérieur -> world
//   musique -> musicBus (s'efface sous les tirs) -> filtre « faible vie » -> limiteur
export class Sfx {
  constructor() { this.ctx = null; }

  /** À appeler sur un geste de l'utilisateur (exigence des navigateurs). */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();

    const limiter = this.limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -8; limiter.knee.value = 6; limiter.ratio.value = 12;
    limiter.attack.value = 0.002; limiter.release.value = 0.12;
    limiter.connect(c.destination);

    this.master = c.createGain(); // volume des bruitages, réglé par le joueur
    this.master.gain.value = 0.7;
    this.master.connect(limiter);

    const lowpass = () => { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 18000; f.Q.value = 0.5; return f; };
    this.worldTone = lowpass();
    this.worldTone.connect(this.master);
    this.world = c.createGain();
    this.world.connect(this.worldTone);

    this.musicTone = lowpass();
    this.musicTone.connect(limiter);
    this.musicBus = c.createGain();
    this.musicBus.connect(this.musicTone);

    // réverbération : réponse d'une pièce fabriquée à partir de bruit qui s'éteint
    const rate = c.sampleRate, irLen = Math.floor(rate * 0.9), fadeIn = rate * 0.004;
    const ir = c.createBuffer(2, irLen, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2) * Math.min(1, i / fadeIn);
    }
    this.reverb = c.createConvolver();
    this.reverb.buffer = ir;
    const revTone = c.createBiquadFilter(); revTone.type = 'lowpass'; revTone.frequency.value = 3200;
    const revGain = c.createGain(); revGain.gain.value = 0.5;
    this.reverb.connect(revTone); revTone.connect(revGain); revGain.connect(this.world);

    const len = rate;
    this.noise = c.createBuffer(1, len, rate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.lastTinkle = 0;
    this.healthFreq = 18000;
  }

  get ok() { return !!this.ctx && this.ctx.state === 'running'; }
  get now() { return this.ctx.currentTime; }

  /** Fait passer la musique par le mixage (atténuation sous les tirs, filtre de faible vie, limiteur). */
  adoptMusic(node) {
    if (!this.ctx || !node || this.musicIn === node) return;
    this.musicIn = node;
    node.disconnect();
    node.connect(this.musicBus);
  }

  /** Étouffe le son quand la vie est basse (0 à 100). */
  setHealth(health) {
    if (!this.ctx) return;
    const k = Math.min(1, Math.max(0, health / 45));
    const freq = k >= 1 ? 18000 : Math.round(500 + k * k * 6000);
    if (freq === this.healthFreq) return;
    this.healthFreq = freq;
    const t = this.now;
    this.worldTone.frequency.setTargetAtTime(freq, t, 0.15);
    this.musicTone.frequency.setTargetAtTime(freq, t, 0.15);
  }

  /** La musique s'efface un court instant pour laisser passer un tir. */
  _duck(amount = 0.55) {
    const g = this.musicBus.gain, t = this.now;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(amount, t, 0.005);
    g.setTargetAtTime(1, t + 0.08, 0.25);
  }

  /** Enveloppe de volume reliée au bon bus. o.ui : son d'interface ; o.rev : part envoyée à la réverbération. */
  _env(t, gain, attack, decay, o = {}) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(o.ui ? this.master : this.world);
    if (o.rev) {
      const send = this.ctx.createGain();
      send.gain.value = o.rev;
      g.connect(send); send.connect(this.reverb);
    }
    return g;
  }

  _noise(t, { type = 'lowpass', freq = 2000, q = 0.7, gain = 0.5, attack = 0.002, decay = 0.1, sweep = null, rate = 1, ...o } = {}) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = rate;
    const f = c.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + attack + decay);
    src.connect(f); f.connect(this._env(t, gain, attack, decay, o));
    src.start(t, Math.random() * 0.5);
    src.stop(t + attack + decay + 0.05);
  }

  _tone(t, { type = 'sine', freq = 440, to = null, gain = 0.3, attack = 0.002, decay = 0.1, ...o } = {}) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    osc.connect(this._env(t, gain, attack, decay, o));
    osc.start(t);
    osc.stop(t + attack + decay + 0.05);
  }

  /** Douille qui tinte au sol un instant après le tir (cartouche de fusil à pompe : bruit plus mat). */
  _casing(t, heavy) {
    if (t - this.lastTinkle < 0.09) return; // en rafale, on n'entend pas chaque douille
    this.lastTinkle = t;
    const at = t + 0.42 + Math.random() * 0.18;
    if (heavy) { this._noise(at, { type: 'bandpass', freq: 900, q: 2, gain: 0.08, decay: 0.05 }); return; }
    const f = 3800 + Math.random() * 1400;
    this._tone(at, { freq: f, gain: 0.035, decay: 0.07 });
    this._tone(at + 0.07, { freq: f * 1.31, gain: 0.02, decay: 0.05 });
  }

  /** Tir du joueur : claquement, corps du coup, grave, mécanique, queue de réverbération. */
  shot(w) {
    if (!this.ok) return;
    const t = this.now, s = w.sound;
    const v = 0.96 + Math.random() * 0.08; // légère variation : deux tirs ne sonnent jamais pareil
    if (w.silenced) {
      this._noise(t, { type: 'bandpass', freq: 1500 * v, q: 0.8, gain: 0.45, decay: 0.07, rev: 0.12 });
      this._noise(t, { type: 'highpass', freq: 4000, gain: 0.12, decay: 0.03 });
      this._tone(t, { type: 'triangle', freq: 300 * v, to: 120, gain: 0.18, decay: 0.05 });
      this._noise(t + 0.02, { type: 'bandpass', freq: 2600, q: 5, gain: 0.1, decay: 0.02 });
      this._duck(0.8);
      this._casing(t, false);
      return;
    }
    const big = w.pellets > 1;
    this._noise(t, { type: 'highpass', freq: 4500, gain: 0.5, attack: 0.001, decay: 0.012 });                 // claquement
    this._noise(t, { freq: s.freq * v, sweep: s.freq * 0.22, gain: 1.0, decay: s.decay, rate: v, rev: 0.35 }); // corps
    this._noise(t, { type: 'highpass', freq: 3500, gain: 0.22, decay: s.decay * 0.3 });
    this._tone(t, { freq: s.thump * v, to: 36, gain: 0.85, decay: s.decay * 0.9 });                            // grave
    if (big) this._tone(t, { freq: 62, to: 30, gain: 0.7, decay: 0.3, rev: 0.3 });
    this._noise(t + 0.025, { type: 'bandpass', freq: 2400 * v, q: 5, gain: 0.13, decay: 0.022 });              // mécanique
    this._duck(big ? 0.4 : 0.55);
    this._casing(t, big);
  }

  enemyShot(dist, kind = 'rifle') {
    if (!this.ok) return;
    const t = this.now + Math.min(dist / 340, 0.15);
    const k = Math.max(0.12, 1 - dist / 45);
    const v = 0.94 + Math.random() * 0.12;
    const p = {
      rifle: { freq: 1800, decay: 0.14, thump: 110 },
      lmg: { freq: 1500, decay: 0.12, thump: 95 },
      shotgun: { freq: 1100, decay: 0.3, thump: 75 },
      marksman: { freq: 2400, decay: 0.4, thump: 80 },
    }[kind] || { freq: 1800, decay: 0.14, thump: 110 };
    // de loin, on entend surtout la pièce qui résonne
    this._noise(t, { freq: (p.freq * k + 400) * v, gain: 0.55 * k, decay: p.decay, rate: v, rev: 0.25 + 0.4 * (1 - k) });
    this._tone(t, { freq: p.thump * v, to: 40, gain: 0.4 * k, decay: p.decay * 0.9 });
    if (k > 0.5) this._noise(t, { type: 'highpass', freq: 4000, gain: 0.2 * k, attack: 0.001, decay: 0.012 });
  }

  /** Pas du joueur. surface : 'wood' (parquet), 'carpet' (moquette) ou 'tile' (carrelage). */
  footstep(surface = 'wood', volume = 1) {
    if (!this.ok) return;
    const t = this.now, v = 0.9 + Math.random() * 0.2;
    if (surface === 'carpet') {
      this._noise(t, { freq: 220 * v, gain: 0.16 * volume, attack: 0.004, decay: 0.07 });
    } else if (surface === 'tile') {
      this._noise(t, { freq: 300 * v, gain: 0.14 * volume, decay: 0.05, rev: 0.3 });
      this._noise(t, { type: 'bandpass', freq: 2200 * v, q: 3, gain: 0.07 * volume, decay: 0.02, rev: 0.3 });
    } else {
      this._noise(t, { type: 'bandpass', freq: 330 * v, q: 2, gain: 0.2 * volume, decay: 0.05, rev: 0.15 });
      this._tone(t, { freq: 95 * v, to: 60, gain: 0.1 * volume, decay: 0.06 });
    }
  }

  /** Battement de cœur à faible vie (force de 0 à 1). */
  heartbeat(strength = 1) {
    if (!this.ok) return;
    const t = this.now, g = 0.25 + 0.3 * strength;
    this._tone(t, { freq: 58, to: 42, gain: g, attack: 0.01, decay: 0.12, ui: true });
    this._tone(t + 0.16, { freq: 52, to: 40, gain: g * 0.7, attack: 0.01, decay: 0.14, ui: true });
  }

  /** Alerte : l'escalier ou la sortie est verrouillé. */
  denied() {
    if (!this.ok) return;
    const t = this.now;
    this._tone(t, { type: 'square', freq: 220, gain: 0.12, decay: 0.12, ui: true });
    this._tone(t + 0.13, { type: 'square', freq: 180, gain: 0.12, decay: 0.16, ui: true });
  }

  /** Changement d'étage : quatre pas dans l'escalier. */
  stairs() {
    if (!this.ok) return;
    const t = this.now;
    for (let i = 0; i < 4; i++) this._noise(t + i * 0.11, { freq: 700, gain: 0.25, decay: 0.08, rev: 0.4 });
  }

  /** Boss abattu : gong grave. */
  bossDown() {
    if (!this.ok) return;
    const t = this.now;
    this._tone(t, { type: 'sine', freq: 82, to: 60, gain: 0.7, decay: 1.6, ui: true, rev: 0.3 });
    this._tone(t, { type: 'triangle', freq: 330, gain: 0.2, decay: 1.2, ui: true });
    this._tone(t, { type: 'triangle', freq: 494, gain: 0.14, decay: 1.0, ui: true });
  }

  /** Touche sans tuer : petit « tic » sec. */
  hit() {
    if (!this.ok) return;
    const t = this.now;
    this._tone(t, { type: 'square', freq: 2300, gain: 0.07, decay: 0.03, ui: true });
    this._noise(t, { type: 'highpass', freq: 5000, gain: 0.12, decay: 0.025, ui: true });
  }

  /** Élimination : impact grave + note qui monte avec le combo. */
  kill(combo = 1) {
    if (!this.ok) return;
    const t = this.now, up = 1 + Math.min(combo - 1, 6) * 0.09;
    this._tone(t, { freq: 160, to: 70, gain: 0.55, decay: 0.16, ui: true });
    this._noise(t, { freq: 900, gain: 0.25, decay: 0.06, ui: true });
    this._tone(t + 0.015, { type: 'triangle', freq: 700 * up, gain: 0.16, decay: 0.12, ui: true });
    this._tone(t + 0.07, { type: 'triangle', freq: 1050 * up, gain: 0.13, decay: 0.16, ui: true });
  }

  /** Headshot : tintement métallique en plus du son d'élimination. */
  headshot(combo = 1) {
    if (!this.ok) return;
    this.kill(combo);
    const t = this.now;
    this._tone(t, { type: 'triangle', freq: 1760, gain: 0.22, decay: 0.5, ui: true });
    this._tone(t, { type: 'sine', freq: 2640, gain: 0.12, decay: 0.38, ui: true });
    this._tone(t, { type: 'sine', freq: 3960, gain: 0.05, decay: 0.25, ui: true });
  }

  /** Bruit mécanique sec (rechargement, culasse). */
  click(freq = 3000, gain = 0.3) {
    if (!this.ok) return;
    const t = this.now;
    this._noise(t, { type: 'highpass', freq, gain, decay: 0.03 });
    this._noise(t, { type: 'bandpass', freq: freq * 0.45, q: 4, gain: gain * 0.5, decay: 0.025 });
  }

  empty() {
    if (!this.ok) return;
    this._tone(this.now, { type: 'square', freq: 1400, gain: 0.08, decay: 0.02 });
  }

  hurt() {
    if (!this.ok) return;
    const t = this.now;
    this._noise(t, { freq: 500, gain: 0.5, decay: 0.12, ui: true });
    this._tone(t, { freq: 120, to: 55, gain: 0.45, decay: 0.16, ui: true });
  }

  extract() {
    if (!this.ok) return;
    this.setHealth(100);
    const t = this.now;
    [523, 659, 784, 1047].forEach((f, i) => this._tone(t + i * 0.09, { type: 'triangle', freq: f, gain: 0.2, decay: 0.35, ui: true }));
  }

  death() {
    if (!this.ok) return;
    this.setHealth(100); // le tableau de fin ne doit pas rester étouffé
    const t = this.now;
    this._tone(t, { type: 'sawtooth', freq: 220, to: 40, gain: 0.3, decay: 1.2, ui: true });
    this._noise(t, { freq: 400, gain: 0.4, decay: 0.6, ui: true });
  }
}

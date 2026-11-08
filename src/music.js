// Bande son techno sombre, générée en direct (aucun fichier audio).
// Joue en permanence ; son intensité suit l'action :
//   0 = menus (étouffée)   1 = exploration   2 = combat (pleine puissance)
// Tempo : 128 dans les menus, 150 en partie (montée progressive en quelques secondes)
const BPM_MENU = 128;
const BPM_GAME = 150;
let STEP = 60 / BPM_MENU / 4;       // une double-croche (varie avec le tempo)
const A1 = 55;                      // la grave
const semi = n => Math.pow(2, n / 12);

// 4 mesures : la, la, fa, sol (mode phrygien, tendu)
const PROG = [0, 0, -4, -2];
// basse sur les contretemps + relances
const BASS_HIT = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0];
const BASS_OFS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 1, 0, 0];
// arpège : mineur + seconde bémol (dissonance angoissante)
const ARP = [12, 15, 19, 13, 24, 19, 15, 13, 12, 15, 18, 13, 22, 19, 15, 13];

export class Music {
  constructor(sfx) {
    this.sfx = sfx;
    this.started = false;
    this.level = 0;
    this.target = 0;
    this.volume = 0.6;
    this.bpm = BPM_MENU;
  }

  start() {
    const c = this.sfx.ctx;
    if (!c || this.started) return;
    this.started = true;
    this.c = c;

    this.out = c.createGain();
    this.out.gain.value = 0.0001;
    this.out.gain.setTargetAtTime(this.volume, c.currentTime, 1.2); // fondu d'entrée
    this.out.connect(c.destination);

    // batterie : passe par un filtre qui s'ouvre avec l'intensité
    this.drumFilter = c.createBiquadFilter();
    this.drumFilter.type = 'lowpass';
    this.drumFilter.frequency.value = 400;
    this.drums = c.createGain();
    this.drums.gain.value = 0.75;
    this.drums.connect(this.drumFilter);
    this.drumFilter.connect(this.out);

    this.bass = c.createGain();
    this.bass.gain.value = 0.55;
    this.bass.connect(this.out);

    // arpège avec écho rythmé (croche pointée)
    this.arp = c.createGain();
    this.arp.gain.value = 0.5;
    this.arp.connect(this.out);
    const delay = this.delay = c.createDelay(1);
    delay.delayTime.value = STEP * 3;
    const fb = c.createGain(); fb.gain.value = 0.38;
    const wet = c.createGain(); wet.gain.value = 0.45;
    const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.arp.connect(delay); delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(wet); wet.connect(this.out);

    this._startDrone();
    this.step = 0;
    this.nextTime = c.currentTime + 0.1;
    this.timer = setInterval(() => this._schedule(), 25);
  }

  /** 0 menus, 1 exploration, 2 combat */
  setIntensity(v) { this.target = v; }

  setPaused(p) {
    if (!this.started) return;
    this.out.gain.setTargetAtTime(p ? this.volume * 0.25 : this.volume, this.c.currentTime, 0.2);
  }

  _startDrone() {
    const c = this.c;
    this.droneGain = c.createGain();
    this.droneGain.gain.value = 0.11;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 4;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lfoAmt = c.createGain(); lfoAmt.gain.value = 320;
    lfo.connect(lfoAmt); lfoAmt.connect(f.frequency); lfo.start();
    for (const [freq, det] of [[110, -6], [110, 7], [164.8, 3], [116.5, 0]]) {
      const o = c.createOscillator();
      o.type = freq === 116.5 ? 'sine' : 'sawtooth';
      o.frequency.value = freq; o.detune.value = det;
      const g = c.createGain();
      g.gain.value = freq === 116.5 ? 0 : 0.5;
      if (freq === 116.5) this.tension = g; // si bémol : ne sonne qu'en combat
      o.connect(g); g.connect(f); o.start();
    }
    f.connect(this.droneGain);
    this.droneGain.connect(this.out);
  }

  _schedule() {
    const c = this.c;
    while (this.nextTime < c.currentTime + 0.12) {
      this._playStep(this.step, this.nextTime);
      this.nextTime += STEP;
      this.step = (this.step + 1) % 64;
    }
  }

  _playStep(s, t) {
    // l'intensité glisse vers la cible (~1 mesure pour monter, plus lent pour redescendre)
    const d = this.target - this.level;
    this.level += Math.sign(d) * Math.min(Math.abs(d), d > 0 ? 0.08 : 0.025);
    const i = this.level;
    const st = s % 16, root = PROG[(s / 16) | 0];

    // tempo : glisse vers 150 en partie, 128 dans les menus (~0,5 BPM par double-croche)
    const bpmTarget = this.target >= 1 ? BPM_GAME : BPM_MENU;
    if (this.bpm !== bpmTarget) {
      const db = bpmTarget - this.bpm;
      this.bpm += Math.sign(db) * Math.min(Math.abs(db), 0.5);
      STEP = 60 / this.bpm / 4;
      this.delay.delayTime.setTargetAtTime(STEP * 3, t, 0.1);
    }

    if (st === 0) {
      this.drumFilter.frequency.setTargetAtTime(i < 0.9 ? 350 + i * 900 : 15000, t, 0.4);
      this.tension.gain.setTargetAtTime(Math.max(0, i - 1) * 0.35, t, 0.5);
    }

    if (st % 4 === 0) { this._kick(t); this._duck(t, i); }
    if (i > 0.5 && st % 4 === 2) this._hat(t, 0.06, 0.2 * Math.min(1, (i - 0.5) * 2));
    if (i > 1.4 && st % 2 === 1 && st % 4 !== 2) this._hat(t, 0.025, 0.09);
    if (i > 1.3 && (st === 4 || st === 12)) this._clap(t);
    if (i > 0.35 && BASS_HIT[st]) this._bass(t, A1 * semi(root + BASS_OFS[st]), i);
    const every = i > 1.4 ? 1 : 2;
    if (st % every === 0) this._arp(t, 220 * semi(root + ARP[st]), i);
    // montée de bruit avant chaque cycle de 4 mesures, en combat
    if (i > 1.6 && s === 56) this._riser(t);
  }

  _env(t, peak, attack, decay, dest) {
    const g = this.c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(dest);
    return g;
  }

  _kick(t) {
    const c = this.c, o = c.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    o.connect(this._env(t, 1, 0.002, 0.38, this.drums));
    o.start(t); o.stop(t + 0.42);
  }

  /** effet « pompe » : le drone s'efface sur chaque grosse caisse */
  _duck(t, i) {
    const g = this.droneGain.gain, base = 0.11 - Math.min(i, 2) * 0.015;
    g.setValueAtTime(base * 0.25, t);
    g.linearRampToValueAtTime(base, t + STEP * 3);
  }

  _noise(t, type, freq, q, peak, decay, dest) {
    const c = this.c, src = c.createBufferSource();
    src.buffer = this.sfx.noise;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    src.connect(f); f.connect(this._env(t, peak, 0.001, decay, dest));
    src.start(t, Math.random() * 0.5); src.stop(t + decay + 0.02);
  }

  _hat(t, decay, peak) { this._noise(t, 'highpass', 7500, 0.7, peak, decay, this.drums); }

  _clap(t) {
    this._noise(t, 'bandpass', 1300, 0.9, 0.35, 0.16, this.drums);
    this._noise(t + 0.012, 'bandpass', 1500, 0.9, 0.25, 0.12, this.drums);
  }

  _bass(t, freq, i) {
    const c = this.c;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 6;
    const cut = 180 + i * 380;
    f.frequency.setValueAtTime(cut * 3, t);
    f.frequency.exponentialRampToValueAtTime(cut, t + STEP * 1.5);
    f.connect(this._env(t, 0.45, 0.004, STEP * 1.8, this.bass));
    for (const det of [-8, 8]) {
      const o = c.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = freq; o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + STEP * 2);
    }
  }

  _arp(t, freq, i) {
    const c = this.c, o = c.createOscillator();
    o.type = 'square'; o.frequency.value = freq;
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900 + i * 900;
    o.connect(f);
    f.connect(this._env(t, 0.05 + i * 0.03, 0.003, 0.13, this.arp));
    o.start(t); o.stop(t + 0.16);
  }

  _riser(t) {
    const c = this.c, src = c.createBufferSource();
    src.buffer = this.sfx.noise; src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 2;
    const dur = STEP * 8;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + dur);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
    src.connect(f); f.connect(g); g.connect(this.out);
    src.start(t); src.stop(t + dur + 0.05);
  }
}

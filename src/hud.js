// Interface en jeu : vie, munitions, score, combo, marqueurs de touche, points flottants.
const $ = id => document.getElementById(id);

export class Hud {
  constructor() {
    this.root = $('hud');
    this.hpFill = $('hpFill');
    this.score = $('score');
    this.combo = $('combo');
    this.comboTxt = $('comboTxt');
    this.comboFill = $('comboBar').firstElementChild;
    this.ammo = $('ammo');
    this.ammoCur = $('ammoCur');
    this.ammoMax = $('ammoMax');
    this.cross = $('crosshair');
    this.hitEl = $('hitmarker');
    this.popups = $('popups');
    this.vignette = $('vignette');
    this.dmgLayer = $('dmgLayer');
    this.enemyCount = $('enemyCount');
    this.cache = {};
  }

  _set(key, value, apply) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    apply(value);
  }

  show(on) { this.root.classList.toggle('hidden', !on); }

  health(hp) {
    const v = Math.max(0, Math.round(hp));
    this._set('hp', v, x => {
      this.hpFill.style.width = x + '%';
      this.hpFill.classList.toggle('low', x < 35);
    });
  }

  ammoState(cur, max, reloading) {
    this._set('ammo', `${cur}|${max}|${reloading}`, () => {
      this.ammoCur.textContent = cur;
      this.ammoMax.textContent = '/' + max;
      this.ammo.classList.toggle('reloading', reloading);
      this.ammo.classList.toggle('empty', cur === 0);
    });
  }

  scoreValue(s) { this._set('score', s, x => { this.score.textContent = x.toLocaleString('fr-FR'); }); }

  comboState(mult, frac) {
    const on = mult > 1;
    this._set('comboOn', on, x => this.combo.classList.toggle('on', x));
    if (!on) return;
    this._set('comboMul', mult, x => { this.comboTxt.textContent = `COMBO x${String(x).replace('.', ',')}`; });
    this.comboFill.style.width = (frac * 100).toFixed(1) + '%';
  }

  crosshair(gapPx, assist) {
    this._set('gap', Math.round(gapPx), x => this.cross.style.setProperty('--gap', x + 'px'));
    this._set('assist', assist, x => this.cross.classList.toggle('assist', x));
  }

  /** Visée : k = 0 (hanche) à 1 (visée complète). */
  aim(k, type, on) {
    const r = document.getElementById('reticle');
    this._set('retType', type, x => { r.dataset.type = x; });
    this._set('retK', Math.round(k * 50), () => {
      r.style.opacity = Math.max(0, (k - 0.55) / 0.45).toFixed(2);
      this.cross.style.opacity = Math.max(0, 1 - k * 2.5).toFixed(2);
    });
    this._set('aimOn', on, x => document.getElementById('btnAim').classList.toggle('on', x));
  }

  objective(text, cls = '') {
    this._set('obj', text + cls, () => {
      const el = document.getElementById('objective');
      el.textContent = text;
      el.className = cls;
    });
  }

  floor(text) { this._set('floor', text, x => { document.getElementById('floorLabel').textContent = x; }); }

  /** Barre de vie du boss (frac = null pour la cacher). */
  boss(name, frac) {
    const on = frac !== null;
    this._set('bossOn', on, x => document.getElementById('bossBar').classList.toggle('hidden', !x));
    if (!on) return;
    this._set('bossName', name, x => { document.getElementById('bossName').textContent = x; });
    this._set('bossFrac', Math.round(frac * 200), () => { document.getElementById('bossFill').style.width = (frac * 100).toFixed(1) + '%'; });
  }

  /** Message court au centre de l'écran. */
  toast(text, cls = '', ms = 1800) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.className = `on ${cls}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.className = ''; }, ms);
  }

  enemies(left, total) { this._set('enemies', left, x => { this.enemyCount.textContent = `Ennemis : ${x} / ${total}`; }); }

  /** kind : 'hit' | 'kill' | 'head' */
  hitmarker(kind) {
    const el = this.hitEl;
    el.className = '';
    void el.offsetWidth; // relance l'animation CSS
    el.className = `show ${kind}`;
  }

  popup(points, label, kind) {
    const d = document.createElement('div');
    d.className = `pop ${kind}`;
    d.innerHTML = `+${points}${label ? `<span>${label}</span>` : ''}`;
    this.popups.prepend(d);
    while (this.popups.children.length > 4) this.popups.lastChild.remove();
    setTimeout(() => d.remove(), 1000);
  }

  vignetteLevel(v) { this._set('vig', Math.round(v * 100), x => { this.vignette.style.opacity = x / 100; }); }

  /** Arc rouge indiquant d'où vient le tir (angle en radians, 0 = devant). */
  damageFrom(angle) {
    const a = document.createElement('div');
    a.className = 'dmgArc';
    a.style.transform = `rotate(${angle}rad)`;
    this.dmgLayer.appendChild(a);
    while (this.dmgLayer.children.length > 4) this.dmgLayer.firstChild.remove();
    setTimeout(() => a.remove(), 900);
  }

  clearTransient() {
    this.popups.innerHTML = '';
    this.dmgLayer.innerHTML = '';
    this.hitEl.className = '';
    document.getElementById('toast').className = '';
    this.cache = {};
  }
}

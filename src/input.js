// Commandes : tactile d'abord (joystick à gauche, glisser à droite pour viser,
// bouton de tir qui sert aussi à viser), avec clavier en secours pour tester sur PC.
const JOY_RADIUS = 52;

export class Input {
  constructor({ onPause } = {}) {
    this.enabled = false;
    this.onPause = onPause;
    this.ptrs = new Map();           // pointerId -> { role, x, y, ox, oy }
    this.joy = { x: 0, y: 0 };
    this.lookDX = 0; this.lookDY = 0;
    this.reloadReq = false;
    this.keys = new Set();

    this.el = document.getElementById('touch');
    this.joyBase = document.getElementById('joyBase');
    this.joyKnob = document.getElementById('joyKnob');
    this.btnFire = document.getElementById('btnFire');
    this.btnFireL = document.getElementById('btnFireL');

    this.el.addEventListener('pointerdown', e => this._down(e));
    window.addEventListener('pointermove', e => this._move(e), { passive: false });
    window.addEventListener('pointerup', e => this._up(e));
    window.addEventListener('pointercancel', e => this._up(e));
    document.getElementById('btnPause').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); this.onPause?.(); });
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      this.keys.add(e.code);
      if (e.code === 'KeyR') this.reloadReq = true;
      if (e.code === 'KeyE' && !e.repeat) this.aimReq = true;
      if (e.code === 'Escape' || e.code === 'KeyP') this.onPause?.();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.reset());
  }

  reset() {
    this.ptrs.clear();
    this.joy.x = this.joy.y = 0;
    this.lookDX = this.lookDY = 0;
    this.reloadReq = false;
    this.aimReq = false;
    this.keys.clear();
    this.joyBase.classList.remove('on');
    this.btnFire.classList.remove('on');
    this.btnFireL.classList.remove('on');
  }

  _role(role) { for (const p of this.ptrs.values()) if (p.role === role) return true; return false; }

  _down(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const t = e.target;
    let role;
    if (t.closest('#btnFire')) role = 'fire';
    else if (t.closest('#btnFireL')) role = 'fireL'; // tir seul, ne fait pas viser
    else if (t.closest('#btnReload')) { this.reloadReq = true; return; }
    else if (t.closest('#btnAim')) { this.aimReq = true; role = 'aim'; } // le doigt peut ensuite glisser pour viser
    else if (e.clientX < window.innerWidth * 0.42 && !this._role('joy')) role = 'joy';
    else if (!this._role('look')) role = 'look';
    else return;

    this.ptrs.set(e.pointerId, { role, x: e.clientX, y: e.clientY, ox: e.clientX, oy: e.clientY });
    if (role === 'joy') {
      this.joyBase.style.left = e.clientX + 'px';
      this.joyBase.style.top = e.clientY + 'px';
      this.joyKnob.style.transform = '';
      this.joyBase.classList.add('on');
    }
    if (role === 'fire') this.btnFire.classList.add('on');
    if (role === 'fireL') this.btnFireL.classList.add('on');
  }

  _move(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    if (p.role === 'joy') {
      let dx = e.clientX - p.ox, dy = e.clientY - p.oy;
      const len = Math.hypot(dx, dy);
      if (len > JOY_RADIUS) { dx *= JOY_RADIUS / len; dy *= JOY_RADIUS / len; }
      this.joy.x = dx / JOY_RADIUS;
      this.joy.y = -dy / JOY_RADIUS;
      this.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (p.role !== 'fireL') {
      this.lookDX += e.clientX - p.x;
      this.lookDY += e.clientY - p.y;
    }
    p.x = e.clientX; p.y = e.clientY;
  }

  _up(e) {
    const p = this.ptrs.get(e.pointerId);
    if (!p) return;
    this.ptrs.delete(e.pointerId);
    if (p.role === 'joy') { this.joy.x = this.joy.y = 0; this.joyBase.classList.remove('on'); }
    if (p.role === 'fire') this.btnFire.classList.remove('on');
    if (p.role === 'fireL') this.btnFireL.classList.remove('on');
  }

  /** Déplacement voulu : x = droite, y = avant, longueur <= 1. */
  getMove() {
    if (this._role('joy')) return { x: this.joy.x, y: this.joy.y };
    const k = this.keys;
    let x = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') || k.has('KeyQ') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('KeyZ') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }

  /** Mouvement du doigt de visée depuis le dernier appel (en pixels). */
  consumeLook() {
    const k = this.keys, kb = 9;
    let dx = this.lookDX + ((k.has('ArrowRight') ? kb : 0) - (k.has('ArrowLeft') ? kb : 0));
    let dy = this.lookDY + ((k.has('ArrowDown') ? kb : 0) - (k.has('ArrowUp') ? kb : 0));
    this.lookDX = this.lookDY = 0;
    return { dx, dy };
  }

  get firing() { return this._role('fire') || this._role('fireL') || this.keys.has('Space'); }

  consumeReload() { const r = this.reloadReq; this.reloadReq = false; return r; }

  /** Appui sur le bouton de visée (bascule viser / ne plus viser). */
  consumeAim() { const r = this.aimReq; this.aimReq = false; return r; }
}

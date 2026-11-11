// Fluidité : niveau de qualité, résolution qui s'adapte à la cadence réelle, limite d'images, compteur à l'écran.
import { settings, params } from './state.js';
import { renderer, renderStats } from './view.js';

// Plage de finesse de l'image (pixels calculés par pixel d'écran) pour chaque niveau de qualité.
// À l'intérieur de sa plage, la résolution baisse quand le jeu ralentit et remonte quand il a de la marge.
const RANGES = { auto: [0.75, 2], low: [0.6, 1], medium: [0.9, 1.5], high: [1.5, 2] };
const HOLD_AFTER_DROP = 8; // secondes sans remonter après une baisse, pour ne pas osciller

let lo = 1, hi = 1, ratio = 1;
let avg = 1 / 60, sinceChange = 0, sinceDrop = 99, lastRender = -1e9;
let el = null, shownT = 0, shownFrames = 0;

function setRatio(r) {
  ratio = r;
  renderer.setPixelRatio(r);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

/** Applique le niveau de qualité choisi. Le lissage des contours, lui, ne change qu'au lancement suivant. */
export function applyQuality() {
  const dpr = window.devicePixelRatio || 1;
  [lo, hi] = RANGES[settings.quality] || RANGES.auto;
  hi = Math.min(hi, dpr);
  lo = Math.min(lo, hi);
  setRatio(settings.quality === 'auto' ? Math.min(hi, 1.5) : hi);
  sinceChange = 0;

  const show = settings.showPerf || !!params.get('fps');
  if (show && !el) {
    el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:50%;bottom:6px;transform:translateX(-50%);font:12px monospace;color:#0f8;z-index:40;pointer-events:none;white-space:nowrap;text-shadow:0 0 3px #000';
    document.body.appendChild(el);
  }
  if (el) el.style.display = show ? '' : 'none';
}

const capFps = () => (settings.fpsCap === 'max' ? 0 : Number(settings.fpsCap));

/** Faux quand cette image doit être sautée pour respecter la limite d'images par seconde. */
export function frameGate(now) {
  const cap = capFps();
  if (cap && now - lastRender < 1000 / cap - 2) return false;
  lastRender = now;
  return true;
}

/** À appeler après chaque image affichée. `playing` : en partie (on n'ajuste pas la résolution dans les menus). */
export function perfFrame(dt, playing) {
  avg += (dt - avg) * 0.05;
  sinceChange += dt;
  sinceDrop += dt;
  if (playing && sinceChange > 1) {
    const target = 1 / (capFps() || 60);
    if (avg > target * 1.18 && ratio > lo) {
      setRatio(Math.max(lo, ratio * 0.88));
      sinceChange = 0; sinceDrop = 0;
    } else if (avg < target * 1.04 && ratio < hi && sinceDrop > HOLD_AFTER_DROP) {
      setRatio(Math.min(hi, ratio * 1.06));
      sinceChange = 0;
    }
  }

  if (el && el.style.display !== 'none') {
    shownFrames++; shownT += dt;
    if (shownT >= 0.5) {
      el.textContent = `${Math.round(shownFrames / shownT)} ips · ${renderStats.calls} appels · ${Math.round(renderStats.triangles / 1000)}k triangles · finesse ${ratio.toFixed(2)}`;
      shownFrames = 0; shownT = 0;
    }
  }
}

/** État courant, pour les tests. */
export const perfState = () => ({ ratio, lo, hi, cap: capFps(), calls: renderStats.calls, triangles: renderStats.triangles });

// Écran de réglages : contrôles, boutons tactiles, affichage, volumes. Ouvert depuis l'écran titre ou la pause.
import { SETTINGS } from '../core/settings.js';
import { $, settings, setSetting, applyAudio } from '../game/state.js';
import { applyQuality } from '../game/perf.js';
import { t } from '../core/i18n.js';

// Ordre d'affichage : un titre de groupe, puis ses réglages.
const LAYOUT = [
  ['aim', ['sens', 'sensAds', 'assist', 'autoFire', 'gyro', 'gyroSens']],
  ['buttons', ['btnScale', 'btnOpacity']],
  ['display', ['quality', 'fpsCap', 'showPerf']],
  ['audio', ['volMusic', 'volSfx']],
];

let screen = null;

/** Taille et opacité des boutons tactiles (variables lues par ui.css). */
export function applyTouch() {
  const s = document.documentElement.style;
  s.setProperty('--btn-scale', settings.btnScale);
  s.setProperty('--btn-opacity', settings.btnOpacity);
}

/** Répercute tous les réglages sur le jeu. */
function applyAll() {
  applyAudio();
  applyTouch();
  applyQuality();
}

const percent = v => `${Math.round(v * 100)} %`;

function row(key) {
  const def = SETTINGS[key];
  const el = document.createElement('label');
  el.className = 'setRow';
  const name = document.createElement('span');
  name.className = 'setName';
  name.textContent = t(`settings.${key}`);
  el.appendChild(name);
  const val = document.createElement('span');
  val.className = 'setVal';

  if (def.options) {
    const select = document.createElement('select');
    select.dataset.key = key;
    for (const opt of def.options) {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = t(`settings.${key}.${opt}`);
      select.appendChild(o);
    }
    select.value = settings[key];
    select.addEventListener('change', () => { setSetting(key, select.value); applyAll(); });
    el.append(select, val);
    return el;
  }

  const input = document.createElement('input');
  input.dataset.key = key;
  if (typeof def.def === 'boolean') {
    input.type = 'checkbox';
    input.checked = settings[key];
    const show = () => { val.textContent = t(input.checked ? 'settings.on' : 'settings.off'); };
    input.addEventListener('change', () => { setSetting(key, input.checked); show(); applyAll(); });
    show();
  } else {
    input.type = 'range';
    input.min = def.min; input.max = def.max; input.step = def.step;
    input.value = settings[key];
    const show = () => { val.textContent = percent(settings[key]); };
    input.addEventListener('input', () => { setSetting(key, input.value); show(); applyAll(); });
    show();
  }
  el.append(input, val);
  return el;
}

function build() {
  const list = screen.querySelector('.setList');
  list.innerHTML = '';
  for (const [group, keys] of LAYOUT) {
    const h = document.createElement('div');
    h.className = 'setGroup';
    h.textContent = t(`settings.group.${group}`);
    list.appendChild(h);
    for (const key of keys) list.appendChild(row(key));
  }
}

export function openSettings() { build(); screen.classList.remove('hidden'); }
export function closeSettings() { screen.classList.add('hidden'); }

/** Crée l'écran et ses boutons d'accès. Appelé une fois au démarrage. */
export function initSettings() {
  screen = document.createElement('div');
  screen.id = 'screenSettings';
  screen.className = 'screen hidden';
  screen.innerHTML = `
    <div class="title small">${t('settings.title')}</div>
    <div class="setList"></div>
    <div class="setFoot">
      <button class="btn ghost" id="setReset">${t('settings.reset')}</button>
      <button class="btn" id="setClose">${t('settings.close')}</button>
    </div>`;
  $('app').appendChild(screen);
  // un toucher dans les réglages ne doit pas atteindre l'écran titre qui se trouve dessous
  screen.addEventListener('pointerup', e => e.stopPropagation());
  screen.querySelector('#setClose').addEventListener('click', closeSettings);
  screen.querySelector('#setReset').addEventListener('click', () => {
    for (const key of Object.keys(SETTINGS)) setSetting(key, SETTINGS[key].def);
    applyAll();
    build();
  });

  // accès depuis l'écran titre (roue en haut à droite) ; l'écran titre démarre le jeu au moindre toucher
  const gear = document.createElement('button');
  gear.id = 'btnSettings';
  gear.setAttribute('aria-label', t('settings.title'));
  gear.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>';
  gear.addEventListener('pointerup', e => e.stopPropagation());
  gear.addEventListener('click', e => { e.stopPropagation(); openSettings(); });
  $('screenMenu').appendChild(gear);

  // accès depuis la pause
  const inPause = document.createElement('button');
  inPause.className = 'btn ghost';
  inPause.textContent = t('settings.title');
  inPause.addEventListener('click', openSettings);
  $('screenPause').insertBefore(inPause, $('btnQuit'));

  applyTouch();
}

// Ce qui dépend de l'appareil : vibrations, plein écran. Tout appel est sans effet là où ce n'est pas disponible.

/** Vrai quand le jeu tourne dans l'appli Android (WebView), faux dans un navigateur. */
export const isApp = location.hostname === 'appassets.androidplatform.net';

export function vibrate(ms) {
  try { navigator.vibrate?.(ms); } catch { /* non supporté */ }
}

/** Plein écran paysage sur téléphone. Doit être appelé pendant un geste de l'utilisateur. */
export function enterFullscreen() {
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen || !matchMedia('(pointer: coarse)').matches) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape').catch(() => {}))
    .catch(() => {});
}

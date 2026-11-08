# Extraction

FPS mobile en HTML5 (Three.js) : sors de trois bâtiments (villa, hôtel, tour) en éliminant les hommes de Varga.

## Jouer

- **APK Android** : onglet *Releases* du dépôt, fichier `extraction.apk`. L'APK est fabriqué automatiquement par GitHub Actions à chaque mise à jour de la branche `main`.
- **Sur PC / en Wi-Fi** : `py serve.py` puis ouvrir l'adresse affichée (Three.js doit être présent dans `vendor/three.module.js`).

## Contenu

- `index.html`, `style.css`, `src/` : le jeu
- `android/` : l'appli Android qui embarque le jeu (WebView hors ligne)
- `.github/workflows/apk.yml` : fabrication et publication de l'APK

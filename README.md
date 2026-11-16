# Escape from hell

FPS de fuite sans fin pour Android, en paysage. Refonte du projet `ceboo75/game1` : identité infernale, portail animé, décors industriels, personnages masqués et cornus, braises, interface orange incandescent. Les règles du document de référence sont conservées.

## Jouer sur PC

Avec Node.js installé :

```powershell
npm ci
npm start
```

Ouvrir http://127.0.0.1:8080. Le moteur est copié dans `vendor/` pendant `npm ci`. Aucun téléchargement n’est nécessaire pendant le jeu. Le double-clic sur `index.html` ne suffit pas : les modules JavaScript demandent un serveur local.

Commandes : ZQSD ou WASD pour marcher ; glisser avec la souris ou utiliser les flèches pour regarder ; Espace pour tirer ; E pour viser ; R pour recharger ; P ou Échap pour mettre en pause. Sur téléphone : joystick gauche, glissement à droite, boutons de tir, visée et rechargement.

## Android

L’APK de test se trouve dans `artifacts/escape-from-hell.apk` après fabrication. Il embarque le moteur, les scripts, les modèles et les sons synthétisés ; le jeu fonctionne hors ligne. Android 8 minimum. L’identifiant historique est conservé pour permettre la mise à jour et garder les records. Le titre affiché et l’icône sont nouveaux.

La signature publique historique sert exclusivement aux tests. Une publication Play Store nécessite une clé privée et le travail de publication décrit dans les documents historiques.

Pour reconstruire avec JDK 17, SDK Android 34 et Gradle 8.9 : `tools/build-android.ps1`. La chaîne locale `.toolchain/` est également détectée lorsqu’elle existe. GitHub Actions peut aussi construire l’APK ; aucun envoi GitHub n’est nécessaire pour jouer localement.

## Vérification

- `npm test` : règles, génération, score, sauvegardes et langues.
- `npm run smoke` : 200 salles et remplacement de modèles glTF, avec Playwright/Chromium installé.
- Serveur démarré, `node tests/experience.mjs` : animation du squelette, menus, réglages, pause, fin et défi quotidien.
- Serveur démarré, `node tests/visual.mjs` : captures de contrôle.

Installer le navigateur de test : `npx playwright install chromium`. Si le navigateur a été installé dans `.browsers/`, définir `PLAYWRIGHT_BROWSERS_PATH` vers ce dossier.

Les mesures PC ne prouvent pas la fluidité d’un OnePlus 12. Le gyroscope, le son sur haut-parleurs, l’équilibrage et le partage Android restent à essayer sur un vrai appareil.

## Continuer le projet

`SUIVI_ESCAPE_FROM_HELL.md` décrit cette livraison. Les anciens documents de conception gardent leur valeur historique, mais leur ancien titre est remplacé par **Escape from hell**. Les contrats de modèles de `docs/modeles.md` sont conservés. Aucun achat, publicité, ressource visuelle téléchargée ni compte de joueur.

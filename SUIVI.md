# Suivi d'avancement — Sütçü İmam Escape

Mis à jour le 11 novembre 2026. Complète `DOSSIER_AMELIORATIONS.md` (le plan) et `DECISIONS.md` (les choix arrêtés).

## État des branches

Chaque branche part de la précédente. **Aucune n'est fusionnée dans `main`** : la fusion et le nouveau workflow de tests attendent une connexion à GitHub dans le navigateur (le connecteur ne peut pas écrire dans `.github/workflows`).

| Branche | Contenu | Vérifié |
|---|---|---|
| `phase-0` | `main.js` découpé en modules, sauvegarde versionnée, textes par clé, tests, nouveau nom et identifiant d'appli | navigateur du PC |
| `phase-1` | Réglages des contrôles, tir automatique, gyroscope, ennemis articulés et animés, arme détaillée et animée, sons et mixage, mobilier, niveaux de qualité et compteur de performances | navigateur du PC |
| `phase-2` | Jetons d'attaque, rafales annoncées, porteur de bouclier, tireur d'élite, mise à l'abri, boss en deux phases | simulation |
| `phase-3` | Étages générés à partir de 24 salles, portes à enfoncer, 16 atouts, crédits, déblocage et maîtrise des armes, bonbonnes explosives | simulation |
| `phase-4` | Première partie guidée, défi du jour, missions, annonces de bâtiment et de boss, partage, anglais et turc | simulation |

## Ce qui n'a jamais été vérifié

Rien de ce qui suit n'a pu l'être sans APK ni téléphone :

- la fluidité réelle, et le compteur de performances à l'écran ;
- le rendu sonore (les niveaux sont mesurés, rien n'a été écouté) ;
- les animations en mouvement (jugées sur images fixes et par le calcul) ;
- le sens des axes du gyroscope ;
- l'équilibrage : jetons d'attaque, nouveaux ennemis, atouts, prix des armes, missions ;
- les tests dans GitHub Actions (ils n'y ont jamais tourné) ;
- le partage du résultat dans l'appli Android (la WebView n'a peut-être pas de menu de partage) ;
- la traduction turque, à faire relire par une personne dont c'est la langue.

## À faire pour fusionner

1. Se connecter à GitHub dans le navigateur intégré.
2. Créer `.github/workflows/ci.yml` (tests, puis APK sur `main`) et supprimer `apk.yml`. Le nouveau workflow doit copier **`ui.css`** dans l'appli, en plus de `index.html`, `style.css`, `src` et `vendor`.
3. Fusionner `phase-4` dans `main` (elle contient toutes les autres).
4. Installer l'APK : l'identifiant a changé (`io.github.ceboo75.sutcuimamescape`), l'ancienne appli « Extraction » est à désinstaller.

## Laissé de côté, à reprendre

- Accessibilité (couleur des annonces, réduction des secousses, taille du texte) et choix manuel de la langue.
- Refonte visuelle des menus, écran de chargement.
- Classements en ligne, succès Google Play, image de résultat à partager.
- Contournement par les ennemis, fonceur au couteau, fumigène.
- Vitres et lampes destructibles.
- Panneaux « ESCALIER » et « SORTIE » dessinés en français dans `level.js`.
- Anciennes cartes fixes de `levels.js` et ancien constructeur d'arme de `weapons.js`, devenus inutiles.
- Niveau des pas à déplacer de `game/ambience.js` vers `audio.js` ; direction des tirs ennemis.
- Modèles et sons libres de droits à la place de la synthèse (demande un accord pour télécharger).
- Toute la phase 5 (cible Android, AAB, clé privée, console Play) et la phase 6 (fiche, tests, lancement).

## Méthode de travail sans Git sur le PC

Écrire les fichiers une seule fois sur une branche avec le connecteur GitHub, les rapatrier avec `tools\pull.ps1 <branche>`, tester dans le navigateur : `tests/index.html` pour la logique, `game.debug.selfTest()` pour les 15 étages. Ne jamais retaper `levels.js` à la main.

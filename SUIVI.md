# Suivi d'avancement — Sütçü İmam Escape

Mis à jour le 12 novembre 2026. Le jeu suit `REFONTE_FUITE_SANS_FIN.md` (fuite sans fin) ; `DECISIONS.md` reste valable pour le nom, les langues, la gratuité et la publication. `DOSSIER_AMELIORATIONS.md` ne sert plus que pour les phases 5 et 6 (plateforme, lancement).

## Où en est la refonte

Les six étapes de `REFONTE_FUITE_SANS_FIN.md` sont faites.

| Étape | Contenu | Vérifié sur le PC |
|---|---|---|
| 1 | Monde continu (`src/world.js`) : salles posées bout à bout, 3 d'avance, détruites une fois dépassées ; salles derrière une porte fermée non dessinées | robot : 200 salles, 4,8 km, mémoire stable d'une partie à l'autre |
| 2 | Courbe de difficulté (`src/core/endless.js`, réglages dans `src/content/endless.js`), compte à rebours de 20 s, porte ouverte à la moitié des ennemis, porte refermée derrière soi | 3 000 salles générées toutes jouables ; courbe croissante, vitesse plafonnée |
| 3 | Arme suivante toutes les 10 éliminations (cycle de 9, +15 % de dégâts par tour), points de distance, multiplicateur de salle | tests |
| 4 | Écran titre (records de score et de distance par difficulté, défi du jour), compte à rebours, annonces HEADSHOT sur l'ennemi et DOUBLE KILL à GODLIKE, tableau de fin, sauvegarde version 2 | dans le navigateur, et tests |
| 5 | Campagne, étages, atouts, crédits, déblocages, missions et bonbonnes retirés | 31 tests, aucune référence restante |
| 6 | Modèles 3D fournis : `assets/manifest.json`, chargeur (`src/game/assets.js`, `src/game/modelbody.js`), contrat `docs/modeles.md` | modèle de test chargé ; fichier manquant sans conséquence |

Mesures du robot sur le PC : 101 à 147 appels d'affichage (budget 150), aucune image de plus de 50 ms au passage d'une porte. La seule image lente (environ 60 ms) est la toute première de la partie, au toucher qui la lance.

## Réponses proposées et appliquées

Les points Q1 à Q10 de `REFONTE_FUITE_SANS_FIN.md` sont appliqués tels que proposés, et réglables dans `src/content/endless.js` :

- temps écoulé : la vie fond de 25 points par seconde, sans mort immédiate ;
- porte de sortie : la moitié des ennemis de la salle, plus le boss s'il y en a un ;
- porte arrière refermée dès l'entrée dans la salle suivante, ennemis laissés derrière retirés ;
- ordre des armes : Faucon 57, Guêpe, Tonnerre 12, Marteau 45, Sentinelle, Kodiak 47, Rempart, Lance 39, Murmure 9 ;
- multiplicateur : +0,1 par salle ; 1 point par mètre ;
- annonces : DOUBLE KILL (2), TRIPLE KILL (3), MONSTER KILL (4), RAMPAGE (5), UNSTOPPABLE (6), GODLIKE (8 et plus) — **liste à valider par l'auteur** ;
- Cauchemar : la vie revient entière à chaque nouvelle salle (elle revenait à chaque étage).

## Ce qui n'a jamais été vérifié

Rien de ce qui suit n'a pu l'être sans téléphone :

- l'équilibrage : 20 secondes par salle, courbe de difficulté, rythme des armes, puissance des petits boss ;
- la fluidité réelle (le compteur « Afficher les performances » des réglages sert à la mesurer) ;
- le rendu sonore, les animations en mouvement, le sens du gyroscope ;
- le partage du résultat dans l'appli Android ;
- les traductions anglaise et turque, à faire relire ;
- un vrai modèle de personnage animé : seul un triangle de test a été chargé.

## Laissé de côté

- Mobilier remplaçable par fichier (seuls ennemis et armes le sont).
- Recentrage du monde pour les très longues parties : inutile en dessous d'une vingtaine de kilomètres.
- Tout ce que listait l'ancien suivi : accessibilité, refonte visuelle des menus, classements en ligne, phase 5 (cible Android, AAB, clé privée, console Play) et phase 6 (fiche, tests, lancement).

## Méthode de travail sans Git sur le PC

Modifier les fichiers en local, tester dans le navigateur (`tests/index.html` pour la logique, `game.debug.selfTest()` pour le robot), puis envoyer sur une branche avec le connecteur GitHub. `tools\pull.ps1 <branche>` rapatrie une branche. Les fichiers `.github/workflows/*` se modifient par l'éditeur web de GitHub.

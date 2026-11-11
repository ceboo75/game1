# Instructions de refonte — Sütçü İmam Escape devient une fuite sans fin

Rédigé le 11 novembre 2026 pour l'agent qui exécutera (Claude Opus). Dépôt : `ceboo75/game1`, branche `main`.

**Ce fichier remplace** le plan de contenu de `DOSSIER_AMELIORATIONS.md` (bâtiments, étages, atouts, progression) et les lots 2 et 3 de `DECISIONS.md`. Le reste de `DECISIONS.md` tient toujours : nom du jeu, identifiant de l'appli, langues, jeu gratuit sans publicité ni collecte, aucune dépense, coquille Android, publication. En cas de contradiction, ce fichier l'emporte.

Lis d'abord `SUIVI.md` : il décrit l'état du code et, surtout, tout ce qui n'a jamais été vérifié sur un téléphone.

---

## 1. Le jeu en une phrase

> **Une fuite sans fin, en ligne droite. On traverse une enfilade de salles, chacune avec un compte à rebours, on change d'arme toutes les 10 éliminations, et on va le plus loin possible.**

Il n'y a plus de bâtiments, plus d'étages, plus d'escalier, plus de choix d'arme, plus d'atouts, plus de crédits. Une partie = un seul parcours, de plus en plus dur, jusqu'à la mort. Seuls comptent **le score et la distance parcourue**.

## 2. Règles voulues par l'auteur

Ces points sont des décisions de l'auteur. Ne les modifie pas sans son accord.

| # | Règle |
|---|---|
| R1 | **Parcours sans fin, en ligne droite.** On peut se déplacer à gauche et à droite dans une salle, mais le but est toujours devant. |
| R2 | **Passage d'une salle à l'autre sans aucune coupure** : ni fondu, ni écran de chargement, ni à-coup. Quand le joueur est dans une salle, les **3 salles suivantes sont déjà chargées**. |
| R3 | **Chaque salle a un compte à rebours fixe**, de l'ordre de **20 secondes**, le même pour toutes les salles. Il sert à empêcher de rester sur place : la salle se verrouille à la fin. |
| R4 | **Difficulté croissante avec la distance** : début doux, puis des ennemis **plus nombreux, plus résistants, plus rapides et qui font plus de dégâts**, et de temps en temps un **petit boss** plus fort. |
| R5 | **Chaque salle franchie augmente le multiplicateur de points.** |
| R6 | **Changement d'arme automatique toutes les 10 éliminations**, en partant de la plus petite : pistolet, puis Uzi, fusil à pompe, petite mitrailleuse, fusil d'assaut, fusil lourd, etc. |
| R7 | **Aucun bonus qui donne un avantage** : les atouts sont supprimés. |
| R8 | **Annonces visuelles des éliminations** : « HEADSHOT » écrit **sur l'ennemi** quand il meurt d'un tir à la tête ; « TRIPLE KILL » à un combo de 3, « MONSTER KILL » à un combo de 4, et ainsi de suite. |
| R9 | **Personnages, armes et décors en vrais modèles 3D soignés, que l'auteur fournira plus tard.** Le jeu doit être construit pour qu'on les branche sans réécrire le code (section 6). |
| R10 | **Un meilleur score permanent par difficulté**, enregistré sur le téléphone et affiché dans les menus. |

Décisions plus anciennes de l'auteur, toujours valables : munitions de réserve illimitées ; régénération automatique de la vie ; pas de corps à corps ni de grenades pour le joueur ; **pas de ralenti** ; combo conservé ; dégâts ×3 à la tête ; 100 points par ennemi, 1 000 par boss, ×1,5 au tir à la tête ; trois difficultés (Normal, Difficile, Cauchemar) ; bouton de visée avec zoom ×2,5 pour les armes de précision et ×1,5 pour les autres ; second bouton de tir à gauche ; musique à 150 BPM en partie ; la mort termine la partie.

## 3. Points que l'auteur n'a pas tranchés

J'ai proposé une réponse pour chacun. **Applique-la, signale-la dans ton compte rendu, et garde chaque valeur dans un seul fichier de réglages** (`src/content/endless.js`) pour qu'elle se change en une ligne après essai.

| # | Question | Réponse proposée | Pourquoi |
|---|---|---|---|
| Q1 | Que se passe-t-il quand le compte à rebours arrive à zéro ? | La vie se vide vite (25 points par seconde, sans régénération) tant que le joueur est dans la salle. Pas de mort immédiate. | Une seconde de retard coûte cher sans tuer d'un coup. |
| Q2 | Peut-on traverser une salle sans tuer personne ? | Non : la porte de sortie ne s'ouvre que lorsque **la moitié des ennemis de la salle** (arrondie au-dessus) est abattue, et le petit boss s'il y en a un. | Sans cela, la meilleure stratégie est de courir tout droit : distance et multiplicateur montent sans combat. |
| Q3 | Que devient la porte derrière soi ? | Elle se referme et se verrouille dès que le joueur est entré dans la salle suivante. Les ennemis laissés derrière sont retirés et ne comptent pas comme éliminés. | Empêche de reculer, et permet de libérer la mémoire des salles passées. |
| Q4 | Et après la dernière arme ? | Le cycle recommence au pistolet, avec +15 % de dégâts à chaque tour complet. | Sinon les bons joueurs finissent toujours avec la même arme. |
| Q5 | Ordre des armes | Faucon 57, Guêpe, Tonnerre 12, Marteau 45, Sentinelle, Kodiak 47, Rempart, Lance 39, Murmure 9. | Suit l'ordre donné par l'auteur, du plus léger au plus lourd. |
| Q6 | Multiplicateur de salle | +0,1 par salle franchie, sans plafond. Il se multiplie avec le combo (×1 à ×3) et avec celui de la difficulté. | Simple à lire à l'écran : « x2,4 ». |
| Q7 | Points de distance | 1 point par mètre parcouru vers l'avant, hors multiplicateurs. | La distance reste lisible comme un record à part entière. |
| Q8 | Les trois difficultés ont-elles encore un sens ? | Oui : elles fixent le point de départ et la pente de la courbe, et chacune a ses records. | L'auteur veut un record par difficulté (R10). |
| Q9 | Annonces au-delà du combo de 4 | 2 : DOUBLE KILL ; 3 : TRIPLE KILL ; 4 : MONSTER KILL ; 5 : RAMPAGE ; 6 : UNSTOPPABLE ; 8 et plus : GODLIKE. En anglais dans toutes les langues. | L'auteur a dit « et ainsi de suite ». Propose-lui la liste avant de la figer. |
| Q10 | Défi du jour | Conservé : même parcours pour tous ce jour-là, record du jour en distance et en score. | Déjà écrit, et le parcours par graine s'y prête. |

Pour R8 : ce sont des mots courants du jeu vidéo. Utilise du texte et une mise en forme propres à ce jeu ; ne reprends ni les voix, ni les sons, ni l'habillage d'un jeu existant.

## 4. Ce qu'on garde, ce qu'on retire

**On garde, tel quel ou presque**

- Contrôles et réglages : `src/input.js`, `src/game/controls.js`, `src/core/settings.js`, `src/ui/settings.js`.
- Combat : tir, dégâts, score de base (`src/game/combat.js`, `src/core/score.js`).
- Ennemis : comportement, jetons d'attaque, rafales annoncées, bouclier, tireur d'élite (`src/enemies.js`, `src/core/tactics.js`, `src/game/roster.js`, `src/game/cues.js`).
- Sons et musique : `src/audio.js`, `src/music.js`, `src/game/ambience.js`.
- Animation de l'arme, qualité et performances : `src/game/viewmodel.js`, `src/game/perf.js`.
- Salles : les 24 gabarits de `src/content/rooms.js` et la validation de `src/core/grid.js`.
- Portes : le principe de `src/game/doors.js` (porte fermée = mur pour les déplacements, la vue et l'ouïe).
- Langues : français, anglais, turc (`src/core/i18n.js`, `src/lang/`).
- Sauvegarde versionnée, tests, chaîne de fabrication.

**On retire**

- Les trois bâtiments et leurs étages (`LEVELS` et les cartes fixes de `src/levels.js`), l'escalier, la sortie, les transitions en fondu.
- L'écran de choix d'arme et le choix de l'arme par niveau.
- Les atouts, les crédits, le déblocage et la maîtrise des armes (`src/core/perks.js`, `src/game/perkflow.js`).
- Les missions quotidiennes (elles récompensaient en crédits).
- Les annonces d'entrée de bâtiment et l'histoire de vengeance. L'annonce d'apparition d'un boss reste.
- Les bonbonnes explosives : à garder seulement si elles ne compliquent pas le parcours continu.
- Le code mort déjà signalé dans `SUIVI.md` (ancien constructeur d'arme de `src/weapons.js`).

Ne laisse pas de code inutilisé derrière toi : ce qui est retiré du jeu est retiré du dépôt, l'historique Git le conserve.

## 5. Le chantier technique principal : un monde continu

Aujourd'hui un étage est construit d'un bloc par la classe `Level` (`src/level.js`), à partir d'une carte texte complète, puis détruit au changement d'étage. La règle R2 demande l'inverse : **un monde qui glisse**.

**Ce qu'il faut obtenir**

- Le monde est une suite de salles numérotées 0, 1, 2... posées bout à bout le long de l'axe x.
- À tout instant existent : la salle du joueur, **les 3 suivantes**, et la précédente tant que sa porte n'est pas verrouillée. Les autres sont détruites (géométries, matériaux, ennemis).
- Chaque salle est un objet autonome : ses murs, son sol, son mobilier, ses lumières, ses ennemis, sa porte de sortie, sa grille de collision.
- La salle n se déduit de **la graine de la partie et de son numéro** : même graine, même parcours (indispensable au défi du jour et aux tests).
- La construction d'une salle ne doit jamais se voir : elle est préparée trois salles à l'avance, et si elle coûte plus de quelques millisecondes, étale-la sur plusieurs images.

**Ce qui dépend de la grille et doit suivre**

- Collisions du joueur et des ennemis, ligne de vue, champ de flux qui guide les ennemis vers le joueur : aujourd'hui calculés sur la grille d'un étage entier. Ils doivent travailler sur la fenêtre des salles chargées.
- Tir du joueur : les cibles du lancer de rayon sont les murs, vitres et meubles des salles chargées, plus les ennemis.
- Lumières : le nombre de lumières actives doit rester borné quel que soit le nombre de salles traversées.

**Pièges connus**

- `Level.dispose()` détruit les géométries et matériaux de tout ce qui est accroché à son groupe, y compris ceux qui sont partagés entre plusieurs objets. Dans un monde continu, les ressources partagées ne doivent être détruites qu'à la fin de la partie.
- Les ennemis sont aujourd'hui masqués salle par salle par `doors.js` pour limiter l'affichage : garde ce principe, il a ramené les appels d'affichage de 176 à 91.
- Sur une très longue partie, les coordonnées grandissent. Vérifie qu'à plusieurs kilomètres l'affichage ne tremble pas ; sinon recentre le monde périodiquement.
- Le thème visuel (villa, hôtel, tour) devient un « secteur » : il change toutes les N salles, sans coupure.

**Courbe de difficulté** (R4) : une fonction pure `roomSpec(numero, difficulte)` dans `src/core/`, testée, qui renvoie pour chaque salle le nombre d'ennemis, leurs types, et les multiplicateurs de vie, de vitesse et de dégâts. Exigences : début doux (les deux premières salles servent de prise en main), croissance régulière, **vitesse plafonnée** (un ennemi plus rapide que le joueur n'est plus esquivable), types spéciaux introduits un par un, petit boss toutes les 10 salles environ. Point de départ proposé, à régler après essai : 2 ennemis en salle 0, +1 toutes les 3 salles jusqu'à 9 ; vie +4 % par salle ; dégâts +3 % par salle ; vitesse +1,5 % par salle, plafonnée à +40 %.

## 6. Modèles 3D fournis plus tard (R9)

L'auteur apportera ses propres modèles. Aujourd'hui tout est construit par le code : personnages dans `src/game/body.js`, armes dans `src/game/gunmodel.js`, mobilier dans `src/game/decor.js`. **Ces modèles restent comme solution de repli** ; ton travail est de rendre le remplacement possible sans toucher à la logique du jeu.

**Principe**

- Séparer strictement l'apparence du reste. Les zones de touche (tête, corps, bouclier), la position du bout du canon et la taille de collision appartiennent à la logique, pas au modèle.
- Un dossier `assets/` et un manifeste (`assets/manifest.json`) qui dit, pour chaque type d'ennemi, chaque arme et chaque meuble, quel fichier charger. **Entrée absente ou fichier manquant : le jeu utilise le modèle construit par le code**, sans erreur.
- Format glTF binaire (`.glb`). Le chargeur de Three.js et ses dépendances doivent être ajoutés à ce que la chaîne de fabrication télécharge (aujourd'hui seul `three.module.js` l'est).
- Chargement avant le début de la partie, avec une barre de progression. Aucune requête réseau : tout est embarqué dans l'appli.

**Contrat à écrire dans `docs/modeles.md`**, pour que l'auteur sache quoi fournir. Il doit préciser au minimum :

- Personnages : unité (mètre), taille (environ 1,80 m), pieds à l'origine, regard vers +z ; squelette articulé ; noms des animations attendues (repos, marche, course, mise en joue, tir, impact, trois chutes) ; nom de l'os ou du point où l'arme est tenue ; budget conseillé (triangles, taille des textures).
- Armes à la première personne : canon vers -z, poignée à l'origine ; noms des pièces animées par `viewmodel.js` (culasse, chargeur, pompe) et des repères (bout du canon, fenêtre d'éjection).
- Meubles et décors : emprise au sol maximale, hauteur.
- Licences : chaque ressource ajoutée est inscrite dans `CREDITS.md` (auteur, lien, licence, date).

Vérifie le contrat en branchant **un** modèle libre de droits pour un type d'ennemi, uniquement si l'auteur approuve son téléchargement. Sans accord, vérifie le chargeur avec un fichier que tu fabriques toi-même.

## 7. Interface

- **Écran titre** : le nom du jeu, le choix de la difficulté, et pour chacune le **meilleur score et la meilleure distance** bien visibles (R10) ; le défi du jour ; les réglages. Un toucher lance la partie : il n'y a plus d'écran intermédiaire.
- **En jeu** : compte à rebours de la salle en grand, qui passe au rouge sous 5 secondes ; distance parcourue ; score ; multiplicateur de salle ; combo ; arme en cours et éliminations restantes avant la suivante ; nombre d'ennemis à abattre pour ouvrir la porte.
- **Annonces** (R8) : « HEADSHOT » apparaît à l'endroit de l'ennemi et le suit un court instant, visible même s'il est loin ; les annonces de combo s'affichent au centre haut, plus grandes à chaque palier. Changement d'arme annoncé par son nom. Chaque annonce a son son.
- **Fin de partie** : distance, score, salles franchies, éliminations, tirs à la tête, meilleur combo, arme atteinte, record battu ou à battre. Boutons rejouer et partager.
- Tous les textes passent par les fichiers de langue, dans les trois langues. Un test vérifie déjà que les trois ont les mêmes clés.

## 8. Sauvegarde

La sauvegarde est versionnée (`src/core/save.js`, version 1). Passe à la version 2 avec une migration testée :

- records par difficulté : meilleur score **et** meilleure distance ;
- record du défi du jour ;
- réglages et première partie guidée déjà faite : conservés ;
- crédits, armes débloquées, maîtrise, missions : supprimés.

Les anciens records de la campagne ne sont pas comparables aux nouveaux : ne les reprends pas comme records du nouveau jeu.

## 9. Ordre de travail

Travaille sur une branche, par étapes, chacune testée avant la suivante.

| Étape | Contenu | Terminé quand |
|---|---|---|
| 1 | Monde continu (section 5) : salles générées à l'infini, trois d'avance, salles passées détruites | Un robot de test traverse 200 salles : aucune erreur, nombre d'objets et mémoire stables, aucune image de plus de 50 ms au passage d'une porte |
| 2 | Courbe de difficulté, compte à rebours, porte qui s'ouvre à la moitié des ennemis, porte arrière qui se verrouille | Les règles R3, R4 et les réponses Q1 à Q3 sont testées |
| 3 | Changement d'arme toutes les 10 éliminations, score de distance, multiplicateur de salle | R5, R6, Q4 à Q7 testées ; **APK à faire essayer à l'auteur** |
| 4 | Écran titre, affichage en jeu, annonces, fin de partie, records, sauvegarde version 2 | R8, R10 ; les trois langues complètes |
| 5 | Retrait de la campagne, des atouts et de la progression ; nettoyage | Plus aucun code ni texte inutilisé ; tests au vert |
| 6 | Chargeur de modèles et contrat `docs/modeles.md` (section 6) | Un modèle de test se charge ; son absence ne casse rien |

**Tests attendus**, en plus de ceux qui existent : génération reproductible par graine ; chaque salle générée est jouable (porte atteignable, ennemis atteignables) sur plusieurs milliers de salles ; courbe de difficulté croissante et vitesse plafonnée ; suite des armes ; calcul du score ; migration de la sauvegarde ; traversée automatique de 200 salles dans le test de fumée.

**Budgets de performance** (annexe A de `DOSSIER_AMELIORATIONS.md`) : moins de 150 appels d'affichage par image, 60 images par seconde sur un téléphone milieu de gamme. Avec une fenêtre de cinq salles au plus, le coût ne doit pas dépendre de la distance parcourue : mesure-le en salle 5 et en salle 150.

## 10. Consignes de travail

1. **Le code fait foi.** Lis les fichiers cités avant de les modifier ; signale tout écart entre ce document et le code.
2. **Ne dépasse pas le périmètre.** Pas de nouveaux systèmes de progression, de bonus ou de monnaie : l'auteur les a explicitement retirés.
3. **Rien n'a été joué sur téléphone.** Contrôles, sons, animations, équilibrage et fluidité n'ont été vérifiés que par des mesures sur PC. Si l'auteur fait un essai, ses retours passent avant la suite du plan.
4. **Réglages d'équilibrage dans un seul fichier**, commenté, pour que l'auteur puisse demander « 25 secondes au lieu de 20 » et que ce soit une ligne.
5. **Ressources tierces** : aucun téléchargement ni achat sans l'accord explicite de l'auteur ; licence vérifiée à la source ; inscription dans `CREDITS.md`.
6. **Rends compte honnêtement** : ce qui est fait et vérifié, ce qui est fait sans avoir pu être vérifié, ce qui reste. Mets `SUIVI.md` à jour à la fin de chaque étape.

**Environnement connu au 11 novembre 2026, à revérifier**

- PC sous Windows avec Python 3.12, sans Git, Node.js, Java ni SDK Android. Serveur local : `serve.py` (port 8000).
- Le connecteur GitHub de Claude écrit le code mais pas `.github/workflows/*` : ces fichiers se modifient par l'éditeur web de GitHub, dans le navigateur intégré où l'auteur est connecté.
- Sans Git, la méthode qui a servi : écrire les fichiers sur une branche avec le connecteur, les rapatrier avec `tools\pull.ps1 <branche>`, tester dans le navigateur (`tests/index.html`, `game.debug.selfTest()`).
- Le workflow `ci.yml` lance les tests sur toutes les branches et ne fabrique l'APK que sur `main`. Il copie `index.html`, `style.css`, `ui.css`, `src` et `vendor` dans l'appli : **tout nouveau dossier à embarquer (`assets/`) doit y être ajouté**.
- Le volet du navigateur intégré, quand il est masqué, n'exécute pas `requestAnimationFrame` et renvoie des captures noires : la fluidité ne s'y mesure pas, et l'image se vérifie en lisant les pixels.
- L'auteur parle français, teste sur un OnePlus 12, suit souvent la session depuis son téléphone, et préfère que l'agent fasse les manipulations lui-même quand c'est possible.

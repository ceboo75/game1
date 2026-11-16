# Escape from hell — suivi de livraison

16 novembre 2026. Cette version repart du code public `ceboo75/game1`, récupéré dans un nouveau dossier local, et remplace son identité visuelle. Elle ne prétend pas réécrire les mécaniques déjà présentes et testées.

## Réalisé

- Nouveau titre dans le jeu, les trois langues, les partages, Android et la configuration de publication.
- Écran titre original : portail incandescent construit en CSS, perspective, cendres animées, typographie massive, cartes de difficulté et bouton de lancement utilisable au clavier.
- Direction artistique charbon, cuivre et orange incandescent ; trois palettes de décors ; panneaux industriels, grilles et bandes de danger dessinés par le code ; horizons rouges ; éclairage de l’arme harmonisé.
- Personnages masqués et cornus, conservant leurs animations et leurs silhouettes de combat ; braises en jeu, désactivées en qualité basse.
- Nouvelle icône Android vectorielle. Aucun modèle, son, police ou image externe ajouté.
- Corps articulés regroupés en un seul maillage avec squelette par personnage, au lieu d’un appel de rendu par segment. Visères et armes restent indépendantes. Les modèles glTF fournis conservent leur propre chemin de chargement.
- Accès clavier empêché aux écrans placés derrière les réglages ; retour du focus à la fermeture ; difficulté sélectionnée exposée aux technologies d’assistance.
- Installation reproductible du moteur Three.js fixé à 0.170.0, serveur Node local, script de construction Android, dépendances de test verrouillées.

Les 20 secondes, neuf armes, règles de porte, bosses, score, défis quotidiens, trois difficultés, trois langues, sons synthétisés et records restent ceux du cahier des charges. L’identifiant Android et les clés de sauvegarde restent compatibles avec l’ancienne version.

## Contrôles effectués

- 31/31 tests de logique passent, dont génération de milliers de salles et cohérence des langues.
- Robot : 200 salles, 4 832 mètres, 1 736 éliminations ; pic 92 appels de rendu, 70 sur la dernière image.
- Mémoire après stabilisation de tous les types et armes : 49 géométries et 18 textures en salle 61 comme à la fin. Le contrôle compare les états après la montée en difficulté : les textures de squelette augmentent normalement avec le nombre d’ennemis jusqu’au plafond de neuf.
- Test géométrique des sommets du squelette avec rotation, translation et échelle ; menus, sélection de difficulté, démarrage clavier, réglages, arrêt du chronomètre en pause, fin, retour et défi quotidien.
- Captures relues en 915 × 412 et 1 366 × 768 : titre, jeu, réglages, pause, résultats.
- Le rendu logiciel du test ne constitue pas une mesure des FPS sur téléphone.

## Point technique Windows

Java peut échouer à créer ses sockets locaux dans le dossier temporaire redirigé du processus. Le script Android utilise un dossier `.jtmp` dans le projet via `jdk.net.unixdomain.tmpdir`. Aucun changement système ni règle de pare-feu n’est nécessaire.

## À vérifier sur appareil réel

Installation et mise à jour sur le téléphone de l’auteur, fluidité et transitions, gyroscope, volume/latence audio, équilibre de difficulté et partage Android. Les traductions anglaise et turque demandent toujours une relecture humaine. La signature publique demeure une signature de test, non destinée au Play Store.

Aucun fichier envoyé sur GitHub, aucune publication et aucun modèle payant. Les anciens documents de conception restent des archives ; le nom courant est Escape from hell.

## Livraison Android vérifiée

- `artifacts/escape-from-hell.apk` : 757 100 octets ; compilation Gradle réussie.
- Signature APK v2 vérifiée par `apksigner` ; une signature de test.
- Titre embarqué : Escape from hell ; Android minimum 26 ; seule permission : VIBRATE.
- 57 fichiers embarqués. Comparaison exacte avec les sources pour le titre, la feuille de style, les personnages, le squelette, le point d’entrée et la licence Three.js.
- SHA-256 : `AE5E908B89E0FE8B3C92E277439472FF0C871C9E90EE6F2F324033993B243A8B`.
- Robot complet et modèle de remplacement glTF : réussite finale (`artifacts/smoke-final.log`).
- Sources avec moteur hors ligne : `artifacts/escape-from-hell-source.zip`.

Le numéro Android de cette livraison est 20261116. Les futurs builds locaux et CI utilisent la date Unix pour que leurs numéros restent supérieurs et permettent les mises à jour.

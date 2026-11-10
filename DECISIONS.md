# Décisions arrêtées — Sütçü İmam Escape

10 novembre 2026. Ce fichier complète `DOSSIER_AMELIORATIONS.md`. **En cas de contradiction, ce fichier l'emporte.**

Le nom du jeu a été choisi par l'auteur. Toutes les autres décisions ont été prises par Claude, à qui l'auteur a délégué la maîtrise d'œuvre. L'auteur peut revenir sur n'importe laquelle.

## Ligne directrice de la version 1

**Un jeu gratuit, sans publicité, sans achat, sans collecte de données, avec 0 € de ressources.** La monétisation n'arrive qu'après le lancement, si les chiffres le justifient. Ce choix supprime d'un coup le formulaire de consentement, les modules de publicité et de facturation, la migration vers Capacitor, et l'affichage public des coordonnées de l'auteur imposé aux vendeurs en Europe.

## Lot 1 — Identité

| Sujet | Décision |
|---|---|
| D1. Nom | **Sütçü İmam Escape** (avec le İ majuscule pointé du turc). 17 caractères, sous la limite de 30. |
| Identifiant de l'appli | `io.github.ceboo75.sutcuimamescape`. Définitif. L'appli de test actuelle `com.extraction.jeu` sera à désinstaller ; les records ne sont pas repris. |
| Portée du nom | Le nom est un titre. L'histoire reste la fiction de vengeance actuelle, dans un décor contemporain. Aucune personne réelle, aucun établissement réel, aucun logo ou symbole existant n'est représenté. |
| D5. Difficulté « Suicide » | Renommée **« Cauchemar »** (`Nightmare`, `Kâbus`). |
| D5. Noms des armes | Noms fictifs : FN-57 → **Faucon 57** ; Benelli → **Tonnerre 12** ; Uzi → **Guêpe** ; UMP45 → **Marteau 45** ; M4 → **Sentinelle** ; AK47 → **Kodiak 47** ; SCAR-H → **Rempart** ; SKS → **Lance 39** ; AS-VAL → **Murmure 9**. Les statistiques ne changent pas. |
| D7. Langues | Jeu en **français, anglais et turc**. Fiche de magasin dans ces trois langues, plus espagnol, portugais du Brésil et allemand. |

## Lot 2 — Modèle économique et données

| Sujet | Décision |
|---|---|
| D2. Modèle | **Gratuit, sans publicité ni achat en version 1.** Publicités choisies par le joueur et achat unique : à étudier après le lancement seulement. |
| D3. Mort | Mort définitive de la partie, conservée. **Progression permanente** ajoutée (crédits, déblocage des armes, maîtrise). **Pas de relèvement** en version 1. |
| I6. Mesure | **Aucun outil de statistiques ni de rapport d'erreurs embarqué.** On s'appuie sur la console Play : plantages, blocages, notes, installations conservées à 1 et 7 jours (disponibilité de ce dernier chiffre à vérifier dans la console). |
| Annexe B | Seuils conservés : retour à J1 ≥ 30 %, à J7 ≥ 10 %, utilisateurs sans plantage ≥ 99,5 %, note ≥ 4,3. Le tutoriel et la durée de session se jugent en observant trois personnes extérieures, pas par des statistiques. |

## Lot 3 — Jeu

| Sujet | Décision |
|---|---|
| D8 du chantier D. Glissade, sprint | **Non.** Aucun nouveau mouvement en version 1. |
| D2 à D5 du chantier D | Tir automatique : oui, proposé au premier lancement. Gyroscope : oui. Disposition des boutons : taille, opacité et mode gaucher en version 1 ; éditeur par glisser-déposer plus tard. Manette : plus tard. |
| E4. Nouveaux ennemis | **Porteur de bouclier** et **tireur d'élite** en version 1. Fonceur au couteau et fumigène : plus tard. |
| F1. Salles | **8 salles par bâtiment** au lancement, au lieu de 12 à 15. |
| G1. Atouts | **16 atouts** au lancement, au lieu de 24. |
| G2. Armes de départ | Faucon 57, Guêpe, Sentinelle. Les six autres se débloquent avec les crédits. |
| G4 à G6. Défi quotidien, succès, classements | Défi quotidien avec record **local** en version 1. Classements en ligne et succès Google Play : plus tard. |
| Violence | Stylisée : impacts et étincelles, pas de sang qui reste, pas de démembrement. Classification attendue : 16 ans. |

## Lot 4 — Ressources graphiques et sonores

| Sujet | Décision |
|---|---|
| D4. Budget | **0 € de ressources.** Seule dépense prévue : les 25 $ du compte développeur. Le budget n'est rouvert que si la tranche verticale est jugée insuffisante. |
| Personnages | D'abord des modèles articulés sous licence CC0 (Quaternius, KayKit, Kenney : disponibilité et licence à vérifier à la source). **Solution de repli** si rien ne convient : humanoïdes articulés construits et animés par le code, avec poses de tir, réactions et chutes. |
| Armes | Arme seule, **sans bras**. |
| Bruitages | Échantillons CC0, mélangés à la synthèse actuelle. |
| Voix ennemies | **Pas de voix enregistrées.** Signaux sonores courts non verbaux et icônes à l'écran. |
| Musique | **Voie 2 du dossier :** on garde et on améliore le synthétiseur à 150 BPM, avec une variation par bâtiment. Aucune piste achetée. |
| Téléchargements | Les règles du dossier restent : une seule liste groupée par phase, soumise à l'accord de l'auteur avant tout téléchargement, puis inscrite dans `CREDITS.md`. |

## Lot 5 — Technique

| Sujet | Décision |
|---|---|
| Moteur | Three.js dans la WebView. Repli vers Godot réexaminé une seule fois, à la fin de la phase 1. |
| A1. Outillage | **Pas de Vite, rien à installer sur le PC.** Le développement reste sans étape de compilation, avec `serve.py`. L'assemblage, la minification (esbuild) et les tests tournent uniquement dans GitHub Actions. |
| Three.js | Version figée, toujours téléchargée par la chaîne de fabrication. |
| I1. Coquille Android | **On garde la coquille Java actuelle.** Capacitor seulement le jour où la monétisation est décidée. |
| I2. Cible Android | Niveau exigé par Google à la date du dépôt, à lire dans la console en phase 5. Hypothèse de travail : 36. |
| Fichiers `.github/workflows/*` | Modifiés par l'éditeur web de GitHub, dans le navigateur intégré où l'auteur est connecté. |
| D8. Téléphone modeste | **Pas d'achat.** Trois moyens : bridage du processeur dans le navigateur pendant le développement, rapport de pré-lancement de la console Play sur de vrais appareils, téléphones des testeurs du test fermé. |

## Lot 6 — Publication

| Sujet | Décision |
|---|---|
| D6. Dépôt | **Reste public jusqu'à la phase 5**, pour que l'auteur télécharge les APK de test sans se connecter. La clé `android/extraction.jks` ne signe que des versions de test. En phase 5 : dépôt passé en privé, nouvelle clé d'envoi dans les secrets GitHub, signature gérée par Google Play. |
| D9. Compte développeur | **Compte personnel** par défaut, donc test fermé de 14 jours avec 12 testeurs. Si l'auteur possède une société avec numéro D-U-N-S, préférer un compte d'organisation. |
| Lancement limité | France, Turquie, Canada, puis mondial si les seuils sont atteints. |
| J4. Version web | Après le lancement, sur itch.io d'abord. |
| Prix | Gratuit. |

## Ce qui reste à l'auteur, et à lui seul

1. Vérifier que l'APK de test s'installe et se lance sur le OnePlus 12.
2. Valider aux trois points d'arrêt : fin de phase 1, fin de phase 3, avant le lancement.
3. Approuver la liste de ressources à télécharger, une fois par phase.
4. En phase 5 : créer le compte Google Play et payer les 25 $, passer le dépôt en privé, recruter 12 testeurs, valider et envoyer les déclarations de la console.

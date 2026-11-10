# Dossier d'amélioration : d'« Extraction » à un jeu publiable sur le Play Store

Rédigé le 10 novembre 2026. Projet : dépôt GitHub `ceboo75/game1`, branche `main`.

Ce dossier a deux lecteurs :

- **Toi (l'auteur du jeu)** : les sections 1 à 4 te disent ce que je changerais, pourquoi, et quelles décisions t'appartiennent.
- **L'agent qui exécutera (Claude Opus 5.5)** : les sections 5 à 10 sont le cahier des charges et la méthode. La section 7 contient ses consignes de travail.

---

## 1. Verdict

Le prototype prouve que la boucle de jeu tient : on avance, on tire, le combo et les marqueurs de kill fonctionnent, les boss verrouillent la sortie. Ce qui lui manque pour le Play Store n'est pas « plus de contenu », c'est quatre choses, dans cet ordre d'importance :

1. **Une identité visuelle et sonore assumée.** Aujourd'hui tout est généré par le code (personnages en boîtes, textures dessinées au canvas, sons synthétisés). C'est ce qui donne l'impression « peu d'efforts ». Il faut de vrais modèles animés, de vrais sons, et une direction artistique tenue de bout en bout.
2. **Des contrôles tactiles au niveau des standards mobiles.** Sur mobile, un FPS est jugé en 30 secondes sur ses contrôles. Il manque les réglages de sensibilité, le tir automatique, le gyroscope, la personnalisation des boutons.
3. **Une raison de revenir.** Le jeu n'enregistre qu'un record par difficulté. Il faut une progression permanente, de la variété d'une partie à l'autre, et un défi quotidien.
4. **Tout ce qui entoure le jeu.** Tutoriel, menus, réglages, anglais, conformité Play Store, mesure de la rétention, fiche de magasin, vidéos.

Ma recommandation de méthode tient en une phrase : **ne pas tout améliorer à la fois, mais d'abord amener un seul étage à la qualité finale** (« tranche verticale »), le valider sur ton téléphone, et seulement ensuite étendre au reste.

**Ce que ce dossier ne peut pas promettre.** Aucun plan ne garantit un succès sur le Play Store : le marché du FPS mobile est dominé par des studios aux budgets énormes, et la majorité des jeux indépendants restent sous quelques milliers d'installations. Ce plan vise ce qui se contrôle : un jeu qui ne ressemble plus à un prototype, qui tient ses joueurs, et dont on mesure les chiffres avant d'investir dans la diffusion. Les trois vrais risques ne sont pas dans le code : la qualité des ressources graphiques et sonores, les performances sur téléphones modestes, et la visibilité.

---

## 2. État des lieux

### 2.1 Ce qui existe

| Élément | État actuel |
|---|---|
| Moteur | Three.js 0.170 dans une WebView Android, sans étape de compilation. Environ 2 500 lignes de JavaScript en 9 modules, dont `src/main.js` qui concentre toute la logique de partie. |
| Contenu | 3 bâtiments (Villa 2 étages, Hôtel 5, Tour 8), 9 cartes dessinées à la main en grille de cases de 2 m, réutilisées et retournées en miroir. 143 ennemis, 6 boss. |
| Ennemis | 3 types (soldat, fonceur, lourd) et 6 boss. Modèles assemblés en boîtes (`BoxGeometry`), marche simulée par une oscillation des membres. |
| Armes | 9 armes avec cadence, chargeur, recul, dégâts, zoom et réticule propres. Modèles en boîtes. |
| Audio | Bruitages et musique entièrement synthétisés en WebAudio. Musique techno à 150 BPM avec 3 niveaux d'intensité. |
| Interface | HUD et écrans en HTML/CSS, en français uniquement. Aucun écran de réglages. |
| Sauvegarde | `localStorage` : meilleur score par difficulté, dernière arme, dernière difficulté. |
| Android | Coquille Java minimale (`com.extraction.jeu`), `targetSdk 34`, APK de 644 Ko fabriqué par GitHub Actions à chaque envoi sur `main`. |

### 2.2 Pourquoi il a l'air « fait avec peu d'efforts »

Chaque point ci-dessous est un signal que le joueur perçoit en quelques secondes :

- **Personnages en boîtes, sans animation.** Pas de pose de tir, pas de réaction à l'impact, pas de chute crédible.
- **Arme en boîtes, immobile.** Pas d'animation de rechargement, pas de douilles, pas de mouvement de marche.
- **Décors uniformes.** Tous les murs ont la même hauteur et le même angle droit ; les abris sont des blocs ; aucun mobilier reconnaissable.
- **Textures dessinées par le code.** Elles se répètent et n'ont pas de matière.
- **Sons synthétisés.** Un tir fait « bip-bruit blanc » au lieu de claquer ; aucune voix ennemie ; pas de pas.
- **Interface sans identité.** Fonctionnelle, mais sans logo, sans illustration, sans transitions travaillées.
- **Aucune prise en main guidée.** Le joueur arrive directement sur un choix de difficulté et de 9 armes qu'il ne connaît pas.
- **Aucune progression.** Rien à débloquer, rien à améliorer, aucune raison de relancer après la première victoire ou la troisième défaite.

### 2.3 Ce qui est solide et doit être conservé

- La boucle de jeu, le système de combo et de score, les marqueurs de kill.
- Les 9 armes différenciées par leurs statistiques.
- Les boss qui verrouillent l'escalier ou la sortie.
- Le déplacement des ennemis par champ de flux et la ligne de vue sur grille.
- La musique dont l'intensité suit le combat : c'est déjà un élément d'identité.
- La chaîne de fabrication automatique de l'APK.
- Les crochets de test `game.debug.start/step/render/instant`, précieux pour les tests automatiques.
- La légèreté : c'est un atout de téléchargement et de démarrage à préserver.

---

## 3. Le cap

### 3.1 Positionnement

Ne pas concurrencer les FPS multijoueurs réalistes. Viser un créneau où un petit jeu peut exister :

> **Un FPS solo d'arcade en parties courtes : nettoyer un immeuble étage par étage, sans jamais reculer, pour le score.**

Chaque étage dure 45 à 90 secondes, une partie complète 8 à 12 minutes. Le jeu se joue hors ligne, se lance en moins de 15 secondes, et donne envie d'en refaire une.

### 3.2 Les trois piliers (tout choix de conception doit en servir au moins un)

1. **L'élan.** On avance toujours. Les combos récompensent la vitesse et la précision. Rien ne doit casser le rythme : pas de temps mort, pas de menu inutile.
2. **La lisibilité.** À tout instant le joueur voit qui le menace, d'où viennent les tirs, et pourquoi il est mort. Une mort qui paraît injuste fait désinstaller.
3. **« Encore une ».** Chaque partie diffère de la précédente et fait progresser quelque chose de permanent.

### 3.3 Direction artistique : « néo-noir stylisé »

Le réalisme est hors de portée (budget, WebView). La bonne réponse est un style **volontairement simple mais cohérent**, ce qui se lit comme un choix et non comme un manque :

- Modèles low-poly à facettes, **vrais personnages articulés et animés**.
- Éclairage sombre avec des néons saturés, une couleur dominante par bâtiment : ambre et bleu canard pour la Villa, rouge et or pour l'Hôtel, cyan et magenta pour la Tour.
- Ennemis toujours détachés du décor par un liseré lumineux, pour la lisibilité.
- Post-traitement léger : halo sur les néons, vignette, grain, étalonnage des couleurs.
- Une seule famille typographique pour les titres et une pour le texte, embarquées dans l'appli.

Une planche de référence d'une page (`docs/direction-artistique.md`, avec palette, exemples de silhouettes, règles d'éclairage) doit être écrite et validée **avant** de produire la moindre ressource.

---

## 4. Décisions qui t'appartiennent

L'agent ne doit pas trancher ces points à ta place. Pour chacun je donne ma recommandation, qui servira de valeur par défaut si tu ne dis rien.

| # | Décision | Ma recommandation | Pourquoi |
|---|---|---|---|
| D1 | **Nom du jeu.** « Extraction » est trop générique : introuvable dans une recherche, et déjà porté par un film et plusieurs jeux. | Choisir un nom distinctif avant toute fiche de magasin. Pistes à vérifier sur le Play Store et auprès de l'INPI : « Dernier Étage », « Red Exit », « Quinze Étages », « Neon Exit ». | Le nom et l'identifiant de l'appli ne se changent plus après publication. |
| D2 | **Modèle économique.** | Gratuit, avec **publicités vues uniquement sur choix du joueur** (se relever une fois par partie, doubler les crédits de fin de partie) et **un achat unique** « édition complète » qui les remplace. Aucune publicité imposée au lancement. | Les publicités imposées font chuter les notes d'un jeu neuf. L'alternative « jeu payant à 2,99 € » est plus simple mais divise les téléchargements. |
| D3 | **Mort et progression.** Tu as voulu une mort très punitive (retour au niveau 1). | Garder la mort définitive de la partie, mais ajouter une **progression permanente** (crédits, déblocages, maîtrise des armes) et **un seul relèvement par partie**. | Sur mobile, tout perdre sans rien gagner fait partir la majorité des joueurs dès le premier jour. La progression permanente garde la tension sans vider la partie de son sens. |
| D4 | **Budget ressources.** | Prévoir une petite enveloppe. Ordre de grandeur estimé, à affiner : compte développeur 25 $ une fois ; 0 à 150 € de packs de modèles et d'animations ; 0 à 100 € de musique ; 50 à 200 € si tu fais faire l'icône et l'illustration principale. | On peut viser 0 € avec des ressources libres (CC0), mais les animations d'armes à la première personne de qualité sont rares en libre. |
| D5 | **Termes sensibles.** La difficulté « Suicide » et les noms d'armes réels (FN, Benelli, Uzi, AK47, SCAR-H...). | Renommer la difficulté (« Cauchemar » ou « Sans retour ») et donner aux armes des noms fictifs évocateurs. | Le mot peut gêner la validation de la fiche et des publicités. Les noms d'armes sont des marques déposées ; la plupart des jeux mobiles les renomment. |
| D6 | **Dépôt public.** Le code et la clé de signature actuelle sont visibles par tous. | Passer le dépôt en privé, ou au minimum ne jamais utiliser la clé actuelle pour le Play Store. | Quiconque possède la clé peut signer une fausse mise à jour. |
| D7 | **Langues.** | Jeu en français et en anglais au lancement ; fiche de magasin traduite en plus en espagnol, portugais du Brésil et allemand. | Sans anglais, le jeu est invisible hors de la francophonie. |
| D8 | **Téléphone de test modeste.** Ton OnePlus 12 est un haut de gamme : il ne révèle aucun problème de performance. | Se procurer un téléphone d'entrée de gamme d'occasion, ou trouver deux ou trois proches qui en ont un. | La majorité du parc Android est bien moins puissante que ton téléphone. |
| D9 | **Type de compte développeur.** | À choisir en connaissance de cause (voir section 8). | Un compte personnel récent impose un test fermé avec 12 testeurs pendant 14 jours avant toute publication. |

Rappel de tes décisions passées, que l'agent doit respecter tant que tu ne les changes pas : une seule arme choisie avant chaque niveau ; munitions de réserve illimitées ; régénération automatique de la vie ; pas de corps à corps ni de grenades pour le joueur ; **pas de ralenti ni de barre d'adrénaline** ; combo conservé ; dégâts ×3 à la tête ; 100 points par ennemi, 1 000 par boss, ×1,5 au tir à la tête ; trois difficultés ; bouton de visée avec zoom ×2,5 (fusils de précision) ou ×1,5 ; bouton de tir à gauche ; musique à 150 BPM en partie.

---

## 5. Les améliorations, chantier par chantier

Priorités : **P0** indispensable pour publier, **P1** nécessaire pour retenir les joueurs, **P2** à faire après le lancement si les chiffres le justifient.

### Chantier A — Fondations techniques (P0)

Rien de visible pour le joueur, mais tout le reste en dépend.

- **A1. Outillage.** Introduire Vite pour assembler, minifier et gérer les ressources. Garder le JavaScript, vérifié par TypeScript en mode `checkJs` (pas de réécriture complète). Three.js devient une dépendance `npm` au lieu d'un téléchargement dans le script de fabrication.
- **A2. Découpage de `main.js`.** Le séparer en : machine à états des écrans (démarrage, menu, équipement, partie, bilan d'étage, fin), systèmes de jeu (joueur, armes, ennemis, effets, audio), et services (sauvegarde, réglages, plateforme).
- **A3. Contenu piloté par des données.** Armes, ennemis, boss, atouts, salles et textes dans des fichiers de données validés au chargement. Aucun texte affiché ne reste dans le code (prérequis de la traduction).
- **A4. Simulation à pas fixe** (60 Hz) séparée de l'affichage, pour un comportement identique à 30, 60 ou 120 images par seconde. Ton OnePlus 12 affiche à 120 Hz : le jeu doit offrir une limite à 60 pour la chauffe et la batterie.
- **A5. Sauvegarde versionnée.** Un seul objet de sauvegarde avec numéro de version et migration, au lieu de clés `localStorage` éparses. Reprise des records existants.
- **A6. Couche « plateforme ».** Une interface unique pour vibrations, publicités, achats, classements, partage, avec une implémentation Android et une implémentation factice pour le navigateur. Le jeu doit rester entièrement jouable et testable dans un navigateur.
- **A7. Tests automatiques.**
  - Tests unitaires de la logique pure : score, combo, dégâts, générateur aléatoire, migrations de sauvegarde.
  - **Validation de chaque carte** : il existe un chemin du départ à la sortie, chaque point d'apparition est atteignable, aucun abri ne bouche une porte. Ce défaut s'est déjà produit dans `HOTEL_ROOMS`.
  - Test de fumée dans un navigateur sans écran (Playwright) : un robot joue un étage via `game.debug` et vérifie qu'aucune erreur n'apparaît.
- **A8. Chaîne de fabrication en deux temps.** Aujourd'hui chaque envoi sur `main` publie une version. Passer à : vérifications et APK de test sur chaque demande de fusion ; version publiée seulement sur une étiquette `v*`.
- **A9. Robustesse.** Mise en pause quand l'appli passe en arrière-plan, reprise de l'audio, récupération après perte du contexte WebGL, écran de chargement avec barre de progression.

### Chantier B — Direction artistique et rendu (P0)

- **B1. Personnages.** Humanoïdes low-poly articulés au format glTF, avec au minimum : attente, marche, course, tir, deux réactions à l'impact, trois ou quatre morts différentes. Une silhouette distincte par type d'ennemi, reconnaissable à 20 mètres. Un modèle propre à chaque boss.
- **B2. Armes à la première personne.** Un modèle par arme, avec tir, recul, rechargement, passage en visée, balancement à la marche, éjection des douilles, flash lumineux. Choix de style assumé : **arme seule, sans bras visibles**, animée en partie par le code. Des bras ne sont ajoutés que si le budget D4 le permet.
- **B3. Décors.** Remplacer les blocs par du mobilier modélisé servant d'abri (canapés, bars, bureaux, baies de serveurs, piliers). Varier les hauteurs de plafond et ajouter cadres de porte, plinthes, luminaires. Chaque bâtiment doit être identifiable sur une seule capture d'écran.
- **B4. Éclairage.** Peu de lumières dynamiques, beaucoup de surfaces émissives. Ombres de contact simples sous les personnages. Ombres portées réelles réservées au niveau de qualité élevé.
- **B5. Post-traitement.** Halo, vignette, grain, étalonnage. Calculé à demi-résolution et désactivable. En qualité basse, le halo est remplacé par de simples images lumineuses.
- **B6. Effets.** Impacts différents selon la matière (plâtre, bois, verre, métal), marques d'impact, vitres qui éclatent, étincelles, fumée de canon, traçantes.
- **B7. Format des ressources.** Modèles glTF compressés (meshopt), textures compressées (KTX2), atlas partagés. Objectif : appli complète sous 50 Mo, idéalement sous 30 Mo.
- **B8. Niveaux de qualité.** Bas, moyen, élevé, choisis automatiquement au premier lancement par une mesure de quelques secondes, modifiables dans les réglages. Résolution d'affichage ajustée en continu selon le temps de calcul des images.

**D'où viennent les ressources.** L'agent ne sait pas produire lui-même des modèles ou des musiques de qualité professionnelle. Il doit donc :

1. Chercher d'abord des ressources sous licence libre (CC0) chez les éditeurs connus de packs low-poly : Kenney, Quaternius, KayKit. Les animations humanoïdes peuvent venir de Mixamo, ce qui demande ton compte Adobe.
2. Te proposer une liste courte avec lien, licence et aperçu, et **attendre ton accord avant tout téléchargement ou achat**.
3. Consigner chaque ressource dans `CREDITS.md` : auteur, lien, licence, date.
4. Vérifier lui-même la licence sur la page d'origine. Les noms d'éditeurs ci-dessus sont des pistes, pas des garanties de disponibilité.

### Chantier C — Audio (P0)

- **C1. Bruitages enregistrés.** Pour chaque arme : détonation, mécanique, queue de réverbération intérieure, rechargement en plusieurs temps. Impacts par matière, pas, douilles, verre.
- **C2. Voix ennemies.** Courtes répliques d'alerte, de rechargement, de douleur, de mort. Elles servent la lisibilité (pilier 2) autant que l'ambiance. Sous-titres activables.
- **C3. Retour de kill.** Garder le marqueur actuel et l'enrichir : son qui monte d'un demi-ton à chaque palier de combo, son distinct et plus brillant pour le tir à la tête.
- **C4. Musique.** Garder le principe d'intensité adaptative à 150 BPM. Deux voies, par ordre de préférence :
  1. Des pistes produites, découpées en couches (calme, tension, combat, boss) lancées en synchronisation et mixées selon l'intensité. Source : achat de licence, commande à un compositeur, ou outil de génération avec licence commerciale.
  2. À défaut, améliorer nettement le synthétiseur actuel (meilleures sonorités, compression, variations par bâtiment).
- **C5. Mixage.** Un bus par famille (musique, tirs, voix, interface), un limiteur en sortie, atténuation de la musique pendant les tirs, spatialisation des sons ennemis. Volumes réglables séparément.

### Chantier D — Contrôles et sensations (P0)

C'est le chantier qui pèse le plus sur les premières notes.

- **D1. Réglages de visée.** Sensibilité horizontale et verticale, sensibilité en visée, courbe d'accélération, force de l'aide à la visée.
- **D2. Tir automatique** en option : l'arme tire seule quand le viseur est sur un ennemi. Proposé au premier lancement, car beaucoup de joueurs mobiles l'attendent.
- **D3. Visée au gyroscope** en option, pour l'ajustement fin.
- **D4. Éditeur de disposition.** Déplacer, redimensionner et régler l'opacité de chaque bouton ; mode gaucher ; joystick fixe ou flottant.
- **D5. Manette.** Prise en charge des manettes Bluetooth par l'API Gamepad du navigateur.
- **D6. Sensations de tir.** Recul avec motif propre à chaque arme, secousse de caméra dosée et désactivable, micro-arrêt de quelques millisecondes sur un kill, réaction visible de l'ennemi à chaque impact, casque qui saute au tir à la tête, chute orientée selon la direction du tir. **Pas de ralenti**, conformément à ta décision.
- **D7. Retours de danger.** Indicateur directionnel des dégâts déjà présent à affiner, battement de cœur et son étouffé à faible vie, vibrations différenciées.
- **D8. Mouvement.** Évaluer à la tranche verticale l'ajout d'une glissade ou d'un sprint. À ne garder que si cela sert l'élan sans surcharger l'écran.

### Chantier E — Ennemis et combat (P1)

- **E1. Équité par jetons d'attaque.** Seuls deux ou trois ennemis ont le droit de tirer avec précision en même temps ; les autres se déplacent ou tirent pour couvrir. C'est la technique standard pour qu'un combat à dix reste lisible. La difficulté règle le nombre de jetons plutôt que seulement les dégâts.
- **E2. Attaques annoncées.** Tout tir dangereux est précédé d'un signal (laser, éclat, réplique). Le tireur d'élite fait déjà cela : généraliser.
- **E3. Comportements.** Se mettre à couvert, sortir pour tirer, contourner, reculer quand on est blessé, se signaler entre eux.
- **E4. Nouveaux types.** Quatre ajouts à prototyper puis trier : porteur de bouclier (à contourner), tireur d'élite ordinaire, fonceur au couteau, lanceur de fumigène qui casse les lignes de vue.
- **E5. Boss.** Une arène propre, deux phases, une attaque signature annoncée, une courte présentation à l'écran.

### Chantier F — Niveaux et variété (P1)

- **F1. Salles assemblées.** Remplacer les 9 cartes fixes par une bibliothèque de salles (viser 12 à 15 par bâtiment) assemblées en chemin linéaire à partir d'une graine. Chaque partie propose des étages différents ; une même graine redonne exactement le même immeuble (indispensable au défi quotidien).
- **F2. Portes.** Le joueur enfonce chaque porte pour entrer dans la salle suivante. C'est un geste fort du genre, et cela permet de n'afficher que deux salles à la fois, ce qui allège beaucoup l'affichage.
- **F3. Décor actif.** Vitres et lampes destructibles, objets explosifs, abris qui se dégradent.
- **F4. Identité de jeu par bâtiment.** Villa : pièces serrées, combat rapproché. Hôtel : longs couloirs, lignes de tir. Tour : plateaux ouverts et cloisons de verre.
- **F5. Transitions.** Cage d'escalier ou ascenseur jouable de quelques secondes entre deux étages, qui masque le chargement et affiche le bilan de l'étage.

### Chantier G — Progression et rejouabilité (P1)

- **G1. Atouts entre les étages.** Après chaque étage, choisir un atout parmi trois (viser 24 au lancement) : chargeur agrandi, rechargement éclair, balles perforantes, soin au kill, combo plus long, etc. Certains se combinent. C'est le principal moteur de variété.
- **G2. Crédits et déblocages.** Le score rapporte des crédits. Le joueur commence avec 3 armes et débloque les 6 autres. Rien ne s'achète avec de l'argent réel qui donne un avantage.
- **G3. Maîtrise des armes.** Chaque arme gagne des niveaux à l'usage et débloque trois accessoires (viseur, chargeur, canon) qui modifient légèrement ses statistiques.
- **G4. Défi quotidien.** Un immeuble identique pour tous, arme imposée, un classement par jour.
- **G5. Missions et succès.** Trois missions par jour, une liste de succès reliée aux services de jeux Google Play.
- **G6. Classements** par bâtiment et par difficulté.
- **G7. Carte de résultat à partager.** Une image générée en fin de partie (score, temps, arme, combo maximal) avec le bouton de partage du téléphone.
- **G8. Récit léger.** Une planche illustrée de quelques secondes à l'entrée de chaque bâtiment et avant chaque boss, passable d'un toucher.

### Chantier H — Interface et première session (P0 pour H1 à H4)

- **H1. Première minute.** Du lancement au premier tir en moins de 15 secondes. À la première partie : pas de choix de difficulté ni d'arme, une arme par défaut, difficulté normale.
- **H2. Tutoriel intégré** au premier étage de la Villa : se déplacer, viser, tirer, recharger, viser de près, comprendre le combo. Par consignes contextuelles, sans écran de texte.
- **H3. Écran de réglages.** Contrôles, graphismes, audio, langue, accessibilité.
- **H4. Refonte des menus.** Logo, décor 3D animé en fond, transitions, sons d'interface, écran de fin détaillé avec comparaison au record.
- **H5. Accessibilité.** Couleur du liseré ennemi au choix (daltonisme), réduction des secousses et des flashs, taille du texte, sous-titres.
- **H6. Traduction.** Système de textes par langue, français et anglais complets, détection de la langue du téléphone.

### Chantier I — Plateforme Android et conformité (P0)

- **I1. Coquille.** Migrer vers Capacitor pour disposer de modules prêts à l'emploi (publicités, achats, services de jeux, vibrations, cycle de vie). La coquille Java actuelle peut servir jusqu'à la phase 5.
- **I2. Cibles Android.** `targetSdk` au niveau exigé par Google à la date de dépôt : **au moins 35, probablement 36, à vérifier dans la console**. Gérer l'affichage bord à bord, les encoches, et le geste de retour.
- **I3. Format et signature.** Publication au format AAB avec la signature gérée par Google Play. **Nouvelle clé d'envoi privée**, stockée dans les secrets GitHub. La clé actuelle `android/extraction.jks`, publique, ne doit servir qu'aux versions de test.
- **I4. Identifiant définitif** de l'appli, fixé avec le nom (D1) avant le premier dépôt.
- **I5. Publicités et achats** selon D2 : module publicitaire avec le formulaire de consentement européen, facturation Google Play, restauration de l'achat.
- **I6. Mesure.** Statistiques d'usage anonymes et rapports d'erreurs, activés après consentement : étapes du tutoriel, étage de la mort, arme choisie, durée de session, rétention.
- **I7. Documents obligatoires.** Politique de confidentialité en ligne, déclaration de sécurité des données, questionnaire de classification (violence), déclaration de présence de publicités.
- **I8. Propriété intellectuelle.** Aucune mention de film, de personnage ou d'autre jeu dans l'appli ou la fiche. Registre des licences à jour (`CREDITS.md`).

### Chantier J — Fiche de magasin, lancement et diffusion (P0 pour J1 et J2)

- **J1. Fiche.** Titre de 30 caractères avec le nom et le genre, description courte de 80 caractères, description longue, icône, bannière 1024×500, 6 à 8 captures légendées, bande-annonce de 30 secondes dont les 3 premières montrent l'action.
- **J2. Lancement par étapes.** Test interne, puis test fermé, puis lancement limité à deux ou trois pays, puis mondial. On ne passe à l'étape suivante que si les seuils de l'annexe B sont atteints.
- **J3. Vidéos courtes.** Des extraits verticaux de 10 à 20 secondes pour TikTok, Shorts et Reels. C'est aujourd'hui le premier canal de découverte gratuit des jeux indépendants.
- **J4. Version web.** Le jeu étant en HTML5, il peut être proposé sur des portails de jeux par navigateur (itch.io, Poki, CrazyGames) comme vitrine renvoyant vers le Play Store. Conditions d'admission à vérifier pour chacun.
- **J5. Après le lancement.** Répondre aux avis, corriger en priorité ce qui fait partir les joueurs le premier jour, publier une mise à jour de contenu par mois.

---

## 6. Méthode d'exécution

Sept phases. Chaque phase se termine par un APK installable et une liste de 5 à 10 points à vérifier sur le téléphone. Les phases marquées **VALIDATION** ne peuvent pas être dépassées sans ton accord explicite.

### Phase 0 — Fondations

- **Contenu :** chantier A en entier. Décisions D1, D5, D6 prises.
- **Terminé quand :** le jeu se comporte exactement comme la version 1.0.1, mais assemblé par Vite, découpé en modules, avec les tests A7 au vert dans la chaîne de fabrication et la validation de toutes les cartes existantes.
- **Piège à éviter :** ajouter des fonctions pendant cette phase. C'est une réorganisation à comportement constant.

### Phase 1 — Tranche verticale (**VALIDATION**)

- **Contenu :** un seul étage, le premier de la Villa, amené à la qualité finale. Chantiers B, C et D appliqués à ce périmètre : une arme et deux types d'ennemis entièrement modélisés, animés et sonorisés ; décor définitif ; contrôles complets avec réglages ; niveaux de qualité.
- **Terminé quand :**
  - une personne qui n'a jamais vu le jeu ne le prend plus pour un prototype sur une vidéo de 20 secondes ;
  - les budgets de l'annexe A sont tenus sur le téléphone modeste (D8) ;
  - tu as validé sur ton OnePlus 12.
- **Décision de fin de phase :** si la WebView ne tient pas les budgets en qualité basse sur un téléphone modeste malgré l'optimisation, s'arrêter et réévaluer le choix du moteur (portage vers Godot) **avant** de produire le reste du contenu. C'est le seul moment où ce changement coûte peu.

### Phase 2 — Combat

- **Contenu :** chantier E, les 9 armes au niveau de la tranche verticale, les 3 types d'ennemis existants refaits, premier boss complet.
- **Terminé quand :** sur 10 morts observées en test, le joueur sait dire dans au moins 8 cas ce qui l'a tué.

### Phase 3 — Variété et progression (**VALIDATION**)

- **Contenu :** chantiers F et G1 à G3. Les trois bâtiments reconstruits en salles assemblées, atouts, crédits, déblocages.
- **Terminé quand :** dix parties consécutives avec la même arme ne se ressemblent pas ; une partie complète dure 8 à 12 minutes ; toutes les graines testées automatiquement (au moins 1 000 par bâtiment) produisent un immeuble valide.

### Phase 4 — Habillage et première session

- **Contenu :** chantier H, G4 à G8, boss restants, anglais.
- **Terminé quand :** trois personnes extérieures terminent le tutoriel sans aide et sans poser de question.

### Phase 5 — Plateforme

- **Contenu :** chantier I. Tes tâches de la section 8 en parallèle.
- **Terminé quand :** un AAB signé est accepté en test interne par la console Play, les achats et publicités fonctionnent en mode test, et la liste de l'annexe C est entièrement cochée.

### Phase 6 — Qualité et lancement (**VALIDATION**)

- **Contenu :** campagne de tests sur plusieurs téléphones, optimisation, chantier J, test fermé puis lancement limité.
- **Terminé quand :** les seuils de l'annexe B sont atteints sur le lancement limité. Sinon, on corrige et on mesure à nouveau avant le lancement mondial.

### Ordre de grandeur de la durée

Estimation, non mesurée : le travail de code de l'agent se compte en sessions, pas en mois. Le calendrier réel sera dicté par trois attentes incompressibles : tes validations, la recherche et le choix des ressources graphiques et sonores, et les 14 jours de test fermé. Compter **deux à trois mois** au total est réaliste ; moins serait surprenant.

---

## 7. Consignes pour l'agent exécutant

1. **Le code fait foi, pas ce dossier.** Lire tous les fichiers de `src/`, `index.html`, `style.css`, `android/` et `.github/workflows/apk.yml` avant toute modification. Signaler tout écart entre ce dossier et le code.
2. **Une phase à la fois.** Ne pas commencer une phase avant que les critères de la précédente soient remplis. Aux phases marquées VALIDATION, s'arrêter et attendre l'accord de l'utilisateur.
3. **Chaque phase livre un APK installable** et une liste de points à tester, en français, courte et concrète.
4. **Respecter les décisions de l'utilisateur** rappelées en fin de section 4. Si une amélioration les contredit, la proposer sans l'appliquer.
5. **Ressources tierces :** jamais de téléchargement ni d'achat sans accord explicite ; licence vérifiée à la source ; inscription dans `CREDITS.md`. Aucune copie d'un jeu, d'un film, d'un personnage ou d'une marque.
6. **Tâches réservées à l'utilisateur** (section 8) : les préparer, ne jamais les faire à sa place. Aucun mot de passe, aucun paiement, aucun formulaire légal.
7. **Mesurer les performances à chaque phase** contre l'annexe A et le dire quand un budget est dépassé.
8. **Travailler sur des branches** avec demandes de fusion ; ne plus publier de version à chaque envoi une fois le point A8 en place.
9. **Rendre compte honnêtement :** ce qui est fait et vérifié, ce qui est fait sans avoir pu être vérifié, ce qui reste.

**Contraintes d'environnement connues au 10 novembre 2026, à revérifier :**

- Le PC est sous Windows avec Python 3.12. Il n'avait ni Node.js, ni Git, ni Java, ni SDK Android. L'outillage de la phase 0 demande Node.js : obtenir l'accord de l'utilisateur pour l'installer, ou tout faire tourner dans GitHub Actions.
- Le connecteur GitHub de Claude peut écrire le code du dépôt mais **pas** les fichiers `.github/workflows/*`. Ceux-ci se modifient par l'éditeur web de GitHub.
- Depuis ce PC, le téléchargement des fichiers de version GitHub a échoué le 8 novembre 2026. **Le contenu de l'APK v1.0.1 et son installation n'ont donc jamais été vérifiés** : c'est la première chose à confirmer avec l'utilisateur.
- L'utilisateur parle français, teste sur un OnePlus 12, suit souvent la session depuis son téléphone, et préfère que l'agent fasse les manipulations lui-même quand c'est possible.
- Le serveur de test local est `serve.py` (port 8000) ; l'adresse `?fps=1` affiche le compteur d'images.

---

## 8. Ce que toi seul peux faire

| Tâche | Quand | Remarques |
|---|---|---|
| Confirmer que l'APK v1.0.1 s'installe et se lance | Tout de suite | Jamais vérifié à ce jour. |
| Trancher D1 à D9 | Avant la phase 0 pour D1, D5, D6 ; avant la phase 1 pour D4 et D8 ; avant la phase 5 pour D2 et D9 | |
| Valider la planche de direction artistique | Début de la phase 1 | |
| Approuver chaque ressource tierce, et l'acheter le cas échéant | Phases 1 à 4 | |
| Créer le compte développeur Google Play (25 $, vérification d'identité) | Dès la phase 3, car la vérification prend du temps | **Compte personnel :** test fermé obligatoire avec au moins 12 testeurs inscrits pendant 14 jours consécutifs avant de demander la publication. **Compte d'organisation :** demande une société et un numéro D-U-N-S, et n'est pas soumis à cette règle. Règles à vérifier dans la console à la date d'inscription. |
| Recruter les testeurs | Phase 5 | Proches, communautés de joueurs. |
| Créer les comptes de publicité et de paiement, remplir les informations fiscales | Phase 5 | Si tu vends ou affiches des publicités dans l'Union européenne, Google affiche publiquement des coordonnées de contact du vendeur. À vérifier avant de choisir le type de compte. |
| Signer les déclarations de la console Play | Phase 5 | L'agent prépare les réponses ; tu les valides et les envoies. |
| Tester sur le téléphone à chaque livraison | Chaque phase | |
| Publier les vidéos courtes | Phase 6 et après | L'agent peut préparer les extraits et les textes. |

---

## 9. Risques principaux

| Risque | Gravité | Parade |
|---|---|---|
| Les ressources libres ne suffisent pas à donner un rendu professionnel. | Élevée | Direction artistique écrite d'abord ; tranche verticale pour juger sur pièce ; petite enveloppe D4. |
| Performances insuffisantes de la WebView sur téléphones modestes. | Élevée | Budgets de l'annexe A ; niveaux de qualité ; portes qui limitent l'affichage ; décision moteur en fin de phase 1. |
| Les contrôles tactiles restent frustrants. | Élevée | Chantier D complet dès la phase 1 ; tests avec des personnes extérieures. |
| Le jeu sort et personne ne le voit. | Élevée | Lancement limité pour mesurer avant de communiquer ; vidéos courtes ; version web en vitrine. |
| Le périmètre gonfle et rien ne sort. | Moyenne | Priorités P0/P1/P2 ; les P2 attendent les chiffres du lancement. |
| Refus de la fiche ou des publicités. | Moyenne | Décision D5 ; annexe C ; aucune référence à une œuvre existante. |
| Clé de signature publique utilisée par erreur pour le magasin. | Moyenne | Point I3, décision D6. |

---

## Annexe A — Budgets de performance (cibles de travail proposées)

| Mesure | Cible |
|---|---|
| Fluidité sur téléphone milieu de gamme, qualité moyenne | 60 images par seconde stables |
| Fluidité sur téléphone d'entrée de gamme, qualité basse | 30 images par seconde stables |
| Appels d'affichage par image | moins de 150 |
| Triangles visibles | moins de 150 000 |
| Du lancement au menu | moins de 3 secondes sur milieu de gamme |
| Chargement d'un étage | moins de 1,5 seconde |
| Saccade isolée | aucune image de plus de 50 ms en combat |
| Taille de l'appli | moins de 50 Mo, idéalement moins de 30 Mo |
| Chauffe | 15 minutes de jeu sans chute de fluidité |

Moyens : mise en commun des objets au lieu de créations en cours de partie, compilation des matériaux pendant le chargement, géométries fusionnées ou instanciées, une seule salle et la suivante affichées à la fois.

## Annexe B — Seuils de passage au lancement mondial (cibles de travail proposées)

| Indicateur | Seuil minimal | Bon niveau |
|---|---|---|
| Joueurs revenus le lendemain (J1) | 30 % | 40 % |
| Joueurs revenus après 7 jours (J7) | 10 % | 15 % |
| Tutoriel terminé | 80 % | 90 % |
| Durée moyenne d'une session | 8 minutes | 12 minutes |
| Utilisateurs sans plantage | 99,5 % | 99,8 % |
| Note moyenne | 4,3 | 4,5 |

Repères de Google à ne pas franchir (seuils de mauvais comportement d'Android vitals) : 1,09 % de sessions avec plantage perçu et 0,47 % avec blocage de l'appli. Au-delà, la visibilité de la fiche est réduite.

## Annexe C — Liste de contrôle avant dépôt sur le Play Store

- [ ] Nom et identifiant d'appli définitifs.
- [ ] Format AAB, `targetSdk` conforme à l'exigence du jour.
- [ ] Nouvelle clé d'envoi privée ; signature gérée par Google Play activée.
- [ ] Affichage correct avec encoche, bord à bord, geste de retour, rotation paysage dans les deux sens.
- [ ] Pause en arrière-plan, reprise de l'audio, appel entrant.
- [ ] Jeu entièrement jouable hors ligne ; publicités et classements absents sans erreur quand il n'y a pas de réseau.
- [ ] Formulaire de consentement affiché en Europe avant toute publicité ou mesure.
- [ ] Achat testé : paiement, annulation, restauration après réinstallation.
- [ ] Politique de confidentialité en ligne et liée dans l'appli et la fiche.
- [ ] Déclaration de sécurité des données, classification du contenu, déclaration des publicités, public visé (pas d'enfants).
- [ ] `CREDITS.md` complet ; aucune marque ni œuvre tierce dans l'appli et la fiche.
- [ ] Fiche complète en 5 langues : icône, bannière, captures, vidéo, textes.
- [ ] Test fermé terminé si le compte y est soumis.
- [ ] Tests passés sur au moins quatre téléphones, dont un d'entrée de gamme et un de plus de quatre ans.

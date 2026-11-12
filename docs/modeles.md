# Fournir ses propres modèles 3D

Le jeu construit lui-même ses personnages, ses armes et son mobilier. Tout modèle que tu fournis remplace celui du jeu ; un modèle absent ou illisible laisse simplement l'ancien en place. Rien d'autre à changer dans le code.

## Où les mettre

1. Dépose les fichiers dans le dossier `assets/` du dépôt.
2. Déclare-les dans `assets/manifest.json` :

```json
{
  "enemies": {
    "grunt": "homme_de_main.glb",
    "varga": "varga.glb"
  },
  "weapons": {
    "fn57": "faucon57.glb"
  }
}
```

**Clés des ennemis** : `grunt` (homme de main), `rusher` (fonceur au fusil à pompe), `heavy` (lourd à la mitrailleuse), `shield` (porteur de bouclier), `sniper` (tireur d'élite), et les boss `kessler`, `lenzA`, `lenzB`, `kask`, `veuve`, `varga`.

**Clés des armes** : `fn57`, `uzi`, `benelli`, `ump45`, `m4`, `ak47`, `scarh`, `sks`, `asval` (dans cet ordre au cours d'une partie).

Le mobilier n'est pas encore remplaçable par fichier.

## Format

- glTF binaire (`.glb`), un fichier par modèle, textures incluses.
- Unité : le mètre. Aucun fichier n'est téléchargé pendant le jeu : tout est embarqué dans l'appli.
- Ajoute chaque modèle à `CREDITS.md` (auteur, lien, licence, date).

## Personnages

| Exigence | Valeur |
|---|---|
| Taille | environ 1,80 m (le jeu applique ensuite l'échelle du type : 1,04 pour le bouclier, 1,2 à 1,3 pour les boss) |
| Origine | entre les pieds, au sol |
| Regard | vers +z |
| Squelette | articulé (personnage « skinné ») |
| Repère `muzzle` | un nœud vide nommé `muzzle`, placé au bout du canon de l'arme tenue. Sans lui, les tirs partent d'un point fixe devant le personnage |
| Budget conseillé | 3 000 à 8 000 triangles, une texture de 1024 × 1024 au plus |

**Animations**, reconnues par leur nom exact. Une animation absente est ignorée : le personnage garde la pose précédente.

| Nom | Rôle | Boucle |
|---|---|---|
| `idle` | au repos | oui |
| `walk` | marche | oui |
| `run` | course (au-delà de 3 m/s) | oui |
| `aim` | arrêté, en joue | oui |
| `shoot` | recul d'un tir | non |
| `hit` | réaction à un impact | non |
| `death1`, `death2`, `death3` | trois chutes, tirées au hasard ; la dernière image reste affichée | non |

Les zones de touche (tête, corps, bouclier) appartiennent au jeu, pas au modèle : elles restent celles d'un personnage de 1,80 m. Un modèle bien plus grand ou plus petit serait mal touché.

## Armes à la première personne

| Exigence | Valeur |
|---|---|
| Orientation | canon vers -z, poignée à l'origine |
| Taille | réelle, en mètres (un pistolet fait environ 0,2 m de long) |
| Repère `muzzle` | nœud vide au bout du canon : la flamme de bouche s'y affiche |
| Repère `eject` | nœud vide à la fenêtre d'éjection : les douilles en sortent |
| Pièces animées | nœuds nommés `bolt` (culasse, recule à chaque tir), `mag` (chargeur, tombe et remonte au rechargement), `pump` (pompe du fusil à pompe), `clip` (lame-chargeur du Lance 39, caché hors rechargement) |
| Budget conseillé | 2 000 à 6 000 triangles |

Une pièce absente n'est pas animée ; le reste fonctionne.

## Vérifier un modèle

Lance le jeu en local (`py serve.py`) et ouvre `http://localhost:8000/`. Un modèle illisible est signalé dans la console du navigateur, et le jeu garde le modèle par défaut. Pour essayer un manifeste sans toucher à `assets/manifest.json`, ouvre `http://localhost:8000/?manifest=chemin/vers/manifest.json` : c'est ce que fait `tests/fixtures/manifest.json`, qui remplace un ennemi et une arme par un simple triangle.

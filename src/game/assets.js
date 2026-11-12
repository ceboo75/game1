// Modèles 3D fournis par l'auteur : dossier assets/, liste dans assets/manifest.json (contrat : docs/modeles.md).
// Sans manifeste, sans entrée ou si un fichier manque, le jeu garde ses modèles construits par le code.
// Le chargeur glTF n'est importé que s'il y a au moins un modèle à charger.

const gltfs = new Map();
let cloneScene = null;

/**
 * Charge les modèles listés dans le manifeste. Aucune requête réseau : les fichiers sont dans l'appli.
 * @param url        manifeste à lire
 * @param onProgress appelé avec l'avancement, de 0 à 1
 * @returns nombre de modèles chargés
 */
export async function loadAssets(url = 'assets/manifest.json', onProgress = () => {}) {
  let manifest;
  try {
    const r = await fetch(url);
    if (!r.ok) return 0;
    manifest = await r.json();
  } catch { return 0; }
  const base = url.slice(0, url.lastIndexOf('/') + 1);
  const entries = [];
  for (const group of ['enemies', 'weapons']) {
    for (const [key, file] of Object.entries(manifest[group] || {})) entries.push([`${group}:${key}`, file]);
  }
  if (!entries.length) return 0;
  const [{ GLTFLoader }, skeleton] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/utils/SkeletonUtils.js'),
  ]);
  cloneScene = skeleton.clone; // copie qui garde le squelette d'un personnage animé
  const loader = new GLTFLoader();
  let done = 0;
  for (const [key, file] of entries) {
    try { gltfs.set(key, await loader.loadAsync(base + file)); } catch (e) { console.warn(`Modèle ${file} illisible : le modèle par défaut est gardé.`, e); }
    onProgress(++done / entries.length);
  }
  return gltfs.size;
}

/** Copie d'un modèle chargé ('enemies:grunt', 'weapons:m4'...), ou null s'il n'y en a pas. */
export function modelOf(key) {
  const g = gltfs.get(key);
  return g ? { scene: cloneScene(g.scene), animations: g.animations } : null;
}

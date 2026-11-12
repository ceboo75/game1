// Test de fumée : ouvre le jeu dans un navigateur sans écran ; un robot traverse 200 salles de la fuite,
// puis le jeu est rouvert avec le modèle 3D de test (tests/fixtures/manifest.json).
// Demande Playwright et vendor/ : lancé par GitHub Actions (`node tests/smoke.mjs`).
// Les temps d'image ne sont pas vérifiés ici : le rendu y est logiciel, donc bien plus lent qu'un téléphone.
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, p === '/' ? 'index.html' : p);
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }).end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const errors = [];
let code = 1;
try {
  // délais larges : le rendu logiciel de GitHub Actions est très lent
  const open = async address => {
    const p = await browser.newPage({ viewport: { width: 915, height: 412 } });
    p.on('pageerror', e => errors.push(`erreur de page : ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(`console : ${m.text()}`); });
    await p.goto(address, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await p.waitForFunction(() => window.game?.assetsReady, null, { timeout: 180000 });
    return p;
  };

  const page = await open(url);
  const report = await page.evaluate(() => window.game.debug.selfTest(200));
  errors.push(...report.problems);
  const m = report.memory;
  console.log(`${report.rooms} salles traversées, ${report.distance} m, ${report.kills} éliminations, arme finale ${report.weapon}`);
  console.log(`mémoire : ${m.room10.geometries} géométries en salle 10, ${m.end.geometries} à la fin ; ${m.end.calls} appels d'affichage`);
  if (report.rooms !== 200) errors.push(`200 salles attendues, ${report.rooms} traversées`);
  if (m.end.rooms !== m.room10.rooms) errors.push(`le monde grossit : ${m.room10.rooms} puis ${m.end.rooms} salles chargées`);
  if (m.end.textures !== m.room10.textures) errors.push(`textures : ${m.room10.textures} puis ${m.end.textures}`);

  await page.close(); // la première page tourne encore : on la ferme pour ne pas ralentir la suivante

  const page2 = await open(`${url}?manifest=tests/fixtures/manifest.json`);
  const custom = await page2.evaluate(() => {
    window.game.debug.start('normal', 1);
    const bodies = window.game.world.rooms.flatMap(r => r.enemies).filter(e => e.def.id === 'grunt').map(e => e.body.constructor.name);
    return { bodies: [...new Set(bodies)], gun: !!window.game.gun.userData.custom };
  });
  if (custom.bodies.join() !== 'ModelBody' || !custom.gun) errors.push(`modèle de test non utilisé : ${JSON.stringify(custom)}`);
  // le fichier volontairement absent du manifeste de test produit une requête en échec, attendue
  for (let i = errors.length - 1; i >= 0; i--) if (/404|absent\.glb/.test(errors[i])) errors.splice(i, 1);
  code = errors.length ? 1 : 0;
} catch (e) {
  errors.push(`test interrompu : ${e.message}`);
} finally {
  await browser.close();
  server.close();
}
for (const e of errors) console.error(`ÉCHEC  ${e}`);
console.log(code ? 'Test de fumée : ÉCHEC' : 'Test de fumée : réussi');
process.exit(code);

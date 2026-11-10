// Test de fumée : ouvre le jeu dans un navigateur sans écran et fait charger et tourner chaque étage.
// Demande Playwright et vendor/three.module.js : lancé par GitHub Actions (`node tests/smoke.mjs`).
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
  const page = await browser.newPage({ viewport: { width: 915, height: 412 } });
  page.on('pageerror', e => errors.push(`erreur de page : ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(`console : ${m.text()}`); });
  await page.goto(url);
  await page.waitForFunction(() => window.game?.debug?.selfTest, null, { timeout: 30000 });
  const report = await page.evaluate(() => window.game.debug.selfTest());
  errors.push(...report.problems);
  console.log(`${report.floors} étages chargés et joués`);
  if (report.floors !== 15) errors.push(`15 étages attendus, ${report.floors} joués`);
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

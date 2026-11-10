// Lance les tests de logique avec Node : `node tests/run.mjs`
import { cases, runAll } from './cases.js';
import './settings.cases.js';
import './tactics.cases.js';

const { passed, failed } = runAll();
for (const f of failed) console.error(`ÉCHEC  ${f.name}\n       ${f.error}`);
console.log(`${passed} / ${cases.length} tests réussis`);
process.exit(failed.length ? 1 : 0);

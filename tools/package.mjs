import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const dest='artifacts/source-package';
const files=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'}).split('\0').filter(Boolean);
for(const f of files){if(!fs.statSync(f).isFile())continue;const out=path.join(dest,f);fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(f,out);}
fs.cpSync('vendor',path.join(dest,'vendor'),{recursive:true});
console.log(`${files.length} source files staged with offline engine`);

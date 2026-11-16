import { mkdir, writeFile } from 'node:fs/promises';
const base = '.toolchain/';
const jobs = [
 ['jdk.zip','https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse'],
 ['gradle.zip','https://services.gradle.org/distributions/gradle-8.9-bin.zip'],
 ['sdk.zip','https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip']
];
await Promise.all(jobs.map(async ([name,url])=> { const r=await fetch(url); if(!r.ok)throw Error(`${name}: ${r.status}`); await writeFile(base+name,Buffer.from(await r.arrayBuffer()));console.log(name+' ready'); }));

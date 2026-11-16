import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
const p=await browser.newPage({viewport:{width:915,height:412},locale:'fr-FR'});
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8080');await p.waitForFunction(()=>game?.assetsReady);
const skin=await p.evaluate(async()=>{
 const THREE=await import('three');const {Body}=await import('./src/game/body.js');const {ENEMY_TYPES}=await import('./src/levels.js');
 const b=new Body({...ENEMY_TYPES.heavy,scale:1.32},.7,true);
 b.update(.1,{x:10,z:12,yaw:1.2,speed:3,aim:true,aimPitch:.1,alert:true});b.root.updateMatrixWorld(true);b.skin.skeleton.update();
 const geo=b.skin.geometry,pos=geo.attributes.position;let max=0;
 for(let i=0;i<pos.count;i+=7){
 const v=new THREE.Vector3().fromBufferAttribute(pos,i),idx=geo.attributes.skinIndex.getX(i);
 const expected=v.clone().applyMatrix4(b.skin.skeleton.boneInverses[idx]).applyMatrix4(b.skin.skeleton.bones[idx].matrixWorld);
 const actual=b.skin.applyBoneTransform(i,v.clone()).applyMatrix4(b.skin.matrixWorld);
 max=Math.max(max,actual.distanceTo(expected));
 }
 b.dispose();return max;
});
assert.ok(skin<1e-5,`skin transform error ${skin}`);
await p.locator('.chip.difficile').click();assert.equal(await p.evaluate(()=>game.state),'menu');
assert.equal(await p.locator('.chip.difficile').getAttribute('aria-pressed'),'true');
await p.locator('#btnSettings').click();await p.locator('#screenSettings').waitFor({state:'visible'});
await p.screenshot({path:'artifacts/settings-mobile.png'});
// Close through the actual settings control.
await p.locator('#setClose').click();
await p.locator('#btnStart').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>game.state==='play');
await p.evaluate(()=>{const e=game.enemies.find(e=>e.alive);game.player.pos.set(e.pos.x-3,0,e.pos.z);game.player.yaw=-Math.PI/2;game.debug.step(1);});
await p.screenshot({path:'artifacts/combat-mobile.png'});
await p.locator('#btnPause').dispatchEvent('pointerdown');await p.waitForFunction(()=>game.state==='paused');
const time=await p.evaluate(()=>game.run.timer);await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>game.run.timer),time);
await p.locator('#btnQuit').click();await p.locator('#screenEnd').waitFor({state:'visible'});await p.screenshot({path:'artifacts/end-mobile.png'});
await p.locator('#btnAgain').click();await p.locator('#btnDaily').click();assert.ok(await p.evaluate(()=>game.run.daily));assert.equal(await p.evaluate(()=>game.diff.id),'normal');
assert.deepEqual(errors,[]);console.log('Skinning, keyboard start, difficulty selection, settings, pause freeze, end/replay and daily challenge: PASS');
}finally{await browser.close();}

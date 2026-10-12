import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1000,height:700},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('havana-settings-v1',JSON.stringify({quality:'low',volume:0})));
await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__game?.active);
await page.locator('[data-screen="welcome"] [data-action="new"]').click();
await page.evaluate(()=>window.__game.pause());
const probe=await page.evaluate(async()=>{const {probeScene}=await import('/scripts/scene-probe.mjs');return probeScene(window.__game);});
console.log('Reachability',JSON.stringify(probe));assert(probe.region&&probe.targets.every(t=>!t.unreachable),'all targets and region connected to spawn');
for(const target of probe.targets){
 await page.locator('[data-screen="pause"] [data-action="resume"]').click();
 await page.evaluate(t=>{const g=window.__game;g.player.teleport(new g.player.safe.constructor(...t.feet));g.player.yaw=t.yaw;g.player.pitch=t.pitch;g.player.syncCamera(false);g.interaction.update();},target);
 await page.keyboard.press('e');await page.waitForFunction(()=>window.__game.state==='inspect');
 assert.equal(await page.evaluate(()=>window.__game.inspected.id),target.id);
 if(target.id==='journal'){
  await page.locator('[data-action="take"]').click();await page.waitForFunction(()=>window.__game.state==='playing');
  assert.equal(await page.evaluate(()=>window.__game.carried?.id),'journal');
  await page.evaluate(()=>{const g=window.__game;g.player.reset();g.player.yaw=Math.PI;g.player.syncCamera(false);});
  await page.keyboard.press('g');assert.equal(await page.evaluate(()=>window.__game.carried),null);
 }else await page.locator('[data-action="closeInspect"]').click();
 await page.evaluate(()=>window.__game.pause());
}
await page.locator('[data-screen="pause"] [data-action="resume"]').click();
await page.evaluate(()=>{const g=window.__game;g.player.teleport(new g.player.safe.constructor(-31,.01,7));});
await page.waitForFunction(()=>window.__game.state==='complete');
assert.equal(await page.locator('#game-percent').textContent(),'100%');
await page.screenshot({path:'test-results/game-complete.png'});
assert.deepEqual(errors,[]);
console.log('PASS: five reachable raycast targets, inspect all, take/drop journal, region visit, 100% completion');
// Explicit pointer-lock fallback is independently usable, without fabricating a lock.
await page.locator('[data-screen="complete"] [data-action="resume"]').click();
await page.evaluate(()=>{window.__game.renderer.domElement.requestPointerLock=undefined;window.__game.dragMode=false;window.__game.pause();});
await page.locator('[data-screen="pause"] [data-action="resume"]').click();
await page.locator('[data-action="dragMode"]').click();assert(await page.evaluate(()=>window.__game.dragMode&&window.__game.state==='playing'));
console.log('PASS: unsupported pointer-lock fallback');
}finally{await browser.close();}

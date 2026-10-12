import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('havana-settings-v1',JSON.stringify({quality:'low',volume:0})));
 await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__game?.active);
 assert(await page.locator('.game-mobile').isVisible());await page.screenshot({path:'test-results/game-mobile.png'});
 await page.locator('.game-mobile [data-action="tour"]').click();assert(!await page.evaluate(()=>window.__game.active));
 assert(await page.locator('.hero').isVisible());console.log('PASS: touch device guidance and mobile scroll-tour handoff');
}finally{await browser.close();}

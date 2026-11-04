import { Browser } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
process.env.TASTE_SKILL_TMP = resolve('.codex-temp/mobile-review-browser');
const out = resolve('docs/reviews/rendered-evidence-2026-11-03');
const browser = await Browser.launch();
try {
  const version = await browser.send('Browser.getVersion');
  const page = await browser.newPage({ width:390,height:844,mobile:true });
  await page.send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('theme','light')"});
  await page.goto('https://www.hivecraic.com/login',{settleMs:1500});
  const order=[];
  for(let i=0;i<7;i++) {
    await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await new Promise(resolve=>setTimeout(resolve,350));
    order.push(await page.eval(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),c=getComputedStyle(e);return {tag:e.tagName,id:e.id,text:e.innerText||'',outline:c.outline,boxShadow:c.boxShadow,y:r.y,height:r.height,scrollY};}));
    if(i===0||i===1) await page.screenshot({path:resolve(out,`login-focus-${i+1}.png`),format:'png'});
  }
  const inputs=await page.eval(()=>[...document.querySelectorAll('input')].map(e=>{const c=getComputedStyle(e);return {id:e.id,border:c.borderColor,background:c.backgroundColor,color:c.color,font:c.fontSize,autocomplete:e.autocomplete};}));
  await page.goto('https://www.hivecraic.com/dashboard',{settleMs:8000});
  await page.screenshot({path:resolve(out,'protected-dashboard-unauthenticated.png'),format:'png'});
  const protectedRoute=await page.eval(()=>({requested:'/dashboard',actual:location.href,heading:document.querySelector('h1')?.innerText}));
  const results={at:new Date().toISOString(),version,viewport:{width:390,height:844,mobile:true},order,inputs,protectedRoute,note:'No credentials entered, forms submitted or app records changed.'};
  writeFileSync(resolve(out,'public-interaction-checks.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}

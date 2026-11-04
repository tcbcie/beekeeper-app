import { Browser } from '../../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base = process.argv[2] || 'https://www.hivecraic.com';
const out = resolve('docs/reviews/rendered-evidence-2026-11-03');
process.env.TASTE_SKILL_TMP = resolve('.codex-temp/mobile-review-browser');
mkdirSync(out, { recursive: true });
const browser = await Browser.launch();
const results = [];
try {
  for (const config of [
    { route: '/login', width: 320, theme: 'light' },
    { route: '/login', width: 390, theme: 'light' },
    { route: '/login', width: 390, theme: 'dark' },
    { route: '/login', width: 390, theme: 'light', textScale: 2 },
    { route: '/forgot-password', width: 320, theme: 'light' },
    { route: '/login?signup=true', width: 320, theme: 'light' }
  ]) {
    const page = await browser.newPage({ width: config.width, height: 844, mobile: true });
    await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('theme', '${config.theme}')` });
    await page.goto(base + config.route, { settleMs: 1200 });
    await page.eval('document.fonts.ready.then(() => true)');
    if (config.textScale) await page.eval('document.documentElement.style.fontSize = "200%"');
    const measured = await page.eval(() => ({
      url: location.href, title: document.title, viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight,
      theme: document.documentElement.className, rootFontSize: getComputedStyle(document.documentElement).fontSize,
      text: document.body.innerText,
      controls: [...document.querySelectorAll('button,input,select,a')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{
        const r=e.getBoundingClientRect(), c=getComputedStyle(e);
        return {tag:e.tagName,type:e.type,text:e.innerText||'',name:e.getAttribute('aria-label'),id:e.id,labels:e.labels?[...e.labels].map(l=>l.innerText):[],x:r.x,y:r.y,width:r.width,height:r.height,fontSize:c.fontSize,color:c.color,background:c.backgroundColor};
      })
    }));
    const name = `${config.route.includes('forgot')?'forgot':config.route.includes('signup')?'signup':'login'}-${config.width}-${config.theme}${config.textScale?'-root-text-200':''}`;
    await page.screenshot({ path: resolve(out, name + '.png'), format: 'png', fullPage: true });
    await page.screenshot({ path: resolve(out, name + '-viewport.png'), format: 'png' });
    results.push({ name, at:new Date().toISOString(), config, ...measured });
    writeFileSync(resolve(out, 'public-screen-measurements.json'), JSON.stringify(results,null,2));
    console.log(JSON.stringify({name,url:measured.url,width:measured.viewport.width,documentWidth:measured.documentWidth,height:measured.documentHeight}));
    await page.close();
  }
} finally { await browser.close(); }

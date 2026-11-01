import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const base = process.env.AUDIT_BASE_URL || 'http://localhost:3100';
const phase = process.env.AUDIT_PHASE || 'phase-a';
const browser = await chromium.launch();
await mkdir('screenshots/audit', { recursive: true });
const axe = await readFile('node_modules/axe-core/axe.min.js', 'utf8');
const result = { base, pages: [], accessibility: [], headers: {} };
const job = '/jobs/customer-support-associate-northstar-services-bengaluru-s1';
try {
  const page = await browser.newPage();
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 1024 });
    for (const [name, path] of [['home','/'],['jobs','/jobs'],['detail',job],['login','/admin/login'],['dashboard-preview','/demo/dashboard'],['about','/about'],['contact','/contact'],['privacy','/privacy-policy'],['disclaimer','/disclaimer'],['404','/missing-audit-page'],['category','/jobs/category/accounts'],['location','/jobs/location/pune'],['report',job+'/report']]) {
      const response = await page.goto(base+path);
      await page.waitForTimeout(250);
      if (['home','jobs','detail','login','dashboard-preview'].includes(name)) await page.screenshot({ path: `screenshots/audit/${name}-${width}.png`, fullPage: true });
      const geometry = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, smallTargets: [...document.querySelectorAll('a,button,input,select,textarea')].map(e=>({label:(e.textContent||e.getAttribute('aria-label')||e.name||'').trim().slice(0,60),r:e.getBoundingClientRect()})).filter(({r})=>r.width>0&&r.height>0&&(r.height<44||r.width<44)).map(({label,r})=>({label,width:Math.round(r.width),height:Math.round(r.height)})) }));
      result.pages.push({name,width,status:response.status(),...geometry});
      if(width===390 && ['home','jobs','detail','login'].includes(name)) {
        await page.addScriptTag({content:axe});
        const a = await page.evaluate(async()=> { const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return { violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:r.passes.length}; });
        result.accessibility.push({name,...a});
      }
      if(width===390&&name==='home') result.headers=response.headers();
    }
  }
} finally { await browser.close(); await writeFile(`verification/audit/browser-${phase}.json`, JSON.stringify(result,null,2)); }
console.log(JSON.stringify({pages:result.pages.length,overflows:result.pages.filter(p=>p.overflow),axe:result.accessibility.map(a=>({page:a.name,violations:a.violations.map(v=>({id:v.id,impact:v.impact}))}))},null,2));

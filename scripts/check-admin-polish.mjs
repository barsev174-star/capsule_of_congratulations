import {createHmac} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const base=process.env.ADMIN_QA_URL || 'http://127.0.0.1:3213';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Local QA server required');
const secret=process.env.ADMIN_QA_SESSION_SECRET;
if(!secret)throw new Error('ADMIN_QA_SESSION_SECRET required');
const output=`output/admin-polish/${process.env.ADMIN_QA_STAGE || 'final'}`;await mkdir(output,{recursive:true});
const routes=(process.env.ADMIN_QA_ROUTES || '/admin,/admin/cards').split(',');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const payload=Buffer.from(JSON.stringify({email:process.env.ADMIN_QA_EMAIL || 'admin-qa@example.com',role:'admin',exp:Date.now()+3600000})).toString('base64url');
 await page.context().addCookies([{name:'admin_session',value:payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url'),url:base}]);
 for(const width of [1280,1440,360,390,430,768]) {
  await page.setViewportSize({width,height:900});
  for(const route of routes) {
   const response=await page.goto(base+route,{waitUntil:'networkidle'});if(!response.ok())throw new Error(route+' '+response.status());
   await page.locator('#admin-content').waitFor();
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Page overflow '+width+' '+route);
   if(await page.locator("#admin-content").evaluate(el=>el.scrollWidth>el.clientWidth+1))throw new Error("Content overflow "+width+" "+route);
   await page.screenshot({path:`${output}/${route.replaceAll(/[^a-z0-9]/gi,'-')}-${width}.png`});
   if(route==='/admin/cards') {
    const main=page.locator('#admin-content');await main.evaluate(el=>{el.scrollTop=600;});
    const position=await main.evaluate(el=>el.scrollTop);if(position<100)throw new Error('Expected a long independently scrollable list');
    const header=await page.locator('header').first().boundingBox();if(header.y<0)throw new Error('Header scrolled away');
    if(width<=768) {
     const trigger=page.getByRole('button',{name:'Открыть меню',exact:true});await trigger.click();
     const drawer=page.getByRole('dialog',{name:'Разделы админки',exact:true});await drawer.waitFor();
     await page.keyboard.press('Tab');if(!await page.evaluate(()=>document.activeElement?.closest('#admin-drawer')!==null))throw new Error('Focus left drawer');
     await page.mouse.move(width-5,500);await page.mouse.wheel(0,400);
     if(await main.evaluate(el=>el.scrollTop)!==position)throw new Error('Background scrolled under drawer');
     await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
     if(!await trigger.evaluate(el=>el===document.activeElement))throw new Error('Focus was not restored');
     if(await main.evaluate(el=>el.scrollTop)!==position)throw new Error('Scroll lost after closing');
     await trigger.click();await page.mouse.click(width-3,100);await drawer.waitFor({state:'hidden'});
     await trigger.click();await drawer.getByRole('link',{name:'Обзор',exact:true}).click();await drawer.waitFor({state:'hidden'});
    } else {
     const nav=await page.locator('aside').boundingBox();if(nav.y<0 || nav.y>100)throw new Error('Sidebar unavailable');
    }
   }
   console.log(`OK ${width}px ${route}`);
  }
 }
 if(errors.length)throw new Error([...new Set(errors)].join('\n'));
 console.log(`ADMIN_POLISH_OK ${output}`);
}finally{await browser.close();}

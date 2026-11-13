import {chromium} from 'playwright-core';
import pg from 'pg';
import {randomUUID,randomBytes,createHash,createHmac} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.ATTRIBUTION_QA_URL||'http://127.0.0.1:3213';
const connection=process.env.DATABASE_URL;
if(!connection || !['127.0.0.1','localhost'].includes(new URL(connection).hostname) || new URL(connection).port!=='5441')throw new Error('Use the isolated QA database on port 5441');
const db=new pg.Client({connectionString:connection});await db.connect();
const browser=await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
const results=[], campaign='polish-qa-'+Date.now(), cards=[];
const paths=[['new-year','/gruppovaya-otkrytka/novyy-god'],['home','/'],['teacher','/gruppovaya-otkrytka/uchitelyu'],['caregiver','/gruppovaya-otkrytka/vospitatelyu'],['colleague','/gruppovaya-otkrytka/kollege'],['birthday','/gruppovaya-otkrytka/den-rozhdeniya']];
async function context(accepted=true) {
 const ctx=await browser.newContext();
 await ctx.route('https://**/*',route=>route.fulfill({status:200,contentType:'application/javascript',body:''}));
 if(accepted) await ctx.addInitScript(()=>localStorage.setItem('slovesto_analytics_consent_v2',JSON.stringify({decision:'accepted',consentVersion:'2026-08-26',privacyVersion:'2026-08-28',decidedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString()})));
 return ctx;
}
async function record(page,name,expected) {
 await page.waitForURL(/\/manage\/[0-9a-f-]{36}(\?|$)/,{timeout:30000});
 const id=new URL(page.url()).pathname.split('/')[2];cards.push(id);
 const row=(await db.query("SELECT context FROM telemetry_events WHERE event='funnel.card_created' AND card_id=$1 ORDER BY created_at LIMIT 1",[id])).rows[0];
 if(!row)throw new Error(name+': creation event missing');
 if(expected && (row.context.landing_type!==expected || row.context.utm_campaign!==campaign))throw new Error(name+': attribution missing or overwritten '+JSON.stringify(row.context));
 if(!expected && row.context.landing_type)throw new Error(name+': invented source');
 results.push({case:name,cardId:id,landing:row.context.landing_type??null,source:row.context.utm_source??null,campaign:row.context.utm_campaign??null});console.log('ATTRIBUTION_OK '+name);
 return id;
}
async function create(page) { await page.locator('form button[type="submit"]').filter({hasText:/Создать|Собрать|Открыть управление/}).first().click(); }
try {
 for(const [type,path] of paths) {
  const ctx=await context(type!=='new-year');const page=await ctx.newPage();
  await page.goto(base+path+'?utm_source=qa&utm_medium=test&utm_campaign='+campaign,{waitUntil:'networkidle'});
  if(type==='new-year') {await page.getByRole('button',{name:'Разрешить',exact:true}).click();await page.waitForFunction(()=>document.cookie.includes('slv_first_touch='));await page.reload({waitUntil:'networkidle'});}
  await create(page);await record(page,type+' CTA'+(type==='new-year'?' after consent and reload':''),type);await ctx.close();
 }
 const ctx=await context();let page=await ctx.newPage();await page.goto(base+paths[0][1]+'?utm_source=qa&utm_campaign='+campaign,{waitUntil:'networkidle'});
 await page.locator('a[href^="/example"]').first().click();await page.waitForURL(/\/example/);await page.getByRole('button',{name:'Пропустить',exact:true}).click();await create(page);await record(page,'new-year → example → create','new-year');await ctx.close();
 const tabCtx=await context();page=await tabCtx.newPage();await page.goto(base+paths[0][1]+'?utm_source=qa&utm_campaign='+campaign,{waitUntil:'networkidle'});const other=await tabCtx.newPage();await other.goto(base+'/manage/new',{waitUntil:'networkidle'});await create(other);await record(other,'new tab → manage/new','new-year');await tabCtx.close();
 const direct=await context();page=await direct.newPage();await page.goto(base+'/example',{waitUntil:'networkidle'});await create(page);await record(page,'direct example (no saved marketing entry)',null);await direct.close();
 const declined=await context(false);page=await declined.newPage();await page.goto(base+paths[0][1],{waitUntil:'networkidle'});await page.getByRole('button',{name:'Не использовать',exact:true}).click();await create(page);await record(page,'declined consent',null);await declined.close();
 const loginContext=await context();page=await loginContext.newPage();await page.goto(base+paths[0][1]+'?utm_source=qa&utm_campaign='+campaign,{waitUntil:'networkidle'});
 const token=randomBytes(32).toString('base64url');
 await db.query("INSERT INTO organizer_magic_links(id,email,token_hash,expires_at,created_at,return_path) VALUES($1,$2,$3,now()+interval '15 minutes',now(),'/account')",[randomUUID(),'qa-auth-'+Date.now()+'@example.com',createHash('sha256').update(token).digest('hex')]);
 await page.goto(base+'/account/verify?token='+token,{waitUntil:'networkidle'});await page.waitForURL('**/account');await create(page);await record(page,'return after real one-time-link verification','new-year');await loginContext.close();
 const blocked=await context();page=await blocked.newPage();await blocked.route('**/api/telemetry',route=>route.fulfill({status:202,contentType:'application/json',body:'{"ok":true}'}));await page.goto(base+paths[0][1]+'?utm_source=qa&utm_campaign='+campaign,{waitUntil:'networkidle'});await create(page);await record(page,'client telemetry unavailable, server creation event preserved','new-year');await blocked.close();
 const first=results[0].cardId,order=randomUUID(),attempt=randomUUID();
 await db.query("INSERT INTO payment_orders(id,card_id,amount,payable_amount,currency,status,provider,provider_order_id,paid_at,created_at,updated_at) VALUES($1,$2,39900,39900,'RUB','PAID','robokassa',$3,now(),now(),now())",[order,first,'qa-'+order]);
 await db.query("INSERT INTO payment_attempts(id,order_id,provider,provider_payment_id,status,amount,currency,confirmation_url,idempotency_key) VALUES($1,$2,'robokassa',$3,'SUCCEEDED',39900,'RUB',$4,$5)",[attempt,order,'qa-'+order,'https://auth.robokassa.ru/Merchant/Index.aspx?InvId=qa',randomUUID()]);
 await db.query("INSERT INTO payment_events(id,order_id,attempt_id,provider,event_type,processed_at) VALUES($1,$2,$3,'robokassa','payment_succeeded',now())",[randomUUID(),order,attempt]);
 const paid=(await db.query("SELECT t.context->>'landing_type' AS landing FROM payment_orders o JOIN telemetry_events t ON t.card_id=o.card_id::text AND t.event='funnel.card_created' JOIN payment_events e ON e.order_id=o.id AND e.event_type='payment_succeeded' WHERE o.id=$1",[order])).rows[0];
 if(paid.landing!=='new-year')throw new Error('Verified payment fixture lost original source');
 const admin=await context();const adminPage=await admin.newPage();const payload=Buffer.from(JSON.stringify({email:'admin-qa@example.com',role:'admin',exp:Date.now()+3600000})).toString('base64url');await admin.addCookies([{name:'admin_session',value:payload+'.'+createHmac('sha256',process.env.ADMIN_QA_SESSION_SECRET).update(payload).digest('base64url'),url:base}]);await adminPage.goto(base+'/admin/analytics?tab=sources',{waitUntil:'networkidle'});const newYearRow=adminPage.getByRole('table',{name:'Результаты страниц'}).getByRole('row').filter({has:adminPage.getByRole('link',{name:'Новый год',exact:true})});if(Number(await newYearRow.locator('td').nth(3).innerText())<1)throw new Error('Confirmed payment not visible under original New Year entry page');await admin.close();
 results.push({case:'confirmed payment ledger fixture',landing:paid.landing,amountKopecks:39900,realProviderCalled:false});
 const views=(await db.query("SELECT context->>'landing_type' AS landing,count(*)::int AS views FROM telemetry_events WHERE event IN ('seo_landing_view','home_page_view') AND created_at>now()-interval '15 minutes' GROUP BY 1")).rows;
 for(const [type] of paths)if(!views.find(v=>v.landing===type&&v.views>0))throw new Error('No persisted page views for '+type);
 await mkdir('output/admin-polish',{recursive:true});await writeFile('output/admin-polish/attribution.json',JSON.stringify({campaign,results,views},null,2));
 console.log('ATTRIBUTION_JOURNEY_OK '+results.length+' cases');
} finally {
 if(cards.length) await db.query('UPDATE cards SET is_test=true WHERE id=ANY($1::uuid[])',[cards]);
 await browser.close();await db.end();
}

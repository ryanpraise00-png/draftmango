import {chromium} from 'playwright';
import http from 'node:http';
import {once} from 'node:events';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {templateForPrompt} from '../server/template-engine/index.mjs';
import {attachStorefront} from '../server/storefront/index.mjs';
import {compileProject} from '../server/compiler.mjs';
import {createPublisher} from '../server/publisher.mjs';
import {createServer} from '../server/serve.mjs';
import '../web/workspace-model.js';
let raw='';for await(const chunk of process.stdin)raw+=chunk;const fixture=JSON.parse(raw);
const template=await templateForPrompt('store','fashion-store-1'),files=await attachStorefront(template.files),compiled=await compileProject(files);
const publisher=createPublisher({token:'store-browser-private-token-123456789',baseDomain:'localhost',backendPort:fixture.port,production:false});
const publishingHandler=publisher.listeners('request')[0];publisher.removeAllListeners('request');
publisher.on('request',(req,res)=>{
 if(req.url.startsWith('/api/'))return publishingHandler(req,res);
 const name=req.url.split('?')[0].slice(1)||'index.html',source=compiled.files[name];
 if(!source){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'Content-Type':name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html'});res.end(source);
});publisher.listen(0,'127.0.0.1');await once(publisher,'listening');
const origin='http://browser-store.localhost:'+publisher.address().port;
const gateway=createServer({root:path.resolve('web')}),handler=gateway.listeners('request')[0];gateway.removeAllListeners('request');
gateway.on('request',(req,res)=>{
 if(req.url==='/owner-fixture'){
  res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/dashboard.css"><link rel="stylesheet" href="/app-type.css"><link rel="stylesheet" href="/workspace-shell.css"><link rel="stylesheet" href="/framo-app.css"><link rel="stylesheet" href="/workspace-framo.css"><link rel="stylesheet" href="/stores.css"><body class="workspace-clone"><main id="main"></main><div id="toast" hidden></div><script src="/project-format.js"></script><script src="/workspace-model.js"></script><script src="/workspace-common.js"></script><script src="/stores.js"></script>');return;
 }handler(req,res);
});gateway.listen(0,'127.0.0.1');await once(gateway,'listening');const ownerOrigin='http://127.0.0.1:'+gateway.address().port;
const browser=await chromium.launch({headless:true});
const screenshots=path.join(tmpdir(),'draftmango-store-review');await mkdir(screenshots,{recursive:true});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(['127.0.0.1','browser-store.localhost'].includes(u.hostname))return route.continue();
  if(u.hostname==='draftmango.com'&&(u.pathname.startsWith('/framo/assets/')||u.pathname==='/assets/coffee.jpg')){
   try{return await route.fulfill({path:path.resolve('web',u.pathname.slice(1))});}catch{return route.abort();}
  }
  if(u.hostname==='checkout.stripe.com')return route.fulfill({contentType:'text/html',body:'<h1>Isolated payment-provider fixture</h1>'});
  return route.abort();
 });
 await page.goto(origin+'/#page=demo-fashion-store-1-shop');await page.getByRole('link',{name:'Cotton overshirt',exact:true}).first().waitFor();
 await page.waitForFunction(()=>{const img=document.querySelector('.product-card-img');return img?.complete&&img.naturalWidth>1;});
 await page.screenshot({path:path.join(screenshots,'store-shop-desktop.png')});
 await page.getByRole('link',{name:'Cotton overshirt',exact:true}).first().click();
 await page.getByRole('button',{name:'Add to Bag',exact:true}).click();await page.getByRole('link',{name:'View bag',exact:true}).click();
 await page.getByRole('spinbutton',{name:'Quantity of Cotton overshirt'}).fill('2');
 await page.getByRole('spinbutton',{name:'Quantity of Cotton overshirt'}).fill('1');
 await page.reload();await page.getByRole('spinbutton',{name:'Quantity of Cotton overshirt'}).waitFor();assert.equal(await page.getByRole('spinbutton',{name:'Quantity of Cotton overshirt'}).inputValue(),'1');
 await page.screenshot({path:path.join(screenshots,'store-cart-desktop.png')});
 await page.goto(origin+'/#page=store-signup');await page.getByLabel('Name',{exact:true}).fill('New customer');await page.getByLabel('Email',{exact:true}).fill('new-customer@example.test');await page.getByLabel('Password',{exact:true}).fill('new-customer-password-42');await page.getByRole('button',{name:'Create your account',exact:true}).click();await page.getByText(/Check your inbox to confirm/).waitFor();
 await page.getByRole('navigation',{name:'Customer account'}).getByRole('link',{name:'Sign in',exact:true}).click();
 await page.getByLabel('Email',{exact:true}).fill('buyer@example.test');await page.getByLabel('Password',{exact:true}).fill('customer-password-42');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:'Order history',exact:true}).waitFor();
 await page.goto(origin+'/#page=demo-fashion-store-1-checkout');await page.getByLabel('Email',{exact:true}).waitFor();
 await page.getByLabel('Address',{exact:true}).fill('1 Test Road');await page.getByLabel('City',{exact:true}).fill('London');await page.getByLabel('Postal code',{exact:true}).fill('AB1 2CD');await page.getByLabel('Country',{exact:true}).selectOption('GB');await page.getByRole('checkbox').check();
 await page.screenshot({path:path.join(screenshots,'store-checkout-desktop.png')});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(screenshots,'store-checkout-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Continue to payment',exact:true}).click();await page.waitForURL('https://checkout.stripe.com/**');
 await page.goto(origin+'/#page=demo-fashion-store-1-cart');const orderId=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('dm-store-order-access')))[0]);
 await page.goto(origin+'/#page=store-confirmation&order='+orderId);await page.getByText(/Payment received/).waitFor();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('dm-store-cart'))),[]);
 await page.goto(origin+'/#page=store-contact');await page.getByLabel('Email',{exact:true}).fill('buyer@example.test');await page.getByLabel('Message',{exact:true}).fill('Please check my delivery.');await page.getByRole('button',{name:'Send message'}).click();await page.getByText('Thank you. Your message has been received.').waitFor();
 const owner=await browser.newContext({viewport:{width:1440,height:1000}});await owner.addCookies([{name:fixture.cookieName,value:fixture.cookie,url:ownerOrigin,httpOnly:true,sameSite:'Lax'},{name:fixture.csrfName,value:fixture.csrfCookie,url:ownerOrigin,httpOnly:true,sameSite:'Lax'}]);
 const doc=globalThis.DraftmangoModel.commitFiles(globalThis.DraftmangoModel.createProject('Studio store'),files);doc.id=fixture.projectId;doc.title='Studio store';doc.workspace={kind:'project'};
 await owner.addInitScript(({fixture,doc})=>{
  localStorage.setItem('store-test-projects',JSON.stringify({schema:1,projects:[doc],activeId:doc.id}));
  window.DraftmangoAccounts={key:()=> 'store-test-projects',user:{id:fixture.owner},request:async(url,{method='GET',body}={})=>{const r=await fetch(url,{method,headers:{'X-Draftmango-Account':fixture.owner,'X-CSRFToken':fixture.csrf,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const x=await r.json();if(!r.ok)throw Error(x.error?.message||'Failed');return x;}};
 },{fixture,doc});
 const admin=await owner.newPage();admin.on('pageerror',e=>errors.push(e.message));await admin.goto(ownerOrigin+'/owner-fixture');
 async function screen(section){await admin.evaluate(({id,section})=>DraftmangoStores.render(document.querySelector('#main'),id,section),{id:fixture.projectId,section});}
 await screen('overview');await admin.getByRole('heading',{name:'Your store is open'}).waitFor();await admin.screenshot({path:path.join(screenshots,'owner-overview-desktop.png')});
 await screen('products');await admin.getByRole('button',{name:'Edit',exact:true}).click();await admin.getByLabel('Product name',{exact:true}).fill('Cotton overshirt revised');await admin.getByRole('button',{name:'Save product',exact:true}).click();await admin.getByText('Cotton overshirt revised',{exact:true}).waitFor();
 await screen('orders');await admin.getByRole('button',{name:'View',exact:true}).click();await admin.getByRole('button',{name:'Mark fulfilled / add tracking'}).click();await admin.getByLabel('Tracking URL (optional)').fill('https://example.test/track/123');await admin.getByRole('button',{name:'Mark fulfilled',exact:true}).click();await admin.getByRole('cell',{name:'fulfilled',exact:true}).waitFor();
 await screen('customers');await admin.getByRole('cell',{name:'buyer@example.test',exact:true}).waitFor();
 await screen('messages');await admin.getByRole('button',{name:'Resolve',exact:true}).click();await admin.getByRole('cell',{name:'Resolved',exact:true}).waitFor();
 await screen('settings');await admin.getByLabel('Store name',{exact:true}).fill('Studio store updated');await admin.getByRole('button',{name:'Save settings',exact:true}).click();await admin.getByRole('heading',{name:'Studio store updated',exact:true}).waitFor();
 await admin.setViewportSize({width:390,height:844});assert.equal(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await admin.screenshot({path:path.join(screenshots,'owner-settings-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);console.log('Store and owner browser workflow passed; screenshots: '+screenshots);
}catch(error){console.error(error);console.error('Browser errors:',errors);process.exitCode=1;}
finally{await browser.close();publisher.closeAllConnections();publisher.close();gateway.closeAllConnections();gateway.close();}

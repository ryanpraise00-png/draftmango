import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {templateForPrompt} from '../server/template-engine/index.mjs';
import {attachStorefront} from '../server/storefront/index.mjs';
import {compileProject} from '../server/compiler.mjs';
test('opaque preview keeps product, cart and checkout routes and never calls a customer API',{timeout:45000},async t=>{
 const template=await templateForPrompt('','fashion-store-1'),compiled=await compileProject(await attachStorefront(template.files));
 const browser=await chromium.launch({headless:true});t.after(()=>browser.close());const page=await browser.newPage();const errors=[],api=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/store/'))api.push(r.url());});
 await page.route('https://**/*',r=>r.abort());
 await page.setContent('<iframe id="preview" sandbox="allow-scripts" style="width:100%;height:900px"></iframe>');
 await page.evaluate(html=>{
  const f=document.querySelector('iframe'),catalogue={store:{name:'Socks studio',currency:'gbp',shippingCountries:['GB'],shippingAmount:400,taxBasisPoints:0,policies:{}},products:[{id:'p',name:'Cotton socks',description:'Owner description',category:'Socks',image:'',variants:[{id:'v',label:'Medium',stock:10,price:1500,active:true}]}]};
  window.addEventListener('message',e=>{if(e.source===f.contentWindow&&e.data?.type==='draftmango:store-preview-ready')e.ports[0].postMessage({type:'draftmango:store-preview',catalogue,page:'shop'});});
  f.srcdoc=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="connect-src \'none\'; form-action \'none\'">');
 },compiled.html);
 page.setDefaultTimeout(5000);const frame=page.frameLocator('#preview');
 try{
 await frame.getByRole('link',{name:'Cotton socks',exact:true}).first().click();
 await frame.getByRole('button',{name:'Add to Bag',exact:true}).click();
 try{await frame.getByText('Cotton socks was added to your bag.',{exact:true}).waitFor({timeout:3000});}catch(e){throw Error(JSON.stringify({errors,body:await frame.locator('body').innerText(),urls:page.frames().map(f=>f.url())}),{cause:e});}
 await frame.getByRole('link',{name:'View bag',exact:true}).click();
 await frame.getByRole('spinbutton',{name:'Quantity of Cotton socks'}).waitFor();await frame.getByText('£19.00',{exact:true}).waitFor();
 await frame.getByRole('spinbutton',{name:'Quantity of Cotton socks'}).fill('2');await frame.getByText('£34.00',{exact:true}).waitFor();
 await frame.getByRole('link',{name:'Proceed to checkout',exact:true}).click();assert.equal(await frame.getByRole('button',{name:'Continue to payment',exact:true}).isDisabled(),true);
 assert.doesNotMatch(await frame.locator('body').innerText(),/Free shipping over|10% off your first order|The Varenna Linen Shirt|Your code is on its way/);
 assert.deepEqual(errors,[]);assert.deepEqual(api,[]);
 }catch(error){throw Error(JSON.stringify({errors,body:(await frame.locator('body').innerText()).slice(0,4000),urls:page.frames().map(f=>f.url()),reason:error.message}),{cause:error});}
});

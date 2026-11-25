import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {createServer} from '../server/serve.mjs';
import {brand} from '../shared/brand.mjs';
const web=new URL('../web/',import.meta.url);
async function files(directory){const result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);if(entry.isDirectory())result.push(...await files(url));else result.push(url);}return result;}

test('active library and every React starter use Draftmango branding',async()=>{
 const catalog=JSON.parse(await readFile(new URL('template-catalog.json',web),'utf8'));
 assert.equal(catalog.length,100);
 for(const template of catalog)assert.equal(template.preview,'/draftmango/previews/'+template.file);
 const names=await files(new URL('draftmango/',web));
 assert.equal(names.filter(name=>name.pathname.includes('/previews/')&&name.pathname.endsWith('.html')).length,1150);
 const leftovers=[];
 for(const name of names){
  if(/framo/i.test(name.pathname))leftovers.push(name.pathname);
  if(!/\.(html|json|css|js|svg|txt|xml)$/.test(name.pathname))continue;
  if(/framo/i.test(await readFile(name,'utf8')))leftovers.push(name.pathname);
 }
 assert.deepEqual(leftovers,[]);
 const runtime=JSON.parse(await readFile(new URL('draftmango/starters/runtime.json',web),'utf8'));
 assert.ok(runtime['src/draftmango/vendor.txt'].includes('DraftmangoVendor'));
 const logo=await readFile(new URL('draftmango/assets/media/logo/draftmango-logo.svg',web),'utf8');
 for(const shape of brand.paths)assert.ok(logo.includes(shape));
 assert.ok(logo.includes('draftmango.'));
});

test('pre-rebrand asset snapshot remains byte-for-byte compatible with saved sites',async()=>{
 const base=new URL('template-compat/v1/',web),manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
 assert.ok(Object.keys(manifest).length>1000);
 for(const [name,digest]of Object.entries(manifest))assert.equal(createHash('sha256').update(await readFile(new URL('assets/'+name,base))).digest('hex'),digest,name);
});

test('old asset URLs preserve bytes, new previews render, and both font paths allow canvas loads',async t=>{
 const server=createServer({root:fileURLToPath(web)});server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>{server.closeAllConnections();server.close();});
 const base='http://127.0.0.1:'+server.address().port;
 for(const name of ['js/vendor.js','css/app.css','media/logo/framo-logo.svg','fonts/Phosphor.woff2']){
  const response=await fetch(base+'/framo/assets/'+name);
  assert.equal(response.status,200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),await readFile(new URL('template-compat/v1/assets/'+name,web)));
  if(name.endsWith('.woff2'))assert.equal(response.headers.get('access-control-allow-origin'),'*');
 }
 const font=await fetch(base+'/draftmango/assets/fonts/Phosphor.woff2');assert.equal(font.status,200);assert.equal(font.headers.get('access-control-allow-origin'),'*');
 const page=await fetch(base+'/draftmango/previews/demo-main.html');assert.equal(page.status,200);assert.doesNotMatch(await page.text(),/framo/i);
 const old=await fetch(base+'/framo/previews/demo-main.html?review=1',{redirect:'manual'});assert.equal(old.status,308);assert.equal(old.headers.get('location'),'/draftmango/previews/demo-main.html?review=1');
 const styles=await fetch(base+'/workspace-framo.css');assert.equal(styles.status,200);
 const traversal=await fetch(base+'/framo/assets/%2e%2e%2f%2e%2e%2fpackage.json');assert.equal(traversal.status,404);
});

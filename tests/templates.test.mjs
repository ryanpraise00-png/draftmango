import {generate} from '../server/ai.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {compileProject} from '../server/compiler.mjs';
import '../web/templates-model.js';
import '../web/dashboard-model.js';
const P=globalThis.DraftmangoProject,T=globalThis.DraftmangoTemplates,D=globalThis.DraftmangoDashboard;
const catalog=JSON.parse(await readFile(new URL('../web/template-catalog.json',import.meta.url)));
const runtime=JSON.parse(await readFile(new URL('../web/framo/starters/runtime.json',import.meta.url)));
test('selected designs survive the account redirect; untrusted paths are not forwarded',()=>{
 assert.equal(new URLSearchParams(D.accountDestination(new URLSearchParams({idea:'Our studio',template:'architecture-studio-1'})).split('#')[1]).get('template'),'architecture-studio-1');
 assert.equal(new URLSearchParams(D.builderDestination('Our studio','../../secret').split('#')[1]).has('template'),false);
 assert.equal(T.choose(catalog,'A shop for selling socks').id,'fashion-store-1');
 assert.equal(T.choose(catalog,'A local architecture studio').id,'architecture-studio-1');
});
test('all 100 imported React templates compile and retain their pages', {timeout:300000},async()=>{
 assert.equal(catalog.length,100);
 const failures=[];
 for(const template of catalog){
  try{
   const starter=JSON.parse(await readFile(new URL('../web/framo/starters/'+template.id+'.json',import.meta.url)));
   const files=P.scaffold({...starter.files,...runtime},template.name);
   assert.ok(P.valid(files),'Source limits');
   const result=await compileProject(files,{timeoutMs:20000});
   assert.ok(result.files['assets/site.js']);
   assert.ok(Object.keys(files).filter(p=>p.startsWith('src/pages/')).length>=template.pages-1);
   if(['architecture-studio-1','restaurant-1','fashion-store-1'].includes(template.id)){
    await mkdir(new URL('../out/review/',import.meta.url),{recursive:true});
    let html=result.html.replaceAll('https://draftmango.com/framo/','http://127.0.0.1:4175/framo/');
    html=html.replace(/data:(text\/javascript|text\/css);base64,([A-Za-z0-9+/=]+)/g,(_all,type,data)=>'data:'+type+';base64,'+Buffer.from(Buffer.from(data,'base64').toString().replaceAll('https://draftmango.com/framo/','http://127.0.0.1:4175/framo/')).toString('base64'));
    await writeFile(new URL('../out/review/'+template.id+'.html',import.meta.url),html);
    const policy='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: https: http://127.0.0.1:4175; style-src \'unsafe-inline\' data: https: http://127.0.0.1:4175; font-src data: https: http://127.0.0.1:4175; script-src \'unsafe-inline\' \'unsafe-eval\' data:; connect-src \'none\'; frame-src \'none\'; form-action \'none\'; object-src \'none\'">';
    const inside=html.replace('<head>','<head>'+policy).replaceAll('&','&amp;').replaceAll('"','&quot;');
    await writeFile(new URL('../out/review/'+template.id+'-sandbox.html',import.meta.url),'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><iframe title="React template sandbox check" sandbox="allow-scripts" style="width:100%;height:100dvh;border:0" srcdoc="'+inside+'"></iframe></body></html>');

   }
  }catch(error){failures.push(template.id+': '+error.message);}
 }
 assert.deepEqual(failures,[]);
});


test('Framo edits retain unreturned pages and runtime without sending vendor source to the model',async()=>{
 const starter=JSON.parse(await readFile(new URL('../web/framo/starters/architecture-studio-1.json',import.meta.url)));
 const files=P.scaffold({...starter.files,...runtime},starter.name);
 let received;
 const result=await generate({mode:'edit',prompt:'Change the accent to blue',files},{provider:'openai',key:'test',model:'gpt-6-luna',maxTokens:4096},{fetchImpl:async(_url,options)=>{
  received=JSON.parse(options.body);
  return Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({action:'update',title:'Studio',message:'Updated the accent.',designBrief:null,files:[{path:'src/styles.css',content:':root{--color-primary:blue}'}]})}]}]});
 }});
 assert.equal(result.files['src/styles.css'],':root{--color-primary:blue}');
 for(const [name,source] of Object.entries(files))if(name!=='src/styles.css')assert.equal(result.files[name],source,name);
 const content=JSON.stringify(received);
 assert.ok(content.includes('src/pages/Page0.jsx'));
 assert.ok(content.includes('src/shared/'));
 assert.ok(!content.includes(runtime['src/framo/vendor.txt']));
 assert.equal(result.files['index.html'],files['index.html']);
});


test('new React creation customizes a Framo template and preserves its complete page library',async()=>{
 const requests=[];
 const brief={version:1,concept:'Personalize the Framo fashion store for socks.',audience:'Socks shoppers.',primaryAction:'Browse the collection.',composition:'Preserve the Framo fashion-store layout.',typography:'Retain the template type system.',palette:'Retain the template palette.',imagery:'Use the template image slots with appropriate product photos.',motion:'Retain template interactions and respect reduced motion.',sections:['Collection','Products','About'],constraints:['Checkout is a demonstration until connected.']};
 const response=value=>Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
 const result=await generate({mode:'create',framework:'react',prompt:'A shop for selling socks'},{provider:'openai',key:'test',model:'gpt-6-luna',maxTokens:4096},{fetchImpl:async(_url,options)=>{
  const body=JSON.parse(options.body);requests.push(body);
  return response(requests.length===1?{action:'plan',message:'Personalizing the fashion store.',designBrief:brief}:{action:'update',title:'Socks',message:'Updated the store.',designBrief:brief,files:[{path:'src/styles.css',content:':root{--color-primary:#c2410c}'}]});
 }});
 assert.equal(requests.length,2);
 const context=JSON.parse(requests[1].input[1].content);
 assert.equal(context.mode,'edit');
 assert.ok(context.files['TEMPLATE.md'].includes('fashion-store-1'));
 assert.ok(context.files['src/pages/Page0.jsx']);
 assert.ok(result.files['src/framo/vendor.txt']);
 assert.ok(P.valid(result.files));
 assert.equal(result.files['src/styles.css'],':root{--color-primary:#c2410c}');
 const original=JSON.parse(await readFile(new URL('../web/framo/starters/fashion-store-1.json',import.meta.url)));
 for(const [name,source] of Object.entries(original.files))if(name!=='src/styles.css')assert.equal(result.files[name],source,name);
});

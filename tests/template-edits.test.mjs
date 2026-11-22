import {validateTemplateFiles} from '../server/template-engine/design-policy.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {templateForPrompt} from '../server/template-library.mjs';
import {templateContentContext,indexTemplate,applyTemplateEdits} from '../server/template-edits.mjs';
import {generate,validateInput} from '../server/ai.mjs';
import {compileProject} from '../server/compiler.mjs';
const template=await templateForPrompt('architecture');
const files=template.files;
const context=templateContentContext(files,'Rename framo studio to North Studio',{creating:true});
const brand=context.fields.find(f=>f.value==='framo studio');
const update=(edits=[],colours=[])=>({action:'update',title:'North Studio',message:'Updated the template content.',edits,colours});
const edit=(value='North Studio')=>({id:brand.id,value,allMatching:true});
const config={provider:'anthropic',key:'test-key',model:'claude-sonnet-5-5',maxTokens:4096};
const response=value=>Response.json({stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:20},content:[{type:'text',text:JSON.stringify(value)}]});

test('all catalog designs expose editable content without executing template code',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../web/template-catalog.json',import.meta.url)));
 for(const item of catalog){const t=await templateForPrompt('',item.id);const validation=validateTemplateFiles(JSON.parse(t.files['template.lock.json']),t.files);assert.equal(validation.valid,true,item.id+': '+JSON.stringify(validation.violations));assert.ok(globalThis.DraftmangoProject.valid(t.files),item.id+' package size');const fields=indexTemplate(t.files);assert.ok(fields.some(f=>f.kind==='text'),item.id);assert.ok(fields.every(f=>/^src\/(pages|shared)\//.test(f.path)),item.id);}
});

test('model can edit only supplied IDs; source, runtime, routing and arbitrary CSS are rejected atomically',()=>{
 for(const value of [
  {...update(),files:[{path:'src/App.jsx',content:'invented'}]},
  update([{id:'src/App.jsx',value:'replacement',allMatching:false}]),
  update([{...edit(),path:'src/App.jsx'}]),
  update([edit('North Studio'),{...edit('Other Studio')}]),
  update([], [{name:'primary',value:'#fff;display:none'}]),
  update([], [{name:'layout',value:'#000000'}]),
  update([{id:brand.id,value:'x'.repeat(2000),allMatching:false}]),
  {...update([edit()]),action:'reply'},
  update()
 ])assert.throws(()=>applyTemplateEdits(files,value,context,''),{code:'template_edit'});
 assert.ok(files['src/pages/Page0.jsx'].includes('framo studio'));
});

test('content edits preserve layout, imports, shared runtime and every unedited page',async()=>{
 const result=applyTemplateEdits(files,update([edit()]),context,'');
 assert.deepEqual(Object.keys(result.files),Object.keys(files));
 for(const [path,source] of Object.entries(files)){
  const expected=source.replaceAll('"framo studio"','"North Studio"');
  assert.equal(result.files[path],expected,path);
 }
 assert.ok((await compileProject(result.files)).files['assets/site.js']);
});

test('JSX quotes and attempted code injection stay literal text',async()=>{
 const original={...files,'src/pages/Page0.jsx':'export default function Page(){return <main><h1>Hello</h1><img alt="Example" src="https://draftmango.com/framo/photos/architecture-studio-1.jpg" /></main>}'};
 const c=templateContentContext(original,'');
 const value='Quotes " and braces } <script>alert(1)</script>';
 const result=applyTemplateEdits(original,update(c.fields.filter(f=>['Hello','Example'].includes(f.value)).map(f=>({id:f.id,value,allMatching:false}))),c,'');
 assert.ok(result.files['src/pages/Page0.jsx'].includes('\\u003cscript\\u003e'));
 assert.ok((await compileProject(result.files)).files['assets/site.js']);
});

test('only supplied image URLs and safe links can replace existing attributes',()=>{
 const image=context.fields.find(f=>f.kind==='image');assert.ok(image);
 for(const value of ['javascript:alert(1)','https://invented.example/photo.jpg','data:text/html,<script>'])assert.throws(()=>applyTemplateEdits(files,update([{id:image.id,value,allMatching:false}]),context,''),{code:'template_edit'});
 const url='https://images.example.test/user-photo.jpg';
 const changed=applyTemplateEdits(files,update([{id:image.id,value:url,allMatching:false}]),context,'Use '+url);
 assert.ok(Object.values(changed.files).some(s=>s.includes(url)));
 const link=context.fields.find(f=>f.kind==='link');
 if(link)assert.throws(()=>applyTemplateEdits(files,update([{id:link.id,value:'javascript:alert(1)',allMatching:false}]),context,''),{code:'template_edit'});
 assert.ok(!context.fields.some(f=>f.kind==='link'&&f.value.startsWith('#page=')));
});

test('brand colours use a fixed CSS block and retain earlier colour edits',()=>{
 const first=applyTemplateEdits(files,update([],[{name:'primary',value:'#123456'}]),context,'Use blue');
 assert.ok(first.files['src/styles.css'].startsWith(files['src/styles.css']));
 const second=applyTemplateEdits(first.files,update([],[{name:'text',value:'#111111'}]),templateContentContext(first.files,''),'');
 assert.ok(second.files['src/styles.css'].includes('--color-primary:#123456;'));
 assert.ok(second.files['src/styles.css'].includes('--color-text:#111111;'));
 assert.equal(second.files['src/styles.css'].split('/* Draftmango template colours */').length,2);
 for(const path of Object.keys(files))if(path!=='src/styles.css')assert.equal(second.files[path],files[path]);
});

test('old clients cannot bypass the React template path by asking for HTML',async()=>{
 assert.equal(validateInput({mode:'create',framework:'html',prompt:'Build a cafe'}).framework,'react');
 let calls=0;
 const result=await generate({mode:'create',framework:'html',prompt:'Build a cafe',templateId:'architecture-studio-1'},config,{fetchImpl:async(url,options)=>{
  calls++;const body=JSON.parse(options.body),c=JSON.parse(body.messages[0].content);
  assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(body.output_config.format.schema.properties.files,undefined);
  assert.equal(c.template.id,'architecture-studio-1');assert.equal(c.files,undefined);
  return response(update([{id:c.fields.find(f=>f.value==='framo studio').id,value:'Cafe Studio',allMatching:true}]));
 }});
 assert.equal(calls,1);assert.ok(result.files['TEMPLATE.md']);assert.ok(!JSON.stringify(result).includes('test-key'));
});

test('unknown selected templates fail before any provider call; no generated fallback exists',async()=>{
 let calls=0;await assert.rejects(generate({mode:'create',prompt:'Build',templateId:'not-in-library'},config,{fetchImpl:async()=>{calls++;}}),{code:'template_unavailable'});assert.equal(calls,0);
});

test('greetings and structural requests can reply without writing files',async()=>{
 for(const prompt of ['Hello','Throw away the template and invent a new layout']){
  const result=await generate({mode:'edit',prompt,files},config,{fetchImpl:async()=>response({action:'reply',title:'Studio',message:'We can personalise this template or choose another library layout.',edits:[],colours:[]})});
  assert.equal(result.action,'reply');assert.equal(result.files,null);
 }
});

test('raw replacement-file responses and cancelled requests never become accepted drafts',async()=>{
 await assert.rejects(generate({mode:'edit',prompt:'Replace everything',files},config,{fetchImpl:async()=>response({action:'update',title:'New',message:'Replaced',files:[{path:'src/App.jsx',content:'new'}]})}),{code:'template_edit'});
 const controller=new AbortController();await assert.rejects(generate({mode:'edit',prompt:'Change title',files},config,{signal:controller.signal,fetchImpl:async()=>{controller.abort();return response(update([edit()]));}}),{name:'AbortError'});
});

test('follow-up requests include relevant existing pages rather than always sending the home page',()=>{
 const c=templateContentContext(files,'Change the contact page email');
 assert.ok(c.fields.slice(0,40).some(f=>f.page.endsWith('-contact')));
 assert.ok(c.omittedFields>0);
});


test('clearing content keeps field IDs stable for the next edit',()=>{
 const first=applyTemplateEdits(files,update([edit('')]),context,'Clear the studio name');
 const before=indexTemplate(files),after=indexTemplate(first.files);
 assert.deepEqual(after.map(f=>[f.id,f.path,f.kind,f.context]),before.map(f=>[f.id,f.path,f.kind,f.context]));
 const nextContext=templateContentContext(first.files,'studio',{creating:true});
 const second=applyTemplateEdits(first.files,update([{id:brand.id,value:'North Studio',allMatching:false}]),nextContext,'Set the name to North Studio');
 assert.ok(second.files[before.find(f=>f.id===brand.id).path].includes('North Studio'));
});

test('HTTPS link validation rejects embedded credentials regardless of scheme casing',()=>{
 const original={...files,'src/pages/Page0.jsx':'export default function Page(){return <a href="https://example.test/">Studio</a>}'};
 const c=templateContentContext(original,'');
 const link=c.fields.find(f=>f.kind==='link');
 for(const value of ['https://user:pass@example.test/','HTTPS://user:pass@example.test/','https://']){
  assert.throws(()=>applyTemplateEdits(original,update([{id:link.id,value,allMatching:false}]),c,''),{code:'template_edit'});
 }
});

// Opt-in real Anthropic test. Never run from npm test; never print or save credentials.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {generate,readConfig} from '../server/ai.mjs';
import {templateForPrompt} from '../server/template-library.mjs';
import {compileProject} from '../server/compiler.mjs';
import {indexTemplate} from '../server/template-edits.mjs';
import assert from 'node:assert/strict';
if(!process.argv.includes('--live')){console.error('Run npm run test:templates:live to allow up to three real Anthropic requests.');process.exit(2);}
const config=await readConfig(undefined,{...process.env,AI_PROVIDER:'anthropic',AI_MAX_TOKENS:'8192'});
if(!config.key){console.error('ANTHROPIC_API_KEY is empty in .env. No API requests were made.');process.exit(2);}
const destination=resolve('data/template-api-tests/'+new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(destination,{recursive:true});
const results=[];
const tests=[
 {id:'socks',prompt:'Build a website for selling socks called Loop Socks. Reuse the supplied fashion-store design. Change the homepage headline to “Find your everyday pair.” and adapt the homepage copy to socks. Keep existing image URLs; do not invent reviews, prices, shipping promises or credentials. Explain which sample content and photography still need my input.',templateId:'fashion-store-1',expected:'Find your everyday pair.'},
 {id:'architecture',prompt:'Personalise the Architecture Studio template for North Studio. Change the existing lowercase framo studio brand heading to North Studio. Keep its layout, typography, all pages and photographs. Do not invent history, locations or testimonials.',templateId:'architecture-studio-1',expected:'North Studio'}
];
async function run(item,previous){
 const original=previous?.files || (await templateForPrompt(item.prompt,item.templateId)).files;
 const input=previous?{mode:'edit',prompt:item.prompt,files:original}:{mode:'create',framework:'react',prompt:item.prompt,templateId:item.templateId};
 const started=Date.now();
 const response=await generate(input,config,{signal:AbortSignal.timeout(180000)});
 assert.equal(response.action,'update','Expected requested content edit');
 assert.deepEqual(Object.keys(response.files),Object.keys(original),'No files may be added or removed');
 for(const [path,text] of Object.entries(original))if(!/^src\/(pages|shared)\//.test(path)&&path!=='src/styles.css')assert.equal(response.files[path],text,'Protected file changed: '+path);
 assert.ok(Object.values(response.files).some(value=>value.includes(item.expected)),'Requested copy or colour not found');
 const before=indexTemplate(original),after=indexTemplate(response.files);
 assert.deepEqual(after.map(f=>[f.id,f.path,f.kind,f.context]),before.map(f=>[f.id,f.path,f.kind,f.context]),'Template content structure changed');
 const compiled=await compileProject(response.files);
 await writeFile(resolve(destination,item.id+'.json'),JSON.stringify({input:{mode:input.mode,prompt:item.prompt,templateId:item.templateId},result:response},null,2));
 await writeFile(resolve(destination,item.id+'.html'),compiled.html);
 const row={id:item.id,status:'passed',provider:config.provider,model:config.model,elapsedMs:Date.now()-started,changedFiles:Object.keys(original).filter(path=>original[path]!==response.files[path]),pagesPreserved:Object.keys(original).filter(p=>p.startsWith('src/pages/')).length,stages:response.designProcess.stages};
 results.push(row);console.log(JSON.stringify(row));return response;
}
try{
 let studio;
 for(const item of tests){const result=await run(item);if(item.id==='architecture')studio=result;}
 await run({id:'architecture-follow-up',prompt:'Keep the template and all current text. Change only the brand primary colour to #315f54.',expected:'#315f54'},studio);
 await writeFile(resolve(destination,'results.json'),JSON.stringify({provider:'anthropic',model:config.model,tests:results},null,2));
 console.log('All three real Anthropic template tests passed. Results: '+destination);
}catch(error){
 await writeFile(resolve(destination,'results.json'),JSON.stringify({provider:'anthropic',model:config.model,tests:results,failed:true,error:{code:error.code||'validation',message:error.message}},null,2));
 console.error('Template API test failed ('+(error.code||'validation')+'): '+error.message);process.exitCode=1;
}

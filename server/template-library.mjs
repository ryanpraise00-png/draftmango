import {readFile} from 'node:fs/promises';
import '../web/templates-model.js';
import '../web/project-format.js';
let catalog,runtime;
export async function templateForPrompt(prompt, templateId = '') {
 catalog ||= JSON.parse(await readFile(new URL('../web/template-catalog.json',import.meta.url)));
 runtime ||= JSON.parse(await readFile(new URL('../web/framo/starters/runtime.json',import.meta.url)));
 const chosen=templateId ? catalog.find(item=>item.id===templateId) : globalThis.DraftmangoTemplates.choose(catalog,prompt);
 if(!chosen){const error=new Error('That template is unavailable. Choose a design from the library.');error.status=422;error.code='template_unavailable';throw error;}
 const starter=JSON.parse(await readFile(new URL('../web/framo/starters/'+chosen.id+'.json',import.meta.url)));
 return {...chosen,files:globalThis.DraftmangoProject.scaffold({...starter.files,...runtime},chosen.name)};
}
export function templateEditContext(files,prompt) {
 const pages=Object.keys(files).filter(name=>name.startsWith('src/pages/'));
 const requested=pages.filter(name=>String(prompt).includes(name));
 const keep=new Set(['index.html','src/App.jsx','src/main.jsx','src/styles.css','TEMPLATE.md','src/pages/Page0.jsx',...Object.keys(files).filter(name=>name.startsWith('src/shared/')),...requested]);
 return {files:Object.fromEntries(Object.entries(files).filter(([name])=>keep.has(name))),preservedFiles:pages.filter(name=>!keep.has(name))};
}

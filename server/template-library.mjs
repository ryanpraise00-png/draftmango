export {templateForPrompt} from './template-engine/index.mjs';
export function templateEditContext(files,prompt) {
 const pages=Object.keys(files).filter(name=>name.startsWith('src/pages/'));
 const requested=pages.filter(name=>String(prompt).includes(name));
 const keep=new Set(['index.html','src/App.jsx','src/main.jsx','src/styles.css','TEMPLATE.md','src/pages/Page0.jsx',...Object.keys(files).filter(name=>name.startsWith('src/shared/')),...requested]);
 return {files:Object.fromEntries(Object.entries(files).filter(([name])=>keep.has(name))),preservedFiles:pages.filter(name=>!keep.has(name))};
}

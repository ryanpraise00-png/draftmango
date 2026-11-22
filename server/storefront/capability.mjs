import {readFileSync} from 'node:fs';
export const storeMarker='storefront.json';
export const storeSource='src/storefront.jsx';
const versions=['fashion-store-v1','fashion-store-v2'].map(adapter=>({
 descriptor:JSON.stringify({schema:1,adapter,template:'fashion-store-1'},null,2)+'\n',
 runtime:readFileSync(new URL('./'+adapter+'.jsx',import.meta.url),'utf8')
}));
export const storeDescriptor=versions[1].descriptor;
export const storeRuntime=versions[1].runtime;
export const appImport="import App from './App.jsx';";
export const storeImport="import App from './storefront.jsx';";
export function hasStoreCapability(files,manifest){
 return manifest.template.id==='fashion-store-1'&&versions.some(v=>files[storeMarker]===v.descriptor&&files[storeSource]===v.runtime)&&typeof files['src/main.jsx']==='string'&&files['src/main.jsx'].split(storeImport).length===2;
}

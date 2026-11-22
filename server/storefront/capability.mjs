import {readFileSync} from 'node:fs';
export const storeMarker='storefront.json';
export const storeSource='src/storefront.jsx';
export const storeDescriptor=JSON.stringify({schema:1,adapter:'fashion-store-v1',template:'fashion-store-1'},null,2)+'\n';
export const storeRuntime=readFileSync(new URL('./fashion-store-v1.jsx',import.meta.url),'utf8');
export const appImport="import App from './App.jsx';";
export const storeImport="import App from './storefront.jsx';";
export function hasStoreCapability(files,manifest){
 return manifest.template.id==='fashion-store-1'&&files[storeMarker]===storeDescriptor&&files[storeSource]===storeRuntime&&typeof files['src/main.jsx']==='string'&&files['src/main.jsx'].split(storeImport).length===2;
}

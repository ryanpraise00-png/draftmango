import {templateForPrompt} from '../template-engine/index.mjs';
import {assertTemplateFiles} from '../template-engine/design-policy.mjs';
import {storeMarker,storeSource,storeDescriptor,storeRuntime,appImport,storeImport} from './capability.mjs';
export async function attachStorefront(files){
 const fail=message=>{throw Object.assign(new Error(message),{status:422,code:'store_template'});};
 let manifest;try{manifest=JSON.parse(files?.['template.lock.json']);}catch{fail('Start from Fashion Store 1 in the template library.');}
 if(manifest?.template?.id!=='fashion-store-1')fail('This store workflow currently supports Fashion Store 1. Other templates keep their design until their adapters are available.');
 const template=await templateForPrompt('store','fashion-store-1');
 const canonical=JSON.parse(template.files['template.lock.json']);
 if(files['template.lock.json']!==template.files['template.lock.json'])fail('The template version does not match the supported store adapter.');
 assertTemplateFiles(canonical,files);
 const result={...files,[storeMarker]:storeDescriptor,[storeSource]:storeRuntime,'src/main.jsx':files['src/main.jsx'].replace(appImport,storeImport)};
 assertTemplateFiles(canonical,result);
 return result;
}

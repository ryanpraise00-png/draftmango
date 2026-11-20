import {readFile,writeFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const path=new URL('../web/framo/starters/runtime.json',import.meta.url);
const runtime=JSON.parse(await readFile(path));
for(const name of Object.keys(runtime))runtime[name]=(await transform(runtime[name],{minify:true,legalComments:'inline',target:'es2022'})).code;
await writeFile(path,JSON.stringify(runtime));
console.log('Minified shared template runtime without changing the purchased source.');

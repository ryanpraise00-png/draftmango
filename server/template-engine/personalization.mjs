import {parse} from '@babel/parser';
import {createHash} from 'node:crypto';
import '../../web/project-format.js';

export class TemplateEditError extends Error {
  constructor(message) { super(message+' Your draft is unchanged.'); this.code='template_edit'; this.status=422; }
}
const fail=message=>{throw new TemplateEditError(message)};
const attributes=new Set(['alt','title','aria-label','placeholder','src','href']);
const palette={primary:'--color-primary',background:'--color-bg',text:'--color-text'};
const themeStart='/* Draftmango template colours */';
const themeEnd='/* End Draftmango template colours */';
const literal=node=>node?.type==='StringLiteral'?node:node?.type==='JSXExpressionContainer'&&node.expression?.type==='StringLiteral'?node.expression:null;
const tagName=node=>node?.name?.name||'content';
function walk(node,visit){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){for(const child of node)walk(child,visit);return;}
  if(!node.type)return;
  if(visit(node)===false)return;
  for(const [key,child] of Object.entries(node))if(!['loc','start','end','extra','comments','tokens'].includes(key))walk(child,visit);
}
// The model sees content fields, never executable source or writable file paths.
// Only these AST ranges can change; every byte outside them remains untouched.
export function indexTemplate(files){
  const fields=[];
  for(const [path,source] of Object.entries(files)){
    if(!/^src\/(pages|shared)\/[^/]+\.(jsx|tsx)$/.test(path))continue;
    let ast;try{ast=parse(source,{sourceType:'module',plugins:['jsx',...(path.endsWith('.tsx')?['typescript']:[])]});}catch{fail('This template contains invalid source; fix it in the code editor first.');}
    let ordinal=0;
    const add=(node,value,kind,context,encoding='literal')=>{
      if(typeof value!=='string'||(encoding==='jsxText'&&!value.trim())||value.length>4000)return;
      fields.push({id:createHash('sha256').update(path+':'+ordinal++).digest('hex').slice(0,16),path,start:node.start,end:node.end,value,kind,context,encoding});
    };
    walk(ast,node=>{
      if(node.type!=='JSXElement')return;
      const tag=tagName(node.openingElement);
      if(['script','style'].includes(tag))return false;
      for(const attr of node.openingElement.attributes){
        const name=attr.name?.name,value=literal(attr.value);
        if(!attributes.has(name)||!value)continue;
        // Keep template routing and anchor targets intact.
        if(name==='href'&&value.value.startsWith('#'))continue;
        add(value,value.value,name==='src'?'image':name==='href'?'link':'text',tag+' '+name,attr.value.type==='StringLiteral'?'jsxAttribute':'literal');
      }
      for(const child of node.children){
        const value=literal(child);
        if(value)add(value,value.value,'text',tag);
        else if(child.type==='JSXText')add(child,child.value,'text',tag,'jsxText');
      }
    });
  }
  return fields;
}
const terms=prompt=>String(prompt).toLowerCase().match(/[a-z]{3,}/g)?.filter(w=>!['the','and','for','with','website','page','please','build','make','this','that','from','have','want','our'].includes(w))||[];
function pageNames(files){
  const names={};
  for(const match of (files['src/App.jsx']||'').matchAll(/"([a-z0-9-]+)"\s*:\s*(Page\d+)/g))names['src/pages/'+match[2]+'.jsx']=match[1];
  return names;
}
export function templateContentContext(files,prompt,{creating=false}={}){
  const indexed=indexTemplate(files),pages=pageNames(files),words=terms(prompt);
  const ranked=indexed.map((field,order)=>({field,order,score:
    (field.path.startsWith('src/shared/')?creating?150:45:0)+(field.path==='src/pages/Page0.jsx'?creating?250:25:0)+
    words.reduce((n,w)=>n+((pages[field.path]||'').includes(w)?80:0)+(field.value.toLowerCase().includes(w)?12:0),0)
  })).sort((a,b)=>b.score-a.score||a.order-b.order);
  const selected=[];let size=0;
  for(const {field} of ranked){
    const item={id:field.id,value:field.value,kind:field.kind,context:field.context,page:pages[field.path]||'Shared navigation/footer'};
    const length=JSON.stringify(item).length;
    if(selected.length>=500||size+length>90000)break;
    selected.push(item);size+=length;
  }
  return {indexed,fields:selected,pages:Object.values(pages),omittedFields:indexed.length-selected.length};
}
function safeValue(field,value,allowedImages){
  if(typeof value!=='string'||value.length>Math.min(4000,Math.max(1000,field.value.length*3))||value.includes('\u0000'))fail('A template content change is too large or invalid.');
  if(field.kind==='image'){
    if(!allowedImages.has(value))fail('Use an existing template image or supply an image URL in your request.');
  }else if(field.kind==='link'){
    if(!/^(https:\/\/|mailto:|tel:)/i.test(value)||/[\s<>"\u0000-\u001f]/.test(value))fail('A link change is not a supported URL.');
    if(/^https:\/\//i.test(value)){try{const u=new URL(value);if(u.username||u.password)fail('Links cannot contain credentials.');}catch{fail('A link URL is invalid.');}}
  }
}
const jsxString=value=>JSON.stringify(value).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
export function applyTemplateEdits(files,output,context,prompt){
  if(!output||!['update','reply'].includes(output.action)||typeof output.message!=='string'||!output.message.trim()||output.message.length>6000||typeof output.title!=='string'||output.title.length>100||!Array.isArray(output.edits)||output.edits.length>250||!Array.isArray(output.colours)||output.colours.length>3||Object.keys(output).some(k=>!['action','title','message','edits','colours'].includes(k)))fail('The response was not a template content edit.');
  if(output.action==='reply'){
    if(output.edits.length||output.colours.length)fail('A conversational reply must not change the template.');
    return {action:'reply',title:output.title,message:output.message.trim(),files:null,designBrief:null};
  }
  const available=new Map(context.fields.map(f=>[f.id,context.indexed.find(x=>x.id===f.id)]));
  const allowedImages=new Set(context.indexed.filter(f=>f.kind==='image').map(f=>f.value));
  for(const url of String(prompt).match(/https:\/\/[^\s<>"']+/g)||[])allowedImages.add(url.replace(/[.,)]$/,''));
  const edits=new Map();
  for(const edit of output.edits){
    if(!edit||Object.keys(edit).some(k=>!['id','value','allMatching'].includes(k))||typeof edit.allMatching!=='boolean')fail('An edit contained unsupported instructions.');
    const field=available.get(edit.id);if(!field)fail('An edit targeted content outside the supplied template.');
    const targets=edit.allMatching?context.indexed.filter(f=>f.kind===field.kind&&f.value===field.value):[field];
    for(const target of targets){
      safeValue(target,edit.value,allowedImages);
      if(edits.has(target.id)&&edits.get(target.id).value!==edit.value)fail('Two edits conflict on the same template content.');
      edits.set(target.id,{...target,value:edit.value});
    }
  }
  const next={...files},byFile=new Map();
  for(const edit of edits.values()){if(!byFile.has(edit.path))byFile.set(edit.path,[]);byFile.get(edit.path).push(edit);}
  for(const [path,changes] of byFile){
    let source=files[path];
    for(const edit of changes.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+(edit.encoding!=='literal'?'{'+jsxString(edit.value)+'}':jsxString(edit.value))+source.slice(edit.end);
    // A second parse catches unsupported source and verifies escaping before commit.
    try{parse(source,{sourceType:'module',plugins:['jsx',...(path.endsWith('.tsx')?['typescript']:[])]});}catch{fail('The template content could not be applied safely.');}
    next[path]=source;
  }
  if(output.colours.length){
    const css=files['src/styles.css'];const start=css.indexOf(themeStart),end=css.indexOf(themeEnd);
    if((start===-1)!==(end===-1)||start> end||css.indexOf(themeStart,start+1)!==-1||css.indexOf(themeEnd,end+1)!==-1)fail('The saved template colours need repair in the code editor.');
    const saved={};
    if(start!==-1)for(const [key,variable] of Object.entries(palette)){const found=css.slice(start,end).match(new RegExp(variable+':(#[a-f0-9]{6});','i'));if(found)saved[key]=found[1];}
    const seen=new Set();
    for(const colour of output.colours){
      if(!colour||Object.keys(colour).some(k=>!['name','value'].includes(k))||!Object.hasOwn(palette,colour.name)||!/^#[a-f0-9]{6}$/i.test(colour.value)||seen.has(colour.name))fail('Use a supported six-digit brand colour.');
      seen.add(colour.name);saved[colour.name]=colour.value;
    }
    const block=themeStart+'\nhtml,body{'+Object.entries(saved).map(([key,value])=>palette[key]+':'+value+';').join('')+'}\n'+themeEnd;
    next['src/styles.css']=start===-1?css+'\n'+block+'\n':css.slice(0,start)+block+css.slice(end+themeEnd.length);
  }
  if(!globalThis.DraftmangoProject.valid(next))fail('The personalised template exceeds project limits.');
  if(!Object.keys(next).some(path=>next[path]!==files[path]))fail('No template content changed. Please clarify the requested update.');
  return {action:'update',title:output.title.trim(),message:output.message.trim(),files:next,designBrief:null};
}

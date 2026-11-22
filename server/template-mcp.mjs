#!/usr/bin/env node
// Thin stdio transport for the shared template engine. No parallel catalog,
// selection, asset collection or personalization implementation lives here.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {searchTemplates,templateDetails,templateFiles} from './template-engine/index.mjs';
import {validateTemplateFiles} from './template-engine/design-policy.mjs';
export {searchTemplates,templateDetails,templateFiles};
const protocolVersions = ['2025-06-18','2025-03-26','2024-11-05'];
const tools = [
  { name: 'search_templates', title: 'Search website templates',
    description: 'Find human-designed Draftmango website templates (100 Framo design families) that fit a brief. The first result is the builder\'s own pick; the rest are ranked alternatives. Returns ids, names, categories, colours, fonts and page counts.',
    inputSchema: { type: 'object', properties: { brief: { type: 'string', description: 'What the website is for, e.g. "independent coffee roaster with online shop"' }, limit: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['brief'], additionalProperties: false },
    annotations: { readOnlyHint: true }, run: async args => searchTemplates(args.brief, args.limit) },
  { name: 'template_details', title: 'Template details',
    description: 'Describe one template: its pages with their main headings, file count and the editing guide (what to preserve, what to replace before publishing).',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'], additionalProperties: false },
    annotations: { readOnlyHint: true }, run: async args => templateDetails(args.id) },
  { name: 'get_template_files', title: 'Get template project files',
    description: 'Return the complete React + Vite project for a template, with its CSS, fonts and placeholder imagery copied locally under public/framo/assets. Editable source files are in structuredContent.files, unchanged vendor text assets in structuredContent.assetFiles and binary assets (base64) in structuredContent.binaryFiles.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, site_name: { type: 'string', description: 'Shown in the browser tab title' } }, required: ['id'], additionalProperties: false },
    annotations: { readOnlyHint: true }, _meta: { 'io.isotris/files': true, 'io.isotris/templatePolicy': 'preserve-template-v1' },
    run: async args => templateFiles(args.id, args.site_name), files: true },
  {name:'validate_template_files',title:'Validate template design',
    description:'Host-side design validation against a pinned template manifest. Returns violations; never writes files. The host supplies its trusted manifest, not a model-created policy.',
    inputSchema:{type:'object',properties:{manifest:{type:'object'},files:{type:'object',additionalProperties:{type:['string','null']}},partial:{type:'boolean'}},required:['manifest','files'],additionalProperties:false},
    annotations:{readOnlyHint:true},_meta:{'io.isotris/templateValidation':true},
    run:async args=>validateTemplateFiles(args.manifest,args.files,{partial:args.partial===true})},

];

async function call(name, args = {}) {
  const tool = tools.find(item => item.name === name);
  if (!tool) return { isError: true, content: [{ type: 'text', text: `Unknown tool ${name}.` }] };
  try {
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Tool arguments must be an object.');
    for (const key of Object.keys(args)) if (!Object.hasOwn(tool.inputSchema.properties,key)) throw new Error('Unsupported argument: '+key);
    for (const key of tool.inputSchema.required || []) if (!Object.hasOwn(args,key)) throw new Error('Missing argument: '+key);
    for (const [key,value] of Object.entries(args)) {
      const type=tool.inputSchema.properties[key].type;
      if (type==='string' && (typeof value!=='string' || value.length>8000)) throw new Error('Invalid argument: '+key);
      if (type==='integer' && (!Number.isInteger(value)||value<1||value>10)) throw new Error('Invalid argument: '+key);
      if (type==='boolean' && typeof value!=='boolean') throw new Error('Invalid argument: '+key);
    }
    const result = await tool.run(args);
    if (tool.files) {
      const text = `Template ${result.template.name} (${result.template.id}): ${Object.keys(result.files).length} source files, ${Object.keys(result.assetFiles).length} text assets and ${Object.keys(result.binaryFiles).length} binary assets.${result.missingAssets.length ? ` ${result.missingAssets.length} referenced assets were unavailable.` : ''} File contents are in structuredContent.`;
      return { content: [{ type: 'text', text }], structuredContent: result };
    }
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: Array.isArray(result) ? { results: result } : result };
  } catch (error) { return { isError: true, content: [{ type: 'text', text: error.message }] }; }
}

export async function handle(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') return {jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}};
  const { id, method, params } = message;
  if (id === undefined) return null;
  const reply = result => ({ jsonrpc: '2.0', id, result });
  if (method === 'initialize') {
    const requested = params?.protocolVersion;
    return reply({ protocolVersion: protocolVersions.includes(requested) ? requested : protocolVersions[0], capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'draftmango-templates', title: 'Draftmango template library', version: '1.1.0' },
      instructions: 'Start new websites from a Draftmango template: search_templates with the brief, optionally template_details, then get_template_files. Keep the template\'s layout, components and styling; replace demo text, contact details, products and placeholder images with the client\'s real content.' });
  }
  if (method === 'ping') return reply({});
  if (method === 'tools/list') return reply({ tools: tools.map(({ run, files, ...tool }) => tool) });
  if (method === 'tools/call') return reply(await call(params?.name, params?.arguments));
  if (id === undefined) return null; // notifications such as notifications/initialized
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Bounded, sequential requests. EOF drains queued work instead of exiting
  // while an import is still loading its assets.
  let buffer = '', chain = Promise.resolve();
  const send = response => {if(response) process.stdout.write(JSON.stringify(response)+'\n');};
  const enqueue = line => { chain = chain.then(async()=>{
    let message;
    try {message=JSON.parse(line);} catch {send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});return;}
    try {send(await handle(message));} catch(error) {send({jsonrpc:'2.0',id:message?.id??null,error:{code:-32603,message:error.message}});}
  }); };
  process.stdin.setEncoding('utf8');
  process.stdin.on('data',chunk=>{
    buffer += chunk;
    if (Buffer.byteLength(buffer)>12*1024*1024) {process.stderr.write('MCP request exceeds limit.\n');process.exit(1);}
    let index;
    while((index=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,index).trim();buffer=buffer.slice(index+1);if(line)enqueue(line);}
  });
  process.stdin.on('end',()=>{if(buffer.trim())enqueue(buffer);});
}

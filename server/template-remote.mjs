import {searchTemplates, templateDetails} from './template-engine/index.mjs';
import {validateTemplateFiles} from './template-engine/design-policy.mjs';
import {TemplatePackages} from './template-engine/packages.mjs';
import {RemoteError, send, readBody, authorizeTemplateRequest, proxyTemplateToken} from './template-access.mjs';

const endpoint = '/mcp/templates';
const downloadPrefix = '/api/template-packages/';
const protectedMetadata = '/.well-known/oauth-protected-resource/mcp/templates';
const authorizationMetadata = '/.well-known/oauth-authorization-server/template-access';
const scopes = ['templates:read','templates:download','templates:validate'];
const versions = ['2025-06-18','2025-03-26'];
const string = {type:'string', maxLength:8000};
const identity = {type:'string', pattern:'^[a-z][a-z0-9-]{0,70}$'};
const version = {type:'string', pattern:'^[a-f0-9]{64}$'};
const tools = [
  {name:'search_templates', description:'Find library templates matching a brief. Preserve the selected design.', scope:scopes[0], inputSchema:{type:'object', properties:{brief:string,limit:{type:'integer',minimum:1,maximum:10}}, required:['brief'],additionalProperties:false}},
  {name:'template_details', description:'Read a template’s pages and editing guide.', scope:scopes[0], inputSchema:{type:'object',properties:{id:identity},required:['id'],additionalProperties:false}},
  {name:'get_template_package', description:'Get a versioned React project download descriptor. The backend downloads the gzip JSON package using its bearer token, verifies SHA-256, and imports files through host review. Never give credentials to the model or desktop app.', scope:scopes[1], inputSchema:{type:'object',properties:{id:identity,version},required:['id'],additionalProperties:false}},
  {name:'validate_template_files', description:'Check proposed source files against the server-owned manifest for an exact package version. Layout, styling and runtime must stay intact. The host separately verifies vendor asset hashes from the package.', scope:scopes[2], inputSchema:{type:'object',properties:{id:identity,version,files:{type:'object',maxProperties:600,additionalProperties:{type:['string','null']}},partial:{type:'boolean'}},required:['id','version','files'],additionalProperties:false}},
];

function argumentsFor(tool, args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new RemoteError(400,'invalid_arguments');
  const schema = tool.inputSchema;
  if (Object.keys(args).some(k=>!Object.hasOwn(schema.properties,k)) || schema.required.some(k=>!Object.hasOwn(args,k))) throw new RemoteError(400,'invalid_arguments');
  for (const [name, value] of Object.entries(args)) {
    const rule = schema.properties[name];
    if (rule.type === 'string' && (typeof value !== 'string' || value.length > 8000 || (rule.pattern && !new RegExp(rule.pattern).test(value)))) throw new RemoteError(400,'invalid_arguments');
    if (rule.type === 'integer' && (!Number.isInteger(value) || value < 1 || value > 10)) throw new RemoteError(400,'invalid_arguments');
    if (rule.type === 'boolean' && typeof value !== 'boolean') throw new RemoteError(400,'invalid_arguments');
    if (rule.type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 600 || Object.entries(value).some(([k,v])=>k.length > 180 || (v !== null && (typeof v !== 'string' || v.length > 500000))))) throw new RemoteError(400,'invalid_arguments');
  }
}
function requireScope(principal, scope) {
  if (!principal.scopes.includes(scope)) throw new RemoteError(403,'insufficient_scope',scope);
}
function descriptor(pkg, origin) {
  const {id,version} = pkg.bundle.template;
  return {template:pkg.bundle.template, url:`${origin}${downloadPrefix}${id}/${version}`, sha256:pkg.sha256, bytes:pkg.bytes.length, format:'draftmango-template-json-gzip-v1', authentication:'Bearer', missingAssets:pkg.bundle.missingAssets};
}

export function createTemplateRemote({enabled = process.env.DRAFTMANGO_TEMPLATE_REMOTE_ENABLED === '1', origin = '', authorize = authorizeTemplateRequest, tokenProxy = proxyTemplateToken, packages = new TemplatePackages()} = {}) {
  let active = 0;
  return async (request, response, url) => {
    const route = url.pathname;
    if (![endpoint,protectedMetadata,authorizationMetadata,'/api/template-access/token'].includes(route) && !route.startsWith(downloadPrefix)) return false;
    try {
      if (!enabled || !origin.startsWith('https://')) throw new RemoteError(404,'not_found');
      if (url.search || (request.headers.origin && request.headers.origin !== origin) || request.headers['sec-fetch-site'] === 'cross-site') throw new RemoteError(403,'invalid_origin_or_query');
      if (route === protectedMetadata || route === authorizationMetadata) {
        if (request.method !== 'GET') throw new RemoteError(405,'method_not_allowed');
        send(response,200,route === protectedMetadata ? {resource:origin+endpoint, authorization_servers:[origin+'/template-access'], scopes_supported:scopes, bearer_methods_supported:['header']} :
          {issuer:origin+'/template-access', token_endpoint:origin+'/api/template-access/token', grant_types_supported:['client_credentials'], token_endpoint_auth_methods_supported:['client_secret_basic'], scopes_supported:scopes, response_types_supported:[]});
        return true;
      }
      if (route === '/api/template-access/token') {
        if (request.method !== 'POST') throw new RemoteError(405,'method_not_allowed');
        await tokenProxy(request,response); return true;
      }
      const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(request.headers.authorization || '');
      if (!bearer) throw new RemoteError(401,'invalid_token');
      const principal = await authorize(request,bearer[1],route === endpoint ? 'mcp' : 'download');
      if (route.startsWith(downloadPrefix)) {
        requireScope(principal,scopes[1]);
        if (request.method !== 'GET') throw new RemoteError(405,'method_not_allowed');
        const match = /^\/api\/template-packages\/([a-z][a-z0-9-]{0,70})\/([a-f0-9]{64})$/.exec(route);
        if (!match) throw new RemoteError(404,'not_found');
        if (active >= 1) throw new RemoteError(429,'template_busy');
        active++;
        try {
          const pkg = await packages.ensure(match[1],match[2]);
          response.writeHead(200, {'Content-Type':'application/gzip', 'Content-Length':pkg.bytes.length, 'Content-Disposition':`attachment; filename="${match[1]}.${match[2]}.json.gz"`, 'Content-Digest':`sha-256=:${Buffer.from(pkg.sha256,'hex').toString('base64')}:`, 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff'});
          response.end(pkg.bytes);
        } finally {active--;}
        return true;
      }
      if (request.method !== 'POST') throw new RemoteError(405,'method_not_allowed'); // SSE GET and session DELETE intentionally unsupported.
      if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw new RemoteError(415,'content_type');
      const accepts = (request.headers.accept || '').split(',').map(s=>s.trim().split(';')[0]);
      if (!accepts.includes('application/json') || !accepts.includes('text/event-stream')) throw new RemoteError(406,'accept');
      const protocol = request.headers['mcp-protocol-version'] || '2025-03-26';
      if (!versions.includes(protocol)) throw new RemoteError(400,'unsupported_protocol');
      if (active >= 1) throw new RemoteError(429,'template_busy');
      active++;
      try {
        let message;
        try {message = JSON.parse((await readBody(request,8*1024*1024)).toString('utf8'));}
        catch (error) {if (error instanceof RemoteError) throw error; send(response,400,{jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}}); return true;}
        if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || (message.id !== undefined && typeof message.id !== 'string' && !Number.isSafeInteger(message.id)) || (typeof message.id === 'string' && message.id.length > 200)) {
          send(response,400,{jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}}); return true;
        }
        // We do not send server requests; accept valid client responses without
        // acting on them, and known notifications without starting tool work.
        if (message.method === undefined && message.id !== undefined && ('result' in message || 'error' in message)) {send(response,202);return true;}
        if (typeof message.method !== 'string') throw new RemoteError(400,'invalid_request');
        if (message.id === undefined) {
          if (!['notifications/initialized','notifications/cancelled'].includes(message.method)) throw new RemoteError(400,'invalid_notification');
          send(response,202); return true;
        }
        const result = value=>send(response,200,{jsonrpc:'2.0',id:message.id,result:value});
        if (message.method === 'initialize') result({protocolVersion:versions.includes(message.params?.protocolVersion) ? message.params.protocolVersion : versions[0], capabilities:{tools:{listChanged:false}}, serverInfo:{name:'draftmango-templates',version:'1.2.0'}, instructions:'Use the shared template library. Download packages through your backend and preserve their design. Validate source edits against the exact imported template id/version. Never send credentials to a model.'});
        else if (message.method === 'ping') result({});
        else if (message.method === 'tools/list') result({tools:tools.filter(t=>principal.scopes.includes(t.scope)).map(({scope,...tool})=>({...tool,annotations:{readOnlyHint:true}}))});
        else if (message.method === 'tools/call') {
          const tool = tools.find(t=>t.name === message.params?.name);
          if (!tool) {send(response,200,{jsonrpc:'2.0',id:message.id,error:{code:-32602,message:'Unknown tool'}});return true;}
          requireScope(principal,tool.scope);
          try {
            const args = message.params.arguments || {}; argumentsFor(tool,args);
            let data;
            if (tool.name === 'search_templates') data = {results:await searchTemplates(args.brief,args.limit)};
            if (tool.name === 'template_details') data = await templateDetails(args.id);
            if (tool.name === 'get_template_package') data = descriptor(await packages.ensure(args.id,args.version),origin);
            if (tool.name === 'validate_template_files') data = validateTemplateFiles((await packages.ensure(args.id,args.version)).bundle.manifest,args.files,{partial:args.partial === true});
            result({content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data});
          } catch (error) {
            if (error instanceof RemoteError && error.status >= 429) throw error;
            result({isError:true,content:[{type:'text',text:['template_design','template_unavailable'].includes(error.code) ? error.message : error instanceof RemoteError ? error.code : 'The template operation could not be completed.'}]});
          }
        } else send(response,200,{jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found'}});
      } finally {active--;}
    } catch (error) {
      const status = error instanceof RemoteError ? error.status : error.code === 'template_unavailable' ? 404 : 503;
      const headers = {};
      if (status === 401) headers['WWW-Authenticate'] = `Bearer error="invalid_token", resource_metadata="${origin}${protectedMetadata}"`;
      if (status === 403 && error.code === 'insufficient_scope') headers['WWW-Authenticate'] = `Bearer error="insufficient_scope", scope="${error.message}"`;
      if (status === 429) headers['Retry-After'] = '60';
      if (status === 405) headers.Allow = route.startsWith(downloadPrefix) || route.startsWith('/.well-known/') ? 'GET' : 'POST';
      send(response,status,{error:error instanceof RemoteError ? error.code : 'template_service_unavailable'},headers);
    }
    return true;
  };
}

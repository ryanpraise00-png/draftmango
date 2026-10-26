// Static-site gateway. No filesystem access, customer-code execution or account proxy.
import http from 'node:http';
import {pathToFileURL} from 'node:url';

export function publicRequest(request, baseDomain) {
  if(!['GET','HEAD'].includes(request.method))return {error:405};
  const host=String(request.headers.host||'').toLowerCase().replace(/:\d{1,5}$/,'');
  if(!/^[a-z][a-z0-9-]{1,46}[a-z0-9]$/.test(host.slice(0,-baseDomain.length-1)) || !host.endsWith('.'+baseDomain))return {error:404};
  const raw=String(request.url||'');
  if(!raw.startsWith('/') || raw.startsWith('//'))return {error:404};
  let path;try{path=decodeURIComponent(raw.split('?')[0]).slice(1);}catch{return {error:404};}
  if(path.includes('\\') || path.includes('%') || path.includes('\0') || path.split('/').some(p=>p.startsWith('.')) || !/^[A-Za-z0-9_./-]*$/.test(path))return {error:404};
  return {host,path};
}

export function createPublisher({token=process.env.DJANGO_PUBLISHING_TOKEN||'',baseDomain=process.env.DJANGO_PUBLISHING_BASE_DOMAIN||'localhost',backendHost=process.env.DJANGO_HOST||'127.0.0.1',backendPort=Number(process.env.DJANGO_PORT||4176),canonicalHost=process.env.PUBLISHING_APP_HOST||'127.0.0.1:4175',production=process.env.NODE_ENV==='production'}={}){
  if(token.length<32)throw Error('A private publishing service token is required.');
  if(!/^[a-z0-9.-]+$/.test(baseDomain))throw Error('Invalid publishing domain.');
  let active=0;
  return http.createServer((req,res)=>{
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Origin-Agent-Cluster':'?1','X-Frame-Options':'SAMEORIGIN','Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'; base-uri 'self'; worker-src 'none'",'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()'};
    const fail=(status,message='Website not found')=>{if(!res.headersSent){res.writeHead(status,{...headers,'Content-Type':'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?'':message);}else res.destroy();};
    if(req.url==='/healthz' && req.headers.host==='localhost' && req.method==='GET'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}
    const target=publicRequest(req,baseDomain);
    if(target.error){fail(target.error);return;}
    if(active>=24){fail(503,'Please try again shortly');return;}
    active++;let finished=false;const finish=()=>{if(!finished){finished=true;active--;}};
    const upstream=http.request({hostname:backendHost,port:backendPort,path:'/internal/publishing/file?'+new URLSearchParams(target),method:req.method,
      headers:{Host:canonicalHost,'X-Publishing-Token':token,...(production?{'X-Forwarded-Proto':'https'}:{})},timeout:8000},incoming=>{
      // Never forward Set-Cookie, CORS credentials, Location or arbitrary backend headers.
      const status=[200,404,503].includes(incoming.statusCode)?incoming.statusCode:502;
      if(status!==200){incoming.resume();fail(status,status===404?'Website or page not found':'Publishing is temporarily unavailable');return;}
      const chunks=[];let size=0;
      incoming.on('data',chunk=>{size+=chunk.length;if(size>5*1024*1024){incoming.destroy();fail(502);}else chunks.push(chunk);});
      incoming.on('end',()=>{if(!res.destroyed){res.writeHead(200,{...headers,'Content-Type':incoming.headers['content-type']||'application/octet-stream',...(req.method==='HEAD' && incoming.headers['content-length']?{'Content-Length':incoming.headers['content-length']}:{})});res.end(Buffer.concat(chunks));}});
      incoming.on('error',()=>fail(502));
    });
    upstream.on('timeout',()=>upstream.destroy(new Error('timeout')));
    upstream.on('error',()=>fail(502,'Publishing is temporarily unavailable'));
    req.on('aborted',()=>upstream.destroy());
    res.on('close',()=>{upstream.destroy();finish();});
    res.on('finish',finish);
    upstream.end();
  });
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  createPublisher().listen(Number(process.env.DJANGO_PUBLISHING_PORT||4177),process.env.PUBLISHING_BIND||'127.0.0.1',()=>console.log('Draftmango static publishing service ready'));
}

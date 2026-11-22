import http from 'node:http';
import {isIP} from 'node:net';

const actions=new Set(['catalog','orders','signup','login','logout','reset','resend','verify','reset-confirm','quote','checkout','order','contact','newsletter']);
export function proxyStore(req,res,{token,baseDomain,backendHost,backendPort,canonicalHost,production,trustedProxyIPs=[]}) {
  const pathname=String(req.url||'').split('?')[0];
  if(!pathname.startsWith('/api/store/'))return false;
  const fail=(status,message)=>{if(!res.headersSent){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify({error:{message}}));}};
  const host=String(req.headers.host||'').toLowerCase().replace(/:\d{1,5}$/,'');
  const action=pathname.slice('/api/store/'.length),suffix='.'+baseDomain;
  if(!host.endsWith(suffix)||!/^[a-z][a-z0-9-]{1,46}[a-z0-9]$/.test(host.slice(0,-suffix.length))||!actions.has(action)||req.url!==pathname){fail(404,'Not found');return true;}
  const origin=(production?'https://':'http://')+req.headers.host;
  if(!['GET','POST'].includes(req.method)||(req.method==='GET'&&!['catalog','orders'].includes(action))){fail(405,'Unsupported method');return true;}
  if((req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site'||(req.method==='POST'&&(req.headers.origin!==origin||req.headers['x-store-request']!=='1'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')))){fail(403,'Use this store’s website to continue.');return true;}
  if(Number(req.headers['content-length']||0)>65536){req.resume();fail(413,'Request too large');return true;}
  const peer=String(req.socket.remoteAddress||'').replace(/^::ffff:/,''),supplied=String(req.headers['x-real-ip']||'');
  const ip=trustedProxyIPs.includes(peer)&&isIP(supplied)?supplied:peer;
  const cookieName=production?'__Host-draftmango_store':'draftmango_store';
  const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='));
  const headers={Host:canonicalHost,'X-Publishing-Token':token,'X-Store-Host':host,'X-Draftmango-Client-IP':ip,'Content-Type':'application/json',...(production?{'X-Forwarded-Proto':'https'}:{})};
  if(cookie&&new RegExp('^'+cookieName+'=[A-Za-z0-9_-]{1,100}$').test(cookie))headers.Cookie=cookie;
  let size=0,done=false;const chunks=[];
  req.on('data',chunk=>{size+=chunk.length;if(size>65536){done=true;chunks.length=0;fail(413,'Request too large');}else if(!done)chunks.push(chunk);});
  req.on('end',()=>{
    if(done)return;
    const payload=Buffer.concat(chunks);headers['Content-Length']=payload.length;
    const upstream=http.request({hostname:backendHost,port:backendPort,path:'/internal/store/'+action,method:req.method,headers,timeout:25000},incoming=>{
      const out={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
      const cookies=(incoming.headers['set-cookie']||[]).filter(v=>v.startsWith(cookieName+'=')&&!/;\s*domain=/i.test(v));
      if(cookies.length)out['Set-Cookie']=cookies;
      const parts=[];let length=0;
      incoming.on('data',chunk=>{length+=chunk.length;if(length>2*1024*1024){incoming.destroy();fail(502,'Store response too large');}else parts.push(chunk);});
      incoming.on('end',()=>{if(!res.headersSent&&!res.destroyed){res.writeHead(incoming.statusCode||502,out);res.end(Buffer.concat(parts));}});
      incoming.on('error',()=>fail(502,'Store temporarily unavailable'));
    });
    upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>fail(502,'Store temporarily unavailable'));
    res.on('close',()=>upstream.destroy());upstream.end(payload);
  });
  req.on('error',()=>fail(400,'Invalid request'));
  return true;
}

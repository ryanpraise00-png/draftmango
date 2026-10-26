import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {compileProject,BuildError} from './compiler.mjs';
export function createBuilder({token=process.env.DRAFTMANGO_BUILD_TOKEN || ''}={}) {
  if(token.length<32)throw new Error('A private build token is required.');
  return http.createServer(async(req,res)=>{
    const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    if(req.method==='GET'&&req.url==='/healthz')return send(200,{status:'ok'});
    const supplied=Buffer.from(req.headers['x-build-token']||'');
    if(req.method!=='POST'||req.url!=='/build'||supplied.length!==Buffer.byteLength(token)||!timingSafeEqual(supplied,Buffer.from(token)))return send(404,{error:{message:'Not found'}});
    try {
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>6*1024*1024)throw new BuildError('Project is too large.',413);chunks.push(chunk);}
      let input;try{input=JSON.parse(Buffer.concat(chunks));}catch{throw new BuildError('Invalid source request.',400);}
      const result=await compileProject(input.files);send(200,result);
    }catch(error){send(error instanceof BuildError?error.status:500,{error:{message:error instanceof BuildError?error.message:'Build service error.'}});}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)createBuilder().listen(Number(process.env.BUILD_PORT||4178),process.env.BUILD_BIND||'127.0.0.1',()=>console.log('React build service ready.'));

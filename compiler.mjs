import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import './dist/project-format.js';
const P = globalThis.DraftmangoProject;
export class BuildError extends Error { constructor(message, status=422) {super(message); this.status=status; this.code='build_failed';} }
let active = 0;
export function compileProject(files, {timeoutMs=10000}={}) {
  if (!P.valid(files) || !P.isReact(files)) return Promise.reject(new BuildError('A React project needs src/App.jsx, src/main.jsx and src/styles.css, with safe relative file paths.'));
  if (active >= 2) return Promise.reject(new BuildError('Two projects are already building. Please try again shortly.',429));
  active++;
  return new Promise((resolve,reject) => {
    const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP','HOME'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
    const child = fork(fileURLToPath(new URL('./compiler-worker.mjs', import.meta.url)), [], {env,execArgv:['--max-old-space-size=192'],stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
    let settled=false;
    const done=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);child.kill();active--;error?reject(error):resolve(result);};
    const timer=setTimeout(()=>done(new BuildError('The React build exceeded its time limit. Reduce the project size and try again.')),timeoutMs);
    child.on('error',()=>done(new BuildError('The React compiler is unavailable. Your source is saved.',503)));
    child.on('exit',()=>done(new BuildError('The React build stopped before completion. Your source is saved.')));
    child.on('message',message=>message.ok?done(null,message.result):done(new BuildError(message.error || 'The React build failed.')));
    child.send({files});
  });
}
export async function buildRemote(files) {
  const token=process.env.DRAFTMANGO_BUILD_TOKEN || '';
  if(token.length<32)throw new BuildError('The React build service is not configured.',503);
  let response;
  try { response=await fetch(process.env.DRAFTMANGO_BUILD_URL || 'http://127.0.0.1:4178/build',{method:'POST',headers:{'content-type':'application/json','X-Build-Token':token},body:JSON.stringify({files}),signal:AbortSignal.timeout(13000)}); }
  catch {throw new BuildError('The React build service is unavailable. Try again shortly.',503);}
  const result=await response.json();
  if(!response.ok)throw new BuildError(result.error?.message || 'The React build failed.',response.status);
  return result;
}

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from '../serve.mjs';
import { createPublisher } from '../publisher.mjs';
import { createBuilder } from '../build-service.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.env.DRAFTMANGO_PYTHON || path.join(root, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
if (!existsSync(python)) { console.error('Run npm run setup:accounts first.'); process.exit(1); }
if(!existsSync(path.join(root,'out/index.html'))) {console.error('Run npm run build to compile the Next.js application first.');process.exit(1);}
const buildToken=randomBytes(32).toString('hex');
const buildPort=Number(process.env.BUILD_PORT||4178);
process.env.DRAFTMANGO_BUILD_TOKEN=buildToken;
process.env.DRAFTMANGO_BUILD_URL=`http://127.0.0.1:${buildPort}/build`;
const builder=createBuilder({token:buildToken});
builder.listen(buildPort,'127.0.0.1');
const token=randomBytes(32).toString('hex');
const publishingPort=Number(process.env.DJANGO_PUBLISHING_PORT || 4177);
const backendEnv={...process.env,DJANGO_PUBLISHING_TOKEN:token,DJANGO_PUBLISHING_ENABLED:'1',DJANGO_PUBLISHING_BASE_DOMAIN:'localhost',DJANGO_PUBLISHING_PORT:String(publishingPort)};
const migration = spawnSync(python, ['manage.py', 'migrate', '--noinput'], { cwd: root, stdio: 'inherit', windowsHide: true });
if (migration.status !== 0) process.exit(1);
const port = Number(process.env.PORT || 4175), djangoPort = Number(process.env.DJANGO_PORT || 4176);
const child = spawn(python, ['manage.py', 'runserver', `127.0.0.1:${djangoPort}`, '--noreload'], { cwd: root, env:backendEnv, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
let exiting = false, server, publisher;
const stop = code => { if (exiting) return; exiting = true; for(const service of [server,publisher,builder]){service?.closeAllConnections();service?.close();} child.kill(); process.exitCode = code; };
builder.on('error',()=>{console.error('The React build port is unavailable.');stop(1);});
child.on('error', () => { console.error('Django could not start.'); stop(1); });
child.on('exit', code => { if (!exiting) stop(code || 1); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(0));
for (let attempt = 0; attempt < 40 && !exiting; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${djangoPort}/api/accounts/session`, { signal: AbortSignal.timeout(1000) });
    if (response.ok) {
      server = createServer();
      publisher=createPublisher({token,baseDomain:'localhost',backendHost:'127.0.0.1',backendPort:djangoPort,canonicalHost:'127.0.0.1:'+port,production:false});
      publisher.on('error',()=>{console.error('Publishing port is unavailable.');stop(1);});
      publisher.listen(publishingPort,'127.0.0.1');
      server.on('error', () => { console.error('Draftmango could not start. Check that its port is available.'); stop(1); });
      server.listen(port, '127.0.0.1', () => console.log(`Draftmango + Django: http://127.0.0.1:${port}`));
      break;
    }
  } catch { /* Wait for Django startup. */ }
  await new Promise(resolve => setTimeout(resolve, 250));
}
if (!server && !exiting) { console.error('Django did not become ready.'); stop(1); }

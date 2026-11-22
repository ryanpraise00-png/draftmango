import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const python=process.env.DRAFTMANGO_PYTHON||fileURLToPath(new URL(process.platform==='win32'?'../.venv/Scripts/python.exe':'../.venv/bin/python',import.meta.url));
const r=spawnSync(python,['manage.py','test','stores','--noinput'],{cwd:root,stdio:'inherit',windowsHide:true});
process.exitCode=r.status||(r.error?1:0);

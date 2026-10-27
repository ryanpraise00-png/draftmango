import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const python = process.env.DRAFTMANGO_PYTHON || fileURLToPath(new URL(process.platform === 'win32' ? '../.venv/Scripts/python.exe' : '../.venv/bin/python', import.meta.url));
const result = spawnSync(python, ['manage.py', 'test', 'accounts', '--noinput'], { cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit', windowsHide: true });
process.exitCode = result.status || (result.error ? 1 : 0);

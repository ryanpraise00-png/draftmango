import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const bundled = path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const python = process.env.DRAFTMANGO_PYTHON || (process.platform === 'win32' && existsSync(bundled) ? bundled : 'python');
const venv = path.join(root, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
function run(exe, args) { const result = spawnSync(exe, args, { cwd: root, stdio: 'inherit', windowsHide: true }); if (result.error || result.status !== 0) throw new Error('Account setup failed. Check Python installation and network access, then retry.'); }
if (!existsSync(venv)) run(python, ['-m', 'venv', '--without-pip', '.venv']);
run(python, ['-m', 'pip', '--python', venv, 'install', '-r', 'requirements.txt']);
const file = path.join(root, '.env'); let env = existsSync(file) ? readFileSync(file, 'utf8') : '';
if (!/^DJANGO_SECRET_KEY=.+$/m.test(env)) {
  env = env.replace(/^DJANGO_SECRET_KEY=\s*$/m, '');
  env += '\nDJANGO_SECRET_KEY=' + randomBytes(48).toString('base64url') + '\n';
  writeFileSync(file, env, { mode: 0o600 });
}
run(venv, ['manage.py', 'migrate', '--noinput']);
console.log('Django accounts are ready. Run npm run dev to open Draftmango.');

// Back up and delete this account's projects, then create one blank project.
// Usage: npm run reset:projects -- [--email you@example.com] [--title Test] [--yes]
// Stop `npm run dev` first. A JSON backup is written to data/backups/ before anything is deleted.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../dist/project-format.js';
import '../dist/workspace-model.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const title = (option('--title') || 'Test').trim().slice(0, 60) || 'Test';

export function blankProject(name) {
  const M = globalThis.DraftmangoModel, P = globalThis.DraftmangoProject;
  const draft = M.createProject('', 'blank');
  draft.title = name; draft.design.brand = name; draft.history[0].design.brand = name;
  draft.files = P.scaffold({}, name); draft.history[0].files = structuredClone(draft.files);
  draft.messages = draft.messages.filter(message => message.role === 'assistant');
  // Normalise through the same reader the browser uses, so the stored document is exactly what it expects.
  const read = M.readStore(JSON.stringify({ schema: 1, activeId: draft.id, projects: [draft] }));
  if (!read || read.projects.length !== 1 || read.projects[0].id !== draft.id) throw new Error('Could not create a valid blank project.');
  return read.projects[0];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const folder = mkdtempSync(path.join(tmpdir(), 'draftmango-reset-'));
  const file = path.join(folder, 'project.json');
  try {
    writeFileSync(file, JSON.stringify(blankProject(title)));
    const python = process.env.DRAFTMANGO_PYTHON || path.join(root, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
    const command = ['manage.py', 'reset_projects', '--document', file];
    if (option('--email')) command.push('--email', option('--email'));
    if (args.includes('--yes')) command.push('--yes');
    const result = spawnSync(python, command, { cwd: root, stdio: 'inherit', windowsHide: true });
    if (result.error) console.error('Could not start Python. Run npm run setup:accounts first.');
    process.exitCode = result.status || (result.error ? 1 : 0);
  } finally { rmSync(folder, { recursive: true, force: true }); }
}

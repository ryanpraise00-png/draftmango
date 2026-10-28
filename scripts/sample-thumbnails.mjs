// Regenerates the gallery thumbnails for the sample websites in web/samples/.
// Usage: start the app (npm run dev), then: node scripts/sample-thumbnails.mjs [base-url]
// Needs Microsoft Edge or Google Chrome. Set BROWSER to use another Chromium binary.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = (process.argv[2] || 'http://localhost:4175').replace(/\/$/, '');
const candidates = [process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
const browser = candidates.find(file => file && existsSync(file));
if (!browser) { console.error('No Chromium browser found. Set BROWSER to its path.'); process.exit(1); }

const samples = (await readdir(path.join(root, 'web/samples'))).filter(name => name.endsWith('.html'));
const scratch = await mkdtemp(path.join(tmpdir(), 'draftmango-thumbs-'));
try {
  for (const sample of samples) {
    const shot = path.join(scratch, sample.replace('.html', '.png'));
    const result = spawnSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      '--window-size=1280,800', `--user-data-dir=${path.join(scratch, 'profile')}`,
      `--screenshot=${shot}`, `${base}/samples/${sample}`], {encoding: 'utf8', timeout: 60000});
    if (!existsSync(shot)) { console.error(`Could not capture ${sample}. Is the app running at ${base}?`, result.error ?? result.stderr); process.exit(1); }
    const output = path.join(root, 'web/samples', sample.replace('.html', '.jpg'));
    await sharp(shot).resize({width: 960}).jpeg({quality: 82, mozjpeg: true}).toFile(output);
    console.log('Wrote', path.relative(root, output));
  }
} finally {
  await rm(scratch, {recursive: true, force: true});
}

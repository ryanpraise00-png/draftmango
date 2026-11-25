// Screenshots of the Draftmango template previews, used as images on the public pages.
//   web/draftmango/shots/cards/<id>.jpg          every template's home page, for the template cards (720 x 500)
//   web/draftmango/shots/<id>-tall.jpg / -wide.jpg the three templates featured on the home page
// Run while the app is running (npm run dev), then npm run build:
//   npm run templates:shots              (uses http://localhost:4175)
//   another port (PowerShell): $env:BASE_URL="http://localhost:4179"; npm run templates:shots
import {chromium} from 'playwright';
import {mkdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const base = (process.env.BASE_URL || 'http://localhost:4175').replace(/\/$/, '');
const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await readFile(new URL('web/template-catalog.json', root), 'utf8'));
const shots = new URL('web/draftmango/shots/', root);
await mkdir(new URL('cards/', shots), {recursive: true});

const featured = ['architecture-studio-1', 'restaurant-1', 'fashion-store-1'];
const jobs = [
  ...catalog.map(t => ({file: t.file, out: `cards/${t.id}.jpg`, width: 1440, height: 1000, scale: 0.5})),
  ...featured.flatMap(id => [
    {file: `demo-${id}.html`, out: `${id}-tall.jpg`, width: 1200, height: 1500, scale: 1},
    {file: `demo-${id}.html`, out: `${id}-wide.jpg`, width: 1440, height: 900, scale: 1},
  ]),
];

const browser = await chromium.launch();
const failed = [];
async function worker() {
  for (let job; (job = jobs.shift());) {
    const context = await browser.newContext({viewport: {width: job.width, height: job.height}, deviceScaleFactor: job.scale, reducedMotion: 'reduce'});
    const page = await context.newPage();
    try {
      await page.goto(`${base}/draftmango/previews/${job.file}`, {waitUntil: 'networkidle', timeout: 45000});
      await page.addStyleTag({content: 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}'});
      await page.waitForTimeout(3000); // entrance effects and preloaders settle
      await page.screenshot({path: fileURLToPath(new URL(job.out, shots)), type: 'jpeg', quality: job.scale < 1 ? 78 : 82});
    } catch (error) {
      failed.push(`${job.out}: ${error.message.split('\n')[0]}`);
    } finally {
      await context.close();
    }
  }
}
await Promise.all([1, 2, 3, 4].map(worker));
await browser.close();
if (failed.length) { console.error('Not captured:\n' + failed.join('\n')); process.exitCode = 1; }
else console.log('Captured template screenshots in web/draftmango/shots.');

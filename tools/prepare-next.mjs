import {cp, mkdir, readdir, rm} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
// public/ is generated from dist/ on every build, so removed files never linger.
await rm(new URL('public/', root), {recursive:true, force:true});
await mkdir(new URL('public/', root), {recursive:true});
// dist currently holds shared controllers/styles used by the API and editor.
// Pages are exclusively authored in app/**/*.jsx; HTML templates are not served.
for (const entry of await readdir(new URL('dist/', root))) {
  if (entry.endsWith('.html')) continue;
  await cp(new URL('dist/'+entry, root), new URL('public/'+entry, root), {recursive:true});
}

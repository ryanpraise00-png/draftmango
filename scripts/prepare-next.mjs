import {cp, mkdir, readdir, rm} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
// public/ is generated from web/ on every build, so removed files never linger.
await rm(new URL('public/', root), {recursive:true, force:true});
await mkdir(new URL('public/', root), {recursive:true});
// web/ holds the browser scripts, styles and assets the pages load.
// Pages are exclusively authored in app/**/*.jsx; HTML templates are not served.
for (const entry of await readdir(new URL('web/', root))) {
  if (entry.endsWith('.html')) continue;
  await cp(new URL('web/'+entry, root), new URL('public/'+entry, root), {recursive:true});
}

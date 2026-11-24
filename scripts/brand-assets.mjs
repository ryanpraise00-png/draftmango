import {mkdir, writeFile} from 'node:fs/promises';
import {brand} from '../shared/brand.mjs';

// Keep portable marks and the browser icon identical to the React mark.
const root = new URL('../web/assets/', import.meta.url);
await mkdir(new URL('brand/', root), {recursive:true});
const paths = brand.paths.map(d => `<path d="${d}"/>`).join('');
for (const [name, colour] of [['orange',brand.colour],['black',brand.ink],['white','#ffffff']]) {
  await writeFile(new URL(`brand/sculpted-${name}.svg`,root), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${brand.viewBox}" fill="${colour}"><title>Draftmango</title>${paths}</svg>\n`);
}
await writeFile(new URL('favicon.svg',root), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="${brand.colour}"><title>Draftmango</title>${paths}</svg>\n`);

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

// Template preview branding shares the approved mango geometry with the app.
const library = new URL('../web/draftmango/assets/media/logo/', import.meta.url);
await mkdir(library, {recursive:true});
await writeFile(new URL('draftmango-mark.svg',library), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="${brand.colour}"><title>Draftmango</title>${paths}</svg>\n`);
await writeFile(new URL('draftmango-logo.svg',library), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 198 36" width="198" height="36"><title>Draftmango</title><g fill="${brand.colour}" transform="translate(0 0) scale(.56)">${paths}</g><text x="39" y="27" fill="${brand.ink}" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="700" letter-spacing="-1.1">draftmango.</text></svg>\n`);

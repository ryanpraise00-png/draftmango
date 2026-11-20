# Framo asset sources

The original purchased package is read-only. Application copies live in web/framo.

Stock photography used in the featured template previews is free under the Unsplash License (https://unsplash.com/license):

- Wes Fischer: https://unsplash.com/photos/white-house-with-swimming-pool-g39p1kDjvSY
- Glenov Brankovic: https://unsplash.com/photos/e4B5AvA7Jqo
- Polina Kuzovkova: https://unsplash.com/photos/clothes-hanging-on-a-rack-in-a-boutique-pt3EBzQcxP0

Other template photography remains the vendor's labelled placeholders until relevant assets are selected. Template content is demonstration content.

## Template library maintenance

- The catalog has 100 design families and 1,150 demo pages. The original purchased directory is never edited.
- Preview HTML and shared CSS, fonts and images are application copies in `web/framo`. The application itself uses Next.js and React.
- After editing a preview copy, run `npm run templates:import` (Python required) to regenerate editable React page components and the minified interaction runtime. Then run `npm run build`.
- Run `node --test tests/templates.test.mjs tests/dashboard.test.mjs` to check all 100 templates compile, account redirects preserve a selected design, and AI edits retain untouched pages.
- The compiled templates retain Framo's existing interaction code for menus, sliders and shop demos. Forms, checkout and other backend services need their own integration.
- Generated projects currently load shared assets from Draftmango. `TEMPLATE.md` in each starter records this dependency; exports are not yet a fully offline asset bundle.
- Catalog previews are isolated in iframes. Compiled workspace previews keep their opaque-origin sandbox; only Framo runtime projects enable expression evaluation needed by Alpine. Network requests and form submission remain disabled in the workspace preview.

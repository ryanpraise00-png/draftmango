# Draftmango logo

The approved identity is the **Sculpted mango in orange** with a **black lowercase wordmark**, including the terminal full stop. Keep the existing orange product accents and white interface.

- Orange: `#ff5b1f`; black: `#191919`; reversed: `#ffffff`.
- Use the white mark and wordmark together on the dark public footer. Black is available for monochrome reproduction.
- Use the symbol alone for favicons and collapsed navigation. Do not add a tile, fruit shading, stem, outline or highlight.
- Keep the mark's proportions and leave at least one leaf-height of clear space. Use at 16 px or larger; the wordmark should remain readable rather than being squeezed into an icon.
- The wordmark uses the bundled Inter font at weight 650 with -0.05em tracking. The website keeps it as accessible text.

`shared/brand.mjs` owns the paths and colour. `components/BrandMark.jsx` and the shared document symbol serve the site; `web/brand.css` provides the lockup styling. `scripts/brand-assets.mjs`, also run by the normal build, produces the standalone orange, black and white SVG marks under `web/assets/brand/` and the transparent SVG favicon. Keep the React and downloaded versions generated from that source.

Deployed on 24 November 2026 as `20261124-logo-bdc612f`. See [the release record](releases/2026-11-24-logo.md).

Validation: production Next.js build passed; all nine branded routes contain exactly one shared symbol; all three SVG downloads return successfully. Visually checked the homepage, sign-in, dashboard, workspace, collapsed sidebar and reversed footer. The browser viewport override did not take effect, so a separate phone-width browser check remains to be done. The web container build includes the shared source and asset generator.

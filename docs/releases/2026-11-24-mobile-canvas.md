# 24 November 2026 mobile canvas release

Live application release: `20261124-mobile-2a8ca2a`.
Source: `2a8ca2ae325a47318ac1f829e1ed1948572f70b2` on
`codex/builder-guided-flow`, pushed before deployment.

Run and the adjacent canvas action buttons retain their natural width and
padding on phones. The action group wraps beneath the view tabs when there is
not enough room. The existing white theme and rounded controls are preserved.

Validation:

- Local production build passed. Browser layout checks at 320, 360, 390, 430,
  760 and 1280 px confirmed that Run and its action group fit without overflow.
- The previous release was compared with its recorded source archive.
- A fresh PostgreSQL backup was created and its archive listing verified.
- Server production build, Django system check and migration check passed.
- Backend, web, builder and publisher are healthy after activation.
- Eleven public routes and ten served assets were verified. The live toolbar
  stylesheet matches the committed source by SHA-256 and contains both mobile
  sizing rules. Existing branding and homepage composer checks also passed.

Production configuration and feature flags were preserved. No database
migrations, live AI requests, emails, orders or charges were made.

Private release, rollback and verification records are stored under
`/opt/draftmango/deploy-20261124-mobile-2a8ca2a/`. The prior release,
`20261124-logo-bdc612f`, and its images remain available for application rollback.

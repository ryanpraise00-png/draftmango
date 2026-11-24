# 24 November 2026 mobile workspace release

Live application release: `20261124-mobile-workspace-8ad6abb`.
Source: `8ad6abbbdbd4a19bdeb8109fe3e167164a4a5cbf` on
`codex/builder-guided-flow`, pushed before deployment.

The reviewed mobile workspace changes preserve the white theme and rounded
controls. Preview/editor controls have more room, diagnostic actions wrap,
preview and save messages occupy separate rows beside Undo/Redo, short empty
Split panels scroll, and the Publish address input has a full row on phones.

Validation:

- Local production build passed. Preview, Code, Split, diagnostics and the
  publishing layout were checked at 320, 360, 390, 430, 760 and 1280 px.
  Workspace dialogs, navigation and composer menus were reviewed at phone width.
  Publishing layout checks used isolated sample data with writes disabled.
- The previous release was compared with its recorded source archive.
- A fresh PostgreSQL backup was created and its archive listing verified.
- Server production build, Django system check and migration check passed.
- Backend, web, builder and publisher are healthy after activation.
- Eleven public routes and fourteen served assets were verified. All four
  changed stylesheets match the committed source by SHA-256 and include the
  reviewed mobile rules. Earlier toolbar, branding and homepage checks passed.

Production configuration and feature flags were preserved. No database
migrations, live AI requests, emails, orders or charges were made.

Private release, rollback and verification records are stored under
`/opt/draftmango/deploy-20261124-mobile-workspace-8ad6abb/`. The prior release,
`20261124-mobile-2a8ca2a`, and its images remain available for application rollback.

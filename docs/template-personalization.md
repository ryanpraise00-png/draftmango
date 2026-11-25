# Deterministic template personalization

The AI generation engine is removed. The shared template library remains available
to authenticated import and MCP integrations. Purchased source files are unchanged.

`server/template-engine/personalization.mjs` indexes literal text and selected JSX
attributes using stable field IDs. Its content-edit functions accept bounded text,
safe links, supplied image URLs and fixed colour overrides. They do not call any
model or provider. Layout, classes, routing, imports and runtime remain protected
by `design-policy.mjs` and the template lock.

Tests cover content changes, literal escaping, invalid IDs and URLs, atomic
failure, relevant-page selection, colour updates and compilation of all templates.
The old paid API test command has been removed.

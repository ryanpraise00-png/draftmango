# Shared template engine

Draftmango and Isotris use `server/template-engine/` and the same `web/template-catalog.json`, React starters and vendor assets. The purchased ThemeForest directory is a read-only reference and is not modified by this engine.

## Entry points

- Draftmango's browser calls authenticated `POST /api/templates/start` with `{brief, id?}`. The server chooses and loads a library template; the browser no longer assembles starter JSON itself. An unknown explicit id is an error, never a generated-layout fallback.
- `server/template-library.mjs` is a compatibility export of the engine. The AI generation path uses the engine's content-field editor from `server/template-edits.mjs`.
- `server/template-mcp.mjs` is a thin local stdio transport over the same engine. Isotris starts it from user settings. No separate template catalog or importer is maintained in Isotris.
- The catalogue is internal to the builder and MCP engine. Public gallery and template-selection pages are removed; old `/templates` URLs redirect to the homepage brief. The plan’s proposed design still renders in an isolated preview, without library navigation.

## Design preservation

`personalization.mjs` indexes literal copy and selected JSX attributes. Draftmango's model receives field IDs and values rather than an invitation to rewrite the component source. It can return content edits and three bounded colour overrides. Layout, classes, internal route/anchor links, runtime scripts, typography, sizing and all other source bytes stay intact.

`design-policy.mjs` fingerprints the source outside those editable fields. Its validator rejects new executable/design files, deleted protected files, arbitrary CSS, altered template identity, unsafe editable URLs and changed layout/runtime. It allows browser-tab titles and the fixed colour override block. This is deliberately strict: a whole-file formatter may change protected source and be rejected even if it looks similar.

New projects include `template.lock.json`: the template id, content-derived version, policy version, source hashes, design fingerprints and vendor asset byte hashes. AI edits preserve that lock. Draftmango checks a pinned project's design before spending a model request and again before accepting the result. Legacy projects with `TEMPLATE.md` still use the strict content editor; they are not silently replaced with today's library version.

The lock is provenance/design policy, not an authentication credential or a signature. Draftmango's editable project documents are user-controlled. Its actual AI capability boundary is the field-edit response contract; it never accepts a model-supplied replacement manifest or source files on the template path.

## Isotris boundary

The existing native adapter imports editable source through review/Accept/Undo, copies vendor assets outside file Undo, and records checksums. A trusted manifest copy is stored outside the project in the editor's data directory. Normal file and patch tools are checked before writing. Commands and completion are audited, including large CSS and binary fonts which aren't in the text snapshot. The validation tool is host-only in Isotris and not offered to its model as a way to replace the trusted policy.

Commands run with the editor user's permissions. Post-command checks detect a violation and stop the task for review; they are not an operating-system sandbox, and do not automatically overwrite concurrent human changes. A disconnected library fails closed for protected agent edits. Imported source can still be rejected/undone. An imported project moved to a different editor data profile needs a trusted import/rebinding workflow; copying a workspace lock alone does not confer trust.

The OpenCode fork is not available yet. It can use this MCP transport, but its host/plugin must implement import and validation hooks before claiming the same guarantees. `_meta["io.isotris/files"]` is an Isotris extension, not automatic file installation by generic MCP clients.

## Packages and assets

Draftmango keeps hosted asset URLs for its existing preview/publishing pipeline. Isotris exports local copies under `public/framo/assets/`, with source URLs rewritten deterministically. Their package identity is the same; the `assetMode` and exact source hashes describe the delivery difference. Site naming does not select a different library version.

The source and exported local assets are pinned to their package version. Hosted asset URLs are still shared paths; durable, content-addressed hosted asset storage is a follow-up before changing assets across production library releases. A lock/hash alone cannot prevent a remote URL's bytes from changing. The engine does not upgrade existing project source during follow-up edits.

The supplied demos contain placeholder photography and some dynamic image references whose original media is absent. Exports and browser imports report `missingAssets`; they do not invent missing images or treat demo checkout/forms/accounts as working integrations. Asset path resolution stays inside the library, follows CSS dependencies, and bounds transfer sizes. At most eight loaded packages are retained in memory.

Authenticated remote MCP and durable package delivery are now implemented behind explicit deployment flags; see [remote access and backend connection guide](remote-template-access.md). Product backends use independent credentials, without requiring their users to create Draftmango accounts. The engine was deployed on 22 November 2026; remote access remains disabled until client provisioning and activation. End-user entitlements, per-template licensing allocation, an OpenCode host plugin, immutable hosted-preview asset URLs, and a user-approved structural/backend extension workflow remain separate follow-ups. No production services or Isotris files were changed by the remote-access work.

## Validation

`npm run check` and `npm test` include the shared engine and MCP protocol checks. The new tests cover equivalent web/MCP packages, asset checksums, repeated content edits, rejected layout/runtime/route changes, JSX injection, corrupt saved locks, authenticated browser imports, and no client-side fallback. Existing template tests compile every catalog design. All model responses in these tests are local stubs; they use no API key or paid model requests.

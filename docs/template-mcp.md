# Template library over MCP

`server/template-mcp.mjs` exposes the builder's template library as a local MCP server (stdio, JSON-RPC 2.0), so other tools, such as the Isotris editor, can start sites from the same 100 Framo design families instead of generic generated layouts. It reuses the builder's own catalog (`web/template-catalog.json`), its template picker (`web/templates-model.js`) and the React starters in `web/framo/starters/`. It does not modify any of them.

```powershell
node server/template-mcp.mjs
```

The transport delegates to `server/template-engine/`. See [Shared engine contract](shared-template-engine.md) for design protection, version metadata and delivery limitations.

## Tools

| Tool | What it returns |
|---|---|
| `search_templates` | Templates that fit a brief. The first result is the builder's own pick (`recommended: true`); the rest are ranked alternatives. |
| `template_details` | One template's pages with their main headings, plus its `TEMPLATE.md` editing guide. |
| `validate_template_files` | Validates proposed source against a pinned manifest; the Isotris host calls this automatically and does not expose it as a model tool. |
| `get_template_files` | A complete React + Vite project. Editable source is in `structuredContent.files`, unchanged vendor text assets in `assetFiles`, and fonts and other binary assets (base64) in `binaryFiles`. |

`get_template_files` includes `template.lock.json` and a manifest with the package version and source/asset checksums. It copies available referenced assets locally; missing original demo media is reported in `missingAssets`:

- References to `https://draftmango.com/framo/assets/` are rewritten to `/framo/assets/`.
- Every referenced stylesheet, image and font is copied under `public/framo/assets/`, including assets that the CSS files themselves reference.
- `site_name` sets the page title.

The tool is marked `_meta["io.isotris/files"]`. Isotris uses that marker to write the files into the project, so the model receives only a summary and the file contents stay out of its context.

## Isotris

Isotris starts this server from its user settings (`xensiq.mcpServers`). Projects cannot start it. Its agent searches the library for new-site requests, imports a template into an empty folder and then personalises the content. Source files go through Isotris's review and Undo. Vendor assets are copied unchanged.

## Tests

```powershell
node --test tests/template-mcp.test.mjs
```

These tests cover search, details, a complete export, title escaping and the stdio protocol. `tests/template-engine.test.mjs` additionally checks browser/MCP parity, design rejection, asset checksums and authenticated browser imports.

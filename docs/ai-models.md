# AI engine removal

The AI engine was removed from the source on 25 November 2026. Provider clients,
model configuration, planning/generation, streaming and paid generation tools
are removed. Existing `/api/ai` routes return HTTP 410 (`builder_removed`).
Adding a provider key does not re-enable generation.

The workspace UI, source editor, compilation/preview, saved conversations,
version history, publishing and existing store management remain available.
Saved questions and plans are displayed read-only; existing store handoff controls
remain usable. No saved project or account data is deleted by this change.

The shared deterministic template engine and MCP access remain independent of
AI generation. See [shared-template-engine.md](shared-template-engine.md).
Private environment files have not been read, rewritten or revoked by this removal.
This source change does not deploy itself; production changes only on deployment.

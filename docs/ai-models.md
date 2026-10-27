# AI models

The model menu in the dashboard composer and the editor selects GPT-6 Luna,
GPT-6 Sol, Claude Sonnet 5.5 or Claude Opus 5.5 per conversation. A
provider-specific model configured in `.env` is also listed. Conversations
without a choice use `AI_PROVIDER` and its model setting.

Keep `OPENAI_API_KEY` for GPT and add `ANTHROPIC_API_KEY` for Claude in the
server `.env`. Keys coexist and stay on the server. Save the file, then refocus
the window to refresh the menu. A model marked "Add key" can be selected, but
generation stops with setup instructions until its key exists. Whether your
provider account can use a model is confirmed by a real request, not by the
menu.

The selection applies to both design planning and implementation. Switching
keeps files and conversation history; there is no automatic fallback to
another provider. Rate limits apply across all models. Claude supports the
same image, PDF and text references as GPT.

Provider settings (`AI_MAX_TOKENS`, `AI_TIMEOUT_SECONDS`, reasoning effort,
Grok via `AI_PROVIDER=xai`) are listed with comments in `.env.example`.

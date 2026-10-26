Draftmango — homepage, personal dashboard, and builder workspace

Run locally
  1. Open this folder in a terminal.
  2. First setup: npm run setup:accounts
  3. Run: npm run dev
  4. Open: http://127.0.0.1:4175

Node.js 20+ and Python 3.10+ are required. setup:accounts installs Django in .venv.
Marketing pages are static; accounts, projects and the builder need the local
Node + Django servers. See ACCOUNT-SETUP.txt for account and email configuration.

Files
  dist/index.html     Page structure, copy, and inline vector artwork
  dist/styles.css     Responsive visual design
  dist/app.js         Prompt ideas, filters, previews, colors, and navigation
  dist/auth.html      Sign-up, login, email confirmation and password reset
  dist/auth.css       Responsive account screen design
  dist/auth.js        Account views and preserved idea in the handoff URL
  dist/dashboard.html   Workspace home, project library, and settings
  dist/dashboard.css    Mango theme and responsive sidebar layout
  dist/dashboard.js     Project cards, search, rename, and local preferences
  dist/dashboard-model.js   Shared routes and validated preference storage
  dist/app-type.css    Shared readable typography across every Draftmango page
  dist/workspace.html The builder: Build, Design, History, preview, and code
  dist/workspace.css  Responsive workspace layout
  dist/workspace.js   Workspace interactions and account-backed project saving
  dist/workspace-ai.js   Streaming progress and complete-response handling
  dist/workspace-model.js   Project state, sample edit rules, and site rendering
  dist/workspace-code.js    Editable source files, HTML export, and source checks
  dist/workspace-assets.js  Embedded local images for portable HTML export
  dist/legal.html     Terms and Privacy placeholders awaiting final policies
  dist/legal.css      Legal page styling
  dist/assets/       Local photographs, font, and favicon
  serve.mjs          Local static server and same-origin AI API routes
  ai.mjs             Server-only provider configuration, generation and validation
  .env.example       Local key/model configuration template (copy to .env)
  tools/ai.test.mjs   API isolation, errors, cancellation and generation checks
  tools/workspace.test.mjs   Project history, storage, rendering, and edit checks
  tools/dashboard.test.mjs   Account handoff, project selection, and preferences

Try it
  Submit an idea on the homepage to open the sign-up/login screen.
  Template "Build with this style" also opens the account screen.
  The idea, starter, and color survive switching between account views.
  The account screen starts with email, followed by a password step.
  Sign up / Log in switches the flow; Edit returns to the email step.
  The account footer links to Terms of service and Privacy placeholders.
  Successful sign-in opens the incoming idea or the personal dashboard.
  Or open /dashboard.html to browse existing projects or create a new one.
  Add context and choose a starting layout or palette before creating.
  Project cards open their own saved conversation, design, and draft history.
  Search, sort, and rename your projects in Your projects.
  Settings saves a display name, default layout, palette, and preview size.
  Usage reflects actual local projects, drafts, and conversation messages.
  Data & privacy exports local project data and preferences as JSON.
  Connections shows AI configuration. Security offers password reset.
  Billing and CLI device pairing are not connected yet.
  CLI has no device pairing, installation, or commands in this preview.
  Open /workspace.html to resume the current local project directly.
  Start a new idea to generate a website with the configured AI. Ask for follow-up changes
  in Build; the selected provider receives the current HTML, CSS, JavaScript and recent chat.
  Questions can get a reply without changing the site. Stop cancels generation;
  Try again explicitly retries. Each applied edit creates a History version.
  Use Design for text, palette, type, layout, and section controls.
  Changes apply when a field is committed; Apply your changes also saves them.
  Preview at desktop, tablet, or mobile widths. Use History to revisit a draft.
  The builder has project navigation, a conversation panel, and a work canvas.
  Switch the canvas between Preview, Code, and Split. Navigation can collapse.
  Code includes editable index.html, styles.css, and app.js files with line
  numbers, syntax coloring, a file filter, and copy-file controls.
  Code drafts save on-device and sync to Django. Run or Ctrl/Cmd+S applies files to
  the preview and adds a version to History. Export also applies current edits.
  Tab indents code. Press Escape then Tab to leave the code editor by keyboard.
  Console displays messages and errors from the isolated preview. Checks runs
  basic HTML/link checks; it is not a complete compiler or test suite.
  To resume visual controls after code editing, choose Return to visual design.
  Both applied and pending code are preserved in History when doing so.
  Bundled coffee and ceramics assets are available at ./assets/coffee.jpg and
  ./assets/ceramics.jpg. Their data is embedded automatically on export.
  Preview JavaScript runs in a sandbox without parent storage, network fetches,
  external scripts, forms, or nested frames. HTTPS images/fonts/styles can load.
  CLI remains Coming soon. Projects save locally and sync to the account database.
  Export site downloads one HTML file with its styles and images embedded.
  Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo/redo when not editing a text field.
  Ctrl/Cmd+Enter submits the conversation input.

Checks
  npm run check
  npm test
  npm run test:accounts

Scope
AI generation and editing are connected through the local server.
The initial template remains visible until a complete AI response is validated.
Accounts and private project storage use Django on this computer. Checkout,
public cloud deployment, CLI and publishing are not connected.
Generated sites are static frontend projects; no backend code runs on your machine.
Sign-up, login, logout and password reset use Django. Passwords are hashed;
sessions use HTTP-only cookies. Social providers are hidden until integrated.
Reset emails are saved as local development files until SMTP is configured.
Email verification is optional locally and must be enabled before launch.
Draft projects, conversations and history sync to the private SQLite database,
with account-scoped working copies in browser storage for offline recovery.
File URLs and the HTTP preview may have separate browser storage.
If storage is unavailable or full, the workspace says "Unsaved session".
Exports remain available in that case. Keep an exported copy of work you value.
Example brands and websites are fictional concepts, not customer work.

Photography
  Coffee: https://images.unsplash.com/photo-1442512595331-e89e73853f31
  Ceramics: https://images.unsplash.com/photo-1578749556568-bc2c40e68b61

All app assets and starter assets are served locally. Custom code can reference
external images, fonts, and styles. Submitting a generation sends the prompt,
recent conversation and current website files to the selected provider through the local server.

OpenAI setup
  Copy .env.example to .env beside serve.mjs, then set AI_PROVIDER=openai
  and OPENAI_API_KEY. Keys stay separate from public website files.
  Never put .env or the API key inside dist. Do not commit or share .env.
  OPENAI_MODEL defaults to gpt-6-luna and can be changed to a model
  supported by your OpenAI account that supports JSON structured outputs.
  AI_MAX_TOKENS defaults to 32768 for GPT and Grok (16384 for Claude); supported local limit: 1024–32768.
  AI_TIMEOUT_SECONDS defaults to 900 (15 minutes); supported range: 60–1800.
  OPENAI_REASONING_EFFORT defaults to medium; none, low, high, xhigh and max are also supported by Luna.
  OpenAI and Grok stream their responses. The builder shows the phase and elapsed time;
  partial files are never applied. Cancel aborts the upstream request.
  Environment variables override .env. The server rereads .env per request.
  Run npm run dev, then open http://127.0.0.1:4175/dashboard.html.
  Click the AI status below the builder composer for setup details.
  "Ready" means a key is configured; successful generation verifies access.
  API usage is billed to your selected provider account. No automatic retries.
  A new idea generates once when the builder opens. Reloading a saved project
  does not automatically generate again. Saved pending ideas have a Make this
  idea real button. Old drafts remain available for AI edits in Build.
  Requests are limited to 2 MB, one active generation, 20 starts per 10 minutes,
  and the configured generation time limit. Failed or truncated responses never replace files.
  A lost browser connection cancels upstream work. The browser follows the
  server deadline and detects a lost progress connection after 90 seconds.
  Stop aborts the request; the provider may still bill work already processed.
  The server binds only to loopback and requires the exact local origin for POST.
  AI and domain requests require a verified Django session. Keep it local until
  deployment, per-user usage controls and billing enforcement are configured.
  API keys are never sent to the browser, generated source, exports or history.
  OpenAI uses https://api.openai.com/v1/responses with JSON schema structured outputs.
  store=false disables response retrieval storage. No web search or tools run.
  Existing drafts and history remain editable with OpenAI.
  Grok remains available with AI_PROVIDER=xai, XAI_API_KEY and XAI_MODEL.
  XAI_REASONING_EFFORT defaults to low. Its endpoint is https://api.x.ai/v1/responses.
  Claude remains available by selecting AI_PROVIDER=anthropic and configuring
  ANTHROPIC_API_KEY, ANTHROPIC_MODEL and optional ANTHROPIC_WORKSPACE_ID.
  Only the selected provider receives the current request and its own key.
  https://developers.openai.com/api/docs/models/gpt-6-luna
  https://docs.x.ai/developers/rest-api-reference/inference/responses
  https://docs.x.ai/developers/model-capabilities/text/best-practices

Domain sandbox interface
  Open /dashboard.html#domains or choose Domains in the dashboard/builder sidebar.
  Search accepts a name or .com, .co, .studio, or .design address. Results
  use Name.com sandbox availability and one-year quotes with a service markup.
  Review a domain, select a saved project, and save a local domain draft.
  Existing-domain connection previews create drafts without changing DNS.
  The Preview plan selector demonstrates Free / Basic / Pro eligibility only.
  It does not change a subscription. Registrar calls go through the local server.
  Drafts are stored separately under draftmango-domain-drafts-v1, and included
  in Settings > Data & privacy exports. No payment or contact details are stored.
  Purchases, verification, DNS provisioning and HTTPS remain pending.
  Sandbox prices and availability are test data, not live purchase offers.

Plans & pricing frontend
  Open /pricings (also available at /pricings.html). /pricing and trailing
  slashes redirect to /pricings. Monthly / Yearly updates both plan prices
  and order summaries. Basic: $15/month or $120/year. Pro: $39/month or
  $360/year. Credit allowances remain monthly on yearly billing.
  Plans are a launch preview: no checkout, billing or subscription is created.
  Paid-plan review carries the plan and cadence to signup without granting a subscription.
  Pricing is linked from the homepage navigation and dashboard Billing.
  dist/pricing-model.js holds prices; dist/pricings.js handles billing and
  plan selection. tools/pricing.test.mjs checks quotes, handoff and routing.


Name.com sandbox integration
----------------------------
Domain search now checks .com, .co, .studio and .design through the server at POST /api/domains/search. It first checks registration availability, then requests one-year registration and renewal pricing for each available name. Empty, unavailable, non-registration and unpriced results are never represented as purchasable offers. Prices expire after five minutes and are not saved in domain drafts.

Credentials stay in the project-root .env and reload on each request. This integration accepts only NAMECOM_ENVIRONMENT=sandbox and its separate Development/Test credentials; it never sends credentials to a production or client-supplied URL. Domain requests have same-origin checks, bounded input, rate limits, cancellation and a 25-second deadline. Public errors never include upstream bodies.

Provisional sandbox pricing: provider cost + max(20% of provider cost, $5). Configure DOMAIN_MARKUP_PERCENT and DOMAIN_MIN_FEE_CENTS (US cents) separately; either may be zero. The rule applies separately to registration and renewal. Retail totals include the service fee and exclude tax. Prices and availability in sandbox are not production quotes. This does not connect payment, registration, DNS changes or HTTPS provisioning.

Provider references:
https://docs.name.com/api/v1/reference/domains/check-availability
https://docs.name.com/api/v1/reference/domains/get-pricing-for-domain
https://docs.name.com/guides/testing-environment

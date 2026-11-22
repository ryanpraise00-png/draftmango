# Guided website builder

Status: local implementation, 22 November 2026. This change does not deploy the
site, provision generated-site backends, or modify Isotris.

## Conversation and build flow

1. A new workspace starts a requirements conversation. The model can ask up to
   three missing decisions at a time, each with suggested choices and a custom
   answer. Detailed requests may go straight to review. Submitted answers stay
   in the conversation; the active questions and plan are stored with the
   account's project.
2. The review identifies the offering, audience, goal, region, content, brand,
   selected library template, pages, user journeys, dependencies and assumptions.
   The user can revise it or select **Build this plan**. Required page sets are
   added by application code, including store account, cart, checkout, order
   confirmation and order-history requirements.
3. A confirmed build loads the same shared template package used by the library.
   It covers every editable field across the shared elements and inner pages in
   bounded batches. The model returns field changes, never replacement source.
   The original layout, routing, scripts and design fingerprints stay protected.
4. Actual progress events describe discovery, template selection, content passes,
   route checks and React compilation. Recent updates remain visible while
   running and are retained in the completed message's activity disclosure.
5. The composer Send control becomes Stop while running, including when the
   textarea is empty. Stop aborts the request; partial batches do not replace the
   saved project. Late results and intervening source/brief edits are rejected.
   Retrying restarts the operation from the saved state.
6. Source checks report unresolved internal destinations, placeholder or computed
   links, missing required pages, forms and connections. They distinguish source
   presence from functional verification. External links are not fetched. Source
   changes and history restores invalidate earlier checks.

Existing projects continue to use content editing. Older API consumers remain
compatible with the existing template-only creation contract. The new web
workspace explicitly sends its saved `builder` state and `builderAction` to
`POST /api/ai/generate`.

## What is not complete yet

The current engine personalises supplied templates. It cannot yet add missing
page implementations or wire template controls to a managed customer backend.
The checklist exposes those gaps; it does not repair them automatically or
certify an entire user journey. A successful React compile is not a successful
checkout, account creation or submission test.

Full-site completion requires the following next implementation, with the
architecture chosen by the product owner:

- **Draftmango-managed accounts and data per generated site.** Customer identities
  and sessions must be isolated by the immutable published-site ID and separate
  from the owner's Draftmango account. Resolve the tenant from the verified host
  or authenticated preview session; never accept a browser's arbitrary tenant ID.
- **Site-owner payment provider connections.** Store each connection on the owning
  site with server-only credentials. Platform subscription billing credentials
  must never process customer orders. Use provider-hosted/tokenised checkout;
  do not submit the purchased template's raw card fields to Draftmango.
- **Trusted workflow adapters and page extensions.** Supply account, reset,
  catalogue/cart/order, enquiry and booking behaviour through reviewed application
  code. Reuse template components and extend the design policy explicitly; do
  not let a model bypass the lock or invent a replacement design.
- **Preview and hosting access.** The current publisher serves static GET/HEAD
  assets. It needs an explicit tenant API boundary, origin/session protection and
  preview isolation before customer records or mutations can work. Template
  form markup and client-side validation are not backend integrations.
- **Verification before readiness.** Exercise navigation, empty/error states,
  signup/verification/login/reset, persisted data and the selected primary
  conversion. Test payments in the owner's provider test environment. Mark a
  journey verified only after its checks pass against the saved release.

Work on that backend is separate from Draftmango's own existing account and
billing services. These dependencies must remain visible until implemented and
connected; generated sites must not claim production readiness beforehand.

## Validation

`tests/builder-flow.test.mjs` covers the planning contract, complete template-field
coverage, design preservation, cancellation, navigation auditing, persistence and
stale checks. `tests/builder-ui.test.mjs` uses an isolated local server, headless
Chromium and mocked provider responses to exercise desktop/mobile questions,
custom input, review, cancellation, retry, reload and reduced motion. It neither
uses real API keys nor sends mail or processes payments.

Run `npm run check`, `npm run build`, and `npm test`. The browser tests require
Playwright Chromium. Full template builds now use multiple provider calls;
measure real latency and token cost before launch. They remain subject to the
existing per-account/site limits and request deadline. There is no resumable
background job yet, so an interrupted build restarts from its saved plan.

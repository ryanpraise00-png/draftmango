# Guided website builder

Status: deployed on 22 November 2026 in release `20261122-guided-f5c864f`.
The following store workflow is implemented separately; see [managed stores](stores.md).
Isotris is unchanged.

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

## Completion boundaries

The deployed guided-builder release personalises supplied templates and reports
missing routes and connections. The next store release adds a reviewed Fashion
Store 1 adapter with managed customers, inventory, checkout, orders and owner
screens. See [managed stores](stores.md) for its activation requirements and
validation. Other template families still report missing workflows; they are
never silently redesigned or replaced.

Customer services are tenant-scoped and separate from Draftmango platform
accounts. Store-owner payment connections are separate from subscription billing.
The publisher exposes an allowlisted customer API only on the published tenant;
preview iframes never inherit customer sessions. The builder cannot bypass design
fingerprints or invent operational code.

A successful compile and recognised routes do not certify a live shop. Real
catalogue data, shipping, policies, publishing and the owner's payment onboarding
remain visible setup requirements. Test the owner's payment environment and
journeys against the published release before calling it ready for customers.

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

## First managed store implementation

Confirmed Fashion Store 1 builds now attach a trusted, versioned React store
adapter after content personalisation. The completion report recognises its
account, cart, checkout, order and policy routes while retaining a setup gate for
real catalogue data, policies, publishing and owner payments. Other templates
are not redesigned or silently switched. See [stores](stores.md).

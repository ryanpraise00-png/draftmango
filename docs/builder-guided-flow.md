# Guided website builder

Status: deployed on 22 November 2026 in release `20261122-guided-f5c864f`.
The following store workflow is implemented separately; see [managed stores](stores.md).
Isotris is unchanged.

## Conversation and build flow

1. A new workspace starts a requirements conversation. The model asks one missing decision at a time, with suggested choices and a custom
   answer. Detailed requests may go straight to review. Submitted answers stay
   in the conversation; the active questions and plan are stored with the
   account's project.
2. The review identifies the offering, audience, goal, region, content, brand,
   selected library template, pages, user journeys, dependencies and assumptions.
   The user can revise it or select **Build it**. Required page sets are
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

## Builder-to-store handoff (implemented; awaiting deployment)

Store plans now carry structured, reviewable business, delivery and product facts.
Unknown values remain unknown: missing prices and stock are not invented, and
missing shipping/tax are not treated as confirmed zero. The current managed
workflow is physical goods on Fashion Store 1. Other selected designs and digital
goods keep their template and receive an explicit unsupported-workflow notice.

After a confirmed build is saved and synced, the browser prepares a draft store
against that exact project version. Django reads the saved plan, creates hidden
products with known prices and stock, and retains incomplete products for owner
review. Retrying never replaces an existing catalogue or settings. Currency must
be confirmed before products can be saved. No publication, account onboarding or
checkout activation occurs automatically.

The completed conversation links to products, settings and publishing, with live
setup status. Returning from owner management refreshes the preview catalogue.
The v2 adapter receives only catalogue display data from its parent editor; the
gateway validates the canonical template and exact reviewed adapter before allowing
this data bridge. A per-preview nonce and document-bound message port prevent
a later iframe navigation from receiving catalogue data. Manually modified source can compile but does not receive draft
catalogue data. The opaque iframe remains isolated and gets no account session, customer records or
payment credentials. Bag totals are a local preview, with unconfirmed shipping
and tax left blank. Accounts, enquiries and payments use the published store.
The immutable v1 adapter remains accepted for existing saved projects.

`tests/store-builder.test.mjs` covers facts, sync/version/account guards, catalogue
filtering and v1 compatibility. `stores.test_setup` covers atomic preparation,
retry behaviour, ownership, unknown facts and stale product reviews. The real
Django/publisher/Chromium test also covers draft creation, owner product review,
and an opaque preview with a working bag and no customer API calls. Provider and
mail fixtures remain isolated. Isotris and Bisuk are untouched.

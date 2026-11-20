# Template-based builder

New sites always start from the imported Framo React library, including requests from older clients asking for HTML. An explicit template selection is validated against the catalog; an unavailable selection fails without asking the model to invent a replacement.

For a template project, the model receives content fields identified by opaque IDs, page names, existing values and field roles. It does not receive writable source files. The server accepts text, supported links, existing or user-supplied image URLs, and the primary/background/text palette. It applies these edits only to parsed JSX string ranges and a fixed palette block. Layout, classes, routing, imports, dependencies and runtime are retained. Repeated brand text can be updated across all pages.

The supplied context is bounded to 500 fields and 90,000 characters, favouring the home page on creation and relevant pages on follow-up. Remaining pages stay intact. This is a constrained personalisation pass, not a promise that every sample page has been rewritten. Structural features that cannot be represented by those fields must produce an honest conversational reply. Users can still use the manual code editor. Existing non-template projects retain their legacy editing path.

## Validation

Automated tests cover the content contract, literal escaping, rejected source replacement, invalid IDs and URLs, atomic failure, cancellation, follow-up page selection, palette updates and compilation of every imported template. Purchased source files are never modified.

The opt-in command below makes at most three paid requests to Anthropic: a socks shop, an architecture studio, and a colour-only follow-up. It uses `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` from the root `.env` (or process environment), checks preservation of template files and content structure, and compiles each result. It exits before making requests when the key is missing.

```powershell
npm run test:templates:live
```

Results and local HTML previews are written under the ignored `data/template-api-tests/` directory. Credentials are not printed or saved with results. These tests validate the actual provider response and source preservation; they do not replace a visual review or verify that stock imagery and factual business details are appropriate.

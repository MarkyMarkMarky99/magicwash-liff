## Code Style Rules

- Keep logic simple and local by default.
- Validate untrusted inputs at public boundaries.
- Keep private functions and methods focused on already-validated inputs.
- Do not duplicate boundary validation inside private functions and methods.
- Extract shared logic when it is used in multiple places.
- Extract complex logic when it improves readability.
- Avoid helpers that only rename one obvious expression.
- Avoid abstractions that do not reduce duplication, complexity, or risk.
- Keep names explicit and domain-accurate.
- Keep functions focused on one responsibility.
- Preserve existing project style unless a change is necessary.

## Frontend Delegation

- Frontend implementation and fixes must be delegated to the project custom agent `frontend-designer`.
- Before changing code, inspect the existing UI and project conventions. Follow the existing design and preserve visual consistency; do not invent a new design when an established pattern already exists.
- Preserve business logic and API contracts unless they are explicitly in scope.
- Reuse shared UI components when doing so actually reduces duplication. Keep components simple and local.
- Maintain responsive and mobile layouts, accessibility, and English and Thai localization.
- Validate untrusted data only at public boundaries.
- Never revert another contributor's work, and honor explicit file ownership.
- Run targeted ESLint, the production build, and browser visual QA when available.
- Do not commit or push unless explicitly instructed.
- The primary agent reviews the delegated agent's diff and verification. If review fails, it sends the work back to the same spawned `frontend-designer` agent for correction instead of editing application code directly.

## Open Suggestions

Review notes parked for later consideration. **These are suggestions, not work orders — do not act on them unless asked.**

- `quoteGvizString` in `api/_gviz.js` quotes filter values with `JSON.stringify`. GViz's query language has no backslash escape, so a value containing `"` would produce a malformed query (a 502, not an injection — it fails at parse). Every value sent today is an ID (`CUS-*`, `ORD-*`, `INV-*`), so nothing hits this. If it ever needs hardening, skip the GViz push-down when the value contains a quote and let the JS filter in `api/gviz.js` handle it alone.
- `addEqualityFilter` in `api/_gviz.js` emits no space before a following clause (`... = "INV-001"ORDER BY A`). Only reachable by passing a hand-written `tq`, which no caller does.
- The live-header cache in `api/_gviz.js` has a 5-minute TTL. If someone inserts a sheet column, the cached column letter goes stale and the pushed-down filter can return nothing for up to 5 minutes. This fails closed — the JS filter still resolves fields by live header, so stale letters can only yield empty results, never wrong rows. A retry that clears the cache when a filtered query comes back empty would close the window.
- `?dev=invoice` builds its mock row during render (`getDevInvoiceViewRow` in `src/App.jsx`), so `mockRow` is a fresh object each time and re-triggers the effect and `useCallback` in `InvoicePreview`. The effect early-returns for mock rows, so there is no side effect — dev-only churn.

# Handoff — customer slip upload & payment verification

**Author:** Claude Opus 5 (`claude-opus-5`), via Claude Code
**Date:** 2026-07-29
**Branch:** `feature/upload-slip-payment-verification` (pushed, `fe7d5aa`)
**Session:** `38aaa679-80d9-4e77-99c9-f87753758023` · https://claude.ai/code/session_01AcUoJPzFyhCKbFBRKQUnm4

If this document leaves you short of context, resume the original session and ask — it holds the
full reasoning, every live test output, and the decisions behind each trade-off:

```bash
claude --resume 38aaa679-80d9-4e77-99c9-f87753758023 --model haiku
```

---

## What this feature does

A customer opens an invoice in the LINE LIFF app, taps pay, scans the QR, transfers money in their
banking app, comes back, and attaches the slip. The server stores the image, asks SlipOK to verify
it, and appends a row to the `Payments` Google Sheet. **Bank transfer is the only payment method
this app handles**; other methods are recorded in a different application.

The customer **never types an amount** — it is read from the slip.

```
browser (WebP, base64)
   └─> POST /api/verify-slip
         ├─ server/uploadSlip.js    → Firebase Storage      → url + path
         ├─ server/verifySlip.js    → SlipOK                → typed outcome + normalized slip
         └─ server/recordPayment.js → Apps Script gateway   → one Payments row
```

## Files

| Path | Role |
|---|---|
| `api/verify-slip.js` | The route. Orchestration and the HTTP contract. |
| `server/uploadSlip.js` | Validates base64 (magic bytes, 1 MB cap) and stores it. Never throws. |
| `server/verifySlip.js` | SlipOK client. Dispatches on numeric provider code. Never throws. Owns extracting meaning from the provider payload. |
| `server/recordPayment.js` | Writes one row. Deliberately ignorant of any provider's shape. Never throws. |
| `server/firebaseAdmin.js` | Shared Firebase bootstrap; `uploadSlip` imports it. |
| `src/services/slipUpload.js` | Browser side: canvas preprocessing + the fetch. No React. |
| `src/components/invoice/PaymentPopup.jsx` | Presentation only. Props in, JSX out. |
| `src/pages/InvoicePreview.jsx` | Owns all popup state and handlers. |

**Layering is a project rule**: behaviour in `src/services/`, orchestration in `src/pages/`,
`src/components/` renders and nothing else. A previous iteration put the fetch inside the component
and had to be redone.

## Rules that look arbitrary but are not

Each of these was decided for a reason. Do not "simplify" one without reading why.

1. **Always record.** Once the image is stored, a row is written for every submission, whatever
   verification said. Verification failure decides `status` / `amount` / `notes`, never whether a
   row exists — a slip a machine cannot read may still be a real transfer.
2. **A write that is not `confirmed` is reported to the customer as a failure**, including the
   ambiguous `writeOutcome: 'unknown'`. Fail-closed on purpose: with no row, the shop cannot learn
   that money arrived or where the evidence is. Telling the customer to contact staff is always
   recoverable; the opposite mistake is not.
3. **Never offer a retry after `RECORD_FAILED`.** The money may already be recorded. Retry is
   offered only for `BAD_REQUEST` / `UNSUPPORTED_TYPE` / `FILE_TOO_LARGE`, where nothing was written.
4. **The popup cannot be dismissed while a submission is in flight** — header X, backdrop and
   Escape are all inert. There is no server-side idempotency; a double submit leaves a duplicate
   row for an admin to delete by hand.
5. **`slip_data` stores the provider payload verbatim**, never allow-listed or reshaped.
   `recordPayment` must never inspect it. Today's provider may be replaced tomorrow.
6. **`amount` is omitted from the wire row when unknown**, not sent as `null`. The live sheet schema
   types it as `"number"` and only dropped it from `required`; an absent key writes the blank cell
   an admin fills in later.
7. **An invoice has many payments.** Instalments are separate rows; a refund is a new row with a
   negative amount, never an edit. Nothing may require `amount` to equal an invoice total.
8. **`proofUrl`, `paymentId` and the provider reason code never reach the customer.** A Firebase
   download URL is a bearer capability and the slip shows a name and a masked account number.
9. **Every user-facing string is an i18n key** in both `en.json` and `th.json`. A key in one file
   only is a defect.

## What the provider's own documentation gets wrong

`SlipOK API Guide v1.13` overstates what is guaranteed, in both directions. Four real captured
responses disagree with it:

- `data.success` and `data.message` are documented as mandatory and are **absent entirely** in code
  1012 responses.
- A party's `name` is sometimes `null`; only `displayName` is dependable, and it may be Thai or English.
- `countryCode` is sometimes `null`, sometimes `"TH"`. `ref1`/`ref2` are sometimes `""`, sometimes `null`.
- `paidLocalCurrency` is sometimes missing entirely. `rqUID` has never appeared.
- `transTimestamp` is documented as present in examples that omit it — and appeared **twice in one
  raw body**.

Only `transRef`, `amount`, `transDate`, `transTime`, the two bank codes and the two party objects
have ever been dependable. **The client was shipped twice with a passing test suite and broke on
first contact with the live API both times, for exactly this reason.** If you add a field
requirement, you are probably re-introducing that bug.

## Verified against live services

Not mocks. Real Firebase, real SlipOK, real sheet:

- Upload round-trips **byte-identical**; the returned URL is fetchable without credentials.
- SlipOK classified correctly: a real success, `1012` duplicate, `1014` receiver mismatch.
- Rows appended **and** updated in the live `Payments` sheet.
- Client-side WebP is safe for the QR: two slips from different banks still decoded at 600px /
  quality 0.6. The UI uses **1080px longest edge, quality 0.9**, which lands near 100 KB.

## Gotchas that will cost you an hour

- **`.env.local` contains placeholders.** `SLIPOK_API_KEY`, `SLIPOK_ENDPOINT_URL` and
  `APPSCRIPT_INVOICE_URL` are all fake there. The real values live in
  `.vercel/.env.preview.local`, and the gateway variable is named **`APPSCRIPT_GATEWAY_URL`**.
- **Use `vercel dev`, not `npm run dev`.** `/api/*` are serverless functions; Vite alone serves 404.
- **The gateway is flaky.** Observed timing out past 20 s and returning a spurious 404 *while the
  row was in fact written*. That is why `writeOutcome: 'unknown'` exists. `vercel.json` pins the
  route to 30 s; the default 10 s would kill it mid-write.
- **`Payment` and `Invoice` cannot be read through the gateway.** Their spreadsheet is not publicly
  readable, so GViz returns a sign-in HTML page and the reader fails with
  `Expected property name or '}' in JSON at position 1`. Writes work fine. Reads of `invoiceView`
  go through the portal spreadsheet and are unaffected.
- **Each slip can only be verified once.** `log: true` makes SlipOK remember it, so any resend
  returns `1012`. **Always capture the raw response with a bare `fetch` before sending a new slip
  through the client** — a real success envelope was lost this way and could not be recovered.
- **Test rows are in the live sheet** (roughly rows 2–14, `INV-PROBE-TEST`, `PAY-PROBE-*`,
  `pay_*`). Gateway `DELETE` is a soft delete; removing them for real means editing the sheet.

## Not done

- **Never run in a browser.** Every part was verified by calling the API directly. Nobody has
  clicked the button.
- No auth, no rate limiting, and no check that `invoiceNumber` exists — all three deferred
  deliberately, to be done together with real auth.
- If `APPSCRIPT_GATEWAY_URL` is missing, or `slip_data` exceeds 50,000 characters, the image is
  stored but no row is written. Narrow gaps in rule 1 above.
- The three modules' test suites (602 + 182 + 52 cases) lived in scratch workspaces that were
  deleted. They were salvaged to this session's scratchpad under `salvaged-tests/`, together with
  `live-captures.md` — the four real provider responses, which **cannot be recaptured**. This
  project has no test runner of its own.

## Commands

```bash
vercel dev          # required for /api
npm run build
npx eslint src/ server/ api/     # 12 pre-existing errors in unrelated files
```

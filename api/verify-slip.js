/**
 * Vercel Serverless Function — bank-transfer slip upload + verification + payment record
 *
 * The seam that ties three server-only modules together for the "attach a slip"
 * flow. Bank transfer is the only payment method this app handles: the customer
 * transfers money, attaches a slip, and that is the entire interaction.
 *
 *   1. ../server/uploadSlip.js    — stores the image in Firebase Storage
 *   2. ../server/verifySlip.js    — SlipOK verification (never throws)
 *   3. ../server/recordPayment.js — appends a row to the Payment sheet (never throws)
 *
 * Governing rule: once the image is stored, a row must be written for every
 * submission, whatever verification said. Verification failure decides
 * `status`/`amount`/`notes` on the row — never whether a row exists. The only
 * case with no row at all is a failure *before* storage (bad body or failed
 * upload).
 *
 * Deliberately NOT done here (deferred decisions, not oversights):
 *   - No check that `invoiceNumber` actually exists — this route only records
 *     what the customer submitted; invoice reconciliation happens elsewhere.
 *   - No rate limiting / auth — LIFF session trust boundary is handled upstream;
 *     adding a limiter here is a separate piece of work.
 *
 * POST /api/verify-slip
 * Body: {
 *   invoiceNumber: string,
 *   balanceDue: number|null,   // advisory only, forgeable, never a correctness gate
 *   proofFile: string,         // base64, data URL prefix already stripped
 *   proofFilename: string,
 *   proofContentType: string,
 * }
 */
import { randomUUID } from 'node:crypto';
import { uploadSlip } from '../server/uploadSlip.js';
import { createSlipOkClient } from '../server/verifySlip.js';
import { createPaymentRecorder } from '../server/recordPayment.js';

// ---------------------------------------------------------------------------
// Timeout budget
//
// The whole request runs inside one serverless invocation. The route's
// maxDuration is 60s, so the explicit downstream budgets below total 37s and
// leave ample room for upload completion, response parsing, and formatting:
//   - SlipOK verification:  7s.  It's a single OCR+bank-lookup round trip;
//     if it hasn't answered in 7s the bank-delay/timeout path already exists
//     and a slower answer wouldn't change what we can safely tell the customer.
//   - Payment record write: 15s. This is the slow, flaky leg (the live gateway
//     has been observed both timing out past 20s and returning a spurious 404
//     after the row was in fact written) — it gets the largest share because
//     losing this write is the one outcome we must avoid.
//   - InvoiceView sync: 15s. Best-effort, but NOT a token budget: at 5s this
//     silently lost roughly half of all syncs. The endpoint was measured at
//     4.0-5.0s across repeated live calls, so a 5s ceiling sat right on the
//     median and every timeout left InvoicesView stale while the customer saw
//     a successful payment. The Apps Script side has since dropped its
//     whole-sheet OrdersView rebuild (see InvoiceViewSync.js), which should
//     bring this well under 2s — 15s is headroom for the tail, not the
//     expected cost, and it still cannot consume the route's whole budget.
//   - The remainder covers upload (already happened before either timeout
//     starts) plus JSON/formatting overhead. Firebase upload of a <=1MB image
//     is not timeout-bounded here because uploadSlip() doesn't accept one; in
//     practice it resolves in well under a second for this payload size.
// ---------------------------------------------------------------------------
const VERIFY_TIMEOUT_MS = 7_000;
const RECORD_TIMEOUT_MS = 15_000;
const INVOICE_VIEW_SYNC_TIMEOUT_MS = 15_000;

const RECORD_CREATED_BY = 'liff-verify-slip';

function logInvoiceViewSyncFailure(reason, status) {
  try {
    const details = status === undefined ? { reason } : { reason, status };
    console.warn('[verify-slip] InvoiceView sync did not complete.', details);
  } catch {
    // Observability must never affect the payment result.
  }
}

/**
 * Refresh the invoice read model after the payment row is confirmed.
 *
 * This is deliberately best-effort. The payment row is the source of truth
 * for this route, and a slow or unavailable read-model sync must not change
 * the response already earned by the customer.
 */
async function syncInvoiceView(invoiceNumber) {
  try {
    const configuredUrl = process.env.APPSCRIPT_INVOICE_VIEW_SYNC_URL;
    if (typeof configuredUrl !== 'string' || configuredUrl.trim().length === 0) {
      logInvoiceViewSyncFailure('missing_config');
      return false;
    }

    let endpointUrl;
    try {
      endpointUrl = new URL(configuredUrl);
    } catch {
      logInvoiceViewSyncFailure('invalid_config');
      return false;
    }
    if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
      logInvoiceViewSyncFailure('invalid_config');
      return false;
    }

    if (typeof globalThis.fetch !== 'function' || typeof globalThis.AbortController !== 'function') {
      logInvoiceViewSyncFailure('runtime_unavailable');
      return false;
    }

    const controller = new globalThis.AbortController();
    let timeoutHandle;
    let resolveTimeout;
    const timeoutPromise = new Promise((resolve) => {
      resolveTimeout = resolve;
      timeoutHandle = setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // The timeout result is still authoritative for this best-effort call.
        }
        resolveTimeout({ kind: 'timeout' });
      }, INVOICE_VIEW_SYNC_TIMEOUT_MS);
    });

    const fetchPromise = Promise.resolve()
      .then(() => globalThis.fetch(configuredUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoiceNumber }),
        signal: controller.signal,
      }))
      .then(async (response) => {
        let status;
        let ok;
        let body;
        try {
          status = response?.status;
          ok = response?.ok;
          if (!Number.isInteger(status) || status < 100 || status > 599 || typeof ok !== 'boolean') {
            return { kind: 'invalid_response' };
          }
          if (typeof response.json !== 'function') {
            return { kind: 'invalid_response' };
          }
          body = await response.json();
        } catch {
          return { kind: 'invalid_response' };
        }
        return { kind: 'response', status, ok, body };
      })
      .catch(() => ({ kind: 'network_failure' }));

    let result;
    try {
      result = await Promise.race([fetchPromise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (result.kind === 'timeout') {
      logInvoiceViewSyncFailure('timeout');
      return false;
    }
    if (result.kind === 'network_failure') {
      logInvoiceViewSyncFailure('network_failure');
      return false;
    }
    if (result.kind === 'invalid_response') {
      logInvoiceViewSyncFailure('invalid_response');
      return false;
    }

    let bodyAccepted = false;
    try {
      bodyAccepted = result.body?.ok === true;
    } catch {
      bodyAccepted = false;
    }
    if (!result.ok) {
      logInvoiceViewSyncFailure('rejected_http', result.status);
      return false;
    } else if (!bodyAccepted) {
      logInvoiceViewSyncFailure('rejected_body', result.status);
      return false;
    }
    return true;
  } catch {
    logInvoiceViewSyncFailure('unexpected_failure');
    return false;
  }
}

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Used when the verification outcome carries no slip at all. Reading meaning
 * out of a provider payload belongs to server/verifySlip.js, which attaches a
 * normalized `slip` to every outcome that has one — this route must never
 * reach into the raw provider `data` itself.
 */
const EMPTY_SLIP = Object.freeze({
  amount: null,
  paidAt: null,
  reference: null,
  senderName: null,
  receiverName: null,
  sendingBankCode: null,
  receivingBankCode: null,
});

/** Derive the SlipOK branch id from the last path segment of the endpoint URL. */
function branchIdFromEndpointUrl(endpointUrl) {
  try {
    const parsed = new URL(endpointUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    return isNonEmptyString(last) ? last : null;
  } catch {
    return null;
  }
}

function badRequest(res) {
  return res.status(400).json({
    ok: false,
    error: 'BAD_REQUEST',
    messageKey: 'invoice.slip.error.badRequest',
    reasonCode: null,
  });
}

// ---------------------------------------------------------------------------
// Verification outcome classification
//
// server/verifySlip.js's `client.verify()` result is a discriminated union on
// `kind`. Only `success`, `duplicate_slip` (1012), `amount_mismatch` (1013),
// and `receiver_mismatch` (1014) carry a `data: SlipData`. Every other kind —
// invalid_input, timeout, network_failure, runtime_failure, body_read_failure,
// non_json_response, unexpected_response, unknown_api_error, and the coded
// SlipOK API errors 1000-1011/1015 — carries no slip data at all.
// ---------------------------------------------------------------------------

const REASONED_FAILURE_KINDS = {
  duplicate_slip: 'SLIP_DUPLICATE',
  amount_mismatch: 'SLIP_AMOUNT_MISMATCH',
  receiver_mismatch: 'SLIP_RECEIVER_MISMATCH',
};

/**
 * @returns {{
 *   bucket: 'verified'|'reasoned'|'unreadable',
 *   slip: typeof EMPTY_SLIP,
 *   marker: string,
 *   errorCode: string|null,
 *   reasonCode: string|null,
 *   httpStatus: number,
 *   slipOkChecksUsed: boolean,
 * }}
 */
function classifyVerification(outcome) {
  if (outcome.kind === 'success') {
    return {
      bucket: 'verified',
      slip: outcome.slip ?? EMPTY_SLIP,
      marker: null,
      errorCode: null,
      reasonCode: null,
      httpStatus: 200,
      slipOkChecksUsed: true,
    };
  }

  if (Object.prototype.hasOwnProperty.call(REASONED_FAILURE_KINDS, outcome.kind)) {
    const code = String(outcome.code);
    return {
      bucket: 'reasoned',
      slip: outcome.slip ?? EMPTY_SLIP,
      marker: `SLIPOK_${code}`,
      errorCode: REASONED_FAILURE_KINDS[outcome.kind],
      reasonCode: code,
      httpStatus: outcome.status ?? 0,
      slipOkChecksUsed: true,
    };
  }

  // Every other kind: no slip data. `code` is present for coded SlipOK API
  // errors (1000-1011, 1015); transport/runtime kinds have none.
  const marker = typeof outcome.code === 'number' ? `SLIPOK_${outcome.code}` : `SLIPOK_${String(outcome.kind).toUpperCase()}`;
  const slipOkChecksUsed = typeof outcome.code === 'number'; // reached the API at all
  return {
    bucket: 'unreadable',
    slip: EMPTY_SLIP,
    marker,
    errorCode: null,
    reasonCode: typeof outcome.code === 'number' ? String(outcome.code) : null,
    httpStatus: outcome.status ?? 0,
    slipOkChecksUsed,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED', messageKey: 'invoice.slip.error.methodNotAllowed', reasonCode: null });
    }

    const body = req.body ?? {};
    if (typeof body !== 'object' || body === null) {
      return badRequest(res);
    }

    const { invoiceNumber, balanceDue, proofFile, proofFilename, proofContentType } = body;

    if (!isNonEmptyString(invoiceNumber)) {
      return badRequest(res);
    }
    if (balanceDue !== null && balanceDue !== undefined && typeof balanceDue !== 'number') {
      return badRequest(res);
    }
    if (!isNonEmptyString(proofFile) || !isNonEmptyString(proofFilename) || !isNonEmptyString(proofContentType)) {
      return badRequest(res);
    }

    // -----------------------------------------------------------------
    // Step 1: store the image. Nothing downstream matters if this fails —
    // per the governing rule, a failed upload is the only failure mode
    // (besides a bad request) that writes no row at all.
    // -----------------------------------------------------------------
    const uploadResult = await uploadSlip({
      base64: proofFile,
      filename: proofFilename,
      contentType: proofContentType,
    });

    if (!uploadResult.ok) {
      const statusByCode = {
        BAD_INPUT: 400,
        UNSUPPORTED_TYPE: 415,
        TOO_LARGE: 413,
        UPLOAD_FAILED: 502,
      };
      const errorByCode = {
        BAD_INPUT: 'BAD_REQUEST',
        UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
        TOO_LARGE: 'FILE_TOO_LARGE',
        UPLOAD_FAILED: 'UPLOAD_FAILED',
      };
      const messageKeyByCode = {
        BAD_INPUT: 'invoice.slip.error.badRequest',
        UNSUPPORTED_TYPE: 'invoice.slip.error.unsupportedType',
        TOO_LARGE: 'invoice.slip.error.fileTooLarge',
        UPLOAD_FAILED: 'invoice.slip.error.uploadFailed',
      };
      const status = statusByCode[uploadResult.code] ?? 502;
      return res.status(status).json({
        ok: false,
        error: errorByCode[uploadResult.code] ?? 'UPLOAD_FAILED',
        messageKey: messageKeyByCode[uploadResult.code] ?? 'invoice.slip.error.uploadFailed',
        reasonCode: null,
      });
    }

    const paymentId = `pay_${randomUUID()}`;

    // -----------------------------------------------------------------
    // Step 2: verify with SlipOK. Never throws; every branch below is a
    // real `kind` value read out of server/verifySlip.js, not invented.
    // -----------------------------------------------------------------
    const branchId = branchIdFromEndpointUrl(process.env.SLIPOK_ENDPOINT_URL ?? '');
    const clientResult = branchId
      ? createSlipOkClient({
          branchId,
          apiKey: process.env.SLIPOK_API_KEY,
          timeoutMs: VERIFY_TIMEOUT_MS,
        })
      : { kind: 'invalid_client_configuration', field: 'branchId', message: 'SLIPOK_ENDPOINT_URL is not configured.' };

    let verification;
    if (clientResult.kind !== 'success') {
      // Verification apparatus itself is misconfigured. This is not the
      // customer's fault and not a reason to lose the slip: treat exactly
      // like an unreadable verification result.
      verification = {
        bucket: 'unreadable',
        slip: EMPTY_SLIP,
        marker: 'SLIPOK_CLIENT_CONFIG_ERROR',
        errorCode: null,
        reasonCode: null,
        httpStatus: 0,
        slipOkChecksUsed: false,
        rawOutcome: { kind: 'invalid_client_configuration', field: clientResult.field },
      };
    } else {
      const outcome = await clientResult.client.verify({ files: proofFile, log: true });
      verification = { ...classifyVerification(outcome), rawOutcome: outcome };
    }

    const { bucket, slip, marker, errorCode, reasonCode, httpStatus, slipOkChecksUsed, rawOutcome } = verification;
    const verified = bucket === 'verified';

    // -----------------------------------------------------------------
    // Step 3: record the payment — this must happen no matter what
    // verification said, per the governing "always record" rule.
    // -----------------------------------------------------------------
    const recorderResult = createPaymentRecorder({
      gatewayUrl: process.env.APPSCRIPT_GATEWAY_URL,
      createdBy: RECORD_CREATED_BY,
      timeoutMs: RECORD_TIMEOUT_MS,
    });

    if (recorderResult.kind !== 'ready') {
      // Recorder is misconfigured server-side — a definite failure, not an
      // "unknown" one; nothing was dispatched.
      return res.status(502).json({
        ok: false,
        error: 'RECORD_FAILED',
        messageKey: 'invoice.slip.error.recordFailed',
        reasonCode: null,
        recovery: { paymentId },
      });
    }

    const recordInput = {
      paymentId,
      invoice: {
        invoiceNumber,
        balanceDue: balanceDue ?? null,
        currency: 'THB',
      },
      amount: verified || bucket === 'reasoned' ? slip.amount : null,
      paidAt: slip.paidAt,
      reference: slip.reference,
      status: verified ? 'VERIFIED' : 'PENDING',
      notes: verified ? null : marker,
      authority: {
        source: 'trusted_server',
        acceptedSlipAmountCurrency: 'THB',
        slipOkAmountCheckUsed: slipOkChecksUsed,
        slipOkReceiverCheckUsed: slipOkChecksUsed,
        slipOkDuplicateCheckUsed: slipOkChecksUsed,
      },
      verification: {
        httpStatus,
        response: rawOutcome,
      },
      method: 'BANK_TRANSFER',
      proofUrl: uploadResult.url,
    };

    const recordResult = await recorderResult.recorder.record(recordInput);
    const writeOutcome = recordResult.writeOutcome;

    if (writeOutcome !== 'confirmed') {
      // Anything short of a confirmed row is reported to the customer as a
      // failure, and this is deliberately fail-closed.
      //
      // 'unknown' means the gateway may or may not have written the row (it has
      // been observed both timing out past 20s and returning a spurious 404
      // after writing). We cannot tell the two apart from here, so we assume the
      // worse one. If no row exists, the shop has no way to learn that money
      // arrived or where the evidence is — the payment is simply lost. Telling
      // the customer to contact staff is always recoverable: staff can look the
      // invoice up and find the row if it did land. The opposite mistake is not.
      //
      // 'not_sent' covers validation_error / slip_data_too_large /
      // internal_error_before_dispatch — rejected before ever leaving here.
      //
      // The customer-facing message must tell them to contact staff directly,
      // NOT to retry: a retry re-sends money that may already be on file, and
      // the slip is already logged with the provider, so a second verification
      // of the same slip comes back as a duplicate.
      return res.status(502).json({
        ok: false,
        error: 'RECORD_FAILED',
        messageKey: 'invoice.slip.error.recordFailed',
        reasonCode,
        recovery: { paymentId, outcomeUnknown: writeOutcome === 'unknown' },
      });
    }

    // Row confirmed written.
    const invoiceViewSynced = await syncInvoiceView(invoiceNumber);

    if (verified) {
      return res.status(200).json({
        ok: true,
        status: 'VERIFIED',
        paymentId,
        invoiceNumber,
        amount: slip.amount,
        paidAt: slip.paidAt,
        reference: slip.reference,
        messageKey: 'invoice.slip.verified',
        reasonCode: null,
        invoiceViewSynced,
      });
    }

    if (bucket === 'reasoned') {
      // Provider actively flagged this slip (duplicate / amount / receiver
      // mismatch). The row is on file as PENDING for an admin, but the
      // customer is told something needs a second look.
      return res.status(200).json({
        ok: false,
        error: errorCode,
        messageKey: `invoice.slip.error.${errorCode === 'SLIP_DUPLICATE' ? 'duplicate' : errorCode === 'SLIP_RECEIVER_MISMATCH' ? 'receiverMismatch' : 'amountMismatch'}`,
        reasonCode,
        recovery: { paymentId },
        invoiceViewSynced,
      });
    }

    // Unreadable: a real transfer may still be behind this slip; row is on
    // file as PENDING with a null amount for an admin to fill in.
    return res.status(200).json({
      ok: true,
      status: 'PENDING',
      paymentId,
      invoiceNumber,
      amount: null,
      paidAt: null,
      reference: null,
      messageKey: 'invoice.slip.pending',
      reasonCode,
      invoiceViewSynced,
    });
  } catch {
    // The route itself must never throw.
    return res.status(500).json({
      ok: false,
      error: 'INTERNAL_ERROR',
      messageKey: 'invoice.slip.error.internal',
      reasonCode: null,
    });
  }
}

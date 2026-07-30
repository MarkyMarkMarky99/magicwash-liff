/**
 * Pure, non-React helpers for the "attach a payment slip" flow.
 *
 * Two responsibilities, kept out of any component:
 *   - preprocessSlipImage: turn a picked File into base64 + filename +
 *     contentType, scaled/re-encoded for upload.
 *   - submitSlip: POST that payload to /api/verify-slip and normalize
 *     whatever comes back — success, a provider-reasoned failure, or a
 *     network/parsing failure that never reached the server — into one
 *     shape the UI can render without knowing the wire format.
 *
 * Bank transfer is the only payment method this app takes: the customer
 * transfers money in their own banking app, then attaches the slip here.
 * The amount is read from the slip server-side — this module never lets
 * the caller supply one.
 */

// ---------------------------------------------------------------------------
// Image preprocessing
//
// Longest edge <= 1080px (never upscaled), re-encoded as WebP at quality 0.9.
// Measured, not guessed: two real slips from different banks were re-encoded
// down to 600px at quality 0.6 and the QR code SlipOK depends on still
// decoded, so 1080px/0.9 sits far inside what works while landing well under
// the server's 1MB cap.
// ---------------------------------------------------------------------------

const MAX_EDGE_PX = 1080;
const MAX_BYTES = 1_000_000;
const WEBP_QUALITY = 0.9;
const FILE_TOO_LARGE_MESSAGE_KEY = 'invoice.slip.error.fileTooLarge';
const BAD_REQUEST_MESSAGE_KEY = 'invoice.slip.error.badRequest';

function createLocalErrorOutcome(messageKey) {
  return {
    tone: 'error',
    messageKey,
    amount: null,
    paidAt: null,
    retryable: true,
    invoiceViewSynced: false,
  };
}

function createLocalFileTooLargeOutcome() {
  return createLocalErrorOutcome(FILE_TOO_LARGE_MESSAGE_KEY);
}

function createLocalBadRequestOutcome() {
  return createLocalErrorOutcome(BAD_REQUEST_MESSAGE_KEY);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_decode_failed'));
    img.src = src;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read_failed'));
    reader.readAsDataURL(blob);
  });
}

async function fallbackToOriginal(file) {
  const contentType = typeof file?.type === 'string' ? file.type : '';
  const size = file?.size;
  if (typeof size !== 'number' || !Number.isFinite(size) || size < 0 || size > MAX_BYTES) {
    throw createLocalFileTooLargeOutcome();
  }

  try {
    const base64 = await blobToBase64(file);
    return {
      base64,
      filename: typeof file?.name === 'string' && file.name ? file.name : 'slip',
      contentType: contentType || 'application/octet-stream',
    };
  } catch {
    throw createLocalBadRequestOutcome();
  }
}

/**
 * Scales `file` down (never up) so its longest edge is at most MAX_EDGE_PX,
 * re-encodes as WebP at WEBP_QUALITY, and returns it as base64. Falls back
 * to the original file's own bytes/content-type if WebP encoding is not
 * available or produces a result over the server's byte limit.
 *
 * @param {File} file
 * @returns {Promise<{ base64: string, filename: string, contentType: string }>}
 */
export async function preprocessSlipImage(file) {
  let objectUrl;
  try {
    objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);
    const longestEdge = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longestEdge > MAX_EDGE_PX ? MAX_EDGE_PX / longestEdge : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY));
    if (blob?.type === 'image/webp' && blob.size <= MAX_BYTES) {
      const base64 = await blobToBase64(blob);
      return {
        base64,
        filename: blob.type === 'image/png' ? 'slip.png' : blob.type === 'image/jpeg' ? 'slip.jpg' : 'slip.webp',
        contentType: blob.type,
      };
    }
  } catch {
    // Decoding/encoding failed — fall through to the original file.
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
  return fallbackToOriginal(file);
}

// ---------------------------------------------------------------------------
// Submission + outcome classification
// ---------------------------------------------------------------------------

// Only these codes mean nothing was recorded and re-picking a file is the
// actual fix. Every other failure — RECORD_FAILED, the SlipOK-reasoned
// mismatches (duplicate/amount/receiver), or an unrecognized shape — already
// has a row on file (or might), so no retry is offered: resubmitting risks a
// second payment row an admin has to clean up, or a duplicate-slip flag from
// the provider.
const RETRYABLE_ERRORS = new Set(['BAD_REQUEST', 'UNSUPPORTED_TYPE', 'FILE_TOO_LARGE']);

/**
 * @typedef {{
 *   tone: 'success'|'pending'|'error',
 *   messageKey: string,
 *   amount: number|null,
 *   paidAt: string|null,
 *   retryable: boolean,
 *   invoiceViewSynced: boolean,
 * }} SlipOutcome
 */

/** @returns {SlipOutcome} */
function classify(data) {
  const invoiceViewSynced = data?.invoiceViewSynced === true;

  if (data?.ok && data.status === 'VERIFIED') {
    return {
      tone: 'success',
      messageKey: data.messageKey ?? 'invoice.slip.verified',
      amount: typeof data.amount === 'number' ? data.amount : null,
      paidAt: data.paidAt ?? null,
      retryable: false,
      invoiceViewSynced,
    };
  }
  if (data?.ok && data.status === 'PENDING') {
    return {
      tone: 'pending',
      messageKey: data.messageKey ?? 'invoice.slip.pending',
      amount: null,
      paidAt: null,
      retryable: false,
      invoiceViewSynced,
    };
  }
  // data.ok === false, or a response shape we don't recognize (including a
  // network failure / unparsable body, where `data` is null).
  const messageKey = typeof data?.messageKey === 'string' ? data.messageKey : 'invoice.slip.error.internal';
  return {
    tone: 'error',
    messageKey,
    amount: null,
    paidAt: null,
    retryable: data ? RETRYABLE_ERRORS.has(data.error) : true,
    invoiceViewSynced,
  };
}

/**
 * POSTs one slip to /api/verify-slip and returns a normalized SlipOutcome.
 * Never throws: a network failure or an unparsable response is folded into
 * the same 'error' shape as a server-reported failure, with `retryable: true`
 * since nothing was recorded in that case.
 *
 * `paymentId` and `reasonCode` are deliberately not part of the returned
 * shape — they must never reach the UI (reasonCode is provider debug info,
 * paymentId is an internal id).
 *
 * @param {{ invoiceNumber: string, balanceDue: number|null, base64: string, filename: string, contentType: string }} input
 * @returns {Promise<SlipOutcome>}
 */
export async function submitSlip({ invoiceNumber, balanceDue, base64, filename, contentType }) {
  try {
    const res = await fetch('/api/verify-slip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceNumber,
        balanceDue: typeof balanceDue === 'number' ? balanceDue : null,
        proofFile: base64,
        proofFilename: filename,
        proofContentType: contentType,
      }),
    });
    const data = await res.json().catch(() => null);
    return classify(data);
  } catch {
    return classify(null);
  }
}

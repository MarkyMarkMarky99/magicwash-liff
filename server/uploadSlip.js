import { randomUUID } from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @type {number} */
export const MAX_BYTES = 1_000_000;

/** @type {readonly string[]} */
export const ACCEPTED_CONTENT_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const JPEG_MAGIC = Object.freeze([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** @type {Readonly<Record<string, string>>} */
const EXT_BY_CONTENT_TYPE = Object.freeze({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
});

const REQUIRED_SERVICE_ACCOUNT_FIELDS = Object.freeze([
  'project_id',
  'client_email',
  'private_key',
]);

/** @type {Readonly<Record<'BAD_INPUT'|'UNSUPPORTED_TYPE'|'TOO_LARGE'|'UPLOAD_FAILED', string>>} */
const MESSAGES = Object.freeze({
  BAD_INPUT: 'Invalid input.',
  UNSUPPORTED_TYPE: 'Unsupported image type.',
  TOO_LARGE: 'Image exceeds maximum size of 1000000 bytes.',
  UPLOAD_FAILED: 'Upload failed.',
});

// ---------------------------------------------------------------------------
// Result helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @param {string} path
 * @returns {{ ok: true, url: string, path: string }}
 */
function okResult(url, path) {
  return { ok: true, url, path };
}

/**
 * @param {'BAD_INPUT'|'UNSUPPORTED_TYPE'|'TOO_LARGE'|'UPLOAD_FAILED'} code
 * @returns {{ ok: false, code: typeof code, message: string }}
 */
function fail(code) {
  return { ok: false, code, message: MESSAGES[code] };
}

// ---------------------------------------------------------------------------
// Firebase init (private) — mirror of docs/reference/firebaseAdmin.js
// ---------------------------------------------------------------------------

function readFirebaseServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is not configured.');
  }

  let serviceAccount;
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    serviceAccount = JSON.parse(json);
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 must contain Base64-encoded JSON.',
    );
  }

  const missingFields = REQUIRED_SERVICE_ACCOUNT_FIELDS.filter(
    (field) => typeof serviceAccount?.[field] !== 'string' || !serviceAccount[field],
  );
  if (missingFields.length) {
    throw new Error(
      `Firebase Service Account is missing required field(s): ${missingFields.join(', ')}.`,
    );
  }

  return serviceAccount;
}

function getFirebaseApp() {
  const [existingApp] = getApps();
  if (existingApp) return existingApp;

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!storageBucket) {
    throw new Error('FIREBASE_STORAGE_BUCKET is not configured.');
  }

  return initializeApp({
    credential: cert(readFirebaseServiceAccount()),
    storageBucket,
  });
}

function getDefaultBucket() {
  return getStorage(getFirebaseApp()).bucket();
}

// ---------------------------------------------------------------------------
// Validation helpers (private, total / non-throwing)
// ---------------------------------------------------------------------------

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeContentType(value) {
  return value.trim().toLowerCase();
}

/**
 * Strict base64 decode per PLAN §5 step 6 / D8.
 * Rejects whitespace; exclusive standard or URL-safe alphabet; padding/length rules.
 *
 * @param {string} base64
 * @returns {{ ok: true, buffer: Buffer } | { ok: false }}
 */
function decodeBase64Strict(base64) {
  // Reject any whitespace (space, tab, CR, LF) anywhere
  if (/[ \t\r\n]/.test(base64)) {
    return { ok: false };
  }

  const isStandard = /^[A-Za-z0-9+/]+={0,2}$/.test(base64);
  const isUrlSafe = /^[A-Za-z0-9_-]+={0,2}$/.test(base64);

  // Must match standard and/or URL-safe alphabet (exclusive of mixed +/ with -_)
  // Pure alphanumeric matches both; treat as standard for decode.
  if (!isStandard && !isUrlSafe) {
    return { ok: false };
  }

  if (base64.length % 4 !== 0) {
    return { ok: false };
  }

  // `=` only at end and at most two — already enforced by regex; count padding
  const paddingMatch = base64.match(/=+$/);
  const paddingCount = paddingMatch ? paddingMatch[0].length : 0;
  if (paddingCount > 2) {
    return { ok: false };
  }

  // Decode: URL-safe only → map then base64; otherwise standard base64
  let decodeInput = base64;
  if (!isStandard && isUrlSafe) {
    decodeInput = base64.replace(/-/g, '+').replace(/_/g, '/');
  }

  let buffer;
  try {
    buffer = Buffer.from(decodeInput, 'base64');
  } catch {
    return { ok: false };
  }

  // Mandatory length check
  const expectedDecodedLen =
    Math.floor(base64.length / 4) * 3 - paddingCount;
  if (buffer.length !== expectedDecodedLen) {
    return { ok: false };
  }

  if (buffer.length === 0) {
    return { ok: false };
  }

  return { ok: true, buffer };
}

/**
 * Total magic-byte detector. Never throws.
 *
 * @param {Buffer} buffer
 * @returns {'image/jpeg'|'image/png'|'image/webp'|null}
 */
function detectImageFormat(buffer) {
  const len = buffer.length;

  // JPEG: >= 3 and FF D8 FF
  if (
    len >= 3 &&
    buffer[0] === JPEG_MAGIC[0] &&
    buffer[1] === JPEG_MAGIC[1] &&
    buffer[2] === JPEG_MAGIC[2]
  ) {
    return 'image/jpeg';
  }

  // PNG: >= 8 and signature
  if (
    len >= 8 &&
    buffer[0] === PNG_MAGIC[0] &&
    buffer[1] === PNG_MAGIC[1] &&
    buffer[2] === PNG_MAGIC[2] &&
    buffer[3] === PNG_MAGIC[3] &&
    buffer[4] === PNG_MAGIC[4] &&
    buffer[5] === PNG_MAGIC[5] &&
    buffer[6] === PNG_MAGIC[6] &&
    buffer[7] === PNG_MAGIC[7]
  ) {
    return 'image/png';
  }

  // WebP: >= 12 and RIFF....WEBP
  if (
    len >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return 'image/webp';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Path helper
// ---------------------------------------------------------------------------

/**
 * @param {'image/jpeg'|'image/png'|'image/webp'} contentType
 * @returns {string}
 */
function buildStoragePath(contentType) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const uuid = randomUUID();
  const ext = EXT_BY_CONTENT_TYPE[contentType];
  return `slips/${yyyy}/${mm}/${uuid}${ext}`;
}

// ---------------------------------------------------------------------------
// URL helper
// ---------------------------------------------------------------------------

/**
 * @param {string} bucketName
 * @param {string} path
 * @param {string} token
 * @returns {string}
 */
function buildDownloadUrl(bucketName, path, token) {
  return (
    'https://firebasestorage.googleapis.com/v0/b/' +
    bucketName +
    '/o/' +
    encodeURIComponent(path) +
    '?alt=media&token=' +
    token
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {object} UploadSlipInput
 * @property {string} base64 - Image bytes, base64, no data-URL prefix
 * @property {string} filename - Original filename (required; not used in path)
 * @property {string} contentType - Declared MIME type
 *
 * @typedef {object} UploadSlipSuccess
 * @property {true} ok
 * @property {string} url - Public fetchable URL (tokenized Firebase download URL)
 * @property {string} path - Storage object path
 *
 * @typedef {object} UploadSlipFailure
 * @property {false} ok
 * @property {'BAD_INPUT'|'UNSUPPORTED_TYPE'|'TOO_LARGE'|'UPLOAD_FAILED'} code
 * @property {string} message - Safe, non-sensitive explanation (fixed strings only)
 *
 * @typedef {UploadSlipSuccess|UploadSlipFailure} UploadSlipResult
 *
 * @param {UploadSlipInput} input
 * @param {{ bucket?: { name?: string, file: (path: string) => any }, bucketName?: string }} [options]
 * @returns {Promise<UploadSlipResult>}
 */
export async function uploadSlip(input, options) {
  try {
    // 1. Normalize options
    if (options === undefined) {
      options = {};
    } else if (!isPlainObject(options)) {
      return fail('BAD_INPUT');
    }

    // 2. input is a plain object
    if (!isPlainObject(input)) {
      return fail('BAD_INPUT');
    }

    // 3. base64, filename, contentType are non-empty strings
    const { base64, filename, contentType: rawContentType } = input;
    if (
      !isNonEmptyString(base64) ||
      !isNonEmptyString(filename) ||
      !isNonEmptyString(rawContentType)
    ) {
      return fail('BAD_INPUT');
    }

    // 4. contentType = trim + lowercase; must be in ACCEPTED_CONTENT_TYPES
    const contentType = normalizeContentType(rawContentType);
    if (!ACCEPTED_CONTENT_TYPES.includes(contentType)) {
      return fail('UNSUPPORTED_TYPE');
    }

    // 5. Data-URL rejection
    if (/^\s*data:/i.test(base64) || /;base64,/i.test(base64)) {
      return fail('BAD_INPUT');
    }

    // 6. Strict base64 decode
    const decoded = decodeBase64Strict(base64);
    if (!decoded.ok) {
      return fail('BAD_INPUT');
    }
    const { buffer } = decoded;

    // 7. Size check (inclusive max: > MAX_BYTES fails)
    if (buffer.length > MAX_BYTES) {
      return fail('TOO_LARGE');
    }

    // 8. Magic-byte detect; must match declared type
    const detected = detectImageFormat(buffer);
    if (detected === null) {
      return fail('UNSUPPORTED_TYPE');
    }
    if (detected !== contentType) {
      return fail('BAD_INPUT');
    }
    const verifiedType = detected;

    // 9. Path
    const path = buildStoragePath(verifiedType);

    // 10. Token
    const token = randomUUID();

    // 11. Bucket
    const bucket = options.bucket ?? getDefaultBucket();

    // 12. Resolve bucketName
    let bucketName = null;
    if (isNonEmptyString(options.bucketName)) {
      bucketName = options.bucketName;
    } else if (
      typeof bucket?.name === 'string' &&
      bucket.name
    ) {
      bucketName = bucket.name;
    } else if (isNonEmptyString(process.env.FIREBASE_STORAGE_BUCKET)) {
      bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    }
    if (!bucketName) {
      return fail('UPLOAD_FAILED');
    }

    // 13. Save
    await bucket.file(path).save(buffer, {
      resumable: false,
      metadata: {
        contentType: verifiedType,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    // 14–15. URL + success
    const url = buildDownloadUrl(bucketName, path, token);
    return okResult(url, path);
  } catch {
    // 16–17. Never surface error details
    return fail('UPLOAD_FAILED');
  }
}

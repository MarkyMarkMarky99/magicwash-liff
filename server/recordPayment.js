/**
 * Payment recorder — single self-contained ESM module.
 * Records one payment/refund row (VERIFIED or PENDING) per call; an invoice
 * may have many rows. Public API: createPaymentRecorder, validatePaymentRow.
 * Zero deps. Node 18+. Never throws across public boundaries.
 * @module recordPayment
 */

export const PAYMENT_ROW_KEYS = Object.freeze([
  "payment_id",
  "invoice_number",
  "amount",
  "method",
  "status",
  "paid_at",
  "reference",
  "proof_url",
  "slip_data",
  "notes",
  "created_at",
  "created_by",
  "updated_at",
  "updated_by",
  "deleted_at",
  "deleted_by",
]);
const PAYMENT_METHODS = Object.freeze([
  "CASH",
  "BANK_TRANSFER",
  "CREDIT_CARD",
  "QR_PROMPTPAY",
  "GIFT_VOUCHER",
  "OTHER",
]);
const PAYMENT_STATUSES = Object.freeze([
  "PENDING",
  "VERIFIED",
  "FAILED",
  "CANCELLED",
]);
const SLIP_PAYMENT_METHODS = Object.freeze(["BANK_TRANSFER", "QR_PROMPTPAY"]);
const RECORD_STATUSES = Object.freeze(["VERIFIED", "PENDING"]);
export const MAX_SLIP_DATA_LENGTH = 50_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const PAYMENT_ID_PATTERN =
  /^pay_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/;
const CONFIG_KEYS = new Set([
  "gatewayUrl",
  "createdBy",
  "timeoutMs",
  "fetch",
  "now",
]);
const INPUT_KEYS = new Set([
  "paymentId",
  "invoice",
  "authority",
  "amount",
  "paidAt",
  "reference",
  "status",
  "notes",
  "verification",
  "method",
  "proofUrl",
]);
const INVOICE_KEYS = new Set(["invoiceNumber", "balanceDue", "currency"]);
const AUTHORITY_KEYS = new Set([
  "source",
  "acceptedSlipAmountCurrency",
  "slipOkAmountCheckUsed",
  "slipOkReceiverCheckUsed",
  "slipOkDuplicateCheckUsed",
]);
const VERIFICATION_KEYS = new Set(["httpStatus", "response"]);
function isRecordObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}
function describeError(error) {
  try {
    if (error instanceof Error) {
      const message = error.message;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  } catch {
    // A hostile error object can throw from its own getters; fall through.
  }
  return "Unexpected internal error.";
}
function addIssue(issues, path, code, message) {
  issues.push({ path, code, message });
}
function requireObject(value, path, issues) {
  if (!isRecordObject(value)) {
    addIssue(issues, path, "invalid_type", "Expected an object.");
    return undefined;
  }
  return value;
}
function reportUnexpectedKeys(record, allowed, path, issues) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      const issuePath = path.length === 0 ? key : `${path}.${key}`;
      addIssue(issues, issuePath, "invalid_value", "Unexpected property.");
    }
  }
}
function requiredValue(record, key, path, issues) {
  if (!hasOwn(record, key) || record[key] === undefined) {
    addIssue(issues, path, "required", "Required value is missing.");
    return undefined;
  }
  return record[key];
}
function nonEmptyString(value, path, issues) {
  if (typeof value !== "string") {
    addIssue(issues, path, "invalid_type", "Expected a string.");
    return undefined;
  }
  if (value.trim().length === 0) {
    addIssue(issues, path, "invalid_value", "Expected a non-empty string.");
    return undefined;
  }
  return value;
}
function finiteNumber(value, path, issues) {
  if (typeof value !== "number") {
    addIssue(issues, path, "invalid_type", "Expected a number.");
    return undefined;
  }
  if (!Number.isFinite(value)) {
    addIssue(issues, path, "invalid_value", "Expected a finite number.");
    return undefined;
  }
  return value;
}
function positiveNumber(value, path, issues) {
  const number = finiteNumber(value, path, issues);
  if (number !== undefined && number <= 0) {
    addIssue(issues, path, "invalid_value", "Expected a positive, nonzero number.");
    return undefined;
  }
  return number;
}
function nonZeroFiniteNumber(value, path, issues) {
  const number = finiteNumber(value, path, issues);
  if (number !== undefined && number === 0) {
    addIssue(issues, path, "invalid_value", "Zero is not allowed.");
    return undefined;
  }
  return number;
}
function nullableFiniteNumber(value, path, issues) {
  if (value === null) {
    return null;
  }
  return finiteNumber(value, path, issues);
}
function nullableNonZeroFiniteNumber(value, path, issues) {
  if (value === null) {
    return null;
  }
  return nonZeroFiniteNumber(value, path, issues);
}
function booleanValue(value, path, issues) {
  if (typeof value !== "boolean") {
    addIssue(issues, path, "invalid_type", "Expected a boolean.");
    return undefined;
  }
  return value;
}
function literalValue(value, literal, path, issues) {
  if (value !== literal) {
    addIssue(issues, path, "invalid_value", `Expected ${JSON.stringify(literal)}.`);
    return undefined;
  }
  return literal;
}
function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
function httpUrl(value, path, issues) {
  const string = nonEmptyString(value, path, issues);
  if (string !== undefined && !isHttpUrl(string)) {
    addIssue(
      issues,
      path,
      "invalid_format",
      "Expected an absolute http: or https: URL.",
    );
    return undefined;
  }
  return string;
}
function nullableHttpUrl(value, path, issues) {
  if (value === null) {
    return null;
  }
  return httpUrl(value, path, issues);
}
function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function daysInMonth(year, month) {
  const days = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return days[month - 1] ?? 0;
}
function isIsoTimestamp(value) {
  const match = ISO_TIMESTAMP_PATTERN.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
  const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59 &&
    Number.isFinite(Date.parse(value))
  );
}
function nullableIsoTimestampInput(value, path, issues) {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    addIssue(issues, path, "invalid_type", "Expected an ISO 8601 string or null.");
    return undefined;
  }
  if (!isIsoTimestamp(value)) {
    addIssue(issues, path, "invalid_format", "Expected an ISO 8601 timestamp.");
    return undefined;
  }
  return value;
}
function nullableStringInput(value, path, issues) {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    addIssue(issues, path, "invalid_type", "Expected a string or null.");
    return undefined;
  }
  return value;
}
function enumValue(value, values, path, issues) {
  if (typeof value !== "string") {
    addIssue(issues, path, "invalid_type", "Expected a string.");
    return undefined;
  }
  if (!values.some((candidate) => candidate === value)) {
    addIssue(issues, path, "invalid_value", "Value is not in the schema enum.");
    return undefined;
  }
  return value;
}
function nullableString(value, path, issues) {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    addIssue(issues, path, "invalid_type", "Expected a string or null.");
    return undefined;
  }
  return value;
}
function nullableIsoTimestamp(value, path, issues) {
  const string = nullableString(value, path, issues);
  if (typeof string === "string" && !isIsoTimestamp(string)) {
    addIssue(issues, path, "invalid_format", "Expected an ISO 8601 timestamp.");
    return undefined;
  }
  return string;
}
function validateConfigValue(candidate) {
  
  const issues = [];
  const record = requireObject(candidate, "config", issues);
  if (record === undefined) {
    return { kind: "invalid", issues };
  }
  reportUnexpectedKeys(record, CONFIG_KEYS, "config", issues);
  const gatewayUrl = httpUrl(
    requiredValue(record, "gatewayUrl", "config.gatewayUrl", issues),
    "config.gatewayUrl",
    issues,
  );
  const createdBy = nonEmptyString(
    requiredValue(record, "createdBy", "config.createdBy", issues),
    "config.createdBy",
    issues,
  );
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (hasOwn(record, "timeoutMs")) {
    const timeout = positiveNumber(record.timeoutMs, "config.timeoutMs", issues);
    if (timeout !== undefined) {
      if (!Number.isInteger(timeout)) {
        addIssue(
          issues,
          "config.timeoutMs",
          "invalid_value",
          "Expected a positive integer.",
        );
      } else {
        timeoutMs = timeout;
      }
    }
  }
  let fetcher = globalThis.fetch;
  if (hasOwn(record, "fetch")) {
    if (typeof record.fetch !== "function") {
      addIssue(issues, "config.fetch", "invalid_type", "Expected a function.");
    } else {
      fetcher =  (record.fetch);
    }
  }
  if (typeof fetcher !== "function") {
    addIssue(
      issues,
      "config.fetch",
      "required",
      "A fetch implementation is required in this runtime.",
    );
  }
  let now = () => new Date();
  if (hasOwn(record, "now")) {
    if (typeof record.now !== "function") {
      addIssue(issues, "config.now", "invalid_type", "Expected a function.");
    } else {
      now =  (record.now);
    }
  }
  if (
    issues.length > 0 ||
    gatewayUrl === undefined ||
    createdBy === undefined ||
    typeof fetcher !== "function"
  ) {
    return { kind: "invalid", issues };
  }
  return {
    kind: "valid",
    config: {
      gatewayUrl,
      createdBy,
      timeoutMs,
      fetch: fetcher,
      now,
    },
  };
}
function validateRecordInputValue(candidate) {
  
  const issues = [];
  const input = requireObject(candidate, "input", issues);
  if (input === undefined) {
    return { kind: "invalid", issues };
  }
  reportUnexpectedKeys(input, INPUT_KEYS, "input", issues);
  const paymentId = nonEmptyString(
    requiredValue(input, "paymentId", "paymentId", issues),
    "paymentId",
    issues,
  );
  if (paymentId !== undefined && !PAYMENT_ID_PATTERN.test(paymentId)) {
    addIssue(
      issues,
      "paymentId",
      "invalid_format",
      "Expected pay_<lowercase canonical RFC 4122 UUID>.",
    );
  }
  const invoice = requireObject(
    requiredValue(input, "invoice", "invoice", issues),
    "invoice",
    issues,
  );
  
  let invoiceNumber;

  let balanceDue;
  if (invoice !== undefined) {
    reportUnexpectedKeys(invoice, INVOICE_KEYS, "invoice", issues);
    invoiceNumber = nonEmptyString(
      requiredValue(invoice, "invoiceNumber", "invoice.invoiceNumber", issues),
      "invoice.invoiceNumber",
      issues,
    );
    balanceDue = nullableFiniteNumber(
      requiredValue(invoice, "balanceDue", "invoice.balanceDue", issues),
      "invoice.balanceDue",
      issues,
    );
    literalValue(
      requiredValue(invoice, "currency", "invoice.currency", issues),
      "THB",
      "invoice.currency",
      issues,
    );
  }
  const authority = requireObject(
    requiredValue(input, "authority", "authority", issues),
    "authority",
    issues,
  );
  if (authority !== undefined) {
    reportUnexpectedKeys(authority, AUTHORITY_KEYS, "authority", issues);
    literalValue(
      requiredValue(authority, "source", "authority.source", issues),
      "trusted_server",
      "authority.source",
      issues,
    );
    literalValue(
      requiredValue(
        authority,
        "acceptedSlipAmountCurrency",
        "authority.acceptedSlipAmountCurrency",
        issues,
      ),
      "THB",
      "authority.acceptedSlipAmountCurrency",
      issues,
    );
    booleanValue(
      requiredValue(
        authority,
        "slipOkAmountCheckUsed",
        "authority.slipOkAmountCheckUsed",
        issues,
      ),
      "authority.slipOkAmountCheckUsed",
      issues,
    );
    booleanValue(
      requiredValue(
        authority,
        "slipOkReceiverCheckUsed",
        "authority.slipOkReceiverCheckUsed",
        issues,
      ),
      "authority.slipOkReceiverCheckUsed",
      issues,
    );
    booleanValue(
      requiredValue(
        authority,
        "slipOkDuplicateCheckUsed",
        "authority.slipOkDuplicateCheckUsed",
        issues,
      ),
      "authority.slipOkDuplicateCheckUsed",
      issues,
    );
  }
  const amount = nullableNonZeroFiniteNumber(
    requiredValue(input, "amount", "amount", issues),
    "amount",
    issues,
  );
  const paidAt = nullableIsoTimestampInput(
    requiredValue(input, "paidAt", "paidAt", issues),
    "paidAt",
    issues,
  );
  const reference = nullableStringInput(
    requiredValue(input, "reference", "reference", issues),
    "reference",
    issues,
  );
  const status = enumValue(
    requiredValue(input, "status", "status", issues),
    RECORD_STATUSES,
    "status",
    issues,
  );
  const notes = nullableStringInput(
    requiredValue(input, "notes", "notes", issues),
    "notes",
    issues,
  );
  const verification = requireObject(
    requiredValue(input, "verification", "verification", issues),
    "verification",
    issues,
  );
  
  let verificationResponse;
  let hasVerificationResponse = false;
  if (verification !== undefined) {
    reportUnexpectedKeys(verification, VERIFICATION_KEYS, "verification", issues);
    const httpStatus = finiteNumber(
      requiredValue(
        verification,
        "httpStatus",
        "verification.httpStatus",
        issues,
      ),
      "verification.httpStatus",
      issues,
    );
    if (httpStatus !== undefined && !Number.isInteger(httpStatus)) {
      addIssue(
        issues,
        "verification.httpStatus",
        "invalid_value",
        "Expected an integer HTTP status code.",
      );
    }
    if (!hasOwn(verification, "response") || verification.response === undefined) {
      addIssue(
        issues,
        "verification.response",
        "required",
        "Required value is missing.",
      );
    } else {
      verificationResponse = verification.response;
      hasVerificationResponse = true;
    }
  }
  const methodValue = requiredValue(input, "method", "method", issues);
  
  let method;
  if (
    typeof methodValue === "string" &&
    SLIP_PAYMENT_METHODS.some((candidateMethod) => candidateMethod === methodValue)
  ) {
    method = methodValue;
  } else {
    addIssue(
      issues,
      "method",
      typeof methodValue === "string" ? "invalid_value" : "invalid_type",
      "Expected BANK_TRANSFER or QR_PROMPTPAY.",
    );
  }
  const proofUrl = nullableHttpUrl(
    requiredValue(input, "proofUrl", "proofUrl", issues),
    "proofUrl",
    issues,
  );
  if (
    issues.length > 0 ||
    paymentId === undefined ||
    invoiceNumber === undefined ||
    balanceDue === undefined ||
    authority === undefined ||
    amount === undefined ||
    paidAt === undefined ||
    reference === undefined ||
    status === undefined ||
    notes === undefined ||
    !hasVerificationResponse ||
    method === undefined ||
    proofUrl === undefined
  ) {
    return { kind: "invalid", issues };
  }
  return {
    kind: "valid",
    input: {
      paymentId,
      invoiceNumber,
      balanceDue,
      authority,
      amount,
      paidAt,
      reference,
      status,
      notes,
      verificationResponse,
      method,
      proofUrl,
    },
  };
}
function validatePaymentRowValue(candidate) {
  
  const issues = [];
  const row = requireObject(candidate, "row", issues);
  if (row === undefined) {
    return { kind: "invalid", issues };
  }
  const expectedKeys = new Set(PAYMENT_ROW_KEYS);
  reportUnexpectedKeys(row, expectedKeys, "row", issues);
  for (const key of PAYMENT_ROW_KEYS) {
    if (!hasOwn(row, key)) {
      addIssue(issues, `row.${key}`, "required", "Required row column is missing.");
    }
  }
  const paymentId = nonEmptyString(row.payment_id, "row.payment_id", issues);
  const invoiceNumber = nonEmptyString(
    row.invoice_number,
    "row.invoice_number",
    issues,
  );
  const amount = nullableNonZeroFiniteNumber(row.amount, "row.amount", issues);
  const method = enumValue(row.method, PAYMENT_METHODS, "row.method", issues);
  const status = enumValue(row.status, PAYMENT_STATUSES, "row.status", issues);
  const paidAt = nullableIsoTimestamp(row.paid_at, "row.paid_at", issues);
  const reference = nullableString(row.reference, "row.reference", issues);
  const proofUrl = nullableHttpUrl(row.proof_url, "row.proof_url", issues);
  const slipData = nullableString(row.slip_data, "row.slip_data", issues);
  const notes = nullableString(row.notes, "row.notes", issues);
  const createdAt = nonEmptyString(row.created_at, "row.created_at", issues);
  if (createdAt !== undefined && !isIsoTimestamp(createdAt)) {
    addIssue(
      issues,
      "row.created_at",
      "invalid_format",
      "Expected an ISO 8601 timestamp.",
    );
  }
  const createdBy = nonEmptyString(row.created_by, "row.created_by", issues);
  const updatedAt = nullableIsoTimestamp(row.updated_at, "row.updated_at", issues);
  const updatedBy = nullableString(row.updated_by, "row.updated_by", issues);
  const deletedAt = nullableIsoTimestamp(row.deleted_at, "row.deleted_at", issues);
  const deletedBy = nullableString(row.deleted_by, "row.deleted_by", issues);
  if (
    issues.length > 0 ||
    paymentId === undefined ||
    invoiceNumber === undefined ||
    amount === undefined ||
    method === undefined ||
    status === undefined ||
    paidAt === undefined ||
    reference === undefined ||
    proofUrl === undefined ||
    slipData === undefined ||
    notes === undefined ||
    createdAt === undefined ||
    createdBy === undefined ||
    updatedAt === undefined ||
    updatedBy === undefined ||
    deletedAt === undefined ||
    deletedBy === undefined
  ) {
    return { kind: "invalid", issues };
  }
  return {
    kind: "valid",
    row: {
      payment_id: paymentId,
      invoice_number: invoiceNumber,
      amount,
      method,
      status,
      paid_at: paidAt,
      reference,
      proof_url: proofUrl,
      slip_data: slipData,
      notes,
      created_at: createdAt,
      created_by: createdBy,
      updated_at: updatedAt,
      updated_by: updatedBy,
      deleted_at: deletedAt,
      deleted_by: deletedBy,
    },
  };
}
export function validatePaymentRow(candidate) {
  try {
    return validatePaymentRowValue(candidate);
  } catch (error) {
    return {
      kind: "validation_internal_error",
      message: describeError(error),
    };
  }
}
export function buildVerifiedPaymentRow(input) {
  return {
    payment_id: input.paymentId,
    invoice_number: input.invoiceNumber,
    amount: input.amount,
    method: input.method,
    status: input.status,
    paid_at: input.paidAt,
    reference: input.reference,
    proof_url: input.proofUrl,
    slip_data: input.slipData,
    notes: input.notes,
    created_at: input.createdAt,
    created_by: input.createdBy,
    updated_at: null,
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
  };
}
function protectText(value) {
  return `'${value}`;
}
function protectNullableText(value) {
  return value === null ? null : protectText(value);
}
function toPaymentWireRow(row) {
  // `amount` is omitted entirely when unknown rather than sent as JSON null.
  // The live sheet schema declares `amount` as `"type": "number"` and only
  // dropped it from `required`, so a literal null would fail validation at the
  // gateway; an absent key is what produces the blank cell the schema's own
  // description calls for ("may be left blank ... an admin fills it in").
  return {
    payment_id: protectText(row.payment_id),
    invoice_number: protectText(row.invoice_number),
    ...(row.amount === null ? {} : { amount: row.amount }),
    method: row.method,
    status: row.status,
    paid_at: protectNullableText(row.paid_at),
    reference: protectNullableText(row.reference),
    proof_url: protectNullableText(row.proof_url),
    slip_data: protectNullableText(row.slip_data),
    notes: protectNullableText(row.notes),
    created_at: protectText(row.created_at),
    created_by: protectText(row.created_by),
    updated_at: protectNullableText(row.updated_at),
    updated_by: protectNullableText(row.updated_by),
    deleted_at: protectNullableText(row.deleted_at),
    deleted_by: protectNullableText(row.deleted_by),
  };
}
function serializeVerificationPayload(response) {
  return JSON.stringify(response);
}
export function paymentRowToCustomerPayment(row) {
  return {
    amount: row.amount,
    method: row.method,
    status: row.status,
    paidAt: row.paid_at,
    proofUrl: row.proof_url,
  };
}
export function customerPaymentToSheetFields(payment) {
  return {
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    paid_at: payment.paidAt,
    proof_url: payment.proofUrl,
  };
}
function hasExactKeys(record, expected) {
  const keys = Object.keys(record);
  return (
    keys.length === expected.length &&
    expected.every((key) => hasOwn(record, key))
  );
}
function hasOnlyKeys(record, required, optional) {
  return (
    required.every((key) => hasOwn(record, key)) &&
    Object.keys(record).every(
      (key) => required.includes(key) || optional.includes(key),
    )
  );
}
// SheetLib returns the row it actually persisted under `data`, with the write
// metadata nested under `write`. Two success variants exist, and BOTH mean the
// Payment row reached the sheet:
//
//   confirmed   { resource, status, target, data: {...}, write: { updated_range } }
//   unconfirmed { resource, status, target, data: null, read_back_failed: true,
//                 reason, write: { updated_range } }
//
// The unconfirmed variant is returned when the append itself succeeded but
// SheetLib's read-back of the stored row failed afterwards (transient Sheets
// API error, quota, timeout) — see appscript/SheetLib/SheetService.js, which
// only reaches `status: "ok"` after Values.append has returned. Rejecting it
// would be wrong twice over: the customer would be told their payment was not
// recorded when it was, and the retry that advice invites would duplicate the
// row. This recorder never reads the persisted row back, so the absent `data`
// costs it nothing.
function isSuccessEnvelope(value) {
  if (!isRecordObject(value)) {
    return false;
  }
  if (
    !hasOnlyKeys(
      value,
      ["resource", "status", "target", "data", "write"],
      ["read_back_failed", "reason"],
    )
  ) {
    return false;
  }
  if (
    value.resource !== "sheet" ||
    value.status !== "ok" ||
    value.target !== "Payment"
  ) {
    return false;
  }
  // `write` is not exact-key checked like the outer envelope, but it is not
  // blindly trusted either. The asymmetry is deliberate: this predicate answers
  // exactly one question — did the Payment row land? — and an unknown extra key
  // inside `write` does not change that answer. Rejecting on one would recreate
  // the very bug this validator was fixed for: a false negative that tells the
  // customer their payment failed after it succeeded, and invites a retry that
  // duplicates the row.
  //
  // `appended_rows` is the exception, and must be rejected. SheetLib only emits
  // it for a batch append, and this recorder only ever sends a single object, so
  // its presence means the request/response no longer line up. `data` alone
  // cannot catch that: in the read-back-failure variant below `data` is null, so
  // the non-array check never runs and a batch response would slip through.
  if (
    !isRecordObject(value.write) ||
    typeof value.write.updated_range !== "string" ||
    value.write.updated_range.length === 0 ||
    hasOwn(value.write, "appended_rows")
  ) {
    return false;
  }
  if (hasOwn(value, "read_back_failed") || hasOwn(value, "reason")) {
    return (
      value.read_back_failed === true &&
      typeof value.reason === "string" &&
      value.data === null
    );
  }
  // A single-object APPEND request gets a single persisted row back, never an
  // array — an array here would mean the request was sent as a batch.
  return isRecordObject(value.data);
}
function isErrorEnvelope(value) {
  if (!isRecordObject(value)) {
    return false;
  }
  return (
    hasExactKeys(value, ["status", "message"]) &&
    value.status === "error" &&
    typeof value.message === "string"
  );
}
async function fetchAndRead(call, signal) {
  
  let response;
  try {
    response = await call.fetch(call.gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: call.body,
      signal,
    });
  } catch (error) {
    return { kind: "network_error", message: describeError(error) };
  }
  const httpStatus = response.status;
  if (httpStatus !== 200) {
    return { kind: "unexpected_http_status", httpStatus };
  }
  try {
    return {
      kind: "http_response",
      httpStatus,
      body: await response.text(),
    };
  } catch (error) {
    return { kind: "network_error", message: describeError(error) };
  }
}
async function appendPayment(call) {
  const controller = new AbortController();
  const operation = fetchAndRead(call, controller.signal);
  const timeout = new Promise((resolve) => {
    const handle = setTimeout(() => {
      resolve({ kind: "timeout" });
      controller.abort();
    }, call.timeoutMs);
    operation
      .finally(() => {
        clearTimeout(handle);
      })
      .catch(() => undefined);
  });
  const readResult = await Promise.race([operation, timeout]);
  if (readResult.kind === "timeout") {
    return {
      kind: "timeout",
      timeoutMs: call.timeoutMs,
      writeOutcome: "unknown",
    };
  }
  if (readResult.kind === "network_error") {
    return {
      kind: "network_error",
      message: readResult.message,
      writeOutcome: "unknown",
    };
  }
  if (readResult.kind === "unexpected_http_status") {
    return {
      kind: "unexpected_http_status",
      httpStatus: readResult.httpStatus,
      writeOutcome: "unknown",
    };
  }
  
  let envelope;
  try {
    envelope = JSON.parse(readResult.body);
  } catch {
    return {
      kind: "malformed_response",
      message: "Gateway response was not valid JSON.",
      writeOutcome: "unknown",
    };
  }
  if (isSuccessEnvelope(envelope)) {
    return { kind: "success", envelope };
  }
  if (isErrorEnvelope(envelope)) {
    return {
      kind: "gateway_error",
      message: envelope.message,
      writeOutcome: "unknown",
    };
  }
  return {
    kind: "malformed_response",
    message: "Gateway response did not match the single-append contract.",
    writeOutcome: "unknown",
  };
}
function duplicateResult(matchedOn, state) {
  return {
    kind: "duplicate_submission",
    matchedOn,
    previous: state.previous,
    writeOutcome: "not_sent",
    message: "This recorder already attempted the matching payment.",
  };
}
function previousOutcomeFor(result) {
  if (result.kind === "success") {
    return { kind: "success", writeOutcome: "confirmed" };
  }
  if (result.kind === "gateway_error") {
    return { kind: "gateway_error", writeOutcome: "unknown" };
  }
  return { kind: "ambiguous", writeOutcome: "unknown" };
}
function currentIsoTimestamp(now) {
  const current = now();
  if (!(current instanceof Date) || !Number.isFinite(current.getTime())) {
    throw new TypeError("Configured clock returned an invalid Date.");
  }
  return current.toISOString();
}
function makeRecorder(config) {
  
  const paymentIds = new Map();
  
  const transactionReferences = new Map();
  return {
    
    async record(input) {
      let dispatched = false;
      
      let attempt;
      try {
        const validated = validateRecordInputValue(input);
        if (validated.kind === "invalid") {
          return {
            kind: "validation_error",
            issues: validated.issues,
            writeOutcome: "not_sent",
          };
        }
        const createdAt = currentIsoTimestamp(config.now);
        const slipData = serializeVerificationPayload(
          validated.input.verificationResponse,
        );
        const row = buildVerifiedPaymentRow({
          paymentId: validated.input.paymentId,
          invoiceNumber: validated.input.invoiceNumber,
          method: validated.input.method,
          proofUrl: validated.input.proofUrl,
          amount: validated.input.amount,
          paidAt: validated.input.paidAt,
          reference: validated.input.reference,
          status: validated.input.status,
          notes: validated.input.notes,
          slipData,
          createdAt,
          createdBy: config.createdBy,
        });
        const rowValidation = validatePaymentRow(row);
        if (rowValidation.kind !== "valid") {
          throw new Error("The internally constructed Payment row was invalid.");
        }
        const wireRow = toPaymentWireRow(rowValidation.row);
        if (
          wireRow.slip_data !== null &&
          wireRow.slip_data.length > MAX_SLIP_DATA_LENGTH
        ) {
          return {
            kind: "slip_data_too_large",
            maxLength: MAX_SLIP_DATA_LENGTH,
            actualLength: wireRow.slip_data.length,
            writeOutcome: "not_sent",
          };
        }
        const request = {
          resource: "sheet",
          action: "APPEND",
          target: "Payment",
          data: wireRow,
        };
        const body = JSON.stringify(request);
        const idAttempt = paymentIds.get(validated.input.paymentId);
        if (idAttempt !== undefined) {
          return duplicateResult("payment_id", idAttempt);
        }
        const referenceKey = validated.input.reference;
        const referenceAttempt =
          referenceKey === null
            ? undefined
            : transactionReferences.get(referenceKey);
        if (referenceAttempt !== undefined) {
          return duplicateResult("transaction_reference", referenceAttempt);
        }
        attempt = {
          previous: { kind: "not_sent", writeOutcome: "not_sent" },
        };
        paymentIds.set(validated.input.paymentId, attempt);
        if (referenceKey !== null) {
          transactionReferences.set(referenceKey, attempt);
        }
        dispatched = true;
        attempt.previous = { kind: "ambiguous", writeOutcome: "unknown" };
        const transportResult = await appendPayment({
          gatewayUrl: config.gatewayUrl,
          body,
          timeoutMs: config.timeoutMs,
          fetch: config.fetch,
        });
        attempt.previous = previousOutcomeFor(transportResult);
        if (transportResult.kind === "success") {
          return { kind: "success", writeOutcome: "confirmed" };
        }
        return transportResult;
      } catch (error) {
        if (attempt !== undefined) {
          attempt.previous = dispatched
            ? { kind: "ambiguous", writeOutcome: "unknown" }
            : { kind: "not_sent", writeOutcome: "not_sent" };
        }
        if (dispatched) {
          return {
            kind: "internal_error_after_dispatch",
            message: describeError(error),
            writeOutcome: "unknown",
          };
        }
        return {
          kind: "internal_error_before_dispatch",
          message: describeError(error),
          writeOutcome: "not_sent",
        };
      }
    },
  };
}
export function createPaymentRecorder(config) {
  try {
    const validation = validateConfigValue(config);
    if (validation.kind === "invalid") {
      return {
        kind: "configuration_error",
        issues: validation.issues,
      };
    }
    return {
      kind: "ready",
      recorder: makeRecorder(validation.config),
    };
  } catch (error) {
    return {
      kind: "configuration_internal_error",
      message: describeError(error),
    };
  }
}

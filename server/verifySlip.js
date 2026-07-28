/**
 * SlipOK slip-verification client — single self-contained ESM module.
 *
 * Zero runtime dependencies. Uses global `fetch`, `AbortController`,
 * `FormData`, `Blob`, and standard built-ins only.
 *
 * Public surface: {@link createSlipOkClient}.
 *
 * @module verifySlip
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 300_000;
const ENDPOINT_PREFIX = "https://api.slipok.com/api/line/apikey/";
const BRANCH_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const API_KEY_PATTERN = /^[\x21-\x7E]+$/;

/** @type {ReadonlySet<string>} */
const BANK_CODES = new Set([
  "002",
  "004",
  "006",
  "011",
  "014",
  "022",
  "024",
  "025",
  "030",
  "033",
  "034",
  "035",
  "067",
  "069",
  "070",
  "071",
  "073",
  "098",
]);

/** @type {ReadonlySet<string>} */
const PROXY_TYPES = new Set([
  "NATID",
  "MSISDN",
  "EWALLETID",
  "EMAIL",
  "BILLERID",
]);

/** @type {ReadonlySet<string>} */
const ACCOUNT_TYPES = new Set(["BANKAC", "TOKEN", "DUMMY"]);

const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

// ---------------------------------------------------------------------------
// JSDoc type definitions (documentation only; no runtime effect)
// ---------------------------------------------------------------------------

/**
 * @typedef {(input: string, init?: RequestInit) => Promise<Response>} FetchLike
 */

/**
 * @typedef {object} SlipOkClientOptions
 * @property {string} branchId
 * @property {string} apiKey
 * @property {number} [timeoutMs]
 * @property {FetchLike} [fetch]
 */

/**
 * @typedef {"options"|"branchId"|"apiKey"|"timeoutMs"|"fetch"|"runtime"} ClientConfigurationField
 */

/**
 * @typedef {object} InvalidClientConfiguration
 * @property {"invalid_client_configuration"} kind
 * @property {ClientConfigurationField} field
 * @property {string} message
 */

/**
 * @typedef {{ kind: "success", client: SlipOkClient } | InvalidClientConfiguration} CreateSlipOkClientResult
 */

/**
 * @typedef {object} VerifySlipOptions
 * @property {boolean} [log]
 * @property {number} [amount]
 */

/**
 * Exactly one of `data`, `files`, or `url` must be present (enforced at runtime).
 *
 * @typedef {VerifySlipOptions & { data: string, files?: never, url?: never }} VerifySlipByQrData
 * @typedef {VerifySlipOptions & { files: Blob | string, data?: never, url?: never }} VerifySlipByFile
 * @typedef {VerifySlipOptions & { url: string, data?: never, files?: never }} VerifySlipByUrl
 * @typedef {VerifySlipByQrData | VerifySlipByFile | VerifySlipByUrl} VerifySlipInput
 */

/**
 * @typedef {"NATID"|"MSISDN"|"EWALLETID"|"EMAIL"|"BILLERID"} ProxyType
 * @typedef {"BANKAC"|"TOKEN"|"DUMMY"} AccountType
 * @typedef {"002"|"004"|"006"|"011"|"014"|"022"|"024"|"025"|"030"|"033"|"034"|"035"|"067"|"069"|"070"|"071"|"073"|"098"} BankCode
 */

/**
 * @typedef {object} SlipProxy
 * @property {ProxyType | "" | null} [type]
 * @property {string | null} [value]
 */

/**
 * @typedef {object} SlipAccount
 * @property {AccountType | "" | null} [type]
 * @property {string | null} [value]
 */

/**
 * @typedef {object} SlipSender
 * @property {string | null} [displayName]
 * @property {string | null} [name]
 * @property {SlipProxy | null} [proxy]
 * @property {SlipAccount | null} [account]
 */

/**
 * @typedef {object} SlipReceiver
 * @property {string | null} [displayName]
 * @property {string | null} [name]
 * @property {SlipProxy | null} [proxy]
 * @property {SlipAccount | null} [account]
 */

/**
 * @typedef {object} SlipData
 * @property {true | null} [success]
 * @property {string | null} [message]
 * @property {string | null} [rqUID]
 * @property {"EN" | "TH" | "" | null} [language]
 * @property {BankCode | "" | null} [receivingBank]
 * @property {BankCode | "" | null} [sendingBank]
 * @property {string | null} [transRef]
 * @property {string | null} [transDate]
 * @property {string | null} [transTime]
 * @property {string | null} [transTimestamp]
 * @property {SlipSender | null} [sender]
 * @property {SlipReceiver | null} [receiver]
 * @property {number | null} [amount]
 * @property {number | null} [paidLocalAmount]
 * @property {string | null} [paidLocalCurrency]
 * @property {string | null} [countryCode]
 * @property {string | number | null} [transFeeAmount]
 * @property {string | null} [ref1]
 * @property {string | null} [ref2]
 * @property {string | null} [ref3]
 * @property {string | null} [toMerchantId]
 * @property {string | null} [qrcodeData]
 */

/**
 * @typedef {object} BankDelayData
 * @property {string} qrcodeData
 * @property {BankCode} bankCode
 * @property {string} bankName
 * @property {number} delay
 */

/**
 * @typedef {object} QuotaData
 * @property {number} quota
 * @property {number} overQuota
 * @property {number} specialQuota
 * @property {string} endDate
 * @property {string | null} specialEndDate
 */

/**
 * @typedef {object} NormalizedSlip
 * @property {number | null} amount
 * @property {string | null} paidAt
 * @property {string | null} reference
 * @property {string | null} senderName
 * @property {string | null} receiverName
 * @property {string | null} sendingBankCode
 * @property {string | null} receivingBankCode
 */

/**
 * @typedef {object} VerifySuccess
 * @property {"success"} kind
 * @property {SlipData} data
 * @property {NormalizedSlip} slip
 */

/**
 * @typedef {object} QuotaSuccess
 * @property {"success"} kind
 * @property {QuotaData} data
 */

/**
 * @typedef {"not_an_object"|"unreadable_input"|"input_count"|"empty_data"|"invalid_file"|"empty_file"|"invalid_url"|"invalid_log"|"invalid_amount"} InvalidInputReason
 */

/**
 * @typedef {object} InvalidInputFailure
 * @property {"invalid_input"} kind
 * @property {InvalidInputReason} reason
 * @property {string} message
 */

/**
 * @typedef {object} TimeoutFailure
 * @property {"timeout"} kind
 * @property {number} timeoutMs
 * @property {string} message
 */

/**
 * @typedef {object} NetworkFailure
 * @property {"network_failure"} kind
 * @property {string} message
 */

/**
 * @typedef {object} RuntimeFailure
 * @property {"runtime_failure"} kind
 * @property {string} message
 */

/**
 * @typedef {object} BodyReadFailure
 * @property {"body_read_failure"} kind
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} NonJsonResponseFailure
 * @property {"non_json_response"} kind
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} UnexpectedResponseFailure
 * @property {"unexpected_response"} kind
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} UnknownApiError
 * @property {"unknown_api_error"} kind
 * @property {number} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} MissingSlipInputError
 * @property {"missing_slip_input"} kind
 * @property {1000} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} BranchNotFoundError
 * @property {"branch_not_found"} kind
 * @property {1001} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} InvalidAuthorizationError
 * @property {"invalid_authorization"} kind
 * @property {1002} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} PackageExpiredError
 * @property {"package_expired"} kind
 * @property {1003} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} QuotaOverLimitError
 * @property {"quota_over_limit"} kind
 * @property {1004} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} UnsupportedImageTypeError
 * @property {"unsupported_image_type"} kind
 * @property {1005} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} InvalidImageError
 * @property {"invalid_image"} kind
 * @property {1006} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} QrNotFoundError
 * @property {"qr_not_found"} kind
 * @property {1007} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} InvalidPaymentQrError
 * @property {"invalid_payment_qr"} kind
 * @property {1008} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} BankUnavailableError
 * @property {"bank_unavailable"} kind
 * @property {1009} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} BankDelayError
 * @property {"bank_delay"} kind
 * @property {1010} code
 * @property {number} status
 * @property {string} message
 * @property {BankDelayData} data
 */

/**
 * @typedef {object} QrExpiredOrNotFoundError
 * @property {"qr_expired_or_not_found"} kind
 * @property {1011} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {object} DuplicateSlipError
 * @property {"duplicate_slip"} kind
 * @property {1012} code
 * @property {number} status
 * @property {string} message
 * @property {SlipData} data
 * @property {NormalizedSlip} slip
 */

/**
 * @typedef {object} AmountMismatchError
 * @property {"amount_mismatch"} kind
 * @property {1013} code
 * @property {number} status
 * @property {string} message
 * @property {SlipData} data
 * @property {NormalizedSlip} slip
 */

/**
 * @typedef {object} ReceiverMismatchError
 * @property {"receiver_mismatch"} kind
 * @property {1014} code
 * @property {number} status
 * @property {string} message
 * @property {SlipData} data
 * @property {NormalizedSlip} slip
 */

/**
 * @typedef {object} PackageNotFoundError
 * @property {"package_not_found"} kind
 * @property {1015} code
 * @property {number} status
 * @property {string} message
 */

/**
 * @typedef {MissingSlipInputError|BranchNotFoundError|InvalidAuthorizationError|PackageExpiredError|QuotaOverLimitError|UnsupportedImageTypeError|InvalidImageError|QrNotFoundError|InvalidPaymentQrError|BankUnavailableError|BankDelayError|QrExpiredOrNotFoundError|DuplicateSlipError|AmountMismatchError|ReceiverMismatchError|PackageNotFoundError} SlipOkApiError
 */

/**
 * @typedef {TimeoutFailure|NetworkFailure|RuntimeFailure|BodyReadFailure|NonJsonResponseFailure|UnexpectedResponseFailure|UnknownApiError} TransportFailure
 */

/**
 * @typedef {VerifySuccess|InvalidInputFailure|SlipOkApiError|TransportFailure} VerifySlipResult
 */

/**
 * @typedef {QuotaSuccess|SlipOkApiError|TransportFailure} QuotaResult
 */

/**
 * @typedef {object} SlipOkClient
 * @property {(input: VerifySlipInput) => Promise<VerifySlipResult>} verify
 * @property {() => Promise<QuotaResult>} getQuota
 */

/**
 * @typedef {object} ClientRuntime
 * @property {FetchLike} fetch
 * @property {typeof AbortController} AbortController
 * @property {typeof setTimeout} setTimeout
 * @property {typeof clearTimeout} clearTimeout
 */

/**
 * @typedef {TimeoutFailure|NetworkFailure|RuntimeFailure|BodyReadFailure|NonJsonResponseFailure|UnexpectedResponseFailure} HttpFailure
 */

/**
 * @typedef {{ kind: "success_payload", data: unknown } | { kind: "api_payload", status: number, code: number, data: unknown } | HttpFailure} HttpOutcome
 */

/**
 * @typedef {{ kind: "json", body: string } | { kind: "form", body: FormData }} PreparedRequest
 */

/**
 * @typedef {PreparedRequest|InvalidInputFailure|RuntimeFailure} PrepareVerifyRequestResult
 */

/**
 * @typedef {"jpg"|"jpeg"|"png"|"jfif"|"webp"} ImageFormat
 */

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {object} record
 * @param {string} key
 * @returns {boolean}
 */
function hasOwn(record, key) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/**
 * @param {InvalidInputReason} reason
 * @param {string} message
 * @returns {InvalidInputFailure}
 */
function invalidInput(reason, message) {
  return { kind: "invalid_input", reason, message };
}

/**
 * @returns {RuntimeFailure}
 */
function runtimeFailure() {
  return {
    kind: "runtime_failure",
    message: "A required runtime capability failed.",
  };
}

/**
 * @param {number} timeoutMs
 * @returns {TimeoutFailure}
 */
function timeoutFailure(timeoutMs) {
  return {
    kind: "timeout",
    timeoutMs,
    message: "The SlipOK request timed out.",
  };
}

/**
 * @param {number} status
 * @returns {UnexpectedResponseFailure}
 */
function unexpectedResponse(status) {
  return {
    kind: "unexpected_response",
    status,
    message: "SlipOK returned an unexpected response.",
  };
}

/**
 * @param {number} startedAt
 * @param {number} timeoutMs
 * @returns {boolean}
 */
function deadlinePassed(startedAt, timeoutMs) {
  return Date.now() - startedAt >= timeoutMs;
}

/**
 * @param {number} startedAt
 * @param {number} timeoutMs
 * @returns {TimeoutFailure | null}
 */
function afterSynchronousStage(startedAt, timeoutMs) {
  return deadlinePassed(startedAt, timeoutMs)
    ? timeoutFailure(timeoutMs)
    : null;
}

/**
 * @param {number} startedAt
 * @param {number} timeoutMs
 * @returns {TimeoutFailure | RuntimeFailure}
 */
function failureAfterUnexpected(startedAt, timeoutMs) {
  try {
    return deadlinePassed(startedAt, timeoutMs)
      ? timeoutFailure(timeoutMs)
      : runtimeFailure();
  } catch {
    return runtimeFailure();
  }
}

/**
 * @param {number} startedAt
 * @param {number} timeoutMs
 * @param {number} status
 * @returns {TimeoutFailure | RuntimeFailure | UnexpectedResponseFailure}
 */
function responseInspectionFailure(startedAt, timeoutMs, status) {
  try {
    return (
      afterSynchronousStage(startedAt, timeoutMs) ?? unexpectedResponse(status)
    );
  } catch {
    return runtimeFailure();
  }
}

// ---------------------------------------------------------------------------
// Request preparation / input validation
// ---------------------------------------------------------------------------

/**
 * @param {string} value
 * @returns {boolean}
 */
function isCanonicalBase64(value) {
  return (
    value.length >= 4 &&
    value.length % 4 === 0 &&
    BASE64_PATTERN.test(value)
  );
}

/**
 * @param {string} type
 * @returns {ImageFormat | null}
 */
function imageFormatFromMime(type) {
  switch (type.toLowerCase()) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
}

/**
 * @param {string} name
 * @returns {ImageFormat | null}
 */
function imageFormatFromName(name) {
  const match = /\.([^.]+)$/.exec(name);
  if (match === null) {
    return null;
  }

  const extension = match[1]?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
    case "png":
    case "jfif":
    case "webp":
      return /** @type {ImageFormat} */ (extension);
    default:
      return null;
  }
}

/**
 * @param {ImageFormat} mimeFormat
 * @param {ImageFormat} nameFormat
 * @returns {boolean}
 */
function formatsAgree(mimeFormat, nameFormat) {
  const mimeFamily = mimeFormat === "jpg" ? "jpeg" : mimeFormat;
  const nameFamily =
    nameFormat === "jpg" || nameFormat === "jpeg" || nameFormat === "jfif"
      ? "jpeg"
      : nameFormat;
  return mimeFamily === nameFamily;
}

/**
 * @param {unknown} candidate
 * @param {boolean | undefined} log
 * @param {number | undefined} amount
 * @returns {PreparedRequest | InvalidInputFailure | RuntimeFailure}
 */
function prepareBlobRequest(candidate, log, amount) {
  if (!isRecord(candidate)) {
    return invalidInput("invalid_file", "The file must be a Blob or base64.");
  }

  let arrayBuffer;
  let size;
  let mimeType;
  let name;
  try {
    arrayBuffer = candidate.arrayBuffer;
    size = candidate.size;
    mimeType = candidate.type;
    name = candidate.name;
  } catch {
    return invalidInput("unreadable_input", "The input could not be read.");
  }

  if (
    typeof arrayBuffer !== "function" ||
    typeof size !== "number" ||
    !Number.isFinite(size) ||
    !Number.isInteger(size)
  ) {
    return invalidInput("invalid_file", "The file must be a valid image Blob.");
  }
  if (size <= 0) {
    return invalidInput("empty_file", "The image file must not be empty.");
  }
  if (typeof mimeType !== "string") {
    return invalidInput("invalid_file", "The file MIME type is invalid.");
  }
  if (name !== undefined && typeof name !== "string") {
    return invalidInput("invalid_file", "The file name is invalid.");
  }

  const mimeFormat = mimeType === "" ? null : imageFormatFromMime(mimeType);
  const nameFormat =
    typeof name === "string" && name !== "" ? imageFormatFromName(name) : null;

  if (mimeType !== "" && mimeFormat === null) {
    return invalidInput("invalid_file", "The image format is not supported.");
  }
  if (typeof name === "string" && name !== "" && nameFormat === null) {
    return invalidInput("invalid_file", "The image filename is not supported.");
  }
  if (mimeFormat === null && nameFormat === null) {
    return invalidInput(
      "invalid_file",
      "The image format could not be identified.",
    );
  }
  if (
    mimeFormat !== null &&
    nameFormat !== null &&
    !formatsAgree(mimeFormat, nameFormat)
  ) {
    return invalidInput(
      "invalid_file",
      "The image MIME type and filename conflict.",
    );
  }

  const format = nameFormat ?? mimeFormat;
  if (format === null) {
    return invalidInput(
      "invalid_file",
      "The image format could not be identified.",
    );
  }

  let FormDataConstructor;
  try {
    FormDataConstructor = globalThis.FormData;
  } catch {
    return runtimeFailure();
  }
  if (typeof FormDataConstructor !== "function") {
    return runtimeFailure();
  }

  let formData;
  try {
    formData = new FormDataConstructor();
  } catch {
    return runtimeFailure();
  }

  try {
    formData.append("files", /** @type {Blob} */ (candidate), `slip.${format}`);
  } catch {
    return invalidInput("invalid_file", "The runtime rejected the image Blob.");
  }

  try {
    if (log !== undefined) {
      formData.append("log", String(log));
    }
    if (amount !== undefined) {
      formData.append("amount", String(amount));
    }
  } catch {
    return runtimeFailure();
  }

  return { kind: "form", body: formData };
}

/**
 * @param {VerifySlipInput} input
 * @returns {PrepareVerifyRequestResult}
 */
function prepareVerifyRequest(input) {
  const unknownInput = /** @type {unknown} */ (input);
  try {
    if (!isRecord(unknownInput)) {
      return invalidInput(
        "not_an_object",
        "The verification input must be an object.",
      );
    }

    const inputKeys = /** @type {const} */ (["data", "files", "url"]);
    const presentKeys = inputKeys.filter((key) => hasOwn(unknownInput, key));
    if (presentKeys.length !== 1) {
      return invalidInput(
        "input_count",
        "Provide exactly one of data, files, or url.",
      );
    }

    const hasLog = hasOwn(unknownInput, "log");
    const logValue = hasLog ? unknownInput.log : undefined;
    if (hasLog && typeof logValue !== "boolean") {
      return invalidInput("invalid_log", "log must be a boolean.");
    }

    const hasAmount = hasOwn(unknownInput, "amount");
    const amountValue = hasAmount ? unknownInput.amount : undefined;
    if (
      hasAmount &&
      (typeof amountValue !== "number" ||
        !Number.isFinite(amountValue) ||
        amountValue < 0)
    ) {
      return invalidInput(
        "invalid_amount",
        "amount must be a finite non-negative number.",
      );
    }

    const log = /** @type {boolean | undefined} */ (logValue);
    const amount = /** @type {number | undefined} */ (amountValue);
    const selectedKey = presentKeys[0];

    if (selectedKey === "data") {
      const data = unknownInput.data;
      if (typeof data !== "string" || data.trim() === "") {
        return invalidInput("empty_data", "data must be a nonblank string.");
      }
      return {
        kind: "json",
        body: JSON.stringify({
          data,
          ...(log !== undefined ? { log } : {}),
          ...(amount !== undefined ? { amount } : {}),
        }),
      };
    }

    if (selectedKey === "url") {
      const url = unknownInput.url;
      if (typeof url !== "string" || url.trim() === "") {
        return invalidInput(
          "invalid_url",
          "url must be an absolute HTTP(S) URL.",
        );
      }
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch {
        return invalidInput(
          "invalid_url",
          "url must be an absolute HTTP(S) URL.",
        );
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return invalidInput("invalid_url", "url must use HTTP or HTTPS.");
      }
      return {
        kind: "json",
        body: JSON.stringify({
          url,
          ...(log !== undefined ? { log } : {}),
          ...(amount !== undefined ? { amount } : {}),
        }),
      };
    }

    const files = unknownInput.files;
    if (typeof files === "string") {
      if (!isCanonicalBase64(files)) {
        return invalidInput(
          "invalid_file",
          "files must be non-empty canonical raw base64.",
        );
      }
      return {
        kind: "json",
        body: JSON.stringify({
          files,
          ...(log !== undefined ? { log } : {}),
          ...(amount !== undefined ? { amount } : {}),
        }),
      };
    }

    return prepareBlobRequest(files, log, amount);
  } catch {
    return invalidInput("unreadable_input", "The input could not be read.");
  }
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

/**
 * @param {unknown} value
 * @returns {value is BankCode}
 */
function isBankCode(value) {
  return typeof value === "string" && BANK_CODES.has(value);
}

/**
 * @param {unknown} value
 * @returns {value is ProxyType}
 */
function isProxyType(value) {
  return typeof value === "string" && PROXY_TYPES.has(value);
}

/**
 * @param {unknown} value
 * @returns {value is AccountType}
 */
function isAccountType(value) {
  return typeof value === "string" && ACCOUNT_TYPES.has(value);
}

/**
 * @param {unknown} value
 * @returns {value is number}
 */
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isNonblankString(value) {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * @param {unknown} value
 * @returns {SlipProxy | null}
 */
function parseSlipProxy(value) {
  if (!isRecord(value)) {
    return null;
  }
  const hasType = hasOwn(value, "type");
  const hasValue = hasOwn(value, "value");
  const type = value.type;
  const proxyValue = value.value;
  if (
    (hasType && type !== null && type !== "" && !isProxyType(type)) ||
    (hasValue && proxyValue !== null && typeof proxyValue !== "string")
  ) {
    return null;
  }
  return {
    ...(hasType ? { type: /** @type {ProxyType | "" | null} */ (type) } : {}),
    ...(hasValue
      ? { value: /** @type {string | null} */ (proxyValue) }
      : {}),
  };
}

/**
 * @param {unknown} value
 * @returns {SlipAccount | null}
 */
function parseSlipAccount(value) {
  if (!isRecord(value)) {
    return null;
  }
  const hasType = hasOwn(value, "type");
  const hasValue = hasOwn(value, "value");
  const type = value.type;
  const accountValue = value.value;
  if (
    (hasType && type !== null && type !== "" && !isAccountType(type)) ||
    (hasValue && accountValue !== null && typeof accountValue !== "string")
  ) {
    return null;
  }
  return {
    ...(hasType
      ? { type: /** @type {AccountType | "" | null} */ (type) }
      : {}),
    ...(hasValue
      ? { value: /** @type {string | null} */ (accountValue) }
      : {}),
  };
}

/**
 * @param {unknown} value
 * @returns {SlipSender | null}
 */
function parseSlipParty(value) {
  if (!isRecord(value)) {
    return null;
  }

  const hasDisplayName = hasOwn(value, "displayName");
  const hasName = hasOwn(value, "name");
  if (
    (hasDisplayName &&
      value.displayName !== null &&
      typeof value.displayName !== "string") ||
    (hasName && value.name !== null && typeof value.name !== "string")
  ) {
    return null;
  }

  const hasProxy = hasOwn(value, "proxy");
  /** @type {SlipProxy | null | undefined} */
  let proxy;
  if (hasProxy) {
    if (value.proxy === null) {
      proxy = null;
    } else {
      proxy = parseSlipProxy(value.proxy);
      if (proxy === null) {
        return null;
      }
    }
  }

  const hasAccount = hasOwn(value, "account");
  /** @type {SlipAccount | null | undefined} */
  let account;
  if (hasAccount) {
    if (value.account === null) {
      account = null;
    } else {
      account = parseSlipAccount(value.account);
      if (account === null) {
        return null;
      }
    }
  }

  return {
    ...(hasDisplayName
      ? { displayName: /** @type {string | null} */ (value.displayName) }
      : {}),
    ...(hasName ? { name: /** @type {string | null} */ (value.name) } : {}),
    ...(hasProxy ? { proxy: /** @type {SlipProxy | null} */ (proxy) } : {}),
    ...(hasAccount
      ? { account: /** @type {SlipAccount | null} */ (account) }
      : {}),
  };
}

/**
 * @param {SlipSender | SlipReceiver | null | undefined} party
 * @returns {boolean}
 */
function hasMeaningfulPartyDetail(party) {
  return (
    party !== null &&
    party !== undefined &&
    (isNonblankString(party.displayName) ||
      isNonblankString(party.name) ||
      isNonblankString(party.proxy?.value) ||
      isNonblankString(party.account?.value))
  );
}

/**
 * @param {unknown} value
 * @returns {SlipData | null}
 */
function parseSlipData(value) {
  if (!isRecord(value)) {
    return null;
  }

  const hasSuccess = hasOwn(value, "success");
  const hasMessage = hasOwn(value, "message");
  const hasReceivingBank = hasOwn(value, "receivingBank");
  const hasSendingBank = hasOwn(value, "sendingBank");
  const hasTransRef = hasOwn(value, "transRef");
  const hasTransDate = hasOwn(value, "transDate");
  const hasTransTime = hasOwn(value, "transTime");
  const hasTransTimestamp = hasOwn(value, "transTimestamp");
  const hasAmount = hasOwn(value, "amount");
  const hasCountryCode = hasOwn(value, "countryCode");

  if (
    (hasSuccess && value.success !== true && value.success !== null) ||
    (hasMessage &&
      value.message !== null &&
      typeof value.message !== "string") ||
    (hasReceivingBank &&
      value.receivingBank !== null &&
      value.receivingBank !== "" &&
      !isBankCode(value.receivingBank)) ||
    (hasSendingBank &&
      value.sendingBank !== null &&
      value.sendingBank !== "" &&
      !isBankCode(value.sendingBank)) ||
    (hasTransRef &&
      value.transRef !== null &&
      typeof value.transRef !== "string") ||
    (hasTransDate &&
      value.transDate !== null &&
      typeof value.transDate !== "string") ||
    (hasTransTime &&
      value.transTime !== null &&
      typeof value.transTime !== "string") ||
    (hasTransTimestamp &&
      value.transTimestamp !== null &&
      typeof value.transTimestamp !== "string") ||
    (hasAmount && value.amount !== null && !isFiniteNumber(value.amount)) ||
    (hasCountryCode &&
      value.countryCode !== null &&
      typeof value.countryCode !== "string")
  ) {
    return null;
  }

  const hasSender = hasOwn(value, "sender");
  /** @type {SlipSender | null | undefined} */
  let sender;
  if (hasSender) {
    if (value.sender === null) {
      sender = null;
    } else {
      sender = parseSlipParty(value.sender);
      if (sender === null) {
        return null;
      }
    }
  }

  const hasReceiver = hasOwn(value, "receiver");
  /** @type {SlipReceiver | null | undefined} */
  let receiver;
  if (hasReceiver) {
    if (value.receiver === null) {
      receiver = null;
    } else {
      receiver = parseSlipParty(value.receiver);
      if (receiver === null) {
        return null;
      }
    }
  }

  const hasRqUID = hasOwn(value, "rqUID");
  const hasLanguage = hasOwn(value, "language");
  const hasPaidLocalAmount = hasOwn(value, "paidLocalAmount");
  const hasPaidLocalCurrency = hasOwn(value, "paidLocalCurrency");
  const hasTransFeeAmount = hasOwn(value, "transFeeAmount");
  const hasRef1 = hasOwn(value, "ref1");
  const hasRef2 = hasOwn(value, "ref2");
  const hasRef3 = hasOwn(value, "ref3");
  const hasToMerchantId = hasOwn(value, "toMerchantId");
  const hasQrcodeData = hasOwn(value, "qrcodeData");
  const rqUID = value.rqUID;
  const language = value.language;
  const paidLocalAmount = value.paidLocalAmount;
  const paidLocalCurrency = value.paidLocalCurrency;
  const transFeeAmount = value.transFeeAmount;
  const ref1 = value.ref1;
  const ref2 = value.ref2;
  const ref3 = value.ref3;
  const toMerchantId = value.toMerchantId;
  const qrcodeData = value.qrcodeData;

  if (
    (hasRqUID && rqUID !== null && typeof rqUID !== "string") ||
    (hasLanguage &&
      language !== null &&
      language !== "" &&
      language !== "EN" &&
      language !== "TH") ||
    (hasPaidLocalAmount &&
      paidLocalAmount !== null &&
      !isFiniteNumber(paidLocalAmount)) ||
    (hasPaidLocalCurrency &&
      paidLocalCurrency !== null &&
      typeof paidLocalCurrency !== "string") ||
    (hasTransFeeAmount &&
      transFeeAmount !== null &&
      typeof transFeeAmount !== "string" &&
      !isFiniteNumber(transFeeAmount)) ||
    (hasRef1 && ref1 !== null && typeof ref1 !== "string") ||
    (hasRef2 && ref2 !== null && typeof ref2 !== "string") ||
    (hasRef3 && ref3 !== null && typeof ref3 !== "string") ||
    (hasToMerchantId &&
      toMerchantId !== null &&
      typeof toMerchantId !== "string") ||
    (hasQrcodeData && qrcodeData !== null && typeof qrcodeData !== "string")
  ) {
    return null;
  }

  const hasTransactionIdentity =
    isNonblankString(value.transRef) ||
    isNonblankString(value.transTimestamp) ||
    (isNonblankString(value.transDate) && isNonblankString(value.transTime));
  const hasCorroboratingEvidence =
    isFiniteNumber(value.amount) ||
    isBankCode(value.receivingBank) ||
    isBankCode(value.sendingBank) ||
    hasMeaningfulPartyDetail(sender) ||
    hasMeaningfulPartyDetail(receiver);
  if (!hasTransactionIdentity || !hasCorroboratingEvidence) {
    return null;
  }

  return {
    ...(hasSuccess
      ? { success: /** @type {true | null} */ (value.success) }
      : {}),
    ...(hasMessage
      ? { message: /** @type {string | null} */ (value.message) }
      : {}),
    ...(hasRqUID ? { rqUID: /** @type {string | null} */ (rqUID) } : {}),
    ...(hasLanguage
      ? {
          language: /** @type {"EN" | "TH" | "" | null} */ (language),
        }
      : {}),
    ...(hasReceivingBank
      ? {
          receivingBank: /** @type {BankCode | "" | null} */ (
            value.receivingBank
          ),
        }
      : {}),
    ...(hasSendingBank
      ? {
          sendingBank: /** @type {BankCode | "" | null} */ (value.sendingBank),
        }
      : {}),
    ...(hasTransRef
      ? { transRef: /** @type {string | null} */ (value.transRef) }
      : {}),
    ...(hasTransDate
      ? { transDate: /** @type {string | null} */ (value.transDate) }
      : {}),
    ...(hasTransTime
      ? { transTime: /** @type {string | null} */ (value.transTime) }
      : {}),
    ...(hasTransTimestamp
      ? {
          transTimestamp: /** @type {string | null} */ (value.transTimestamp),
        }
      : {}),
    ...(hasSender ? { sender: /** @type {SlipSender | null} */ (sender) } : {}),
    ...(hasReceiver
      ? { receiver: /** @type {SlipReceiver | null} */ (receiver) }
      : {}),
    ...(hasAmount
      ? { amount: /** @type {number | null} */ (value.amount) }
      : {}),
    ...(hasPaidLocalAmount
      ? {
          paidLocalAmount: /** @type {number | null} */ (paidLocalAmount),
        }
      : {}),
    ...(hasPaidLocalCurrency
      ? {
          paidLocalCurrency: /** @type {string | null} */ (paidLocalCurrency),
        }
      : {}),
    ...(hasCountryCode
      ? {
          countryCode: /** @type {string | null} */ (value.countryCode),
        }
      : {}),
    ...(hasTransFeeAmount
      ? {
          transFeeAmount: /** @type {string | number | null} */ (
            transFeeAmount
          ),
        }
      : {}),
    ...(hasRef1 ? { ref1: /** @type {string | null} */ (ref1) } : {}),
    ...(hasRef2 ? { ref2: /** @type {string | null} */ (ref2) } : {}),
    ...(hasRef3 ? { ref3: /** @type {string | null} */ (ref3) } : {}),
    ...(hasToMerchantId
      ? {
          toMerchantId: /** @type {string | null} */ (toMerchantId),
        }
      : {}),
    ...(hasQrcodeData
      ? { qrcodeData: /** @type {string | null} */ (qrcodeData) }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// Slip normalization (provider-shape extraction lives here, not with callers)
// ---------------------------------------------------------------------------

const TRANS_DATE_PATTERN = /^\d{8}$/;
const TRANS_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

/**
 * @param {number} year
 * @returns {boolean}
 */
function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * @param {number} year
 * @param {number} month 1-based
 * @returns {number}
 */
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
  return /** @type {number} */ (days[month - 1]);
}

/**
 * Pure calendar validation — deliberately avoids the Date constructor so
 * two-digit years are never silently reinterpreted as 19xx.
 *
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {boolean}
 */
function isRealCalendarDate(year, month, day) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

/**
 * Rule 1 of paidAt derivation: use transTimestamp verbatim-parsed when valid.
 *
 * @param {unknown} transTimestamp
 * @returns {string | null}
 */
function paidAtFromTimestamp(transTimestamp) {
  try {
    if (typeof transTimestamp !== "string" || transTimestamp.trim() === "") {
      return null;
    }
    const parsed = new Date(transTimestamp);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed.toISOString();
  } catch {
    return null;
  }
}

/**
 * Rule 2 of paidAt derivation: build from transDate ("yyyyMMdd") and
 * transTime ("HH:mm:ss") as "yyyy-MM-ddTHH:mm:ss+07:00".
 *
 * The +07:00 offset is an inference, not documented by the provider: the
 * provider's own guide example pairs transDate "20200401" / transTime
 * "10:15:07" with transTimestamp "2020-04-01T03:15:07.000Z" — exactly 7
 * hours apart, i.e. Asia/Bangkok. Live capture A in
 * docs/live-captures.md corroborates the same 7-hour offset
 * (transDate/transTime 13:43:12 vs transTimestamp 06:43:12Z).
 *
 * @param {unknown} transDate
 * @param {unknown} transTime
 * @returns {string | null}
 */
function paidAtFromTransDateTime(transDate, transTime) {
  try {
    if (typeof transDate !== "string" || typeof transTime !== "string") {
      return null;
    }
    if (!TRANS_DATE_PATTERN.test(transDate) || !TRANS_TIME_PATTERN.test(transTime)) {
      return null;
    }
    const year = Number(transDate.slice(0, 4));
    const month = Number(transDate.slice(4, 6));
    const day = Number(transDate.slice(6, 8));
    if (!isRealCalendarDate(year, month, day)) {
      return null;
    }
    return `${transDate.slice(0, 4)}-${transDate.slice(4, 6)}-${transDate.slice(6, 8)}T${transTime}+07:00`;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} transTimestamp
 * @param {unknown} transDate
 * @param {unknown} transTime
 * @returns {string | null}
 */
function derivePaidAt(transTimestamp, transDate, transTime) {
  try {
    return (
      paidAtFromTimestamp(transTimestamp) ??
      paidAtFromTransDateTime(transDate, transTime)
    );
  } catch {
    return null;
  }
}

/**
 * displayName wins when it is a non-empty string; otherwise fall back to
 * name. Real responses have shown Thai in one field and English in the
 * other, and name === null while only displayName is usable — never
 * assume either field's language or presence.
 *
 * @param {SlipSender | SlipReceiver | null | undefined} party
 * @returns {string | null}
 */
function derivePartyName(party) {
  try {
    if (!isRecord(party)) {
      return null;
    }
    if (isNonblankString(party.displayName)) {
      return party.displayName;
    }
    if (isNonblankString(party.name)) {
      return party.name;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function toNullableBankCode(value) {
  return isNonblankString(value) ? value : null;
}

/**
 * Extract meaning from a provider SlipData payload. Runs only on an
 * already-validated {@link SlipData} object (the output of
 * {@link parseSlipData}), which by construction holds only plain sanitized
 * values — no getters, no prototype tricks — so nothing here can throw from
 * hostile upstream input. The try/catch is defense in depth, not load
 * bearing: any field that cannot be read degrades to null.
 *
 * Never call this with the code-1010 bank-delay payload — that is a
 * different shape entirely (bank delay metadata), not a slip.
 *
 * @param {SlipData} slipData
 * @returns {NormalizedSlip}
 */
function normalizeSlip(slipData) {
  try {
    const record = isRecord(slipData) ? slipData : {};
    return {
      amount: isFiniteNumber(record.amount) ? record.amount : null,
      paidAt: derivePaidAt(
        record.transTimestamp,
        record.transDate,
        record.transTime,
      ),
      reference: isNonblankString(record.transRef) ? record.transRef : null,
      senderName: derivePartyName(
        /** @type {SlipSender | null | undefined} */ (record.sender),
      ),
      receiverName: derivePartyName(
        /** @type {SlipReceiver | null | undefined} */ (record.receiver),
      ),
      sendingBankCode: toNullableBankCode(record.sendingBank),
      receivingBankCode: toNullableBankCode(record.receivingBank),
    };
  } catch {
    return {
      amount: null,
      paidAt: null,
      reference: null,
      senderName: null,
      receiverName: null,
      sendingBankCode: null,
      receivingBankCode: null,
    };
  }
}

/**
 * @param {unknown} value
 * @returns {BankDelayData | null}
 */
function parseBankDelayData(value) {
  if (
    !isRecord(value) ||
    !isNonblankString(value.qrcodeData) ||
    !isBankCode(value.bankCode) ||
    !isNonblankString(value.bankName) ||
    !isFiniteNumber(value.delay) ||
    value.delay < 0
  ) {
    return null;
  }
  return {
    qrcodeData: value.qrcodeData,
    bankCode: value.bankCode,
    bankName: value.bankName,
    delay: value.delay,
  };
}

/**
 * @param {unknown} value
 * @returns {QuotaData | null}
 */
function parseQuotaData(value) {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.quota) ||
    !isFiniteNumber(value.overQuota) ||
    !isFiniteNumber(value.specialQuota) ||
    typeof value.endDate !== "string" ||
    (value.specialEndDate !== null &&
      typeof value.specialEndDate !== "string")
  ) {
    return null;
  }
  return {
    quota: value.quota,
    overQuota: value.overQuota,
    specialQuota: value.specialQuota,
    endDate: value.endDate,
    specialEndDate: value.specialEndDate,
  };
}

// ---------------------------------------------------------------------------
// Credential guard
// ---------------------------------------------------------------------------

/**
 * @param {unknown} value
 * @param {string} apiKey
 * @returns {boolean}
 */
function containsCredential(value, apiKey) {
  if (typeof value === "string") {
    return value.includes(apiKey);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && String(value) === apiKey;
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsCredential(item, apiKey));
  }
  if (isRecord(value)) {
    return Object.values(value).some((item) =>
      containsCredential(item, apiKey),
    );
  }
  return false;
}

/**
 * @template T
 * @param {string} apiKey
 * @param {readonly unknown[]} exposedUpstreamValues
 * @param {T} result
 * @returns {T | UnexpectedResponseFailure}
 */
function guardUpstreamResult(apiKey, exposedUpstreamValues, result) {
  if (
    exposedUpstreamValues.some((value) => containsCredential(value, apiKey))
  ) {
    return {
      kind: "unexpected_response",
      status: 0,
      message: "SlipOK returned an unexpected response.",
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// API error dispatch (numeric code only)
// ---------------------------------------------------------------------------

/**
 * @param {number} code
 * @param {number} status
 * @param {unknown} data
 * @returns {SlipOkApiError | UnexpectedResponseFailure}
 */
function dispatchApiError(code, status, data) {
  switch (code) {
    case 1000:
      return {
        kind: "missing_slip_input",
        code,
        status,
        message: "Slip input is missing.",
      };
    case 1001:
      return {
        kind: "branch_not_found",
        code,
        status,
        message: "The SlipOK branch was not found.",
      };
    case 1002:
      return {
        kind: "invalid_authorization",
        code,
        status,
        message: "SlipOK rejected the API authorization.",
      };
    case 1003:
      return {
        kind: "package_expired",
        code,
        status,
        message: "The SlipOK package has expired.",
      };
    case 1004:
      return {
        kind: "quota_over_limit",
        code,
        status,
        message: "The SlipOK package is over its quota limit.",
      };
    case 1005:
      return {
        kind: "unsupported_image_type",
        code,
        status,
        message: "SlipOK does not support the submitted image type.",
      };
    case 1006:
      return {
        kind: "invalid_image",
        code,
        status,
        message: "SlipOK could not read the submitted image.",
      };
    case 1007:
      return {
        kind: "qr_not_found",
        code,
        status,
        message: "SlipOK did not find a QR code in the image.",
      };
    case 1008:
      return {
        kind: "invalid_payment_qr",
        code,
        status,
        message: "The QR code is not a payment-verification QR.",
      };
    case 1009:
      return {
        kind: "bank_unavailable",
        code,
        status,
        message: "The bank service is temporarily unavailable.",
      };
    case 1010: {
      const delayData = parseBankDelayData(data);
      if (delayData === null) {
        return unexpectedResponse(status);
      }
      return {
        kind: "bank_delay",
        code,
        status,
        message: "The bank requires verification to be retried after a delay.",
        data: delayData,
      };
    }
    case 1011:
      return {
        kind: "qr_expired_or_not_found",
        code,
        status,
        message: "The QR code is expired or has no matching transaction.",
      };
    case 1012: {
      const slipData = parseSlipData(data);
      if (slipData === null) {
        return unexpectedResponse(status);
      }
      return {
        kind: "duplicate_slip",
        code,
        status,
        message: "SlipOK identified a duplicate slip.",
        data: slipData,
        slip: normalizeSlip(slipData),
      };
    }
    case 1013: {
      const slipData = parseSlipData(data);
      if (slipData === null) {
        return unexpectedResponse(status);
      }
      return {
        kind: "amount_mismatch",
        code,
        status,
        message: "The submitted amount does not match the slip amount.",
        data: slipData,
        slip: normalizeSlip(slipData),
      };
    }
    case 1014: {
      const slipData = parseSlipData(data);
      if (slipData === null) {
        return unexpectedResponse(status);
      }
      return {
        kind: "receiver_mismatch",
        code,
        status,
        message: "The slip receiver does not match the branch receiver.",
        data: slipData,
        slip: normalizeSlip(slipData),
      };
    }
    case 1015:
      return {
        kind: "package_not_found",
        code,
        status,
        message: "No SlipOK package was found.",
      };
    default:
      return unexpectedResponse(status);
  }
}

// ---------------------------------------------------------------------------
// HTTP transport
// ---------------------------------------------------------------------------

/**
 * @param {ClientRuntime} runtime
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} startedAt
 * @param {number} timeoutMs
 * @returns {Promise<HttpOutcome>}
 */
async function fetchAndParse(runtime, url, init, startedAt, timeoutMs) {
  const beforeFetch = afterSynchronousStage(startedAt, timeoutMs);
  if (beforeFetch !== null) {
    return beforeFetch;
  }

  let response;
  try {
    const fetchFunction = runtime.fetch;
    response = await fetchFunction(url, init);
  } catch {
    try {
      return deadlinePassed(startedAt, timeoutMs)
        ? timeoutFailure(timeoutMs)
        : {
            kind: "network_failure",
            message:
              "The SlipOK request failed before a response was received.",
          };
    } catch {
      return runtimeFailure();
    }
  }

  const afterFetch = afterSynchronousStage(startedAt, timeoutMs);
  if (afterFetch !== null) {
    return afterFetch;
  }

  let status = 0;
  /** @type {((...args: never[]) => unknown) | null} */
  let textMethod = null;
  /** @type {UnexpectedResponseFailure | null} */
  let inspectionFailure = null;
  try {
    if (!isRecord(response)) {
      inspectionFailure = unexpectedResponse(0);
    } else {
      const candidateStatus = response.status;
      if (
        typeof candidateStatus !== "number" ||
        !Number.isInteger(candidateStatus) ||
        candidateStatus < 100 ||
        candidateStatus > 599
      ) {
        inspectionFailure = unexpectedResponse(0);
      } else {
        status = candidateStatus;
        const candidateTextMethod = response.text;
        if (typeof candidateTextMethod !== "function") {
          inspectionFailure = unexpectedResponse(status);
        } else {
          textMethod = /** @type {(...args: never[]) => unknown} */ (
            candidateTextMethod
          );
        }
      }
    }
  } catch {
    return responseInspectionFailure(startedAt, timeoutMs, status);
  }

  const afterInspection = afterSynchronousStage(startedAt, timeoutMs);
  if (afterInspection !== null) {
    return afterInspection;
  }
  if (inspectionFailure !== null) {
    return inspectionFailure;
  }
  if (textMethod === null) {
    return unexpectedResponse(status);
  }

  let responseText;
  try {
    responseText = await textMethod.call(response);
  } catch {
    if (deadlinePassed(startedAt, timeoutMs)) {
      return timeoutFailure(timeoutMs);
    }
    return {
      kind: "body_read_failure",
      status,
      message: "The SlipOK response body could not be read.",
    };
  }

  const afterBodyRead = afterSynchronousStage(startedAt, timeoutMs);
  if (afterBodyRead !== null) {
    return afterBodyRead;
  }
  if (typeof responseText !== "string") {
    return unexpectedResponse(status);
  }

  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    const afterJsonFailure = afterSynchronousStage(startedAt, timeoutMs);
    if (afterJsonFailure !== null) {
      return afterJsonFailure;
    }
    return {
      kind: "non_json_response",
      status,
      message: "SlipOK returned a non-JSON response.",
    };
  }

  const afterJson = afterSynchronousStage(startedAt, timeoutMs);
  if (afterJson !== null) {
    return afterJson;
  }

  /** @type {HttpOutcome} */
  let parsedOutcome;
  try {
    if (!isRecord(parsed)) {
      parsedOutcome = unexpectedResponse(status);
    } else {
      const hasSuccess = hasOwn(parsed, "success");
      const hasCode = hasOwn(parsed, "code");
      if (status === 200) {
        parsedOutcome =
          !hasSuccess || hasCode || parsed.success !== true
            ? unexpectedResponse(status)
            : { kind: "success_payload", data: parsed.data };
      } else if (
        !hasCode ||
        typeof parsed.code !== "number" ||
        !Number.isInteger(parsed.code)
      ) {
        parsedOutcome = unexpectedResponse(status);
      } else {
        parsedOutcome = {
          kind: "api_payload",
          status,
          code: parsed.code,
          data: parsed.data,
        };
      }
    }
  } catch {
    return responseInspectionFailure(startedAt, timeoutMs, status);
  }

  const afterEnvelope = afterSynchronousStage(startedAt, timeoutMs);
  if (afterEnvelope !== null) {
    return afterEnvelope;
  }
  return parsedOutcome;
}

/**
 * @param {ClientRuntime} runtime
 * @param {string} url
 * @param {Omit<RequestInit, "signal">} init
 * @param {number} startedAt
 * @param {number} timeoutMs
 * @returns {Promise<HttpOutcome>}
 */
async function performHttpRequest(runtime, url, init, startedAt, timeoutMs) {
  const beforeController = afterSynchronousStage(startedAt, timeoutMs);
  if (beforeController !== null) {
    return beforeController;
  }

  let controller;
  try {
    controller = new runtime.AbortController();
  } catch {
    return failureAfterUnexpected(startedAt, timeoutMs);
  }

  const afterController = afterSynchronousStage(startedAt, timeoutMs);
  if (afterController !== null) {
    return afterController;
  }

  const remainingMs = timeoutMs - (Date.now() - startedAt);
  if (remainingMs <= 0) {
    return timeoutFailure(timeoutMs);
  }

  /** @type {ReturnType<typeof setTimeout>} */
  let timerHandle;
  /** @type {(failure: TimeoutFailure) => void} */
  let resolveTimeout = () => undefined;
  const timeoutPromise = new Promise((resolve) => {
    resolveTimeout = resolve;
  });

  try {
    const setTimer = runtime.setTimeout;
    timerHandle = setTimer(() => {
      resolveTimeout(timeoutFailure(timeoutMs));
      try {
        controller.abort();
      } catch {
        // The timeout result is already settled; abort errors are contained.
      }
    }, remainingMs);
  } catch {
    return failureAfterUnexpected(startedAt, timeoutMs);
  }

  /** @type {HttpOutcome} */
  let outcome;
  try {
    const afterTimerSetup = afterSynchronousStage(startedAt, timeoutMs);
    if (afterTimerSetup !== null) {
      outcome = afterTimerSetup;
    } else {
      const workPromise = Promise.resolve()
        .then(() =>
          fetchAndParse(
            runtime,
            url,
            { ...init, signal: controller.signal },
            startedAt,
            timeoutMs,
          ),
        )
        .catch(() => failureAfterUnexpected(startedAt, timeoutMs));

      void workPromise.catch(() => undefined);

      try {
        outcome = await Promise.race([workPromise, timeoutPromise]);
      } catch {
        outcome = failureAfterUnexpected(startedAt, timeoutMs);
      }
    }
  } finally {
    try {
      const clearTimer = runtime.clearTimeout;
      clearTimer(timerHandle);
    } catch {
      // Cleanup failure must not make an otherwise completed operation throw.
    }
  }

  const afterCleanup = afterSynchronousStage(startedAt, timeoutMs);
  return afterCleanup ?? outcome;
}

/**
 * @param {string} apiKey
 * @param {HttpFailure} failure
 * @returns {HttpFailure}
 */
function guardHttpFailure(apiKey, failure) {
  if (
    failure.kind === "body_read_failure" ||
    failure.kind === "non_json_response" ||
    failure.kind === "unexpected_response"
  ) {
    if (failure.status !== 0) {
      return /** @type {HttpFailure} */ (
        guardUpstreamResult(apiKey, [failure.status], failure)
      );
    }
  }
  return failure;
}

/**
 * @param {string} apiKey
 * @param {number} status
 * @param {number} code
 * @param {unknown} data
 * @returns {SlipOkApiError | UnexpectedResponseFailure | UnknownApiError}
 */
function apiResult(apiKey, status, code, data) {
  if (code < 1000 || code > 1015) {
    /** @type {UnknownApiError} */
    const unknownError = {
      kind: "unknown_api_error",
      code,
      status,
      message: "SlipOK returned an unknown API error code.",
    };
    return guardUpstreamResult(apiKey, [status, code], unknownError);
  }

  const dispatched = dispatchApiError(code, status, data);
  if (dispatched.kind === "unexpected_response") {
    return guardUpstreamResult(apiKey, [status], dispatched);
  }
  /** @type {unknown[]} */
  const exposedValues = [status, code];
  if ("data" in dispatched) {
    exposedValues.push(dispatched.data);
  }
  if ("slip" in dispatched) {
    exposedValues.push(dispatched.slip);
  }
  return guardUpstreamResult(apiKey, exposedValues, dispatched);
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

/**
 * @param {string} branchId
 * @param {string} apiKey
 * @param {number} timeoutMs
 * @param {ClientRuntime} runtime
 * @returns {SlipOkClient}
 */
function createClient(branchId, apiKey, timeoutMs, runtime) {
  const verificationUrl = `${ENDPOINT_PREFIX}${branchId}`;
  const quotaUrl = `${verificationUrl}/quota`;

  return {
    /**
     * @param {VerifySlipInput} input
     * @returns {Promise<VerifySlipResult>}
     */
    async verify(input) {
      let startedAt = 0;
      try {
        startedAt = Date.now();
        const prepared = prepareVerifyRequest(input);
        const afterInput = afterSynchronousStage(startedAt, timeoutMs);
        if (afterInput !== null) {
          return afterInput;
        }
        if (
          prepared.kind === "invalid_input" ||
          prepared.kind === "runtime_failure"
        ) {
          return prepared;
        }

        const headers =
          prepared.kind === "json"
            ? {
                "x-authorization": apiKey,
                "content-type": "application/json",
              }
            : { "x-authorization": apiKey };

        const outcome = await performHttpRequest(
          runtime,
          verificationUrl,
          {
            method: "POST",
            headers,
            body: prepared.body,
            redirect: "error",
          },
          startedAt,
          timeoutMs,
        );

        if (outcome.kind === "success_payload") {
          const data = parseSlipData(outcome.data);
          const afterValidation = afterSynchronousStage(startedAt, timeoutMs);
          if (afterValidation !== null) {
            return afterValidation;
          }
          if (data === null) {
            const guarded = guardUpstreamResult(
              apiKey,
              [200],
              unexpectedResponse(200),
            );
            const afterGuard = afterSynchronousStage(startedAt, timeoutMs);
            return afterGuard ?? guarded;
          }
          const slip = normalizeSlip(data);
          const guarded = guardUpstreamResult(apiKey, [data, slip], {
            kind: /** @type {const} */ ("success"),
            data,
            slip,
          });
          const afterGuard = afterSynchronousStage(startedAt, timeoutMs);
          return afterGuard ?? guarded;
        }

        if (outcome.kind === "api_payload") {
          const result = apiResult(
            apiKey,
            outcome.status,
            outcome.code,
            outcome.data,
          );
          const afterDispatch = afterSynchronousStage(startedAt, timeoutMs);
          return afterDispatch ?? result;
        }

        const guarded = guardHttpFailure(apiKey, outcome);
        const afterGuard = afterSynchronousStage(startedAt, timeoutMs);
        return afterGuard ?? guarded;
      } catch {
        return startedAt !== 0
          ? failureAfterUnexpected(startedAt, timeoutMs)
          : runtimeFailure();
      }
    },

    /**
     * @returns {Promise<QuotaResult>}
     */
    async getQuota() {
      let startedAt = 0;
      try {
        startedAt = Date.now();
        const outcome = await performHttpRequest(
          runtime,
          quotaUrl,
          {
            method: "GET",
            headers: { "x-authorization": apiKey },
            redirect: "error",
          },
          startedAt,
          timeoutMs,
        );

        if (outcome.kind === "success_payload") {
          const data = parseQuotaData(outcome.data);
          const afterValidation = afterSynchronousStage(startedAt, timeoutMs);
          if (afterValidation !== null) {
            return afterValidation;
          }
          if (data === null) {
            const guarded = guardUpstreamResult(
              apiKey,
              [200],
              unexpectedResponse(200),
            );
            const afterGuard = afterSynchronousStage(startedAt, timeoutMs);
            return afterGuard ?? guarded;
          }
          const guarded = guardUpstreamResult(apiKey, [data], {
            kind: /** @type {const} */ ("success"),
            data,
          });
          const afterGuard = afterSynchronousStage(startedAt, timeoutMs);
          return afterGuard ?? guarded;
        }

        if (outcome.kind === "api_payload") {
          const result = apiResult(
            apiKey,
            outcome.status,
            outcome.code,
            outcome.data,
          );
          const afterDispatch = afterSynchronousStage(startedAt, timeoutMs);
          return afterDispatch ?? result;
        }

        const guarded = guardHttpFailure(apiKey, outcome);
        const afterGuard = afterSynchronousStage(startedAt, timeoutMs);
        return afterGuard ?? guarded;
      } catch {
        return startedAt !== 0
          ? failureAfterUnexpected(startedAt, timeoutMs)
          : runtimeFailure();
      }
    },
  };
}

/**
 * Create a non-throwing SlipOK client.
 *
 * @param {SlipOkClientOptions} options
 * @returns {CreateSlipOkClientResult}
 */
export function createSlipOkClient(options) {
  try {
    const candidate = /** @type {unknown} */ (options);
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      Array.isArray(candidate)
    ) {
      return {
        kind: "invalid_client_configuration",
        field: "options",
        message: "Client options must be an object.",
      };
    }

    const record = /** @type {Record<string, unknown>} */ (candidate);
    const branchId = record.branchId;
    if (typeof branchId !== "string" || !BRANCH_ID_PATTERN.test(branchId)) {
      return {
        kind: "invalid_client_configuration",
        field: "branchId",
        message: "branchId must be a safe non-empty path segment.",
      };
    }

    const apiKey = record.apiKey;
    if (typeof apiKey !== "string" || !API_KEY_PATTERN.test(apiKey)) {
      return {
        kind: "invalid_client_configuration",
        field: "apiKey",
        message: "apiKey must contain only nonblank visible ASCII characters.",
      };
    }

    try {
      const HeadersConstructor = globalThis.Headers;
      if (typeof HeadersConstructor === "function") {
        const headers = new HeadersConstructor();
        headers.set("x-authorization", apiKey);
      }
    } catch {
      return {
        kind: "invalid_client_configuration",
        field: "apiKey",
        message: "apiKey cannot be represented safely as a request header.",
      };
    }

    const timeoutCandidate = record.timeoutMs;
    const timeoutMs =
      timeoutCandidate === undefined ? DEFAULT_TIMEOUT_MS : timeoutCandidate;
    if (
      typeof timeoutMs !== "number" ||
      !Number.isFinite(timeoutMs) ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > MAX_TIMEOUT_MS
    ) {
      return {
        kind: "invalid_client_configuration",
        field: "timeoutMs",
        message: "timeoutMs must be an integer from 1 through 300000.",
      };
    }

    const configuredFetch = record.fetch;
    let fetchCandidate = configuredFetch;
    if (configuredFetch === undefined) {
      try {
        fetchCandidate = globalThis.fetch;
      } catch {
        return {
          kind: "invalid_client_configuration",
          field: "fetch",
          message: "A standards-compatible fetch function is required.",
        };
      }
    }
    if (typeof fetchCandidate !== "function") {
      return {
        kind: "invalid_client_configuration",
        field: "fetch",
        message: "A standards-compatible fetch function is required.",
      };
    }

    let AbortControllerConstructor;
    let setTimeoutFunction;
    let clearTimeoutFunction;
    try {
      AbortControllerConstructor = globalThis.AbortController;
      setTimeoutFunction = globalThis.setTimeout;
      clearTimeoutFunction = globalThis.clearTimeout;
    } catch {
      return {
        kind: "invalid_client_configuration",
        field: "runtime",
        message: "AbortController and timer capabilities are required.",
      };
    }
    if (
      typeof AbortControllerConstructor !== "function" ||
      typeof setTimeoutFunction !== "function" ||
      typeof clearTimeoutFunction !== "function"
    ) {
      return {
        kind: "invalid_client_configuration",
        field: "runtime",
        message: "AbortController and timer capabilities are required.",
      };
    }

    /** @type {ClientRuntime} */
    const runtime = {
      fetch: /** @type {FetchLike} */ (fetchCandidate),
      AbortController: /** @type {typeof AbortController} */ (
        AbortControllerConstructor
      ),
      setTimeout: /** @type {typeof setTimeout} */ (setTimeoutFunction),
      clearTimeout: /** @type {typeof clearTimeout} */ (clearTimeoutFunction),
    };

    return {
      kind: "success",
      client: createClient(branchId, apiKey, timeoutMs, runtime),
    };
  } catch {
    return {
      kind: "invalid_client_configuration",
      field: "options",
      message: "Client options could not be read safely.",
    };
  }
}

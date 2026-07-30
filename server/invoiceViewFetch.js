const INVOICE_VIEW_FETCH_TIMEOUT_MS = 15_000;

const INVOICE_VIEW_ROW_KEYS = [
  'invoiceNumber',
  'status',
  'billingType',
  'billingPeriodStart',
  'billingPeriodEnd',
  'issuedDate',
  'dueDate',
  'customerId',
  'customerJson',
  'itemsJson',
  'adjustmentsJson',
  'paymentsJson',
  'subtotal',
  'adjustmentTotal',
  'grandTotal',
  'paidAmount',
  'balanceDue',
];

function logInvoiceViewFetchFailure(logPrefix, reason, status) {
  try {
    const details = status === undefined ? { reason } : { reason, status };
    console.warn(`[${logPrefix}] InvoiceView fetch did not complete.`, details);
  } catch {
    // Observability must never affect the caller's result.
  }
}

function fetchFailure(logPrefix, reason, status) {
  logInvoiceViewFetchFailure(logPrefix, reason, status);
  return status === undefined ? { ok: false, reason } : { ok: false, reason, status };
}

function buildRow(body) {
  const row = {};
  for (const key of INVOICE_VIEW_ROW_KEYS) {
    row[key] = Object.prototype.hasOwnProperty.call(body, key) ? body[key] : null;
  }
  return row;
}

/**
 * Read the invoice read model live through the configured Apps Script endpoint.
 *
 * Returns a safe result code for every failure mode. It deliberately never
 * includes an upstream response body or error message.
 */
export async function getInvoiceViewFetchResult(invoiceNumber, { logPrefix = 'invoice-view-fetch' } = {}) {
  try {
    const configuredUrl = process.env.APPSCRIPT_INVOICE_URL;
    if (typeof configuredUrl !== 'string' || configuredUrl.trim().length === 0) {
      return fetchFailure(logPrefix, 'missing_config');
    }

    let endpointUrl;
    try {
      endpointUrl = new URL(configuredUrl);
    } catch {
      return fetchFailure(logPrefix, 'invalid_config');
    }
    if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
      return fetchFailure(logPrefix, 'invalid_config');
    }

    if (typeof globalThis.fetch !== 'function' || typeof globalThis.AbortController !== 'function') {
      return fetchFailure(logPrefix, 'runtime_unavailable');
    }

    endpointUrl.searchParams.set('invoiceNumber', invoiceNumber);
    const requestUrl = endpointUrl.toString();

    const controller = new globalThis.AbortController();
    let timeoutHandle;
    let resolveTimeout;
    const timeoutPromise = new Promise((resolve) => {
      resolveTimeout = resolve;
      timeoutHandle = setTimeout(() => {
        try {
          controller.abort();
        } catch {
          // The timeout result is still authoritative for this bounded call.
        }
        resolveTimeout({ kind: 'timeout' });
      }, INVOICE_VIEW_FETCH_TIMEOUT_MS);
    });

    const fetchPromise = Promise.resolve()
      .then(() => globalThis.fetch(requestUrl, {
        method: 'GET',
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
            return { kind: 'invalid_response', status };
          }
          body = await response.json();
        } catch {
          return { kind: 'invalid_response', status };
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
      return fetchFailure(logPrefix, 'timeout');
    }
    if (result.kind === 'network_failure') {
      return fetchFailure(logPrefix, 'network_failure');
    }
    if (result.kind === 'invalid_response') {
      return fetchFailure(logPrefix, 'invalid_response', result.status);
    }

    if (!result.ok) {
      return fetchFailure(logPrefix, 'rejected_http', result.status);
    }

    const body = result.body;
    let bodyOk = false;
    try {
      bodyOk = body?.ok === true;
    } catch {
      bodyOk = false;
    }

    if (!bodyOk) {
      let notFound = false;
      try {
        notFound = body?.ok === false && body?.error === 'invoice not found';
      } catch {
        notFound = false;
      }
      if (notFound) {
        return { ok: true, found: false };
      }
      return fetchFailure(logPrefix, 'rejected_body', result.status);
    }

    try {
      return { ok: true, found: true, row: buildRow(body) };
    } catch {
      return fetchFailure(logPrefix, 'invalid_response', result.status);
    }
  } catch {
    return fetchFailure(logPrefix, 'unexpected_failure');
  }
}

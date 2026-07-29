const INVOICE_VIEW_SYNC_TIMEOUT_MS = 15_000;

function logInvoiceViewSyncFailure(logPrefix, reason, status) {
  try {
    const details = status === undefined ? { reason } : { reason, status };
    console.warn(`[${logPrefix}] InvoiceView sync did not complete.`, details);
  } catch {
    // Observability must never affect the caller's result.
  }
}

function syncFailure(logPrefix, reason, status) {
  logInvoiceViewSyncFailure(logPrefix, reason, status);
  return status === undefined ? { ok: false, reason } : { ok: false, reason, status };
}

/**
 * Refresh the invoice read model through the configured Apps Script endpoint.
 *
 * Returns a safe result code for every failure mode. It deliberately never
 * includes an upstream response body or error message.
 */
export async function getInvoiceViewSyncResult(invoiceNumber, { logPrefix = 'invoice-view-sync' } = {}) {
  try {
    const configuredUrl = process.env.APPSCRIPT_INVOICE_VIEW_SYNC_URL;
    if (typeof configuredUrl !== 'string' || configuredUrl.trim().length === 0) {
      return syncFailure(logPrefix, 'missing_config');
    }

    let endpointUrl;
    try {
      endpointUrl = new URL(configuredUrl);
    } catch {
      return syncFailure(logPrefix, 'invalid_config');
    }
    if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
      return syncFailure(logPrefix, 'invalid_config');
    }

    if (typeof globalThis.fetch !== 'function' || typeof globalThis.AbortController !== 'function') {
      return syncFailure(logPrefix, 'runtime_unavailable');
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
          // The timeout result is still authoritative for this bounded call.
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
      return syncFailure(logPrefix, 'timeout');
    }
    if (result.kind === 'network_failure') {
      return syncFailure(logPrefix, 'network_failure');
    }
    if (result.kind === 'invalid_response') {
      return syncFailure(logPrefix, 'invalid_response', result.status);
    }

    let bodyAccepted = false;
    try {
      bodyAccepted = result.body?.ok === true;
    } catch {
      bodyAccepted = false;
    }
    if (!result.ok) {
      return syncFailure(logPrefix, 'rejected_http', result.status);
    }
    if (!bodyAccepted) {
      return syncFailure(logPrefix, 'rejected_body', result.status);
    }
    return { ok: true };
  } catch {
    return syncFailure(logPrefix, 'unexpected_failure');
  }
}

/**
 * Compatibility wrapper for callers where syncing remains best-effort.
 */
export async function syncInvoiceView(invoiceNumber, options) {
  const result = await getInvoiceViewSyncResult(invoiceNumber, options);
  return result.ok;
}

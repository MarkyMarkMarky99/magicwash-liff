const INVOICE_VIEW_SYNC_TIMEOUT_MS = 15_000;

function logInvoiceViewSyncFailure(logPrefix, reason, status) {
  try {
    const details = status === undefined ? { reason } : { reason, status };
    console.warn(`[${logPrefix}] InvoiceView sync did not complete.`, details);
  } catch {
    // Observability must never affect the caller's result.
  }
}

/**
 * Refresh the invoice read model through the configured Apps Script endpoint.
 *
 * Returns false for every failure mode so callers can decide whether the sync
 * is best-effort (payment recording) or required (pre-display refresh).
 */
export async function syncInvoiceView(invoiceNumber, { logPrefix = 'invoice-view-sync' } = {}) {
  try {
    const configuredUrl = process.env.APPSCRIPT_INVOICE_VIEW_SYNC_URL;
    if (typeof configuredUrl !== 'string' || configuredUrl.trim().length === 0) {
      logInvoiceViewSyncFailure(logPrefix, 'missing_config');
      return false;
    }

    let endpointUrl;
    try {
      endpointUrl = new URL(configuredUrl);
    } catch {
      logInvoiceViewSyncFailure(logPrefix, 'invalid_config');
      return false;
    }
    if (endpointUrl.protocol !== 'http:' && endpointUrl.protocol !== 'https:') {
      logInvoiceViewSyncFailure(logPrefix, 'invalid_config');
      return false;
    }

    if (typeof globalThis.fetch !== 'function' || typeof globalThis.AbortController !== 'function') {
      logInvoiceViewSyncFailure(logPrefix, 'runtime_unavailable');
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
      logInvoiceViewSyncFailure(logPrefix, 'timeout');
      return false;
    }
    if (result.kind === 'network_failure') {
      logInvoiceViewSyncFailure(logPrefix, 'network_failure');
      return false;
    }
    if (result.kind === 'invalid_response') {
      logInvoiceViewSyncFailure(logPrefix, 'invalid_response');
      return false;
    }

    let bodyAccepted = false;
    try {
      bodyAccepted = result.body?.ok === true;
    } catch {
      bodyAccepted = false;
    }
    if (!result.ok) {
      logInvoiceViewSyncFailure(logPrefix, 'rejected_http', result.status);
      return false;
    }
    if (!bodyAccepted) {
      logInvoiceViewSyncFailure(logPrefix, 'rejected_body', result.status);
      return false;
    }
    return true;
  } catch {
    logInvoiceViewSyncFailure(logPrefix, 'unexpected_failure');
    return false;
  }
}

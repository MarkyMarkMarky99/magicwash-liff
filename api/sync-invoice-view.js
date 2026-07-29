import { getInvoiceViewSyncResult } from '../server/invoiceViewSync.js';

const INVOICE_NUMBER_RE = /^INV\d{12}$/;

function syncDiagnostic(result) {
  return {
    reason: result.reason,
    ...(Number.isInteger(result.status) ? { status: result.status } : {}),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const body = req.body;
  if (
    !body
    || typeof body !== 'object'
    || Array.isArray(body)
    || Object.keys(body).some((key) => key !== 'invoiceNumber')
    || typeof body.invoiceNumber !== 'string'
  ) {
    return res.status(400).json({ ok: false, error: 'BAD_REQUEST' });
  }

  const invoiceNumber = body.invoiceNumber.trim();
  if (!INVOICE_NUMBER_RE.test(invoiceNumber)) {
    return res.status(400).json({ ok: false, error: 'BAD_REQUEST' });
  }

  const syncResult = await getInvoiceViewSyncResult(invoiceNumber, { logPrefix: 'sync-invoice-view' });
  if (!syncResult.ok) {
    const diagnostic = syncDiagnostic(syncResult);
    return res.status(502).json({
      ok: false,
      error: 'SYNC_FAILED',
      // These are normalized local codes and a numeric status only. Upstream
      // response bodies and error messages never leave the server.
      diagnostic,
    });
  }

  return res.status(200).json({ ok: true, invoiceNumber });
}

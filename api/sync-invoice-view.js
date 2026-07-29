import { syncInvoiceView } from '../server/invoiceViewSync.js';

const INVOICE_NUMBER_RE = /^INV\d{12}$/;

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

  const synced = await syncInvoiceView(invoiceNumber, { logPrefix: 'sync-invoice-view' });
  if (!synced) {
    return res.status(502).json({ ok: false, error: 'SYNC_FAILED' });
  }

  return res.status(200).json({ ok: true, invoiceNumber });
}

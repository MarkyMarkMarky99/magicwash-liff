/**
 * Vercel Serverless Function — Live invoice read via Apps Script `doGet`
 *
 * Used only for outstanding-balance invoices, where the materialized
 * `InvoicesView` GViz sheet can lag behind real writes. Reuses the same
 * Apps Script deployment (and env var) as the existing sync `doPost`.
 *
 * Query params:
 *   invoiceNumber - required, must match /^INV\d{12}$/
 *
 * Returns: JSON array (mirrors api/gviz.js's array contract)
 *   - [] when the invoice is not found
 *   - [row] when found
 */
import { getInvoiceViewFetchResult } from '../server/invoiceViewFetch.js';

const INVOICE_NUMBER_RE = /^INV\d{12}$/;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { invoiceNumber } = req.query;
  if (typeof invoiceNumber !== 'string' || !INVOICE_NUMBER_RE.test(invoiceNumber)) {
    return res.status(400).json({ error: 'invoiceNumber is required' });
  }

  const result = await getInvoiceViewFetchResult(invoiceNumber, { logPrefix: 'appscript-invoice' });

  if (!result.ok) {
    return res.status(502).json({ error: 'UPSTREAM_FETCH_FAILED' });
  }

  if (!result.found) {
    return res.status(200).json([]);
  }

  return res.status(200).json([result.row]);
}

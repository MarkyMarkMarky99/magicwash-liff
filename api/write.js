/**
 * Vercel Serverless Function — Generic AppScript write proxy
 *
 * Keeps AppScript deployment URLs server-side.
 * Validates required client-supplied fields before forwarding.
 * Body: { table: string, payload: object }
 *
 * Known tables:
 *   customer    — APPSCRIPT_CUSTOMER_URL    (register, update)
 *   appointment — APPSCRIPT_APPOINTMENT_URL (create pickup)
 */

const WRITE_TARGETS = {
  customer: {
    url:      process.env.APPSCRIPT_CUSTOMER_URL,
    required: ['customerName'],
    requiredByAction: {
      UPDATE: ['customerId'],
    },
  },
  appointment: {
    url:      process.env.APPSCRIPT_APPOINTMENT_URL,
    required: ['customerId', 'appointmentType', 'appointmentDate', 'timeSlot'],
  },
};

function validate(required, data) {
  const missing = required.filter((k) => data[k] == null || data[k] === '');
  return missing.length ? `Missing required fields: ${missing.join(', ')}` : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { table, payload } = req.body ?? {};

  if (!table || !payload) {
    return res.status(400).json({ error: 'table and payload are required' });
  }

  const target = WRITE_TARGETS[table];
  if (!target) {
    return res.status(400).json({
      error: `Unknown table "${table}". Known: ${Object.keys(WRITE_TARGETS).join(', ')}`,
    });
  }

  const required = target.requiredByAction?.[payload.action] ?? target.required;
  const validationError = validate(required, payload);
  if (validationError) return res.status(422).json({ error: validationError });

  const upstream = await fetch(target.url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  });

  if (!upstream.ok) {
    return res.status(502).json({ error: `Upstream responded ${upstream.status}` });
  }

  return res.json(await upstream.json());
}

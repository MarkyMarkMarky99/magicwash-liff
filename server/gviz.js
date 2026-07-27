// Shared GViz utilities for the /api/gviz route.

import { columns as orderFormColumns,     dateColumns as orderFormDates,     headers as orderFormHeaders,     schema as orderFormSchema     } from '../server/schemas/orderForm.js';
import { columns as customersColumns,     dateColumns as customersDates,     headers as customersHeaders,     schema as customersSchema     } from '../server/schemas/customers.js';
import { columns as laundryItemsColumns,  dateColumns as laundryItemsDates,  headers as laundryItemsHeaders,  schema as laundryItemsSchema  } from '../server/schemas/laundryItems.js';
import { columns as laundryPhotosColumns, dateColumns as laundryPhotosDates, headers as laundryPhotosHeaders, schema as laundryPhotosSchema } from '../server/schemas/laundryPhotos.js';
import { columns as orderItemFormsColumns,dateColumns as orderItemFormsDates,headers as orderItemFormsHeaders,schema as orderItemFormsSchema} from '../server/schemas/orderItemForms.js';
import { columns as ordersViewColumns,    dateColumns as ordersViewDates,    headers as ordersViewHeaders,    schema as ordersViewSchema    } from '../server/schemas/ordersView.js';
import { columns as ordersColumns,        dateColumns as ordersDates,        headers as ordersHeaders,        schema as ordersSchema        } from '../server/schemas/orders.js';
import { columns as orderItemsColumns,    dateColumns as orderItemsDates,    headers as orderItemsHeaders,    schema as orderItemsSchema    } from '../server/schemas/orderItems.js';
import { columns as appointmentsColumns,  dateColumns as appointmentsDates,  headers as appointmentsHeaders,  schema as appointmentsSchema  } from '../server/schemas/appointments.js';
import { columns as invoiceViewColumns,    dateColumns as invoiceViewDates,    headers as invoiceViewHeaders,    schema as invoiceViewSchema    } from '../server/schemas/invoiceView.js';

export const SOURCE_MAP = {
  orderForm:      { sheetName: 'OrderForm',      spreadsheetId: process.env.GVIZ_SPREADSHEET_ID,          columns: orderFormColumns,      dateColumns: orderFormDates,      headers: orderFormHeaders,      required: orderFormSchema.required      },
  customers:      { sheetName: 'Customers',      spreadsheetId: process.env.GVIZ_CUSTOMERS_SPREADSHEET_ID,columns: customersColumns,      dateColumns: customersDates,      headers: customersHeaders,      required: customersSchema.required      },
  laundryItems:   { sheetName: 'LaundryItems',   spreadsheetId: process.env.GVIZ_LAUNDRY_ITEMS_SPREADSHEET_ID, columns: laundryItemsColumns, dateColumns: laundryItemsDates, headers: laundryItemsHeaders,   required: laundryItemsSchema.required   },
  photos:         { sheetName: 'LaundryPhotos',  spreadsheetId: process.env.GVIZ_SPREADSHEET_ID,          columns: laundryPhotosColumns,  dateColumns: laundryPhotosDates,  headers: laundryPhotosHeaders,  required: laundryPhotosSchema.required  },
  orderItemForms: { sheetName: 'OrderItemForms', spreadsheetId: process.env.GVIZ_SPREADSHEET_ID,          columns: orderItemFormsColumns, dateColumns: orderItemFormsDates, headers: orderItemFormsHeaders, required: orderItemFormsSchema.required },
  ordersView:     { sheetName: 'OrdersView',     spreadsheetId: process.env.GVIZ_PORTAL_SPREADSHEET_ID,   columns: ordersViewColumns,     dateColumns: ordersViewDates,     headers: ordersViewHeaders,     required: ordersViewSchema.required     },
  orders:         { sheetName: 'Orders',         spreadsheetId: process.env.GVIZ_ORDERS_SPREADSHEET_ID,   columns: ordersColumns,         dateColumns: ordersDates,         headers: ordersHeaders,         required: ordersSchema.required         },
  orderItems:     { sheetName: 'OrderItems',     spreadsheetId: process.env.GVIZ_ORDERS_SPREADSHEET_ID,   columns: orderItemsColumns,     dateColumns: orderItemsDates,     headers: orderItemsHeaders,     required: orderItemsSchema.required     },
  appointments:   { sheetName: 'Appointments',   spreadsheetId: process.env.GVIZ_APPOINTMENTS_SPREADSHEET_ID, columns: appointmentsColumns, dateColumns: appointmentsDates, headers: appointmentsHeaders, required: appointmentsSchema.required   },
  invoiceView:    { sheetName: 'InvoicesView',   spreadsheetId: process.env.GVIZ_PORTAL_SPREADSHEET_ID,       columns: invoiceViewColumns, dateColumns: invoiceViewDates, headers: invoiceViewHeaders, required: invoiceViewSchema.required },
};

export function gvizDateToISO(v) {
  if (!v) return null;
  const m = String(v).match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (!m) return v;
  return `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
}

/** Case/punctuation-insensitive header comparison key, e.g. "Order ID", "order_id", "orderId" all -> "orderid". */
function normalizeHeader(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_CACHE_TTL_MS = 5 * 60 * 1000;
const liveHeaderCache = new Map();

function gvizUrl(source, tq) {
  const entry = SOURCE_MAP[source];
  return (
    `https://docs.google.com/spreadsheets/d/${entry.spreadsheetId}/gviz/tq` +
    `?sheet=${encodeURIComponent(entry.sheetName)}` +
    `&tq=${encodeURIComponent(tq)}` +
    '&tqx=out:json'
  );
}

function columnIndexToLetter(index) {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function quoteGvizString(value) {
  return JSON.stringify(String(value));
}

function createHeaderIndex(cols, sheetName) {
  const headerIndex = new Map();
  const firstLabels = new Map();
  const duplicates = [];

  cols.forEach((label, i) => {
    const norm = normalizeHeader(label);
    if (!norm) return;
    if (headerIndex.has(norm)) {
      duplicates.push(`"${firstLabels.get(norm)}" / "${label}"`);
      return;
    }
    headerIndex.set(norm, i);
    firstLabels.set(norm, label);
  });

  if (duplicates.length) {
    const error = `Sheet "${sheetName}" has duplicate normalized header(s): ${duplicates.join(', ')}. Rename the conflicting headers.`;
    console.error(`[GViz] ${error}`);
    return { headerIndex: null, error };
  }

  return { headerIndex, error: null };
}

async function getLiveHeaderInfo(source) {
  const cached = liveHeaderCache.get(source);
  if (cached && cached.expiresAt > Date.now()) return cached.info;

  const { cols } = await _fetchRaw(gvizUrl(source, 'SELECT * LIMIT 0'));
  const info = createHeaderIndex(cols, SOURCE_MAP[source].sheetName);
  if (info.error) return info;

  liveHeaderCache.set(source, { expiresAt: Date.now() + HEADER_CACHE_TTL_MS, info });
  return info;
}

function addEqualityFilter(query, columnIndex, value) {
  const base = query.trim().replace(/;\s*$/, '');
  const condition = `${columnIndexToLetter(columnIndex)} = ${quoteGvizString(value)}`;
  const clausePattern = /\b(group\s+by|pivot|order\s+by|limit|offset|label|format|options)\b/i;
  const clause = base.match(clausePattern);
  const insertAt = clause ? clause.index : base.length;
  const prefix = base.slice(0, insertAt);
  const suffix = base.slice(insertAt);
  return `${prefix}${/\bwhere\b/i.test(base) ? ` AND ${condition}` : ` WHERE ${condition}`}${suffix}`;
}

/**
 * Map a raw GViz row (keyed by c0/c1/...) to a named object, resolving each
 * schema field to its cell by matching `headers[i]` against the sheet's
 * actual live header row (`headerIndex`) — never by trusting that `columns[i]`
 * and `row['c'+i]` line up positionally.
 */
export function mapRow(row, columns, headers, dateColumns, headerIndex) {
  return Object.fromEntries(
    columns.map((col, i) => {
      const cellIndex = headerIndex.get(normalizeHeader(headers[i]));
      const raw = cellIndex == null ? null : (row[`c${cellIndex}`] ?? null);
      return [col, dateColumns.has(col) ? gvizDateToISO(raw) : raw];
    })
  );
}

async function _fetchRaw(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GViz responded ${res.status}`);
  const text = await res.text();
  const json = JSON.parse(text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, ''));
  const cols = (json?.table?.cols ?? []).map((c) => c.label);
  const rows = (json?.table?.rows ?? []).map((row) => {
    const obj = {};
    (row.c ?? []).forEach((cell, i) => { obj[`c${i}`] = cell?.v ?? null; });
    return obj;
  });
  return { cols, rows };
}

export async function fetchGvizMapped(source, tq, filterSpec = null) {
  const entry = SOURCE_MAP[source];
  try {
    let query = tq;
    if (filterSpec?.field) {
      const liveHeaders = await getLiveHeaderInfo(source);
      if (liveHeaders.error) return { rows: [], error: liveHeaders.error };

      const fieldIndex = entry.columns.indexOf(filterSpec.field);
      const expectedHeader = entry.headers[fieldIndex];
      const columnIndex = liveHeaders.headerIndex.get(normalizeHeader(expectedHeader));
      if (columnIndex == null) {
        return {
          rows: [],
          error: `Sheet "${entry.sheetName}" is missing filter header for "${filterSpec.field}" (${expectedHeader}).`,
        };
      }
      query = addEqualityFilter(query, columnIndex, filterSpec.value);
    }

    const { cols, rows } = await _fetchRaw(gvizUrl(source, query));

    const { headerIndex, error: duplicateError } = createHeaderIndex(cols, entry.sheetName);
    if (duplicateError) return { rows: [], error: duplicateError };

    const requiredHeaders = (entry.required ?? []).map((field) => entry.headers[entry.columns.indexOf(field)]);
    const missing = requiredHeaders.filter((h) => !headerIndex.has(normalizeHeader(h)));
    if (missing.length) {
      return {
        rows: [],
        error: `Sheet "${entry.sheetName}" is missing expected header(s): ${missing.join(', ')}. The sheet's columns may have changed — update server/schemas/${source}.js.`,
      };
    }

    return { rows: rows.map((r) => mapRow(r, entry.columns, entry.headers, entry.dateColumns, headerIndex)), error: null };
  } catch (e) {
    return { rows: [], error: e.message };
  }
}

// Shared GViz utilities — imported by api/gviz.js

import { columns as orderFormColumns,     dateColumns as orderFormDates,     headers as orderFormHeaders,     schema as orderFormSchema     } from './schemas/orderForm.js';
import { columns as customersColumns,     dateColumns as customersDates,     headers as customersHeaders,     schema as customersSchema     } from './schemas/customers.js';
import { columns as laundryItemsColumns,  dateColumns as laundryItemsDates,  headers as laundryItemsHeaders,  schema as laundryItemsSchema  } from './schemas/laundryItems.js';
import { columns as laundryPhotosColumns, dateColumns as laundryPhotosDates, headers as laundryPhotosHeaders, schema as laundryPhotosSchema } from './schemas/laundryPhotos.js';
import { columns as orderItemFormsColumns,dateColumns as orderItemFormsDates,headers as orderItemFormsHeaders,schema as orderItemFormsSchema} from './schemas/orderItemForms.js';
import { columns as ordersViewColumns,    dateColumns as ordersViewDates,    headers as ordersViewHeaders,    schema as ordersViewSchema    } from './schemas/ordersView.js';
import { columns as ordersColumns,        dateColumns as ordersDates,        headers as ordersHeaders,        schema as ordersSchema        } from './schemas/orders.js';
import { columns as orderItemsColumns,    dateColumns as orderItemsDates,    headers as orderItemsHeaders,    schema as orderItemsSchema    } from './schemas/orderItems.js';
import { columns as appointmentsColumns,  dateColumns as appointmentsDates,  headers as appointmentsHeaders,  schema as appointmentsSchema  } from './schemas/appointments.js';

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
};

export function gvizDateToISO(v) {
  if (!v) return null;
  const m = String(v).match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (!m) return v;
  return `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}-${String(Number(m[3])).padStart(2, '0')}`;
}

// Strip single quotes to prevent GViz query injection
export function sanitize(val) {
  return String(val ?? '').replace(/'/g, '');
}

/** Case/punctuation-insensitive header comparison key, e.g. "Order ID", "order_id", "orderId" all -> "orderid". */
function normalizeHeader(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
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

export async function fetchGvizMapped(source, tq) {
  const entry = SOURCE_MAP[source];
  const url = (
    `https://docs.google.com/spreadsheets/d/${entry.spreadsheetId}/gviz/tq` +
    `?sheet=${encodeURIComponent(entry.sheetName)}` +
    `&tq=${encodeURIComponent(tq)}` +
    `&tqx=out:json`
  );
  try {
    const { cols, rows } = await _fetchRaw(url);

    const headerIndex = new Map();
    cols.forEach((label, i) => {
      const norm = normalizeHeader(label);
      if (norm && !headerIndex.has(norm)) headerIndex.set(norm, i); // first occurrence wins on duplicate headers
    });

    const requiredHeaders = (entry.required ?? []).map((field) => entry.headers[entry.columns.indexOf(field)]);
    const missing = requiredHeaders.filter((h) => !headerIndex.has(normalizeHeader(h)));
    if (missing.length) {
      return {
        rows: [],
        error: `Sheet "${entry.sheetName}" is missing expected header(s): ${missing.join(', ')}. The sheet's columns may have changed — update api/schemas/${source}.js.`,
      };
    }

    return { rows: rows.map((r) => mapRow(r, entry.columns, entry.headers, entry.dateColumns, headerIndex)), error: null };
  } catch (e) {
    return { rows: [], error: e.message };
  }
}

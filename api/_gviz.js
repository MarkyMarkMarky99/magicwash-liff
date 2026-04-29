// Shared GViz utilities — imported by api/gviz.js

import { columns as orderFormColumns,     dateColumns as orderFormDates     } from './schemas/orderForm.js';
import { columns as customersColumns,     dateColumns as customersDates     } from './schemas/customers.js';
import { columns as laundryItemsColumns,  dateColumns as laundryItemsDates  } from './schemas/laundryItems.js';
import { columns as laundryPhotosColumns, dateColumns as laundryPhotosDates } from './schemas/laundryPhotos.js';
import { columns as orderItemFormsColumns,dateColumns as orderItemFormsDates} from './schemas/orderItemForms.js';
import { columns as ordersViewColumns,    dateColumns as ordersViewDates    } from './schemas/ordersView.js';
import { columns as ordersColumns,        dateColumns as ordersDates        } from './schemas/orders.js';
import { columns as orderItemsColumns,    dateColumns as orderItemsDates    } from './schemas/orderItems.js';

export const SOURCE_MAP = {
  orderForm:      { sheetName: 'OrderForm',      spreadsheetId: process.env.GVIZ_SPREADSHEET_ID,          columns: orderFormColumns,      dateColumns: orderFormDates      },
  customers:      { sheetName: 'Customers',      spreadsheetId: process.env.GVIZ_CUSTOMERS_SPREADSHEET_ID,columns: customersColumns,      dateColumns: customersDates      },
  laundryItems:   { sheetName: 'LaundryItems',   spreadsheetId: process.env.GVIZ_LAUNDRY_ITEMS_SPREADSHEET_ID, columns: laundryItemsColumns, dateColumns: laundryItemsDates },
  photos:         { sheetName: 'LaundryPhotos',  spreadsheetId: process.env.GVIZ_SPREADSHEET_ID,          columns: laundryPhotosColumns,  dateColumns: laundryPhotosDates  },
  orderItemForms: { sheetName: 'OrderItemForms', spreadsheetId: process.env.GVIZ_SPREADSHEET_ID,          columns: orderItemFormsColumns, dateColumns: orderItemFormsDates },
  ordersView:     { sheetName: 'OrdersView',     spreadsheetId: process.env.GVIZ_PORTAL_SPREADSHEET_ID,   columns: ordersViewColumns,     dateColumns: ordersViewDates     },
  orders:         { sheetName: 'Orders',         spreadsheetId: process.env.GVIZ_ORDERS_SPREADSHEET_ID,   columns: ordersColumns,         dateColumns: ordersDates         },
  orderItems:     { sheetName: 'OrderItems',     spreadsheetId: process.env.GVIZ_ORDERS_SPREADSHEET_ID,   columns: orderItemsColumns,     dateColumns: orderItemsDates     },
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

export function mapRow(row, columns, dateColumns) {
  return Object.fromEntries(
    columns.map((col, i) => [
      col,
      dateColumns.has(col) ? gvizDateToISO(row[`c${i}`]) : (row[`c${i}`] ?? null),
    ])
  );
}

async function _fetchRaw(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GViz responded ${res.status}`);
  const text = await res.text();
  const json = JSON.parse(text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, ''));
  return (json?.table?.rows ?? []).map((row) => {
    const obj = {};
    (row.c ?? []).forEach((cell, i) => { obj[`c${i}`] = cell?.v ?? null; });
    return obj;
  });
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
    const rows = await _fetchRaw(url);
    return { rows: rows.map((r) => mapRow(r, entry.columns, entry.dateColumns)), error: null };
  } catch (e) {
    return { rows: [], error: e.message };
  }
}

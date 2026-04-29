# CLAUDE.md - Laundry Service LIFF App

## Overview
LINE LIFF app for a laundry service — customers book pickups, track orders, and view laundry photos. Deployed on Vercel. Data lives entirely in Google Sheets (no backend server).

## Tech Stack
- React, Vite, Tailwind CSS 4
- `react-i18next` — en/th bilingual
- LINE LIFF SDK
- Vercel — hosting + serverless proxy (`api/`)
- Google Sheets (GViz) — data reads; Google AppScript — HTTP POST writes

## Project Structure
- `api/` — Vercel serverless functions (hides spreadsheet IDs and AppScript URLs); `_gviz.js` is a shared internal module
- `api/schemas/` — one `.js` file per Google Sheet table; each exports `columns` (ordered camelCase array), `dateColumns` (Set), and `schema` (Draft 2020-12 JSON Schema)
- `src/api/` — client fetch logic, `localStorage` TTL caching, image cache
- `src/components/ui/` — generic reusable UI (e.g., `SuccessModal.jsx`)
- `src/components/active-order/` — components for the `ActiveOrder` page
- `src/mocks/` — mock data for dev preview routes
- `src/hooks/` — `useLiff.js` (LINE SDK wrapper)
- `src/i18n/locales/` — `en.json` and `th.json` string files
- `App.jsx` — URL routing, state management, and `HeaderContext`
- `src/index.css` — Material Design 3 tokens

## Commands
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`
- Lint: `npm run lint`

No test suite — there are no test files in this project.

## Architecture Rules
- **Routing:** No React Router. `App.jsx` reads URL search params directly to render components:
  - `/?photos&orderId=xxx` → `OrderGallery` (standalone, no LIFF) — `?gallery&orderId=xxx` is a backward-compat alias
  - `/?orders&custId=xxx` → `CustomerOrders` (standalone, no LIFF)
  - `/?custId=xxx` → `BookPickup` (or `RegisterCustomer` if not found)
  - `LINE LIFF context` → Look up by LINE `userId` → `BookPickup` or `RegisterCustomer`
  - `No LINE / no params` → `RegisterCustomer`
  - `?dev=chat` → `OrderChat` preview
  - `?dev=active&state=<unpaid-no-delivery|paid-no-delivery|paid-with-delivery>` → `ActiveOrder` preview (uses mock data from `src/mocks/`)
  - `?dev=confirm` → `ConfirmBooking` preview (uses inline mock data)
- **URL param naming:** Route key is a boolean flag (`?photos`, `?orders`). Additional params use the actual field name from the schema (`orderId`, `custId`). `id` is reserved for primary-key-only lookups.
- **State Management:** No Redux, Zustand, or global Context. State is per-page `useState`, except `HeaderContext` for back-button coordination.
- **Data Layer:** API reads use Stale-While-Revalidate: return cache immediately, call `onRevalidate(freshData)` when background fetch completes.
- **Caching:** All API caching must use `src/api/localCache.js` for data and `src/api/imageCache.js` for images (with exponential backoff on 429s). Use the shared helpers — `cacheKey(resource, id)` for consistent key names, `swrFetch` for SWR reads, `apiPost` for writes.
- **Header/Back Button:** Pages must call `setOnBack(fn)` via `HeaderContext` to show the back button, or `setOnBack(null)` to hide it.
- **Development bypass:** Set `VITE_MOCK_LINE_USER_ID` in `.env.local` to test without opening in LINE.

## GViz / Schema Layer

### Reading data (`api/gviz.js`)
- Endpoint: `GET /api/gviz?source=<key>&tq=<GViz SQL>`
- `source` is a validated key from `SOURCE_MAP` in `api/_gviz.js` — never pass raw sheet names or spreadsheet IDs from the frontend.
- Responses are **named-key objects** (`{ orderId, customerId, ... }`), never positional `c0/c1/...`.
- Date/date-time columns are automatically converted from GViz `Date(yyyy,m,d)` format to ISO strings server-side. Clients do **not** need to call `gvizDateToISO` on GViz responses.
- Always use `SELECT *` in `tq` queries so the column-index mapping is correct. Use `WHERE` for filtering.

### Known source keys
| source key | Sheet | Spreadsheet env var |
|---|---|---|
| `customers` | Customers | `GVIZ_CUSTOMERS_SPREADSHEET_ID` |
| `orderForm` | OrderForm | `GVIZ_SPREADSHEET_ID` |
| `photos` | LaundryPhotos | `GVIZ_SPREADSHEET_ID` |
| `laundryItems` | LaundryItems | `GVIZ_LAUNDRY_ITEMS_SPREADSHEET_ID` |
| `orderItemForms` | OrderItemForms | `GVIZ_SPREADSHEET_ID` |
| `ordersView` | OrdersView | `GVIZ_PORTAL_SPREADSHEET_ID` |
| `orders` | Orders | `GVIZ_ORDERS_SPREADSHEET_ID` |
| `orderItems` | OrderItems | `GVIZ_ORDERS_SPREADSHEET_ID` |

### Adding a new sheet
1. Add a file `api/schemas/<camelCaseName>.js` — export `columns`, `dateColumns`, `schema`.
2. Add an entry to `SOURCE_MAP` in `api/_gviz.js`.
3. Add the spreadsheet ID env var to the Vercel dashboard if it's a new spreadsheet.

### Writing data (`api/write.js`)
- Endpoint: `POST /api/write` with body `{ table, payload }`.
- Required fields per table are declared in `WRITE_TARGETS` inside `api/write.js`. Missing required fields return 422.
- Known tables: `customer`, `appointment`.

## Design Rules
- Design system: Material Design 3 — use tokens in `src/index.css` (e.g., Primary teal `#004f45`).
- Typography: Manrope for headings, Inter for body.
- Icons: `material-symbols-outlined` only.
- Layout: Mobile-first. Desktop is capped at `max-w-[390px]` with a visible border.
- Modals: Full-screen success modals must render above the app shell via React Portals.
- Localization: Never hardcode strings. Use `t('key')` and add to both `en.json` and `th.json`. Read current language via `i18n.language`, not `localStorage`.
- Dates: Always use `'th-TH-u-ca-gregory'` locale to keep the Gregorian calendar.
- Date logic: GViz date columns are converted to ISO (YYYY-MM-DD) by the server. Display using `formatDisplayDate()` from `src/api/dateUtils.js`.
- Naming: All data objects (orders, customers, appointments) use **camelCase** field names throughout — in `api/schemas/`, `src/api/` clients, components, and mock data. Never use snake_case (e.g. `receivedDate` not `received_date`, `serviceType` not `service_type`, `orderId` not `id`).

## Environment Variables

Frontend (`.env.local`, `VITE_` prefix exposed to browser):
- `VITE_MOCK_LINE_USER_ID` — bypass LIFF during dev

Vercel server-side (set in Vercel dashboard, used only by `api/`):
- `GVIZ_SPREADSHEET_ID` — main orders/photos spreadsheet (OrderForm, LaundryPhotos, OrderItemForms)
- `GVIZ_CUSTOMERS_SPREADSHEET_ID` — customers spreadsheet
- `GVIZ_PORTAL_SPREADSHEET_ID` — portal/OrdersView spreadsheet
- `GVIZ_ORDERS_SPREADSHEET_ID` — NoSQL orders spreadsheet (Orders, OrderItems)
- `GVIZ_LAUNDRY_ITEMS_SPREADSHEET_ID` — laundry items spreadsheet
- `APPSCRIPT_CUSTOMER_URL` — AppScript endpoint for customer create/update (`api/write.js`)
- `APPSCRIPT_APPOINTMENT_URL` — AppScript endpoint for appointment create (`api/write.js`)

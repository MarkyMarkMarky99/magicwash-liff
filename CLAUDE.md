# CLAUDE.md - Magicwash Laundry Web App

## Overview
LINE LIFF customer portal for a laundry business — lets customers view orders, book pickups, and register via LINE or phone.

## Tech Stack
- React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`)
- `react-i18next` — en/th bilingual, Thai default
- LINE LIFF SDK — LINE in-app login
- Vercel — hosting + serverless functions (`api/`)
- Google Sheets (GViz) — data source; Google AppScript — writes

## Project Structure
- `api/` — Vercel serverless functions (GViz proxy, customer/order queries)
- `src/api/` — client fetch logic, localStorage SWR cache, date utils
- `src/components/ui/` — generic reusable UI (CardSection, BookingSheet)
- `src/components/layout/` — app-level layout primitives (HeroSheet, PageLayout)
- `src/components/forms/` — standalone form components
- `src/hooks/` — useLiff (LINE SDK), useRoute (custom router)
- `src/pages/` — top-level page components
- `src/i18n/locales/` — en.json and th.json string files
- `App.jsx` — AppShell, route switching, LIST_CONFIG

## Commands
- Dev server: `npm run dev`
- Production build: `npm run build`
- Lint: `npm run lint`
- Preview build: `npm run preview`

No test suite — lint is the only automated check.

## Architecture Rules
- No React Router — routing is `src/hooks/useRoute.js` (history.pushState)
- Never use `window.location.href` — always `navigate` from `NavigateContext`
- New list views go in `LIST_CONFIG` in `App.jsx` — no new page file needed
- All date formatting goes through `src/api/dateUtils.js` — no inline `Intl` elsewhere
- API reads use Stale-While-Revalidate: return cache immediately, revalidate in background
- Serverless functions must never embed spreadsheet IDs — use Vercel env vars

## Design Rules
- Design system: Material Design 3 — use `index.css` color tokens (`bg-primary`, `text-on-surface`, etc.), never raw hex
- Icons: `material-symbols-outlined` only — add `fill-icon` class for filled variant
- Typography: Use typography generic classes — see rules for available classes and when to use each; use `rem` units for scaling
- Localization: Layouts must support both en/th text lengths via `i18n.language` to prevent UI breaking
- App renders in a `sm:max-w-[440px]` shell — all layouts must work at 440 px
- Root layout is `h-dvh overflow-hidden` — scrollable areas must be explicit inner containers

## Domain Terms
- Customer — a registered laundry customer (`customerId: CUS-xxx`)
- Order — a laundry pickup/dropoff job (`orderId: ORD-xxx`)
- Portal — the Google Sheet used for booking/registration data

# Magicwash Laundry LIFF App — Design System

## Overview
A utilitarian, mobile-first LINE LIFF app for a laundry service. The aesthetic is Material Design 3 rendered in a compact, information-dense style suited to a 390px-wide chat-embedded surface — deep teal brand color on a near-white surface, small type sizes, pill badges for status, and card-based sections that collapse to save vertical space. Bilingual (Thai/English) throughout.

## Colors (Material Design 3 tokens — `src/index.css`)

- **Primary** (`#004f45`): Deep teal — headers, icons, CTA backgrounds, active states, links
- **On Primary** (`#ffffff`): Text/icons on primary-filled surfaces
- **Primary Container** (`#00695c`) / **On Primary Container** (`#94e5d5`): Emphasized containers on primary
- **Secondary** (`#006b5f`) / **On Secondary** (`#ffffff`): Secondary actions
- **Secondary Container** (`#8df5e4`) / **On Secondary Container** (`#007165`): Secondary emphasis surfaces
- **Background / Surface** (`#f8fafa`): App background
- **On Background / On Surface** (`#191c1d`): Primary text
- **Surface Variant** (`#e1e3e3`) / **On Surface Variant** (`#3e4946`): Muted text, secondary labels, captions
- **Surface Container Lowest** (`#ffffff`): Cards, elevated white surfaces
- **Surface Container Low** (`#f2f4f4`): Card headers, subtle section backgrounds
- **Surface Container** (`#eceeee`): Badge pill backgrounds, hover states
- **Surface Container High** (`#e6e8e8`) / **Highest** (`#e1e3e3`): Pressed/active states
- **Outline** (`#6e7976`) / **Outline Variant** (`#bec9c5`): Borders, dividers (almost always used at reduced opacity — `/10`, `/20`, `/30`, and `/40` all appear depending on how prominent the border needs to be)
- **Error** (`#ba1a1a`) / **On Error** (`#ffffff`) / **Error Container** (`#ffdad6`) / **On Error Container** (`#93000a`)

Status colors (order/appointment state, `OrderCard.jsx`) borrow directly from Tailwind's palette rather than the MD3 tokens, kept intentionally separate from brand color so status is scannable at a glance:
- Pending/Submitted: `amber-100` / `amber-700` (badge), `amber-50` / `amber-600` (avatar)
- Approved: `blue-100` / `blue-700` (badge), `blue-50` / `blue-700` (avatar)
- Confirmed/Completed: `green-100` / `green-700` (badge), `green-50` / `green-700` (avatar)
- Received: `teal-50` / `teal-700` (both badge and avatar)
- Unknown/fallback: `gray-100` / `gray-600` (badge), `gray-100` / `gray-500` (avatar)

## Typography

- **Headline** — Manrope, weights 400–800 (`font-headline`): all headings, card titles, prices, dates, primary emphasis text
- **Body** — Inter, weights 400–600 (`font-body`): descriptions, notes, secondary text
- **Label** — Inter (`font-label`, aliased to the same family as body): uppercase micro-labels, badges, captions

### Scale (all sizes are fixed pixel values via Tailwind arbitrary values, not a rem-based scale)
- **Section title**: 13px, `font-headline font-bold`, `tracking-tight`
- **Card header / date**: 14–15px, `font-headline font-bold`
- **Body text**: 12–14px (`text-xs` / `text-[14px]`), `font-body`, regular/medium weight
- **Micro-label / badge**: 9px, `font-label font-bold uppercase tracking-wide`
- **Icon-adjacent caption**: 9–11px, `text-on-surface-variant`

Type is deliberately small and dense — this is a compact chat-embedded surface, not a marketing page. Hierarchy is built with weight and color more than size.

## Spacing
- **Base unit**: 4px (Tailwind default scale, no custom spacing tokens)
- **Card padding**: `px-4 py-3` (row content), `px-4 py-2` (section headers)
- **Section gaps**: `gap-2` to `gap-3` between icon/text clusters
- **List rows**: divided with `divide-y divide-outline-variant/10`, no gap — full-bleed rows within a card
- **Page container**: capped at `max-w-[390px]` (see `App.jsx`), centered, with a visible border on desktop viewports to simulate the LINE in-app browser frame

## Border Radius
- **Section cards**: `rounded-2xl` (16px)
- **Footer action bar**: `rounded-2xl`
- **Badges / pills / chips**: `rounded-full` (status badges, count badges, date chips)
- **Avatars / icon circles**: `rounded-full`

## Elevation & Shadows
- Minimal — this system favors flat color and borders over shadow for depth
- **Footer action bar**: `shadow-md`, sits above scrollable content
- **LanguageSwitcher**: also `shadow-md` — a second floating element (frosted `bg-white/20 backdrop-blur-md` pill), see note under Iconography/Layout exceptions below
- **Modals** (`SuccessModal.jsx`): heavier `shadow-2xl` — the app's biggest shadow, appropriate to a full-screen overlay; the outer app shell border also gets `sm:shadow-2xl` on desktop viewports to read as a floating device frame
- **Buttons**: no shadow by default; feedback comes from `active:scale-95` / `active:scale-[0.98]` press states instead
- Borders (`border-outline-variant/10-40`) do most of the elevation work that shadows would elsewhere — regular cards separate from background via a `surface-container-low` header band, not a drop shadow; shadow is reserved for things that visually float above the page (footer, language switcher, modals)

## Component Guidelines

### SectionCard (`src/components/ui/SectionCard.jsx`)
The canonical container for any list of records (orders, items, appointments). White (`surface-container-lowest`) body, `surface-container-low` header band with icon + title, optional count badge (pill, 9px uppercase) and/or a custom trailing action (e.g. refresh button). Supports `collapsible` — header becomes a button with `expand_more` chevron that rotates 180° when open. The content wrapper itself is unstyled (`rounded-b-2xl overflow-hidden`) — it's the *consumer* that applies `divide-y divide-outline-variant/10` to whatever list it renders as children (see `OrderList.jsx`, `ItemsList.jsx`, `OrderDetailSheet.jsx`), keeping row separation consistent without SectionCard needing to know its content is a list.

### Empty state
When a SectionCard's content list has nothing to show, render a single line in its place: `<p className="px-6 py-4 text-sm text-on-surface-variant italic">{t('...')}</p>`. Used verbatim in `OrderList.jsx`, `ItemsList.jsx`, and `InvoicePreview.jsx` — treat this as the standard empty-state, not a one-off.

### Bordered fieldset card (`CustomerDetailsCard.jsx`)
A second, distinct card style from SectionCard: `border border-outline-variant/40 rounded-2xl` with a label that straddles the top border — absolutely positioned, `-translate-y-1/2`, `bg-surface` behind it to punch a gap through the border line (mimics an HTML `<fieldset>/<legend>`). Use for a single labeled block of read-only details, not for lists.

### Modals (`SuccessModal.jsx`)
Full-screen confirmation modals render via `createPortal` to `document.body` — required so they sit above the app shell, not just above their local DOM parent (see CLAUDE.md's explicit portal rule). Pattern: `fixed inset-0 bg-black/40 backdrop-blur-sm` scrim behind a `rounded-2xl p-5 max-w-[320px] shadow-2xl` content box.

### List rows (e.g. `OrderCard.jsx`)
Pattern: `w-10 h-10 rounded-full` status avatar (icon + tinted background) on the left, two-line content on the right — row 1 is title/date + status badge + trailing metadate, row 2 is a muted description + trailing icon-only actions (each icon action stops event propagation so it doesn't trigger the row's own `onClick`). Entire row is clickable (`cursor-pointer hover:bg-surface-container-low active:bg-surface-container`).

### Badges / Chips
- **Count badge** (`BADGE_PILL` constant in `SectionCard.jsx`): `bg-surface-container`, `rounded-full`, `px-2.5 h-[22px]`, 9px bold uppercase — reused wherever a header needs a count ("3 orders", "12 items")
- **Status badge**: same pill shape, color pair driven by status (see Colors above)
- **DateChip** (`src/components/ui/DateChip.jsx`): uppercase 9px label + `bg-primary/10 text-primary` rounded-full value pill — used for labeled date display outside of card rows

### Buttons
- **Icon-only action** (refresh, view invoice, view photos): no background, `text-primary`, `hover:opacity-70 active:scale-95`, always has `aria-label` since there's no visible text
- **Primary CTA / footer action** (`PageActionFooter.jsx`): full-width, `h-14 rounded-2xl bg-primary text-on-primary shadow-md`, icon + two-line label (caption + main label) on the left, amount on the right, `hover:opacity-95 active:scale-[0.98]`

### Forms
Standardized via a shared class string rather than a component (see `RegisterCustomer.jsx`'s `inputClass`), reused across 4+ fields:
`w-full bg-surface-container border border-outline-variant/30 rounded-xl py-2.5 pr-4 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder:text-on-surface-variant/60 text-sm`
Fields with a leading icon add a `pl-9` variant to leave room for it. Follow this exact pattern for new inputs rather than inventing a new one.

## Motion
- **Press feedback**: `active:scale-95` (icon buttons) / `active:scale-[0.98]` (large CTAs) — no separate hover-lift pattern since this is a touch-first surface
- **Collapse/expand**: chevron `rotate-180` transition, content toggled via `hidden` (no height animation)
- **Loading**: `animate-spin` on the refresh icon while `refreshing` is true
- **Transitions**: `transition-all` / `transition-colors` / `transition-transform`, no explicit duration overrides — relies on Tailwind's default (150ms)

## Iconography
- **Material Symbols Outlined only** — loaded via Google Fonts (`FILL,wght,GRAD,opsz` variable axes), never a different icon set
- Default weight is outlined (`FILL 0`); use the `.fill-icon` utility class (`FILL 1`) for filled variants, e.g. status avatars in `OrderCard`
- Sizes are fixed pixel values matched to context: 14px (inline row actions), 16px (section header icons), 20px (avatars, footer CTA icon) — never left at the browser default 24px

## Layout
- **Viewport**: mobile-first, designed for the LINE in-app browser (`max-w-[390px]`, capped and bordered on wider viewports)
- **Fixed shell**: `html, body { height: 100dvh; overflow: hidden }` — the app itself scrolls internally per-page, not the document
- **No React Router** — pages are chosen by reading URL search params directly in `App.jsx`

## Localization
- Every user-facing string goes through `t('key')` (`react-i18next`); new keys are added to **both** `src/i18n/locales/en.json` and `th.json` in the same change
- Dates always render with the `'th-TH-u-ca-gregory'` locale (`formatDisplayDate` from `src/api/dateUtils.js`) to keep the Gregorian calendar in Thai locale
- Current language is read from `i18n.language`, never `localStorage`

## Known exception
`LanguageSwitcher.jsx` is a deliberate outlier: a frosted-glass floating pill (`bg-white/20 backdrop-blur-md`, `shadow-md`) rather than the flat/bordered surface-container styling used everywhere else. It's a persistent chrome element sitting over variable page content (needs to stay legible over anything behind it), which is why it breaks from the flat-color rule — don't use it as precedent for other components.

## Key Principles
1. **Density over decoration** — small type, tight padding, no ornamental whitespace; this is a utility tool embedded in a chat app, not a landing page
2. **Color communicates state, not brand** — teal is structural (headers, chrome, primary actions); status color (amber/blue/green/teal-status/gray) is reserved for order/appointment state and never reused for anything else
3. **Flat + bordered, not shadowed** — depth comes from `surface-container-*` layering and hairline borders (`outline-variant/10-20`), shadows are reserved for the one floating footer CTA
4. **Full-bleed rows inside cards** — list rows span the card edge-to-edge with divider lines, not individually padded/margined cards-within-cards
5. **Every icon-only control needs an `aria-label`** — no icon button ships without one
6. **Bilingual by construction** — no string is hardcoded; every new UI element ships with both `en.json` and `th.json` entries

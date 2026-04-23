---
paths:
  - src/**/*.jsx
---

# Frontend Design Rules

## Core Layout & Localization
- App renders in a `sm:max-w-[440px]` shell — all layouts must work at 440 px.
- Root layout is `h-dvh overflow-hidden` — scrollable areas must be explicit inner containers.
- Use bottom sheets for detail overlays — not modals or new pages.
- Localization: Layouts must support both en/th text lengths via `i18n.language` to prevent UI breaking.

## Design Style
- **Minimal luxury** — deep forest-green primary on near-white surfaces; no loud gradients, no multi-colour decoration.
- Calm and trustworthy, suited to a service brand — not playful or colourful.
- Depth comes from subtle shadows and layered white/surface tones, not from colour variety.
- Decorative accents are `bg-white/5` transparent circles on the hero — barely visible, never distracting.
- Interactions feel tactile: add `active:scale-[0.98] transition-all` on every tappable element.
- **Never** use raw hex values or arbitrary Tailwind colours (`text-green-700`, `bg-teal-500`, etc.) — always use the color tokens below.

## Color Theme

### Primary (forest green)
- `bg-primary` / `text-primary`: App header, hero background, CTA buttons, icon accents, active states.
- `bg-primary-container`: Hover/pressed state for primary surfaces.
- `text-on-primary`: Text and icons sitting on top of `bg-primary`.
- `text-on-primary-container`: Secondary text on dark green backgrounds.

### Secondary (teal)
- `bg-secondary`: Secondary actions, supporting highlights.
- `bg-secondary-container`: Chips, tags, light accent backgrounds.
- `text-on-secondary`: Text and icons on `bg-secondary`.
- `text-on-secondary-container`: Text inside secondary containers.

### Surface (near-white greys)
- `bg-surface`: Main page background and large bottom sheets.
- `bg-surface-container-lowest`: Card interiors, white panels.
- `bg-surface-container-low`: Section header rows (CardSection), subtle fill.
- `bg-surface-container`: Hover states, chips, badge backgrounds.
- `bg-surface-container-high`: Pressed/active states on surfaces.
- `bg-inverse-surface` / `text-inverse-on-surface`: Dark tooltips and snackbars.

### Text
- `text-on-surface`: Primary body text.
- `text-on-surface-variant`: Secondary/muted text, placeholders.
- `text-outline`: Borders, dividers.
- `text-outline-variant`: Subtle dividers, input underlines.

### Error
- `bg-error` / `text-error`: Validation errors, text on error state.
- `text-on-error`: Text inside destructive primary buttons.
- `bg-error/10` + `border-error/30`: Error banner background.

## Typography
- Use typography generic classes mapped to `rem` units for scaling.
- Never use `font-sans` (Tailwind default) — always `font-headline` (Manrope) or `font-body`/`font-label` (Inter).
- `text-display-large`: Hero titles, large display text.
- `text-headline-large`: Page/screen headings.
- `text-headline-medium`: Section headings inside sheets.
- `text-title-large`: App bar titles, prominent card titles.
- `text-title-medium`: Standard card titles, list item primary text.
- `text-title-small`: CardSection row headers, sub-labels.
- `text-body-large`: Introductory paragraphs, highlighted reading text.
- `text-body-medium`: Standard body copy, descriptions, hints.
- `text-body-small`: Footer notes, helper text.
- `text-label-large`: Primary button labels, form field labels.
- `text-label-medium`: Secondary/small button labels, tabs.
- `text-label-small`: Uppercase badges, count chips.

## Component Patterns

### Buttons
- Primary CTA: `bg-primary text-on-primary rounded-full py-4 text-label-large shadow-[0_4px_16px_rgba(0,79,69,0.25)]`.
- Outline CTA (on dark bg): `border-2 border-white/50 text-white rounded-2xl text-label-large`.
- Ghost (on light bg): `text-primary font-semibold hover:underline`.
- Always add `active:scale-[0.98] transition-all` for tactile press feedback.
- Disabled: `disabled:opacity-60 disabled:cursor-not-allowed`.

### Cards
- Use `card` utility: white bg, `rounded-2xl`, subtle shadow `0 2px 8px rgba(0,0,0,0.06)`.
- Dividers between list items: `divide-y divide-outline-variant/10`.

### Form Inputs
- Use generic classes for labels and `input-field` for inputs — underline-only style, no box border.
- Focus state draws a green underline shadow — no focus ring.

### Sheets / Overlays
- Use `HeroSheet` for full-screen overlays with a green hero panel + white content panel.
- Entrance animation: `duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)]` (spring-like).
- White panel has `rounded-t-3xl` top corners; green panel has `rounded-b-3xl` bottom corners.

### Icons
- Always `material-symbols-outlined`; add `fill-icon` class for filled variant.
- Size via generic text classes or specific size classes that correspond to `rem` units.
- Icons on green backgrounds: `text-white`; icons on white surfaces: `text-primary` or `text-on-surface-variant`.
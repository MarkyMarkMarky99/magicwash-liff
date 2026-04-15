---
paths:
  - "src/components/**/*.{jsx,tsx,js,ts}"
  - "src/pages/**/*.{jsx,tsx,js,ts}"
  - "src/i18n/**/*"
---

# Language Switching

Supports **en** and **th** (default) via `react-i18next`. Locale files: `src/i18n/locales/{en,th}.json`.

- All user-facing strings must use `t('key')` — never hardcoded
- New keys must be added to **both** locale files at the same time
- Date locale: use `'th-TH-u-ca-gregory'` (not `'th-TH'`) to keep Gregorian calendar
- Read current language via `i18n.language`, not `localStorage.getItem('lang')`
- `i18n.changeLanguage()` is called only in `LanguageSwitcher.jsx`

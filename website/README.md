# ZAKI Website

Standalone marketing website for `chatzaki.com`.

## Stack

- Vite + React
- Tailwind CSS (utility-first classes)
- Static legal pages under `public/`

## What was converted from Framer export

- Framer HTML structure was reimplemented as React components (`website/src/components`).
- Framer inline styles were moved into Tailwind utilities and `website/src/styles.css`.
- Framer smooth-scroll behavior was replaced with native smooth scrolling + React `scrollIntoView` handlers.
- Interactive controls now use React state:
  - mobile nav toggle
  - prompt input + CTA submit
  - FAQ accordion
  - EN/AR mode switch

## Run locally

```bash
cd website
npm install
npm run dev
```

Open `http://localhost:4173`.

## Build

```bash
cd website
npm run build
```

Deploy `website/dist` as static hosting.

## Routes

- `/` -> React landing (EN by default)
- `/ar/` -> React landing (Arabic mode, canonical Arabic URL)
- `/?lang=ar` -> compatibility path (should 301 to `/ar/` at edge)
- `/terms/` -> Terms of Use
- `/privacy/` -> Privacy
- `/compliance/` -> Compliance
- `/contact/` -> Contact
- `/faq/` -> FAQ

## App handoff

All login/signup CTAs route to:

- `https://app.chatzaki.com/?auth=login`
- `https://app.chatzaki.com/?auth=signup`

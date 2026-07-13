# ZAKI Website

Standalone marketing website for `chatzaki.com`.

Status: secondary marketing shell. The canonical product visibility and
activation truth lives in the app-integrated website routes under
`src/app/components/WebsitePage.tsx`. This package keeps its distinct marketing
visual system, but it must not reintroduce old beta, student-pricing, or paid
Spaces claims.

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

All app CTAs carry an explicit app handoff contract:

- `https://app.chatzaki.com/?source=website_standalone&intent=dashboard`
- `https://app.chatzaki.com/spaces?source=website_standalone&intent=chat`
- `https://app.chatzaki.com/agent?source=website_standalone&intent=agent`

Current product truth:

- Chat/Spaces is the free entry point.
- Agent and Chat/Spaces are the live spokes.
- Design remains waitlist and Minutes remains coming soon.
- Brain is the Agent memory view, not a separate spoke.

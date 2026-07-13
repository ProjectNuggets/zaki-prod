# Website Archive

This directory preserves superseded website source and unused launch-draft
material. Nothing here participates in the active build or container image.

## `react-vite-legacy/`

The previous `@zaki/website` Vite/React implementation, moved intact from the
repository root at `origin/main` commit `a263c9c` on 2026-07-13.

It remains independently buildable for comparison or rollback investigation:

```bash
cd website/archive/react-vite-legacy
npm ci
npm run typecheck
npm run build
```

Do not patch this copy for new website work. Restore it only through an explicit
rollback decision and a reviewed PR.

## `launch-draft-unused-assets/`

Assets imported with the editable launch draft but not referenced by any active
HTML, CSS, or JavaScript at freeze time. They are preserved here instead of
being deleted or shipped in the production image.

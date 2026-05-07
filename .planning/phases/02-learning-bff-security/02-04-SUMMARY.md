# 02-04 Summary: Generated HTML Renderer Safety

## Completed

- Inspected generated HTML render paths in `LearningBookBlockContent`.
- Confirmed interactive blocks now use:
  - `sandbox=""`
  - CSP with `script-src 'none'`
  - CSP with `connect-src 'none'`
  - script tag stripping
  - inline event handler stripping
  - `javascript:` URL stripping
- Added a frontend regression test for generated interactive HTML safety.

## Verification

- `npm test -- --runTestsByPath src/app/components/learning/LearningBookBlockContent.test.tsx`
- `git diff --check`

## Review Result

- Generated interactive HTML cannot execute scripts by default in the ZAKI-hosted renderer.
- No operator renderer policy control is exposed to normal users.

## Residual

- If production later needs script-enabled generated artifacts, serve them from a constrained separate origin with an operator-controlled policy and strict CSP.

## Next

Execute 02-05: split user-managed settings from operator-managed settings.

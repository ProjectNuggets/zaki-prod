# Contributor guide: develop zaki-prod against STAGING (no local upstreams)

**Audience:** a developer (or agent) who wants to work on this repo's app (`@zaki/web`) and/or BFF
without running nullalis, the chat engine, the brain Postgres, and every other upstream locally.
Point at the staging environment instead and iterate on the frontend only.

Verified against the real wiring as of 2026-07-11. If config drifts, re-verify against
[`src/lib/runtimeEnv.ts`](../src/lib/runtimeEnv.ts) + [`vite.config.ts`](../vite.config.ts) here, and
the [`zaki-infra` staging values](https://github.com/ProjectNuggets/zaki-infra/tree/staging/charts)
for the staging side.

---

## The one thing to understand first

This SPA has **no Vite dev proxy** — it was deliberately removed (`vite.config.ts:29-31`, "Proxy
removed — all nullalis traffic now flows through the BFF"). The SPA calls its backend at an
**absolute base URL** resolved at runtime (`src/lib/runtimeEnv.ts:49-64`), always with
`credentials: "include"` so the **HttpOnly session cookie** rides along. In local `vite` dev that
base comes from **`VITE_ZAKI_BACKEND_URL`** (default `http://localhost:8787`, from `.env.local`).

Staging is three public HTTPS hosts on the `nova-cloud` cluster; **only the BFF is your proxy
target** (it is the sole authN authority and the single door to every upstream — all spokes are
cluster-internal, no ingress):

| Surface | Staging host | Note |
|---|---|---|
| **BFF / API** (proxy target) | `https://api-staging.chatzaki.ai` | `zaki-infra charts/zaki-api/values-staging.yaml:64` |
| SPA | `https://app-staging.chatzaki.ai` | allowed CORS origin |
| Marketing | `https://staging.chatzaki.com` | note the `.com` vs `.ai` split |

**The catch that makes "just set the env var" not enough:** the staging BFF's CORS allowlist is
`ZAKI_ALLOWED_ORIGINS = https://app-staging.chatzaki.ai,https://staging.chatzaki.com` and its
session cookie is scoped to domain **`.chatzaki.ai`**. So a bare
`VITE_ZAKI_BACKEND_URL=https://api-staging.chatzaki.ai` from `http://localhost:5173` **reaches
staging over the wire but every authenticated request is CORS-blocked and cookie-less** — the app
loads, then 401s/CORS-fails on every data call.

Two ways around it. Pick one.

---

## Option A — Local reverse proxy, same-origin (zero infra change; recommended for a solo dev)

Make the browser talk to a **single origin** (your local dev server) and have that server forward
`/api/*` to the staging BFF, removing the staging cookie domain so the cookie becomes host-only on
localhost. The browser never makes a cross-origin request, so there is no CORS and the cookie sticks.
Re-add the dev proxy locally
(an uncommitted, dev-only convenience — **don't commit it**; the repo removed it on purpose).

1. In `.env.local`, **blank the backend base** so the SPA uses its own origin:
   ```
   VITE_ZAKI_BACKEND_URL=
   VITE_API_BASE_URL=
   ```
   (Empty → `getApiBase()` falls back to `window.location.origin` — `src/lib/api.ts:70-72`.)

2. Temporarily fill the empty `server:` block in `vite.config.ts` (local only, don't commit):
   ```ts
   server: {
     host: 'localhost',
     port: 5173,
     proxy: {
       '/api': {
         target: 'https://api-staging.chatzaki.ai',
         changeOrigin: true,                // Host header becomes api-staging.chatzaki.ai
         secure: true,
         cookieDomainRewrite: '',           // remove Domain=.chatzaki.ai; bind cookie to localhost
       },
     },
   }
   ```

   **Do not proxy `/env.js`.** Keep the local [`public/env.js`](../public/env.js) placeholder. A
   staging `/env.js` injects `BACKEND_URL=https://api-staging.chatzaki.ai`, and runtime config has
   priority over the blank Vite variables; proxying it would silently bypass `/api` and recreate the
   CORS/cookie failure this option is meant to avoid.

3. `npm run dev`, open `http://localhost:5173`. Every `/api/*` call is forwarded to staging; log in
   normally through the app UI. Verify in DevTools → Network that XHRs are same-origin
   (`localhost:5173`), `window.__ZAKI_ENV__.BACKEND_URL` is empty/undefined, and a host-only
   `zaki_refresh` cookie is set for localhost.

**What you inherit for free:** staging's real nullalis token, chat key, and brain DSN live in the
*staging BFF* — you never see a secret on your laptop. Run the full local stack only when you
actually need to change an upstream.

---

## Option B — Subdomain loopback + a 1-line infra allowlist (the "official" path if this becomes common)

Keeps the app's absolute-URL model intact (no local proxy) and makes cookies work by putting your
dev origin on the **same registrable domain** as the BFF (`chatzaki.ai`), so the `.chatzaki.ai`
cookie attaches. Costs one infra change.

1. `/etc/hosts`: `127.0.0.1 dev-local.chatzaki.ai`
2. Run Vite over **HTTPS** on that hostname (`vite --host dev-local.chatzaki.ai` + a local cert via
   `mkcert` or `@vitejs/plugin-basic-ssl`) — the staging cookie is `Secure`, so the origin must be https.
3. `.env.local`: `VITE_ZAKI_BACKEND_URL=https://api-staging.chatzaki.ai`
4. **Infra handoff (zaki-infra's job, not yours):** add the dev origin to the staging BFF allowlist —
   [`charts/zaki-api/values-staging.yaml`](https://github.com/ProjectNuggets/zaki-infra/blob/staging/charts/zaki-api/values-staging.yaml)
   → append `https://dev-local.chatzaki.ai:5173` to
   `ZAKI_ALLOWED_ORIGINS` → re-sync. **Staging-only convenience; never add a dev origin to prod.**
   Request it via a note on the
   [central board](https://github.com/ProjectNuggets/zaki-infra/blob/staging/docs/COORDINATION.md)
   (handoff H11) and an infra agent lands it. If you cannot access the private infra repository,
   request the handoff in your zaki-prod issue or PR instead.

Because `dev-local.chatzaki.ai` shares the registrable domain, the `.chatzaki.ai` session cookie is
same-site and attaches; CORS passes because the origin is allowlisted.

---

## Notes that will save you an hour

- **CAPTCHA is off on staging** (`ZAKI_TURNSTILE_DISABLED=true`), so signup/login work without a
  Turnstile token — create a throwaway staging account.
- **Do not** set `NULLALIS_DEV_USER_ID` / `NULLCLAW_DEV_USER_ID` when proxying to staging — that's
  the *local BFF* auth-bypass and it's meaningless here (you're using staging's real auth).
- **Running a local BFF against staging upstreams** (the third option) is possible but needs the
  staging nullalis internal token + chat key + brain DSN + TLS CA on your laptop — real secrets, not
  worth it unless you're changing the BFF↔engine contract itself. Prefer A or B.
- The public LoadBalancer IP / DNS A-record for `api-staging.chatzaki.ai` and any edge WAF/allowlist
  are **not in git** (DNS + edge are managed outside these repos). If the host doesn't resolve or
  403s at the edge, ask on the central board or in your zaki-prod issue/PR.
- Staging TLD is `.chatzaki.ai` for app+api but `.chatzaki.com` for the marketing site; prod is
  `.com` for all three. Don't cross them.

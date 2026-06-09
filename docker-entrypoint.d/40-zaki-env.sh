#!/bin/sh
# Runtime config for the ZAKI SPA. The official nginx image runs every /docker-entrypoint.d/*.sh at
# container start (before nginx itself), so this writes /env.js from the BACKEND_URL container env.
# The SPA reads window.__ZAKI_ENV__.BACKEND_URL (src/lib/runtimeEnv.ts) at the highest priority, so ONE
# built image serves any environment — the backend URL is injected here at start, not baked at build.
set -eu

ENV_JS="/usr/share/nginx/html/env.js"
BACKEND_URL="${BACKEND_URL:-}"
SENTRY_DSN="${SENTRY_DSN:-}"
SENTRY_ENVIRONMENT="${SENTRY_ENVIRONMENT:-}"

cat > "$ENV_JS" <<EOF
window.__ZAKI_ENV__ = { BACKEND_URL: "${BACKEND_URL}", SENTRY_DSN: "${SENTRY_DSN}", SENTRY_ENVIRONMENT: "${SENTRY_ENVIRONMENT}" };
EOF

echo "[zaki-env] wrote ${ENV_JS} (BACKEND_URL=${BACKEND_URL:-<empty>}, SENTRY_DSN=${SENTRY_DSN:+set})"

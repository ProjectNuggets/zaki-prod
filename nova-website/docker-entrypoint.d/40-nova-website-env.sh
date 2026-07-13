#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/</\\u003c/g; s/>/\\u003e/g'
}

API_BASE_URL="${NOVA_WEBSITE_API_BASE_URL:-https://api.chatzaki.com}"
ENVIRONMENT_VALUE="${NOVA_WEBSITE_ENVIRONMENT:-production}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__NOVA_WEBSITE_ENV__ = {
  NOVA_WEBSITE_API_BASE_URL: "$(json_escape "$API_BASE_URL")",
  ENVIRONMENT: "$(json_escape "$ENVIRONMENT_VALUE")"
};
EOF

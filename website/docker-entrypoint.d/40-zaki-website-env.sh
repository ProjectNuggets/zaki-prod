#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

APP_BASE_URL_VALUE="${APP_BASE_URL:-${VITE_APP_BASE_URL:-https://www.chatzaki.ai}}"
SITE_URL_VALUE="${SITE_URL:-${VITE_SITE_URL:-https://www.chatzaki.com}}"
WEBSITE_API_BASE_URL_VALUE="${WEBSITE_API_BASE_URL:-${VITE_WEBSITE_API_BASE_URL:-}}"
ENVIRONMENT_VALUE="${ZAKI_WEBSITE_ENVIRONMENT:-${VITE_ZAKI_WEBSITE_ENVIRONMENT:-production}}"

cat > /usr/share/nginx/html/env.js <<EOF
window.__ZAKI_WEBSITE_ENV__ = {
  APP_BASE_URL: "$(json_escape "$APP_BASE_URL_VALUE")",
  SITE_URL: "$(json_escape "$SITE_URL_VALUE")",
  WEBSITE_API_BASE_URL: "$(json_escape "$WEBSITE_API_BASE_URL_VALUE")",
  ENVIRONMENT: "$(json_escape "$ENVIRONMENT_VALUE")"
};
EOF

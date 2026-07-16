#!/bin/sh
set -eu

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

sed_escape() {
  printf '%s' "$1" | sed 's/[\/&]/\\&/g'
}

APP_BASE_URL_VALUE="${APP_BASE_URL:-${VITE_APP_BASE_URL:-https://chatzaki.ai}}"
SITE_URL_VALUE="${SITE_URL:-${VITE_SITE_URL:-https://chatzaki.com}}"
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

APP_BASE_URL_REPLACEMENT="$(sed_escape "$APP_BASE_URL_VALUE")"
SITE_URL_REPLACEMENT="$(sed_escape "$SITE_URL_VALUE")"
WEBSITE_API_BASE_URL_REPLACEMENT="$(sed_escape "$WEBSITE_API_BASE_URL_VALUE")"
ENVIRONMENT_REPLACEMENT="$(sed_escape "$ENVIRONMENT_VALUE")"

find /usr/share/nginx/html -type f \( -name '*.html' -o -name 'sitemap.xml' \) -print | while IFS= read -r file; do
  sed -i \
    -e "s/https:\/\/zaki-app-base-url.invalid/${APP_BASE_URL_REPLACEMENT}/g" \
    -e "s/https:\/\/zaki-site-url.invalid/${SITE_URL_REPLACEMENT}/g" \
    -e "s/https:\/\/zaki-website-api-base-url.invalid/${WEBSITE_API_BASE_URL_REPLACEMENT}/g" \
    -e "s/__ZAKI_WEBSITE_ENVIRONMENT__/${ENVIRONMENT_REPLACEMENT}/g" \
    "$file"
done

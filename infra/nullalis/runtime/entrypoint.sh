#!/bin/sh
set -eu

CONFIG_TEMPLATE_PATH="/opt/nullalis-runtime/config.json.tmpl"
CONFIG_OUTPUT_PATH="/nullclaw-data/.nullalis/config.json"

require_env() {
  key="$1"
  eval "value=\${$key-}"
  if [ -z "${value}" ]; then
    echo "missing required environment variable: ${key}" >&2
    exit 1
  fi
}

require_bool() {
  key="$1"
  value="$2"
  case "$value" in
    true|false) ;;
    *)
      echo "invalid boolean for ${key}: ${value}" >&2
      exit 1
      ;;
  esac
}

require_uint() {
  key="$1"
  value="$2"
  case "$value" in
    ''|*[!0-9]*)
      echo "invalid integer for ${key}: ${value}" >&2
      exit 1
      ;;
  esac
}

json_escape() {
  printf '%s' "$1" | sed \
    -e 's/[&|]/\\&/g' \
    -e 's/\\/\\\\/g' \
    -e 's/"/\\"/g' \
    -e ':a' \
    -e 'N' \
    -e '$!ba' \
    -e 's/\n/\\n/g' \
    -e 's/\r/\\r/g' \
    -e 's/\t/\\t/g'
}

json_array_from_csv() {
  input="$1"
  if [ -z "$input" ]; then
    printf '[]'
    return
  fi

  first=true
  output='['
  old_ifs="$IFS"
  IFS=','
  set -- $input
  IFS="$old_ifs"

  for item in "$@"; do
    trimmed="$(printf '%s' "$item" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    if [ -z "$trimmed" ]; then
      continue
    fi
    escaped="$(json_escape "$trimmed")"
    if [ "$first" = true ]; then
      output="${output}\"${escaped}\""
      first=false
    else
      output="${output},\"${escaped}\""
    fi
  done

  output="${output}]"
  printf '%s' "$output"
}

render_template() {
  sed \
    -e "s|{{TOGETHER_API_KEY}}|${TOGETHER_API_KEY_ESC}|g" \
    -e "s|{{INTERNAL_SERVICE_TOKEN}}|${INTERNAL_SERVICE_TOKEN_ESC}|g" \
    -e "s|{{GATEWAY_HOST}}|${GATEWAY_HOST_ESC}|g" \
    -e "s|{{GATEWAY_PORT}}|${GATEWAY_PORT}|g" \
    -e "s|{{TENANT_DATA_ROOT}}|${TENANT_DATA_ROOT_ESC}|g" \
    -e "s|{{STATE_BACKEND}}|${STATE_BACKEND_ESC}|g" \
    -e "s|{{POSTGRES_RUNTIME_CONNECTION_STRING}}|${POSTGRES_RUNTIME_CONNECTION_STRING_ESC}|g" \
    -e "s|{{POSTGRES_SCHEMA}}|${POSTGRES_SCHEMA_ESC}|g" \
    -e "s|{{POSTGRES_POOL_MAX}}|${POSTGRES_POOL_MAX}|g" \
    -e "s|{{POSTGRES_STATEMENT_TIMEOUT_MS}}|${POSTGRES_STATEMENT_TIMEOUT_MS}|g" \
    -e "s|{{POSTGRES_LOCK_TIMEOUT_MS}}|${POSTGRES_LOCK_TIMEOUT_MS}|g" \
    -e "s|{{COMPOSIO_ENABLED}}|${COMPOSIO_ENABLED}|g" \
    -e "s|{{COMPOSIO_API_KEY}}|${COMPOSIO_API_KEY_ESC}|g" \
    -e "s|{{COMPOSIO_ENTITY_ID}}|${COMPOSIO_ENTITY_ID_ESC}|g" \
    -e "s|{{SESSION_SHARED_MAIN_BOOL}}|${SESSION_SHARED_MAIN_BOOL}|g" \
    -e "s|{{TELEGRAM_BOT_TOKEN}}|${TELEGRAM_BOT_TOKEN_ESC}|g" \
    -e "s|{{TELEGRAM_WEBHOOK_SECRET}}|${TELEGRAM_WEBHOOK_SECRET_ESC}|g" \
    -e "s|{{TELEGRAM_ALLOW_FROM_JSON}}|${TELEGRAM_ALLOW_FROM_JSON}|g" \
    "${CONFIG_TEMPLATE_PATH}" > "${CONFIG_OUTPUT_PATH}"
}

export HOME=/nullclaw-data
export NULLALIS_CONFIG_PATH="${CONFIG_OUTPUT_PATH}"

require_env TOGETHER_API_KEY
require_env INTERNAL_SERVICE_TOKEN
require_env POSTGRES_CONNECTION_STRING
require_env GATEWAY_HOST
require_env GATEWAY_PORT
require_env TENANT_DATA_ROOT
require_env STATE_BACKEND
require_env POSTGRES_SCHEMA
require_env POSTGRES_POOL_MAX
require_env POSTGRES_STATEMENT_TIMEOUT_MS
require_env POSTGRES_LOCK_TIMEOUT_MS
require_env COMPOSIO_ENABLED
require_env TELEGRAM_ALLOW_FROM
require_env SESSION_CROSS_CHANNEL_SHARED_MAIN

require_bool COMPOSIO_ENABLED "${COMPOSIO_ENABLED}"
require_bool SESSION_CROSS_CHANNEL_SHARED_MAIN "${SESSION_CROSS_CHANNEL_SHARED_MAIN}"
require_uint GATEWAY_PORT "${GATEWAY_PORT}"
require_uint POSTGRES_POOL_MAX "${POSTGRES_POOL_MAX}"
require_uint POSTGRES_STATEMENT_TIMEOUT_MS "${POSTGRES_STATEMENT_TIMEOUT_MS}"
require_uint POSTGRES_LOCK_TIMEOUT_MS "${POSTGRES_LOCK_TIMEOUT_MS}"

mkdir -p /nullclaw-data/.nullalis
mkdir -p "${TENANT_DATA_ROOT}"

POSTGRES_RUNTIME_CONNECTION_STRING="${POSTGRES_CONNECTION_STRING}"
if [ "${POSTGRES_USE_PGBOUNCER:-false}" = "true" ] && [ -n "${PGBOUNCER_CONNECTION_STRING:-}" ]; then
  POSTGRES_RUNTIME_CONNECTION_STRING="${PGBOUNCER_CONNECTION_STRING}"
fi

SESSION_SHARED_MAIN_BOOL=false
if [ "${SESSION_CROSS_CHANNEL_SHARED_MAIN}" = "true" ]; then
  SESSION_SHARED_MAIN_BOOL=true
fi

TOGETHER_API_KEY_ESC="$(json_escape "${TOGETHER_API_KEY}")"
INTERNAL_SERVICE_TOKEN_ESC="$(json_escape "${INTERNAL_SERVICE_TOKEN}")"
GATEWAY_HOST_ESC="$(json_escape "${GATEWAY_HOST}")"
TENANT_DATA_ROOT_ESC="$(json_escape "${TENANT_DATA_ROOT}")"
STATE_BACKEND_ESC="$(json_escape "${STATE_BACKEND}")"
POSTGRES_RUNTIME_CONNECTION_STRING_ESC="$(json_escape "${POSTGRES_RUNTIME_CONNECTION_STRING}")"
POSTGRES_SCHEMA_ESC="$(json_escape "${POSTGRES_SCHEMA}")"
COMPOSIO_API_KEY_ESC="$(json_escape "${COMPOSIO_API_KEY:-}")"
COMPOSIO_ENTITY_ID_ESC="$(json_escape "${COMPOSIO_ENTITY_ID:-default}")"
TELEGRAM_BOT_TOKEN_ESC="$(json_escape "${TELEGRAM_BOT_TOKEN:-}")"
TELEGRAM_WEBHOOK_SECRET_ESC="$(json_escape "${TELEGRAM_WEBHOOK_SECRET:-}")"
TELEGRAM_ALLOW_FROM_JSON="$(json_array_from_csv "${TELEGRAM_ALLOW_FROM}")"

render_template

exec nullalis gateway --host "${GATEWAY_HOST}" --port "${GATEWAY_PORT}"

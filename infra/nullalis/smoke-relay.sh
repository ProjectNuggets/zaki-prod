#!/usr/bin/env bash
set -euo pipefail

: "${BACKEND_BASE_URL:?Set BACKEND_BASE_URL}"
: "${INTERNAL_TOKEN:?Set INTERNAL_TOKEN}"
: "${USER_ID:?Set USER_ID}"

auth=(
  -H "X-Internal-Token: ${INTERNAL_TOKEN}"
  -H "X-Zaki-User-Id: ${USER_ID}"
)
json=(-H "Content-Type: application/json")

echo "[relay] diagnostics"
diagnostics_json="$(curl -fsS "${BACKEND_BASE_URL}/api/agent/diagnostics" "${auth[@]}")"
printf '%s\n' "${diagnostics_json}" | jq '.'

agent_enabled="$(jq -r '.agentBackendEnabled' <<<"${diagnostics_json}")"
upstream_health_ok="$(jq -r '.upstreamHealth.ok' <<<"${diagnostics_json}")"
upstream_ready_ok="$(jq -r '.upstreamReady.ok' <<<"${diagnostics_json}")"
provider_summary="$(jq -r '.upstreamSummary.provider // ""' <<<"${diagnostics_json}")"

if [[ "${agent_enabled}" != "true" ]]; then
  echo "agent backend is not enabled" >&2
  exit 1
fi
if [[ "${upstream_health_ok}" != "true" || "${upstream_ready_ok}" != "true" ]]; then
  echo "backend diagnostics report unhealthy upstream" >&2
  exit 1
fi
if [[ "${provider_summary}" != "together-ai/moonshotai/kimi-k2.5" ]]; then
  echo "unexpected provider summary: ${provider_summary}" >&2
  exit 1
fi

echo "[relay] stream chat"
stream_output="$(
  curl -fsS -N -X POST "${BACKEND_BASE_URL}/api/agent/chat/stream" "${auth[@]}" "${json[@]}" \
    -d "{\"message\":\"Reply with relay smoke ok\",\"threadId\":\"smoke-relay\",\"spaceId\":\"zaki-bot\"}" |
    sed -n '1,30p'
)"
printf '%s\n' "${stream_output}"
if ! grep -Eq 'event: (token|done|status|progress)' <<<"${stream_output}"; then
  echo "relay stream smoke did not receive SSE events" >&2
  exit 1
fi

#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?Set BASE_URL}"
: "${INTERNAL_TOKEN:?Set INTERNAL_TOKEN}"
: "${USER_ID:?Set USER_ID}"

: "${EXPECT_PRIMARY_PROVIDER:=together-ai/moonshotai/kimi-k2.5}"
: "${EXPECT_STATE_EFFECTIVE:=postgres}"
: "${EXPECT_NOT_DEGRADED:=true}"

auth=(-H "X-Internal-Token: ${INTERNAL_TOKEN}")
json=(-H "Content-Type: application/json")

echo "[direct] health"
curl -fsS "${BASE_URL}/health" >/dev/null

echo "[direct] ready"
curl -fsS "${BASE_URL}/ready" >/dev/null

echo "[direct] diagnostics"
diagnostics_json="$(curl -fsS "${BASE_URL}/internal/diagnostics" "${auth[@]}")"
provider_effective="$(jq -r '.startup_self_check.chat_provider_effective // ""' <<<"${diagnostics_json}")"
state_effective="$(jq -r '.startup_self_check.state_backend_effective // ""' <<<"${diagnostics_json}")"
degraded_flag="$(jq -r '.startup_self_check.degraded | tostring' <<<"${diagnostics_json}")"

if [[ "${provider_effective}" != "${EXPECT_PRIMARY_PROVIDER}" ]]; then
  echo "expected provider ${EXPECT_PRIMARY_PROVIDER}, got ${provider_effective}" >&2
  exit 1
fi
if [[ "${state_effective}" != "${EXPECT_STATE_EFFECTIVE}" ]]; then
  echo "expected state backend ${EXPECT_STATE_EFFECTIVE}, got ${state_effective}" >&2
  exit 1
fi
if [[ "${EXPECT_NOT_DEGRADED}" == "true" && "${degraded_flag}" != "false" ]]; then
  echo "runtime is degraded" >&2
  exit 1
fi

echo "[direct] provision user"
curl -fsS -X POST "${BASE_URL}/api/v1/users/provision" "${auth[@]}" "${json[@]}" \
  -d "{\"user_id\":\"${USER_ID}\"}" >/dev/null

echo "[direct] stream chat"
stream_output="$(
  curl -fsS -N -X POST "${BASE_URL}/api/v1/chat/stream" "${auth[@]}" "${json[@]}" \
    -H "X-Zaki-User-Id: ${USER_ID}" \
    -d "{\"message\":\"Reply with direct smoke ok\",\"session_key\":\"agent:zaki-bot:user:${USER_ID}:thread:smoke-direct\"}" |
    sed -n '1,30p'
)"
printf '%s\n' "${stream_output}"
if ! grep -Eq 'event: (token|done|status|progress)' <<<"${stream_output}"; then
  echo "direct stream smoke did not receive SSE events" >&2
  exit 1
fi

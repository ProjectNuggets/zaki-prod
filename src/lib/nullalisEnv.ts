const NULLALIS_STREAM_PATH = "/api/v1/chat/stream";

function getViteEnvString(key: string) {
  const env = (import.meta as { env?: Record<string, string | boolean | undefined> }).env;
  const value = env?.[key];
  if (value == null) return "";
  return String(value).trim();
}

function readBooleanEnv(key: string) {
  const value = getViteEnvString(key).toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

export function isNullalisModeEnabled() {
  return readBooleanEnv("VITE_NULLALIS_MODE");
}

export function getNullalisUserId() {
  return getViteEnvString("VITE_NULLALIS_USER_ID") || "1";
}

export function getNullalisToken() {
  return getViteEnvString("VITE_NULLALIS_TOKEN") || "dev-token";
}

export function buildNullalisStreamUrl() {
  const backendUrl = getViteEnvString("VITE_NULLALIS_BACKEND_URL").replace(/\/+$/, "");
  const env = (import.meta as { env?: Record<string, unknown> }).env;
  const preferProxy = Boolean(env?.DEV ?? true);
  if (preferProxy || !backendUrl) return NULLALIS_STREAM_PATH;
  return `${backendUrl}${NULLALIS_STREAM_PATH}`;
}

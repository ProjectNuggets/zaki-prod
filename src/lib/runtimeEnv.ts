type ProcessEnv = Record<string, string | undefined>;

function normalizeEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readProcessEnv(name: string): string | undefined {
  const env = (
    globalThis as typeof globalThis & {
      process?: { env?: ProcessEnv };
    }
  ).process?.env;
  return normalizeEnvValue(env?.[name]);
}

export function isDevRuntime(): boolean {
  if (typeof __APP_DEV__ !== "undefined") {
    return __APP_DEV__;
  }
  return readProcessEnv("NODE_ENV") !== "production";
}

export function isProdRuntime(): boolean {
  if (typeof __APP_PROD__ !== "undefined") {
    return __APP_PROD__;
  }
  return readProcessEnv("NODE_ENV") === "production";
}

export function getConfiguredApiBase(): string | undefined {
  if (typeof __VITE_ZAKI_BACKEND_URL__ !== "undefined") {
    return normalizeEnvValue(__VITE_ZAKI_BACKEND_URL__)?.replace(/\/+$/, "");
  }
  return readProcessEnv("VITE_ZAKI_BACKEND_URL")?.replace(/\/+$/, "");
}

export function getConfiguredLegacyApiBase(): string | undefined {
  if (typeof __VITE_API_BASE_URL__ !== "undefined") {
    return normalizeEnvValue(__VITE_API_BASE_URL__)?.replace(/\/+$/, "");
  }
  return readProcessEnv("VITE_API_BASE_URL")?.replace(/\/+$/, "");
}

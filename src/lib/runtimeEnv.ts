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

// Runtime config injected at container start (public/env.js, overwritten by the nginx entrypoint from
// the BACKEND_URL container env). Highest priority so ONE built image serves any environment without
// baking the backend URL at build time — see docker-entrypoint.d/40-zaki-env.sh.
function readRuntimeEnv(name: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const env = (window as typeof window & { __ZAKI_ENV__?: ProcessEnv }).__ZAKI_ENV__;
  return normalizeEnvValue(env?.[name]);
}

// Sentry/GlitchTip config injected at runtime (same env.js mechanism as BACKEND_URL). Empty → SDK no-op.
export function getSentryConfig(): { dsn?: string; environment?: string } {
  return {
    dsn: readRuntimeEnv("SENTRY_DSN"),
    environment: readRuntimeEnv("SENTRY_ENVIRONMENT"),
  };
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
  // Runtime first: a per-environment BACKEND_URL injected at container start beats any build-time bake.
  const runtime = readRuntimeEnv("BACKEND_URL");
  if (runtime) return runtime.replace(/\/+$/, "");
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

export function getConfiguredTurnstileSiteKey(): string | undefined {
  const runtime = readRuntimeEnv("VITE_TURNSTILE_SITE_KEY");
  if (runtime) return runtime;
  if (typeof __VITE_TURNSTILE_SITE_KEY__ !== "undefined") {
    return normalizeEnvValue(__VITE_TURNSTILE_SITE_KEY__);
  }
  return readProcessEnv("VITE_TURNSTILE_SITE_KEY");
}

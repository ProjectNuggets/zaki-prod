// Sentry/GlitchTip instrumentation — preloaded via `node --import ./src/instrument.mjs src/index.js`
// so the SDK initializes BEFORE the app's modules load (required for ESM auto-instrumentation of
// http/express). No-op when SENTRY_DSN is unset (e.g. prod until a prod GlitchTip project exists).
import * as Sentry from "@sentry/node";

const dsn = (process.env.SENTRY_DSN || "").trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "staging",
    release: process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false, // do not attach request bodies / user emails by default
  });
  // eslint-disable-next-line no-console
  console.log("[sentry] initialized:", process.env.SENTRY_ENVIRONMENT || "staging");
}

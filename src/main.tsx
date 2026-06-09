import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./routes.tsx";
import { ErrorBoundary } from "./app/components/ErrorBoundary";
import { getSentryConfig } from "./lib/runtimeEnv";
import "./i18n";
import "./styles/index.css";

// Error monitoring → self-hosted GlitchTip (F2). DSN injected at runtime via /env.js (no build-time bake);
// no-op when unset. Sentry auto-captures unhandled errors + promise rejections.
const sentryCfg = getSentryConfig();
if (sentryCfg.dsn) {
  Sentry.init({
    dsn: sentryCfg.dsn,
    environment: sentryCfg.environment || "staging",
    tracesSampleRate: 0.1,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </ErrorBoundary>
);

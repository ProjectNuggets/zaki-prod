import { defineConfig, devices } from "@playwright/test";

const PORT = 4273;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    timeout: 120_000,
    reuseExistingServer: false,
    // Neutralize the developer's .env/.env.local backend URL (gitignored, so CI never has one). With
    // it set, getBackendBase() points the app at localhost:8787 while the page is on 127.0.0.1:4273 —
    // different registrable domains, so the workbench iframe is cross-SITE and its SameSite=Strict
    // session cookie is withheld. The specs mock every /api/** route anyway; the dev server only
    // serves the SPA. Empty string is normalized back to window.location.origin.
    env: { VITE_ZAKI_BACKEND_URL: "", VITE_API_BASE_URL: "" },
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
      },
    },
  ],
});

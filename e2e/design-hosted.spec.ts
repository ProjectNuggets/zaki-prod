import { expect, test, type Route } from "@playwright/test";
import { RELEASE_PRODUCT_REGISTRY, signInForRelease } from "./support/release-harness";

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("signed-in user opens and stops an isolated Design workspace", async ({ page }) => {
  const productRegistry = {
    ...RELEASE_PRODUCT_REGISTRY,
    products: RELEASE_PRODUCT_REGISTRY.products.map((product) =>
      product.productId === "design"
        ? { ...product, state: "enabled" as const, lifecycle: "current" as const }
        : product),
  };
  await signInForRelease(page, { productRegistry });

  await page.route("**/api/design/health", (route) => json(route, {
    ok: true, enabled: true, configured: true, topology: "session-controller",
  }));
  await page.route("**/api/design/projects", async (route) => {
    if (route.request().method() === "POST") {
      return json(route, { project: { id: "project_new", name: "New project" } }, 201);
    }
    return json(route, { projects: [{ id: "project_01", name: "Brand system" }] });
  });
  await page.route("**/api/design/sessions", (route) => route.fulfill({
    status: 202,
    contentType: "application/json",
    headers: {
      "set-cookie": "zaki_design_workbench_sess_01=scoped; Path=/api/design; HttpOnly; SameSite=Strict",
    },
    body: JSON.stringify({
      session: { id: "sess_01", projectId: "project_01", state: "STARTING", generation: 1 },
      retryAfterMs: 10,
    }),
  }));
  await page.route("**/api/design/sessions/sess_01?projectId=project_01", (route) => json(route, {
    session: { id: "sess_01", projectId: "project_01", state: "READY", generation: 1 },
  }));
  await page.route("**/api/design/sessions/sess_01/stop", (route) => json(route, {
    session: { id: "sess_01", projectId: "project_01", state: "STOPPED", generation: 1 },
  }));
  await page.route("**/api/design/sessions/sess_01/proxy/api/projects/project_01/files", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("POST");
    expect(request.headers().authorization).toBeUndefined();
    expect(request.headers().cookie).toContain("zaki_design_workbench_sess_01=scoped");
    expect(request.postDataBuffer()?.byteLength).toBeGreaterThan(0);
    expect(request.postDataJSON()).toEqual({ name: "browser-proof.html" });
    await json(route, { ok: true });
  });
  await page.route("**/api/design/workbench/**", (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: `<!doctype html><html><body><main>
      <h1>Open Design workbench</h1>
      <p id="proxy-status">Saving through session proxy</p>
      <script>
        fetch('/api/design/sessions/sess_01/proxy/api/projects/project_01/files', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json', 'x-zaki-project-id': 'project_01' },
          body: JSON.stringify({ name: 'browser-proof.html' }),
        }).then((response) => {
          if (!response.ok) throw new Error('proxy failed');
          document.querySelector('#proxy-status').textContent = 'Saved through session proxy';
        });
      </script>
    </main></body></html>`,
  }));

  await page.goto("/design");
  await page.evaluate(() => window.localStorage.removeItem("zaki.auth.token"));
  await page.getByRole("button", { name: /Brand system/i }).click();
  await expect(page.getByTitle("ZAKI Design workbench")).toBeVisible();
  const workbench = page.frames().find((frame) => frame !== page.mainFrame())!;
  await expect(workbench.getByRole("heading", { name: "Open Design workbench" })).toBeVisible();
  await expect(workbench.getByText("Saved through session proxy")).toBeVisible();

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("heading", { name: "Your design projects" })).toBeVisible();
});

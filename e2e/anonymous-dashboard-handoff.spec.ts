// Launch-close sweep regressions (2026-07-16): the anonymous dashboard
// "Start in Spaces" handoff.
//
// Defect 1 — the typed prompt posted into the new thread and the BFF metered
// a unit, but the reply never arrived: navigating `/` → the new thread route
// remounted ChatArea, and its unmount cleanup aborted the just-fired stream.
// Defect 2 — reloading the dashboard-started thread must rebuild the full
// ordered transcript from the browser ledger.
//
// The stream mock echoes the request message so ordering assertions are
// unambiguous, counts every stream POST (exactly one metered send per turn),
// and counts aborts (the handoff must not tear its own stream down).
import { expect, test, type Page, type Route } from "@playwright/test";
import { mockReleaseShell } from "./support/release-harness";

const DAILY_RESET = "2026-07-18T00:00:00.000Z";

async function json(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function mockAnonymousSession(page: Page) {
  await mockReleaseShell(page);
  await page.addInitScript(() => {
    window.localStorage.removeItem("zaki.auth.token");
    window.localStorage.setItem("zaki:locale", "en");
    window.localStorage.setItem("zaki:dashboard-v2-intro-dismissed", "1");

    const originalFetch = window.fetch.bind(window);
    const encoder = new TextEncoder();
    const counters = window as unknown as {
      __streamCalls: number;
      __streamAborts: number;
    };
    counters.__streamCalls = 0;
    counters.__streamAborts = 0;
    window.fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (
        url.includes("/api/anonymous/workspace/zaky/thread/") &&
        url.includes("/stream-chat")
      ) {
        counters.__streamCalls += 1;
        const threadSlug = decodeURIComponent(
          url.split("/thread/")[1]?.split("/stream-chat")[0] || ""
        );
        let message = "";
        try {
          message = String(JSON.parse(String(init?.body || "{}")).message || "");
        } catch {
          message = "";
        }
        return new Promise<Response>((resolve, reject) => {
          const signal = init?.signal;
          const fail = () => {
            counters.__streamAborts += 1;
            reject(new DOMException("Aborted", "AbortError"));
          };
          if (signal?.aborted) {
            fail();
            return;
          }
          signal?.addEventListener("abort", fail, { once: true });
          // Small delay approximates real BFF latency: the sweep's defect was
          // an abort that landed between dispatch and the first byte.
          window.setTimeout(() => {
            if (signal?.aborted) return;
            signal?.removeEventListener("abort", fail);
            resolve(
              new Response(
                new ReadableStream({
                  start(controller) {
                    controller.enqueue(
                      encoder.encode(
                        'data: {"type":"textResponseChunk","textResponse":"Reply to "}\n\n'
                      )
                    );
                    window.setTimeout(() => {
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            type: "textResponseChunk",
                            textResponse: message,
                          })}\n\n` +
                            'data: {"type":"finalizeResponseStream","close":true}\n\n'
                        )
                      );
                      controller.close();
                    }, 400);
                  },
                  cancel() {},
                }),
                {
                  status: 200,
                  headers: {
                    "content-type": "text/event-stream",
                    "x-zaki-spaces-route": `/spaces/zaky/threads/${encodeURIComponent(
                      threadSlug
                    )}`,
                  },
                }
              )
            );
          }, 150);
        });
      }
      return originalFetch(input, init);
    };
  });

  await page.route("**/api/auth/refresh", async (route) => {
    await json(route, { error: "unauthorized" }, 401);
  });
  await page.route("**/api/meter/status**", async (route) => {
    await json(route, {
      success: true,
      contractVersion: "2026-07-14.anonymous-daily-meter.v1",
      identity: {
        type: "anonymous",
        tenantId: "public",
        userId: null,
        anonymousSessionId: "anon-e2e",
      },
      plan: {
        tier: "anonymous",
        label: "Anonymous",
        source: "anonymous_daily_allowance",
      },
      enforced: {
        kind: "anonymous_daily_prompts",
        surface: "spaces",
        period: "day",
        limit: 10,
        used: 0,
        remaining: 10,
        resetAt: DAILY_RESET,
      },
    });
  });
  let threadCreates = 0;
  await page.route("**/api/anonymous/workspace/zaky/thread/new", async (route) => {
    threadCreates += 1;
    const body = route.request().postDataJSON() as { slug?: string; name?: string };
    const slug = String(body?.slug || `anon-${Date.now()}`);
    await json(route, {
      thread: { id: slug, slug, name: body?.name || "Anonymous chat" },
      message: null,
    });
  });
  await page.route("**/api/documents/accepted-file-types", async (route) => {
    await json(route, { types: { "text/plain": [".txt"] } });
  });
  await page.route("**/api/telemetry/product-event", async (route) => {
    await json(route, {});
  });
  return { getThreadCreates: () => threadCreates };
}

async function setDefectViewport(page: Page, projectName: string) {
  await page.setViewportSize(
    projectName.includes("mobile")
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 }
  );
}

async function startInSpaces(page: Page, prompt: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const commandInput = page.getByLabel("Describe what you want ZAKI to do");
  await expect(commandInput).toBeVisible({ timeout: 20_000 });
  await commandInput.fill(prompt);
  await page.getByRole("button", { name: "Start in Spaces" }).click();
  await page.waitForURL(/\/spaces\/zaky\/threads\/anon-/, { timeout: 15_000 });
}

function streamCounters(page: Page) {
  return page.evaluate(() => ({
    calls: (window as unknown as { __streamCalls?: number }).__streamCalls ?? 0,
    aborts: (window as unknown as { __streamAborts?: number }).__streamAborts ?? 0,
  }));
}

test.describe("anonymous dashboard → Spaces handoff", () => {
  test("first turn streams its reply into the new thread on exactly one metered send", async ({
    page,
  }, testInfo) => {
    const { getThreadCreates } = await mockAnonymousSession(page);
    await setDefectViewport(page, testInfo.project.name);

    await startInSpaces(page, "Draft a launch checklist");

    const main = page.locator("#main-content");
    await expect(
      main.getByText("Draft a launch checklist", { exact: true })
    ).toBeVisible({ timeout: 15_000 });
    // Defect 1: this reply never arrived — the handoff aborted its own stream
    // after the BFF had already consumed the metered unit.
    await expect(
      main.getByText("Reply to Draft a launch checklist", { exact: true })
    ).toBeVisible({ timeout: 15_000 });

    const counters = await streamCounters(page);
    expect(counters.calls).toBe(1); // exactly one metered unit
    expect(counters.aborts).toBe(0); // the handoff no longer kills its own turn
    expect(getThreadCreates()).toBe(1);

    // The browser ledger (the only transcript store for anonymous turns) must
    // hold the completed turn, not an empty interrupted husk.
    const turns = await page.evaluate(() => {
      const ledger = JSON.parse(
        window.localStorage.getItem("zaki:anonymous-work:v1") || "{}"
      ) as { items?: Array<{ threadId?: string | null; turns?: unknown[] }> };
      return (ledger.items || []).find((item) => item.threadId)?.turns ?? [];
    });
    expect(turns).toEqual([
      expect.objectContaining({
        prompt: "Draft a launch checklist",
        reply: "Reply to Draft a launch checklist",
        status: "succeeded",
      }),
    ]);

    await testInfo.attach("dashboard-handoff-first-turn", {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    });
  });

  test("dashboard-started thread survives reload with the full ordered transcript", async ({
    page,
  }, testInfo) => {
    await mockAnonymousSession(page);
    await setDefectViewport(page, testInfo.project.name);

    await startInSpaces(page, "Draft a launch checklist");
    const main = page.locator("#main-content");
    await expect(
      main.getByText("Reply to Draft a launch checklist", { exact: true })
    ).toBeVisible({ timeout: 15_000 });

    // A direct follow-up in the chat view, then a full reload.
    const composer = page.getByRole("combobox");
    await composer.fill("Add a rollback step");
    await page.getByRole("button", { name: /send/i }).click();
    await expect(
      main.getByText("Reply to Add a rollback step", { exact: true })
    ).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: "domcontentloaded" });

    // Defect 2: the user's own turns must survive the reload alongside the
    // assistant replies, in order.
    await expect(
      main.getByText("Draft a launch checklist", { exact: true })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      main.getByText("Reply to Draft a launch checklist", { exact: true })
    ).toBeVisible();
    await expect(
      main.getByText("Add a rollback step", { exact: true })
    ).toBeVisible();
    await expect(
      main.getByText("Reply to Add a rollback step", { exact: true })
    ).toBeVisible();

    const transcript = await main.innerText();
    const order = [
      "Draft a launch checklist",
      "Reply to Draft a launch checklist",
      "Add a rollback step",
      "Reply to Add a rollback step",
    ].map((text) => transcript.indexOf(text));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    await testInfo.attach("dashboard-handoff-reload", {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    });
  });
});

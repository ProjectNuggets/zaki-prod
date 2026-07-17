import { expect, test } from "@playwright/test";

test.describe("anonymous Spaces continuity", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const createdAt = new Date().toISOString();
      if (!window.localStorage.getItem("zaki:anonymous-work:v1")) {
        window.localStorage.setItem(
          "zaki:anonymous-work:v1",
          JSON.stringify({
            version: 2,
            updatedAt: createdAt,
            items: [
              {
                id: "saved-work",
                productId: "spaces",
                taskKind: "chat",
                prompt: "Saved question",
                replyPreview: "Saved answer",
                reply: "Saved answer",
                route: "/spaces/zaky/threads/saved-thread",
                threadId: "saved-thread",
                title: "Saved question",
                createdAt,
                updatedAt: createdAt,
                meterRemaining: 9,
                status: "succeeded",
                turns: [
                  {
                    id: "saved-turn",
                    prompt: "Saved question",
                    reply: "Saved answer",
                    createdAt,
                    updatedAt: createdAt,
                    status: "succeeded",
                  },
                ],
              },
            ],
          })
        );
      }

      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url.includes("/api/anonymous/workspace/zaky/thread/saved-thread/stream-chat")) {
          const encoder = new TextEncoder();
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  encoder.encode(
                    'data: {"type":"textResponseChunk","textResponse":"First token"}\n\n'
                  )
                );
                window.setTimeout(() => {
                  controller.enqueue(
                    encoder.encode(
                      'data: {"type":"textResponseChunk","textResponse":" and the rest"}\n\n' +
                        'data: {"type":"finalizeResponseStream","close":true}\n\n'
                    )
                  );
                  controller.close();
                }, 500);
              },
              cancel() {},
            }),
            {
              status: 200,
              headers: {
                "content-type": "text/event-stream",
                "x-zaki-spaces-route": "/spaces/zaky/threads/saved-thread",
              },
            }
          );
        }
        return originalFetch(input, init);
      };
    });

    await page.route("**/api/documents/accepted-file-types", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ types: { "text/plain": [".txt"] } }),
      });
    });
    await page.route("**/api/telemetry/product-event", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
  });

  test("streams a new turn, stores it, and restores the transcript after reload", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(
      testInfo.project.name.includes("mobile")
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 }
    );
    await page.goto("/spaces/zaky/threads/saved-thread", {
      waitUntil: "domcontentloaded",
    });

    const main = page.locator("#main-content");
    await expect(main.getByText("Saved question", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(main.getByText("Saved answer", { exact: true })).toBeVisible();

    const composer = page.getByRole("combobox");
    await composer.fill("Stream another answer");
    await page.getByRole("button", { name: /send/i }).click();

    await expect(main.getByText("First token", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /stop/i })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(main.getByText("First token", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    const interruptedTurns = await page.evaluate(() => {
      const ledger = JSON.parse(
        window.localStorage.getItem("zaki:anonymous-work:v1") || "{}"
      );
      return ledger.items?.[0]?.turns ?? [];
    });
    expect(interruptedTurns).toEqual([
      expect.objectContaining({ prompt: "Saved question", reply: "Saved answer" }),
      expect.objectContaining({
        prompt: "Stream another answer",
        reply: "First token",
        status: "interrupted",
      }),
    ]);

    await composer.fill("Complete after reload");
    await page.getByRole("button", { name: /send/i }).click();
    await expect(main.getByText("First token and the rest", { exact: true })).toBeVisible();

    const storedTurns = await page.evaluate(() => {
      const ledger = JSON.parse(
        window.localStorage.getItem("zaki:anonymous-work:v1") || "{}"
      );
      return ledger.items?.[0]?.turns ?? [];
    });
    expect(storedTurns).toEqual([
      expect.objectContaining({ prompt: "Saved question", reply: "Saved answer" }),
      expect.objectContaining({
        prompt: "Stream another answer",
        reply: "First token",
        status: "interrupted",
      }),
      expect.objectContaining({
        prompt: "Complete after reload",
        reply: "First token and the rest",
        status: "succeeded",
      }),
    ]);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(main.getByText("Saved answer", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(main.getByText("First token", { exact: true })).toBeVisible();
    await expect(main.getByText("First token and the rest", { exact: true })).toBeVisible();
    await testInfo.attach("anonymous-spaces-continuity", {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    });
  });
});

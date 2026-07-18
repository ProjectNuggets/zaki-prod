import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Route } from "@playwright/test";
import {
  RELEASE_PRODUCT_REGISTRY,
  RELEASE_VIEWPORTS,
  signInForRelease,
} from "./support/release-harness";

const metadata = [
  {
    id: "meeting:41",
    kind: "meeting",
    title: "Launch review",
    occurred_at: "2026-07-17T09:00:00Z",
    updated_at: "2026-07-17T10:00:00Z",
    sensitivity: "sensitive_pii",
    retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" },
  },
  {
    id: "transcript:41",
    kind: "transcript",
    meeting_id: "meeting:41",
    title: "Launch review",
    occurred_at: "2026-07-17T09:00:00Z",
    updated_at: "2026-07-17T10:00:00Z",
    sensitivity: "sensitive_pii",
    retention: { scope: "minutes.transcript", expires_at: "2027-07-17T10:00:00Z" },
  },
  {
    id: "summary:41",
    kind: "summary",
    meeting_id: "meeting:41",
    title: "Launch review",
    occurred_at: "2026-07-17T09:00:00Z",
    updated_at: "2026-07-17T10:00:00Z",
    sensitivity: "sensitive_pii",
    retention: { scope: "minutes.summary", expires_at: "2027-07-17T10:00:00Z" },
  },
] as const;

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("signed-in Minutes archive is bounded, responsive, and privacy-labelled", async ({ page }, testInfo) => {
  const productRegistry = {
    ...RELEASE_PRODUCT_REGISTRY,
    products: [
      ...RELEASE_PRODUCT_REGISTRY.products.filter((product) => product.productId !== "minutes"),
      {
        productId: "minutes",
        label: "ZAKI Minutes",
        productKind: "product" as const,
        state: "enabled" as const,
        lifecycle: "current" as const,
        visibleInSettings: true,
        route: "/minutes",
        memoryScope: "minutes",
      },
    ],
  };
  await signInForRelease(page, { productRegistry });

  await page.route("**/api/minutes/index?**", async (route) => {
    expect(route.request().method()).toBe("GET");
    expect(route.request().headers()["x-zaki-read-token"]).toBeUndefined();
    await json(route, { items: metadata, truncated: false });
  });
  await page.route("**/api/minutes/items/**", async (route) => {
    expect(route.request().method()).toBe("GET");
    expect(route.request().url()).toContain("transcript%3A41?variant=full");
    await json(route, {
      item: {
        ...metadata[1],
        capture_notice: {
          bot_visible: true,
          tenant_attested_at: "2026-07-17T08:55:00Z",
          policy_version: "minutes-consent-v1",
        },
        content: {
          format: "speaker_turns",
          language: "en",
          turns: [
            {
              speaker: "Nova",
              text: "Ship the authenticated read boundary.",
              started_at: "2026-07-17T09:00:00Z",
            },
          ],
        },
      },
      truncated: false,
    });
  });

  const viewport = testInfo.project.name === "chromium-mobile"
    ? RELEASE_VIEWPORTS.mobile
    : RELEASE_VIEWPORTS.desktop;
  await page.setViewportSize(viewport);
  await page.goto("/minutes", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Minutes", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Launch review" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.screenshot({
    path: `e2e/__screenshots__/minutes/${testInfo.project.name}-archive.png`,
    fullPage: false,
  });

  await page.getByRole("button", { name: "Open transcript" }).click();
  await expect(page.getByText("Visible capture verified")).toBeVisible();
  await expect(page.locator("article").getByRole("heading", { name: "Launch review" })).toBeInViewport();
  await expect(page.getByText("Ship the authenticated read boundary.")).toBeVisible();
  await page.getByText("Visible capture verified").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ["critical", "serious"].includes(violation.impact ?? ""))).toEqual([]);
  await page.screenshot({
    path: `e2e/__screenshots__/minutes/${testInfo.project.name}-detail.png`,
    fullPage: false,
  });
});

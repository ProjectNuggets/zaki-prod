import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  ANONYMOUS_WORK_LEDGER_KEY,
  readAnonymousWorkLedger,
  upsertAnonymousWorkItem,
  writeAnonymousWorkLedger,
  type AnonymousWorkItem,
} from "./anonymousWork";

describe("anonymous work ledger", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates and updates capped local anonymous work records", () => {
    const first = upsertAnonymousWorkItem(
      {
        productId: "spaces",
        taskKind: "chat",
        prompt: "Summarize this launch plan",
        route: "/spaces/zaky/threads/one",
        threadId: "one",
        meterRemaining: 9,
        status: "draft",
      },
      Date.parse("2026-06-01T10:00:00.000Z")
    );

    expect(first?.title).toBe("Summarize this launch plan");
    expect(readAnonymousWorkLedger().items).toHaveLength(1);

    const updated = upsertAnonymousWorkItem(
      {
        productId: "spaces",
        taskKind: "chat",
        prompt: "Summarize this launch plan",
        replyPreview: "Here is a concise summary.",
        route: "/spaces/zaky/threads/one",
        threadId: "one",
        status: "succeeded",
      },
      Date.parse("2026-06-01T10:02:00.000Z")
    );

    const ledger = readAnonymousWorkLedger(Date.parse("2026-06-01T10:02:00.000Z"));
    expect(ledger.items).toHaveLength(1);
    expect(ledger.items[0]?.id).toBe(updated?.id);
    expect(ledger.items[0]?.replyPreview).toBe("Here is a concise summary.");
    expect(ledger.items[0]?.status).toBe("succeeded");
  });

  it("defaults partial anonymous work records to plan work", () => {
    const created = upsertAnonymousWorkItem(
      {
        productId: "agent",
        prompt: "Plan the launch cutover",
        route: "/agent",
      },
      Date.parse("2026-06-01T10:00:00.000Z")
    );

    expect(created?.taskKind).toBe("plan");

    window.localStorage.setItem(
      ANONYMOUS_WORK_LEDGER_KEY,
      JSON.stringify({
        items: [
          {
            id: "stored",
            productId: "agent",
            prompt: "Plan the launch cutover",
            route: "/agent",
            createdAt: "2026-06-01T10:00:00.000Z",
            updatedAt: "2026-06-01T10:00:00.000Z",
          },
        ],
      })
    );

    const ledger = readAnonymousWorkLedger(Date.parse("2026-06-01T10:01:00.000Z"));
    expect(ledger.items[0]?.taskKind).toBe("plan");
  });

  it("expires old records and caps to the last 20 items", () => {
    const now = Date.parse("2026-06-15T10:00:00.000Z");
    const items: AnonymousWorkItem[] = Array.from({ length: 25 }).map((_, index) => ({
      id: `item-${index}`,
      productId: "spaces",
      taskKind: "chat",
      prompt: `Prompt ${index}`,
      replyPreview: "",
      route: `/spaces/zaky/threads/${index}`,
      threadId: String(index),
      title: `Prompt ${index}`,
      createdAt: new Date(now - index * 1000).toISOString(),
      updatedAt: new Date(now - index * 1000).toISOString(),
      meterRemaining: null,
    }));
    items.push({
      id: "old",
      productId: "spaces",
      taskKind: "chat",
      prompt: "Old prompt",
      replyPreview: "",
      route: "/spaces/zaky/threads/old",
      threadId: "old",
      title: "Old prompt",
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-01T00:00:00.000Z",
      meterRemaining: null,
    });

    writeAnonymousWorkLedger(items, now);
    const ledger = readAnonymousWorkLedger(now);

    expect(ledger.items).toHaveLength(20);
    expect(ledger.items.some((item) => item.id === "old")).toBe(false);
    expect(ledger.items[0]?.id).toBe("item-0");
    expect(ledger.items[19]?.id).toBe("item-19");
  });

  it("ignores malformed stored data and trims oversized content", () => {
    window.localStorage.setItem(
      ANONYMOUS_WORK_LEDGER_KEY,
      JSON.stringify({
        items: [
          { productId: "unknown", prompt: "Nope", updatedAt: "2026-06-01T00:00:00.000Z" },
          {
            id: "valid",
            productId: "brain",
            taskKind: "preview",
            prompt: "x".repeat(1200),
            replyPreview: "y".repeat(1200),
            route: "https://evil.example",
            title: "",
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
            meterRemaining: -5,
          },
        ],
      })
    );

    const ledger = readAnonymousWorkLedger(Date.parse("2026-06-02T00:00:00.000Z"));

    expect(ledger.items).toHaveLength(1);
    expect(ledger.items[0]?.prompt).toHaveLength(800);
    expect(ledger.items[0]?.replyPreview).toHaveLength(800);
    expect(ledger.items[0]?.route).toBe("/");
    expect(ledger.items[0]?.meterRemaining).toBe(0);
  });
});

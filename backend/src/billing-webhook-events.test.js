import { describe, it, expect, jest } from "@jest/globals";
import { markWebhookEventProcessed } from "./billing-webhook-events.js";

describe("billing webhook dedupe helper", () => {
  it("stores normalized provider/event id and returns true on first insert", async () => {
    const dbGet = jest.fn().mockResolvedValue({ id: 1 });
    const result = await markWebhookEventProcessed(dbGet, {
      provider: " Stripe ",
      eventId: " evt_123 ",
    });

    expect(result).toBe(true);
    expect(dbGet).toHaveBeenCalledTimes(1);
    expect(dbGet).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO billing_webhook_events"),
      ["stripe", "evt_123"]
    );
  });

  it("returns false for duplicate events", async () => {
    const dbGet = jest.fn().mockResolvedValue(null);
    const result = await markWebhookEventProcessed(dbGet, {
      provider: "stripe",
      eventId: "evt_duplicate",
    });

    expect(result).toBe(false);
    expect(dbGet).toHaveBeenCalledTimes(1);
  });

  it("skips insert when provider or event id is missing", async () => {
    const dbGet = jest.fn().mockResolvedValue({ id: 1 });

    await expect(
      markWebhookEventProcessed(dbGet, { provider: "", eventId: "evt_1" })
    ).resolves.toBe(false);
    await expect(
      markWebhookEventProcessed(dbGet, { provider: "stripe", eventId: "" })
    ).resolves.toBe(false);

    expect(dbGet).not.toHaveBeenCalled();
  });
});

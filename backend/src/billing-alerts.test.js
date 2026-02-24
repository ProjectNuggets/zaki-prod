import { describe, it, expect, jest } from "@jest/globals";
import { createBillingAlertDispatcher } from "./billing-alerts.js";

describe("billing alert dispatcher", () => {
  it("dispatches alert payload with auth header when enabled", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    const dispatcher = createBillingAlertDispatcher({
      webhookUrl: "https://alerts.example.com/billing",
      webhookToken: "token-1",
      fetchImpl: fetchMock,
      now: () => 1000,
      cooldownMs: 5000,
    });

    const result = await dispatcher.dispatch({
      id: "stripe.webhook.failed",
      provider: "stripe",
      severity: "high",
      message: "Webhook failed",
      details: { statusCode: 500 },
    });

    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://alerts.example.com/billing");
    expect(String(options?.headers?.get("Authorization"))).toContain("Bearer token-1");
    expect(String(options?.body || "")).toContain("\"stripe.webhook.failed\"");
  });

  it("rate-limits duplicate alerts inside cooldown window", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    let currentTs = 1000;
    const dispatcher = createBillingAlertDispatcher({
      webhookUrl: "https://alerts.example.com/billing",
      fetchImpl: fetchMock,
      now: () => currentTs,
      cooldownMs: 5000,
    });

    const alert = {
      id: "stripe.webhook.signature_invalid",
      provider: "stripe",
      severity: "medium",
      message: "Invalid signature",
    };

    const first = await dispatcher.dispatch(alert);
    currentTs += 1000;
    const second = await dispatcher.dispatch(alert);
    currentTs += 6000;
    const third = await dispatcher.dispatch(alert);

    expect(first.sent).toBe(true);
    expect(second.sent).toBe(false);
    expect(second.skippedReason).toBe("cooldown");
    expect(third.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("is disabled when webhook url is missing", async () => {
    const dispatcher = createBillingAlertDispatcher({
      webhookUrl: "",
      fetchImpl: jest.fn(),
    });
    expect(dispatcher.isEnabled()).toBe(false);
    const result = await dispatcher.dispatch({ id: "any" });
    expect(result.sent).toBe(false);
    expect(result.skippedReason).toBe("disabled");
  });
});

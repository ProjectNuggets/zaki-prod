import { describe, it, expect } from "@jest/globals";
import { createBillingHealthTracker } from "./billing-health.js";

function createDeterministicNow() {
  let tick = 0;
  return () => new Date(`2026-02-24T10:00:${String(tick++).padStart(2, "0")}.000Z`);
}

describe("billing health tracker", () => {
  it("tracks receive/process/duplicate/failure counters and metadata", () => {
    const tracker = createBillingHealthTracker({ now: createDeterministicNow() });

    tracker.recordReceived("stripe", { eventId: "evt_1", eventType: "checkout.session.completed" });
    tracker.recordDuplicate("stripe", { eventId: "evt_1", eventType: "checkout.session.completed" });
    tracker.recordReceived("stripe", { eventId: "evt_2", eventType: "customer.subscription.updated" });
    tracker.recordProcessed("stripe", { eventId: "evt_2", eventType: "customer.subscription.updated" });
    tracker.recordFailure("stripe", {
      eventId: "evt_3",
      eventType: "customer.subscription.deleted",
      error: "database timeout",
    });

    const snapshot = tracker.getSnapshot();
    const stripe = snapshot.providers.stripe;

    expect(snapshot.timestamp).toBe("2026-02-24T10:00:05.000Z");
    expect(stripe).toBeDefined();
    expect(stripe.received).toBe(2);
    expect(stripe.processed).toBe(1);
    expect(stripe.duplicates).toBe(1);
    expect(stripe.failed).toBe(1);
    expect(stripe.lastEventId).toBe("evt_3");
    expect(stripe.lastEventType).toBe("customer.subscription.deleted");
    expect(stripe.lastError).toBe("database timeout");
    expect(stripe.lastReceivedAt).toBe("2026-02-24T10:00:02.000Z");
    expect(stripe.lastDuplicateAt).toBe("2026-02-24T10:00:01.000Z");
    expect(stripe.lastProcessedAt).toBe("2026-02-24T10:00:03.000Z");
    expect(stripe.lastFailedAt).toBe("2026-02-24T10:00:04.000Z");
  });

  it("normalizes provider keys and initializes state lazily", () => {
    const tracker = createBillingHealthTracker({ now: createDeterministicNow() });
    tracker.recordReceived(" Creem ", { eventId: "evt_c1" });
    const snapshot = tracker.getSnapshot();
    expect(snapshot.providers.creem).toBeDefined();
    expect(snapshot.providers.creem.received).toBe(1);
  });
});

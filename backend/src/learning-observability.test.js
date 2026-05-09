import {
  createLearningObservabilityStore,
} from "./learning-observability.js";

describe("learning observability", () => {
  test("records bounded structured events without PII-oriented payloads", () => {
    let tick = 0;
    const store = createLearningObservabilityStore({
      maxEvents: 2,
      now: () => new Date(`2026-05-09T12:00:0${tick++}.000Z`),
    });

    const upstreamFailure = store.record({
      event: "learning_upstream_failure",
      severity: "error",
      requestId: "req-1",
      route: "/api/v1/book/books/book-1/compile?token=secret",
      method: "POST",
      status: 502,
      message: "provider failed",
    });
    expect(upstreamFailure.route).toBe("/api/v1/book/books/book-1/compile");
    store.record({ event: "learning_background_accepted", severity: "warn", action: "compile-page" });
    store.record({ event: "learning_json_sanitize_fallback", severity: "warn" });

    const snapshot = store.snapshot({
      activeWebSockets: new Map([
        ["user-a", 2],
        ["user-b", 1],
      ]),
      nowDate: new Date("2026-05-09T12:00:10.000Z"),
    });

    expect(snapshot.counters).toMatchObject({
      total: 3,
      warn: 2,
      error: 1,
      byEvent: {
        learning_upstream_failure: 1,
        learning_background_accepted: 1,
        learning_json_sanitize_fallback: 1,
      },
    });
    expect(snapshot.activeWebSockets).toEqual({
      total: 3,
      usersWithSessions: 2,
      maxForAnyUser: 2,
    });
    expect(snapshot.recentEvents).toHaveLength(2);
    expect(snapshot.recentEvents[0].event).toBe("learning_json_sanitize_fallback");
    expect(snapshot.recentEvents[1].event).toBe("learning_background_accepted");
    expect(snapshot.counters.byEvent.learning_upstream_failure).toBe(1);
  });
});

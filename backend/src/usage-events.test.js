import { describe, expect, it, jest } from "@jest/globals";
import {
  USAGE_EVENTS_SCHEMA_VERSION,
  normalizeUsageEventInput,
  recordUsageEvent,
  sanitizeUsageEventMetadata,
} from "./usage-events.js";

describe("usage events", () => {
  it("normalizes central usage event payloads without preserving oversized metadata", () => {
    const event = normalizeUsageEventInput({
      userId: "42",
      productId: "hire",
      surface: "hire",
      eventType: "hire.generated_package",
      usageUnitType: "request",
      usageUnits: 1.25,
      planId: "Hire",
      quotaLimit: 10,
      quotaUsed: 3,
      quotaRemaining: 7,
      requestId: "req-1",
      sourceRoute: "/api/hire/leads/:leadId/generate?ignored=true",
      metadata: {
        note: "x".repeat(700),
        nested: { ok: true },
      },
    });

    expect(event).toEqual(
      expect.objectContaining({
        userId: "42",
        productId: "hire",
        surface: "hire",
        eventType: "hire.generated_package",
        usageUnitType: "request",
        usageUnits: 1.25,
        planId: "hire",
        quotaLimit: 10,
        quotaUsed: 3,
        quotaRemaining: 7,
        requestId: "req-1",
      })
    );
    expect(event.sourceRoute).toBe("/api/hire/leads/:leadId/generate");
    expect(event.metadata.schemaVersion).toBe(USAGE_EVENTS_SCHEMA_VERSION);
    expect(event.metadata.note).toHaveLength(500);
    expect(event.metadata.nested).toEqual({ ok: true });
  });

  it("rejects events without canonical user and event identity", () => {
    expect(() => normalizeUsageEventInput({ productId: "hire" })).toThrow(
      "usage_event_user_required"
    );
    expect(() =>
      normalizeUsageEventInput({
        userId: "1",
        productId: "hire",
        surface: "hire",
        eventType: "../../bad",
      })
    ).toThrow("usage_event_identity_required");
  });

  it("sanitizes metadata keys, arrays, and non-finite numbers", () => {
    expect(
      sanitizeUsageEventMetadata({
        "bad key": Number.NaN,
        items: Array.from({ length: 30 }, (_, index) => index),
        ok: "value",
      })
    ).toEqual({
      items: Array.from({ length: 20 }, (_, index) => index),
      ok: "value",
    });
  });

  it("persists usage events with parameterized SQL", async () => {
    const dbQuery = jest.fn(async () => ({ rowCount: 1 }));
    const logStructured = jest.fn();

    const result = await recordUsageEvent({
      dbQuery,
      logStructured,
      event: {
        userId: 42,
        productId: "hire",
        surface: "hire",
        eventType: "hire.source_scan",
        usageUnitType: "request",
        usageUnits: 1,
        planId: "free",
        entitlement: "metered",
        quotaBucket: "hire_weekly",
        quotaPeriod: "week",
        quotaLimit: 10,
        quotaUsed: 1,
        quotaRemaining: 9,
        requestId: "req-2",
        sourceRoute: "/api/hire/scan",
        metadata: { action: "source_scan" },
        createdAt: "2026-05-20T10:00:00.000Z",
      },
    });

    expect(result.recorded).toBe(true);
    expect(dbQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = dbQuery.mock.calls[0];
    expect(sql).toContain("INSERT INTO zaki_usage_events");
    expect(sql).toContain("$16::jsonb");
    expect(params).toEqual([
      "42",
      "hire",
      "hire",
      "hire.source_scan",
      "request",
      1,
      "free",
      "metered",
      "hire_weekly",
      "week",
      10,
      1,
      9,
      "req-2",
      "/api/hire/scan",
      JSON.stringify({
        schemaVersion: USAGE_EVENTS_SCHEMA_VERSION,
        action: "source_scan",
      }),
      "2026-05-20T10:00:00.000Z",
    ]);
    expect(logStructured).not.toHaveBeenCalled();
  });

  it("logs persistence failures without throwing", async () => {
    const dbQuery = jest.fn(async () => {
      throw new Error("db offline");
    });
    const logStructured = jest.fn();

    const result = await recordUsageEvent({
      dbQuery,
      logStructured,
      event: {
        userId: 42,
        productId: "hire",
        surface: "hire",
        eventType: "hire.source_scan",
      },
    });

    expect(result.recorded).toBe(false);
    expect(logStructured).toHaveBeenCalledWith(
      "error",
      "usage.event.persist_failed",
      expect.objectContaining({
        userId: "42",
        productId: "hire",
        surface: "hire",
        eventType: "hire.source_scan",
        message: "db offline",
      })
    );
  });
});

import { describe, expect, it, jest } from "@jest/globals";
import { HIRE_SURFACE } from "./daily-quota.js";
import {
  HIRE_USAGE_EVENTS_VERSION,
  buildHireUsageEvent,
  recordHireUsageEvent,
} from "./hire-usage-events.js";
import { ZAKI_PRODUCT_IDS } from "./platform-policy.js";
import { USAGE_EVENTS_SCHEMA_VERSION } from "./usage-events.js";

describe("hire usage events", () => {
  it("builds normalized route-level usage events after quota admission", () => {
    const event = buildHireUsageEvent({
      req: {
        method: "POST",
        originalUrl: "/api/hire/leads/job_1/generate?debug=true",
        hireAuthResult: {
          zakiUser: {
            id: 42,
            plan_tier: "hire",
          },
        },
      },
      quotaDecision: {
        allowed: true,
        quota: {
          surface: HIRE_SURFACE,
          bucket: "hire_weekly",
          period: "week",
          limit: 10,
          used: 3,
          remaining: 7,
        },
      },
      requestId: "req-hire-1",
    });

    expect(event).toEqual({
      userId: 42,
      productId: ZAKI_PRODUCT_IDS.HIRE,
      surface: HIRE_SURFACE,
      eventType: "hire.resume.tailor",
      usageUnitType: "request",
      usageUnits: 1,
      planId: "hire",
      entitlement: "metered",
      quotaBucket: "hire_weekly",
      quotaPeriod: "week",
      quotaLimit: 10,
      quotaUsed: 3,
      quotaRemaining: 7,
      requestId: "req-hire-1",
      sourceRoute: "/api/hire/leads/:leadId/generate",
      metadata: {
        schemaVersion: USAGE_EVENTS_SCHEMA_VERSION,
        hireUsageVersion: HIRE_USAGE_EVENTS_VERSION,
        action: "hire.resume.tailor",
        sourceAction: "generated_package",
        method: "POST",
        routeTemplate: "/api/hire/leads/:leadId/generate",
        quotaSurface: HIRE_SURFACE,
        quotaUnlimited: false,
      },
    });
  });

  it("marks paid/unlimited quota events without numeric quota fields", () => {
    const event = buildHireUsageEvent({
      req: {
        method: "POST",
        originalUrl: "/api/hire/fire/job_1",
        hireAuthResult: {
          zakiUser: {
            id: 42,
            plan_tier: "complete",
          },
        },
      },
      quotaDecision: {
        allowed: true,
        quota: {
          surface: HIRE_SURFACE,
          bucket: "hire_weekly",
          period: "week",
          limit: null,
          used: 0,
          remaining: null,
          unlimited: true,
        },
      },
      requestId: "req-hire-2",
    });

    expect(event).toEqual(
      expect.objectContaining({
        eventType: "hire.outreach.send",
        entitlement: "unlimited",
        quotaLimit: null,
        quotaUsed: 0,
        quotaRemaining: null,
        sourceRoute: "/api/hire/fire/:leadId",
      })
    );
    expect(event.metadata.quotaUnlimited).toBe(true);
  });

  it("does not record usage for unmetered hire routes", async () => {
    const dbQuery = jest.fn();
    const result = await recordHireUsageEvent({
      req: {
        method: "GET",
        originalUrl: "/api/hire/leads",
        hireAuthResult: { zakiUser: { id: 42 } },
      },
      quotaDecision: { allowed: true },
      requestId: "req-hire-3",
      dbQuery,
    });

    expect(result).toEqual({ recorded: false, reason: "not_metered_hire_route" });
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("persists metered hire usage through the central ledger helper", async () => {
    const dbQuery = jest.fn(async () => ({ rowCount: 1 }));
    const result = await recordHireUsageEvent({
      req: {
        method: "POST",
        originalUrl: "/api/hire/scan",
        hireAuthResult: {
          zakiUser: { id: 42, plan_tier: "free" },
        },
      },
      quotaDecision: {
        allowed: true,
        quota: {
          surface: HIRE_SURFACE,
          bucket: "hire_weekly",
          period: "week",
          limit: 10,
          used: 1,
          remaining: 9,
        },
      },
      requestId: "req-hire-4",
      dbQuery,
    });

    expect(result.recorded).toBe(true);
    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(dbQuery.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        "42",
        ZAKI_PRODUCT_IDS.HIRE,
        HIRE_SURFACE,
        "hire.job.search",
        "request",
        1,
        "free",
        "metered",
        "hire_weekly",
        "week",
        10,
        1,
        9,
        "req-hire-4",
        "/api/hire/scan",
      ])
    );
  });
});

import { describe, it, expect } from "@jest/globals";
import {
  mapPlanTier,
  mapPlanStatus,
  toPeriodEndUnix,
  buildEntitlementFields,
} from "./nullalis-entitlement.js";

describe("mapPlanTier", () => {
  it.each([
    ["free", "free"],
    ["personal", "pro"],
    ["student", "pro"],
  ])("maps zaki %p -> nullalis %p", (input, expected) => {
    expect(mapPlanTier(input)).toBe(expected);
  });

  it.each([
    ["pro"],
    ["team"],
    ["enterprise"],
    ["PERSONAL"],
    [""],
    [null],
    [undefined],
    [42],
    ["garbage"],
  ])("falls back to free for %p", (input) => {
    expect(mapPlanTier(input)).toBe(input === "PERSONAL" ? "pro" : "free");
  });
});

describe("mapPlanStatus", () => {
  it.each([
    ["active", "active"],
    ["trialing", "active"],
    ["past_due", "past_due"],
    ["unpaid", "past_due"],
    ["incomplete", "past_due"],
    ["canceled", "canceled"],
    ["incomplete_expired", "expired"],
    ["inactive", "expired"],
  ])("maps zaki %p -> nullalis %p", (input, expected) => {
    expect(mapPlanStatus(input)).toBe(expected);
  });

  it.each([[""], [null], [undefined], ["foo"], ["ACTIVE"]])(
    "falls back to expired for %p unless known after case-normalize",
    (input) => {
      const expected = input === "ACTIVE" ? "active" : "expired";
      expect(mapPlanStatus(input)).toBe(expected);
    }
  );
});

describe("toPeriodEndUnix", () => {
  it("passes through unix seconds", () => {
    expect(toPeriodEndUnix(1735689600)).toBe(1735689600);
  });

  it("converts unix milliseconds", () => {
    expect(toPeriodEndUnix(1735689600000)).toBe(1735689600);
  });

  it("parses ISO strings", () => {
    expect(toPeriodEndUnix("2025-01-01T00:00:00Z")).toBe(1735689600);
  });

  it("accepts Date instances", () => {
    expect(toPeriodEndUnix(new Date("2025-01-01T00:00:00Z"))).toBe(1735689600);
  });

  it.each([[null], [undefined], ["garbage"], [NaN], [Infinity]])(
    "returns null for %p",
    (input) => {
      expect(toPeriodEndUnix(input)).toBeNull();
    }
  );
});

describe("buildEntitlementFields", () => {
  it("assembles full tuple from a zaki_users row", () => {
    expect(
      buildEntitlementFields({
        plan_tier: "personal",
        plan_status: "active",
        current_period_end: "2025-01-01T00:00:00Z",
      })
    ).toEqual({
      plan_tier: "pro",
      status: "active",
      period_end_unix: 1735689600,
    });
  });

  it("handles a free/inactive/no-period user", () => {
    expect(
      buildEntitlementFields({
        plan_tier: "free",
        plan_status: "inactive",
        current_period_end: null,
      })
    ).toEqual({
      plan_tier: "free",
      status: "expired",
      period_end_unix: null,
    });
  });

  it("applies the student -> pro mapping", () => {
    expect(
      buildEntitlementFields({
        plan_tier: "student",
        plan_status: "trialing",
        current_period_end: null,
      })
    ).toEqual({
      plan_tier: "pro",
      status: "active",
      period_end_unix: null,
    });
  });

  it("returns null for missing / non-object input", () => {
    expect(buildEntitlementFields(null)).toBeNull();
    expect(buildEntitlementFields(undefined)).toBeNull();
    expect(buildEntitlementFields("row")).toBeNull();
  });

  it("falls back safely on unknown tier + unknown status", () => {
    expect(
      buildEntitlementFields({
        plan_tier: "ghost",
        plan_status: "limbo",
        current_period_end: "not a date",
      })
    ).toEqual({
      plan_tier: "free",
      status: "expired",
      period_end_unix: null,
    });
  });
});

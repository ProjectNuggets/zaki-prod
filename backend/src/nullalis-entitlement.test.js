import { describe, it, expect, jest } from "@jest/globals";
import {
  mapPlanTier,
  mapPlanStatus,
  toPeriodEndUnix,
  buildEntitlementFields,
  buildAgentRuntimeEntitlementFields,
  applySuperAdminEntitlementOverride,
  SUPER_ADMIN_ENTITLEMENT,
} from "./nullalis-entitlement.js";

describe("mapPlanTier", () => {
  it.each([
    ["free", "free"],
    ["personal", "pro"],
    ["pro", "pro"],
    ["pro_max", "pro"],
    ["student", "pro"],
    ["agent", "pro"],
    ["learn", "pro"],
    ["complete", "pro"],
    ["legacy_personal", "pro"],
  ])("maps zaki %p -> nullalis %p", (input, expected) => {
    expect(mapPlanTier(input)).toBe(expected);
  });

  it.each([
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

describe("buildAgentRuntimeEntitlementFields", () => {
  it("gives a free user a bounded runtime lease after the meter authorizes a turn", () => {
    expect(
      buildAgentRuntimeEntitlementFields(
        {
          plan_tier: "free",
          plan_status: "inactive",
          current_period_end: null,
        },
        {
          nowUnix: 1_700_000_000,
          meterAuthorizedUntilUnix: 1_700_000_660,
        }
      )
    ).toEqual({
      plan_tier: "free",
      status: "canceled",
      period_end_unix: 1_700_000_660,
    });
  });

  it("keeps a truly inactive user gated when no meter authorization exists", () => {
    expect(
      buildAgentRuntimeEntitlementFields(
        {
          plan_tier: "free",
          plan_status: "inactive",
          current_period_end: null,
        },
        { nowUnix: 1_700_000_000 }
      )
    ).toEqual({
      plan_tier: "free",
      status: "expired",
      period_end_unix: null,
    });
  });

  it("does not revive a user with an already-expired meter authorization", () => {
    expect(
      buildAgentRuntimeEntitlementFields(
        {
          plan_tier: "free",
          plan_status: "inactive",
          current_period_end: null,
        },
        {
          nowUnix: 1_700_000_000,
          meterAuthorizedUntilUnix: 1_700_000_000,
        }
      )
    ).toEqual({
      plan_tier: "free",
      status: "expired",
      period_end_unix: null,
    });
  });

  it("preserves an already-active paid entitlement instead of rewriting billing state", () => {
    expect(
      buildAgentRuntimeEntitlementFields(
        {
          plan_tier: "personal",
          plan_status: "active",
          current_period_end: "2027-01-01T00:00:00.000Z",
        },
        {
          nowUnix: 1_700_000_000,
          meterAuthorizedUntilUnix: 1_700_000_660,
        }
      )
    ).toEqual({
      plan_tier: "pro",
      status: "active",
      period_end_unix: 1_798_761_600,
    });
  });
});

describe("applySuperAdminEntitlementOverride", () => {
  it("forces pro/active for a super-admin even when DB says free/expired", () => {
    // A free/inactive user maps to free/expired; the super-admin override
    // must replace that with the entitled tuple sent to the engine so the
    // engine provisions them entitled and never returns 402.
    const dbDerived = buildEntitlementFields({
      plan_tier: "free",
      plan_status: "inactive",
      current_period_end: null,
    });
    expect(dbDerived).toEqual({
      plan_tier: "free",
      status: "expired",
      period_end_unix: null,
    });

    expect(
      applySuperAdminEntitlementOverride(dbDerived, { isSuperAdmin: true })
    ).toEqual({
      plan_tier: "pro",
      status: "active",
      period_end_unix: null,
    });
  });

  it("forces the entitled tuple even when the DB-derived entitlement is null", () => {
    // Soft-fail lookups return null; a super-admin must still be entitled.
    expect(
      applySuperAdminEntitlementOverride(null, { isSuperAdmin: true })
    ).toEqual({
      plan_tier: "pro",
      status: "active",
      period_end_unix: null,
    });
  });

  it("leaves a NON-super-admin free/inactive entitlement unchanged", () => {
    const dbDerived = buildEntitlementFields({
      plan_tier: "free",
      plan_status: "inactive",
      current_period_end: null,
    });
    expect(
      applySuperAdminEntitlementOverride(dbDerived, { isSuperAdmin: false })
    ).toEqual({
      plan_tier: "free",
      status: "expired",
      period_end_unix: null,
    });
  });

  it("returns the input unchanged (same reference) for a non-super-admin", () => {
    const dbDerived = buildEntitlementFields({
      plan_tier: "personal",
      plan_status: "active",
      current_period_end: "2025-01-01T00:00:00Z",
    });
    // Pure passthrough: no override means no mutation/new object.
    expect(applySuperAdminEntitlementOverride(dbDerived, { isSuperAdmin: false })).toBe(
      dbDerived
    );
  });

  it("defaults isSuperAdmin to false when the flag is omitted", () => {
    const dbDerived = { plan_tier: "free", status: "expired", period_end_unix: null };
    expect(applySuperAdminEntitlementOverride(dbDerived)).toBe(dbDerived);
  });

  it("returns a fresh object for super-admins (does not mutate input)", () => {
    const dbDerived = { plan_tier: "free", status: "expired", period_end_unix: null };
    const result = applySuperAdminEntitlementOverride(dbDerived, { isSuperAdmin: true });
    expect(result).not.toBe(dbDerived);
    expect(dbDerived).toEqual({
      plan_tier: "free",
      status: "expired",
      period_end_unix: null,
    });
    expect(result).toEqual(SUPER_ADMIN_ENTITLEMENT);
  });

  it("exposes the canonical super-admin tuple as a frozen constant", () => {
    expect(SUPER_ADMIN_ENTITLEMENT).toEqual({
      plan_tier: "pro",
      status: "active",
      period_end_unix: null,
    });
    expect(Object.isFrozen(SUPER_ADMIN_ENTITLEMENT)).toBe(true);
  });

  it("override is pure — it touches only the entitlement object, never the wallet/reserve path", () => {
    // The override ONLY changes the engine-bound entitlement payload (the 402
    // paywall). It performs no wallet reserve/settle/debit and has no I/O — so
    // a super-admin still goes through requireAgentWalletReserveForChat and
    // units still debit. We assert purity by proving the call is total: it
    // accepts only (entitlement, {isSuperAdmin}) and returns an entitlement
    // tuple, with no callbacks/handles through which a wallet could be touched.
    const walletSpy = jest.fn();
    const entitlement = { plan_tier: "free", status: "expired", period_end_unix: null };

    const out = applySuperAdminEntitlementOverride(entitlement, {
      isSuperAdmin: true,
      // a hostile extra field that a wallet-coupled impl might invoke
      reserveUnits: walletSpy,
    });

    expect(out).toEqual(SUPER_ADMIN_ENTITLEMENT);
    // Wallet/reserve must NEVER be invoked by the entitlement override.
    expect(walletSpy).not.toHaveBeenCalled();
    // Only entitlement keys are produced — no wallet/hold/units leakage.
    expect(Object.keys(out).sort()).toEqual([
      "period_end_unix",
      "plan_tier",
      "status",
    ]);
  });
});

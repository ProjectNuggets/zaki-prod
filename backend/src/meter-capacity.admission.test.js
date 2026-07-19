import { describe, expect, test } from "@jest/globals";
import { computeAvailableNow } from "./meter-capacity.js";

// WP-BILL1 — owner metering decision 2026-07-18.
//
// The reserve (ZAKI_AGENT_RESERVE_UNITS, 60) is a worst-case ceiling, not an entitlement to spend.
// Gating admission on it meant any tier whose rolling allowance sat below 60 got exactly ONE turn
// per window and was then refused with most of its balance unspent.
//
// The reported incident, reproduced below to the decimal: free tier, 5h allowance floored to 60,
// one 24.752-unit turn settled, 35.248 units left — refused, because 35.248 < 60. The UI showed
// "41% used" (24.752/60) while blocking the user with 59% of the window unspent.
describe("admission: while units remain, admit", () => {
  const RESERVE = 60;

  function availability({ rollingRemaining, weeklyRemaining = 1000, topupUnits = 0 }) {
    return computeAvailableNow({
      requiredUnits: RESERVE,
      weekly: { recurringRemaining: weeklyRemaining, topupUnits, resetAt: "2026-07-19T01:58:00Z" },
      rolling: { remaining: rollingRemaining, resetAt: "2026-07-19T01:58:00Z" },
    });
  }

  test("REGRESSION: the reported incident — 35.248 units left is ADMITTED, not refused", () => {
    const a = availability({ rollingRemaining: 35.248 });
    expect(a.available).toBe(true);
    expect(a.constraint).toBeNull();
    // Still below the worst-case reserve, so the user is warned this is likely their last turn.
    expect(a.lastTurnWarning).toBe(true);
    expect(a.resetAt).toBe("2026-07-19T01:58:00Z");
  });

  test("a full window is admitted with no warning", () => {
    const a = availability({ rollingRemaining: 240 });
    expect(a.available).toBe(true);
    expect(a.lastTurnWarning).toBe(false);
    expect(a.resetAt).toBeNull();
  });

  test("exactly at the reserve: admitted, no warning (it can afford the ceiling)", () => {
    const a = availability({ rollingRemaining: RESERVE });
    expect(a.available).toBe(true);
    expect(a.lastTurnWarning).toBe(false);
  });

  test("a sliver of balance is still admitted — the shortfall is absorbed", () => {
    const a = availability({ rollingRemaining: 0.5 });
    expect(a.available).toBe(true);
    expect(a.lastTurnWarning).toBe(true);
  });

  test("drained to zero is REFUSED — this is the turn that blocks", () => {
    const a = availability({ rollingRemaining: 0 });
    expect(a.available).toBe(false);
    expect(a.lastTurnWarning).toBe(false);
    expect(a.constraint).toBe("rolling");
    expect(a.resetAt).toBe("2026-07-19T01:58:00Z");
  });

  test("top-up units count toward the balance that admits a turn", () => {
    const a = availability({ rollingRemaining: 0, weeklyRemaining: 0, topupUnits: 5 });
    expect(a.available).toBe(true);
    expect(a.lastTurnWarning).toBe(true);
  });

  test("the weekly window can still refuse independently of the rolling one", () => {
    const a = availability({ rollingRemaining: 100, weeklyRemaining: 0 });
    expect(a.available).toBe(false);
    expect(a.constraint).toBe("weekly");
  });
});

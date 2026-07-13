import { describe, expect, it } from "@jest/globals";
import {
  createMeterFailOpenBackstop,
  resolveMeterFailOpenConfig,
} from "./meter-fail-open-backstop.js";

describe("meter fail-open backstop", () => {
  it("keeps fail-open available within both the per-user and global budgets", () => {
    const backstop = createMeterFailOpenBackstop({
      env: {
        ZAKI_METER_FAIL_OPEN_PER_USER_LIMIT_PER_MINUTE: "2",
        ZAKI_METER_FAIL_OPEN_GLOBAL_BUDGET_PER_MINUTE: "4",
      },
      now: () => 1_000,
    });

    expect(backstop.check({ userId: 7, surface: "agent" })).toMatchObject({
      allowed: true,
      reason: "fail_open_allowed",
      userCount: 1,
      globalCount: 1,
    });
    expect(backstop.check({ userId: 7, surface: "spaces" })).toMatchObject({
      allowed: true,
      userCount: 2,
      globalCount: 2,
    });
  });

  it("rate-limits one user inside the fail-open branch without consuming another user's allowance", () => {
    const backstop = createMeterFailOpenBackstop({
      env: {
        ZAKI_METER_FAIL_OPEN_PER_USER_LIMIT_PER_MINUTE: "1",
        ZAKI_METER_FAIL_OPEN_GLOBAL_BUDGET_PER_MINUTE: "5",
      },
      now: () => 1_000,
    });

    expect(backstop.check({ userId: 7 }).allowed).toBe(true);
    expect(backstop.check({ userId: 7 })).toMatchObject({
      allowed: false,
      status: 429,
      reason: "user_rate_limited",
    });
    expect(backstop.check({ userId: 8 })).toMatchObject({
      allowed: true,
      globalAllowedCount: 2,
    });
  });

  it("stops all free turns after the process-wide emergency budget is exhausted", () => {
    const backstop = createMeterFailOpenBackstop({
      env: {
        ZAKI_METER_FAIL_OPEN_PER_USER_LIMIT_PER_MINUTE: "10",
        ZAKI_METER_FAIL_OPEN_GLOBAL_BUDGET_PER_MINUTE: "2",
      },
      now: () => 1_000,
    });

    expect(backstop.check({ userId: 1 }).allowed).toBe(true);
    expect(backstop.check({ userId: 2 }).allowed).toBe(true);
    expect(backstop.check({ userId: 3 })).toMatchObject({
      allowed: false,
      status: 503,
      reason: "global_budget_exhausted",
    });
  });

  it("supports an environment kill switch that fails closed immediately", () => {
    const backstop = createMeterFailOpenBackstop({
      env: { ZAKI_METER_FAIL_OPEN_ENABLED: "false" },
      now: () => 1_000,
    });

    expect(backstop.check({ userId: 1 })).toMatchObject({
      allowed: false,
      status: 503,
      reason: "fail_open_disabled",
    });
  });

  it("requests one paging alert only after the configured threshold is crossed", () => {
    let nowMs = 1_000;
    const backstop = createMeterFailOpenBackstop({
      env: {
        ZAKI_METER_FAIL_OPEN_PAGE_THRESHOLD_PER_MINUTE: "2",
        ZAKI_METER_FAIL_OPEN_PER_USER_LIMIT_PER_MINUTE: "10",
      },
      now: () => nowMs,
    });

    expect(backstop.check({ userId: 1 }).shouldPage).toBe(false);
    expect(backstop.check({ userId: 2 }).shouldPage).toBe(false);
    expect(backstop.check({ userId: 3 }).shouldPage).toBe(true);
    expect(backstop.check({ userId: 4 }).shouldPage).toBe(false);

    nowMs += 60_001;
    expect(backstop.check({ userId: 5 }).globalCount).toBe(1);
  });

  it("uses conservative defaults for malformed numeric configuration", () => {
    expect(
      resolveMeterFailOpenConfig({
        ZAKI_METER_FAIL_OPEN_PER_USER_LIMIT_PER_MINUTE: "0",
        ZAKI_METER_FAIL_OPEN_GLOBAL_BUDGET_PER_MINUTE: "not-a-number",
      })
    ).toMatchObject({
      enabled: true,
      perUserLimit: 3,
      globalLimit: 100,
      pageThreshold: 10,
    });
  });
});

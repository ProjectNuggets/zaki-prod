import { describe, expect, jest, test } from "@jest/globals";
import {
  V1_CUTOVER_VERSION,
  listV1CutoverUsers,
  normalizeV1CutoverUser,
  requestNullalisV1Cutover,
  runV1CutoverBatch,
  runV1CutoverForUser,
} from "./v1-cutover.js";

function makeCutoverDb({ marker = null, users = [] } = {}) {
  const calls = [];
  const client = {
    query: jest.fn(async (text, params = []) => {
      calls.push({ text, params });
      if (/FROM zaki_v1_cutover_markers/.test(text) && /FOR UPDATE/.test(text)) {
        return { rows: marker ? [marker] : [] };
      }
      if (/FROM zaki_users/.test(text)) {
        return { rows: users };
      }
      if (/INSERT INTO zaki_v1_cutover_markers/.test(text)) {
        return {
          rows: [
            {
              user_id: params[0],
              cutover_version: params[1],
              status: "running",
              request_id: params[2],
            },
          ],
        };
      }
      if (/SELECT \* FROM zaki_unit_wallets/.test(text)) {
        return {
          rows: [
            {
              user_id: 42,
              plan_id: "personal",
              weekly_used_units: 88,
              topup_units: 17,
              version: 3,
            },
          ],
        };
      }
      if (/UPDATE zaki_unit_wallets/.test(text)) {
        return {
          rows: [
            {
              user_id: params[0],
              plan_id: params[1],
              weekly_allowance_units: params[2],
              burst_allowance_units: params[3],
              burst_window_hours: params[4],
              weekly_used_units: 0,
              topup_units: 0,
              version: 4,
            },
          ],
        };
      }
      if (/UPDATE zaki_v1_cutover_markers/.test(text)) {
        return {
          rows: [
            {
              user_id: params[0],
              cutover_version: params[1],
              status: "completed",
              completed_at: "2026-06-18T00:00:00.000Z",
              details_json: params.at(-1),
            },
          ],
        };
      }
      if (/INSERT INTO zaki_v1_cutover_events/.test(text)) {
        return {
          rows: [
            {
              id: calls.length,
              user_id: params[0],
              cutover_version: params[1],
              event: params[4],
              status: params[5],
              details_json: params[6],
            },
          ],
        };
      }
      return { rows: [], rowCount: 0 };
    }),
  };
  return {
    calls,
    client,
    withDbTransaction: async (fn) => fn(client),
    dbAll: async (text, params = []) => client.query(text, params).then((r) => r.rows),
  };
}

describe("V1 beta cutover", () => {
  test("normalizes users without leaking emails into the audit marker", () => {
    expect(
      normalizeV1CutoverUser({
        id: "42",
        email: "Beta@Example.com ",
        commercial_plan_id: "pro",
      })
    ).toEqual({
      id: 42,
      email: "beta@example.com",
      planId: "pro",
    });
  });

  test("keeps explicit paid tiers above collapsed commercial aliases during cutover", () => {
    expect(
      normalizeV1CutoverUser({
        id: 42,
        email: "pro@example.com",
        commercial_plan_id: "legacy_personal",
        plan_tier: "pro",
        plan_status: "active",
        current_period_end: "2026-12-31T00:00:00.000Z",
      }).planId
    ).toBe("pro");
    expect(
      normalizeV1CutoverUser({
        id: 43,
        email: "personal@example.com",
        commercial_plan_id: "legacy_personal",
        plan_tier: "personal",
        plan_status: "active",
        current_period_end: "2026-12-31T00:00:00.000Z",
      }).planId
    ).toBe("personal");
    expect(
      normalizeV1CutoverUser({
        id: 44,
        email: "legacy@example.com",
        commercial_plan_id: "legacy_personal",
      }).planId
    ).toBe("pro");
    expect(
      normalizeV1CutoverUser({
        id: 45,
        email: "canceled@example.com",
        commercial_plan_id: "legacy_personal",
        plan_tier: "pro",
        plan_status: "canceled",
      }).planId
    ).toBe("free");
    expect(
      normalizeV1CutoverUser({
        id: 46,
        email: "free@example.com",
        commercial_plan_id: "legacy_personal",
        plan_tier: "free",
      }).planId
    ).toBe("free");
    expect(
      normalizeV1CutoverUser({
        id: 47,
        email: "bogus@example.com",
        plan_tier: "bogus",
      }).planId
    ).toBe("free");
  });

  test("batch user listing includes entitlement fields needed for canonical wallet plans", async () => {
    const dbAll = jest.fn(async () => []);

    await listV1CutoverUsers({ dbAll, limit: 5 });

    const [query] = dbAll.mock.calls[0];
    expect(query).toContain("plan_status");
    expect(query).toContain("current_period_end");
    expect(query).toContain("access_expires_at");
    expect(query).toContain("access_code_campaign");
  });

  test("re-running a completed user is a logged no-op", async () => {
    const db = makeCutoverDb({
      marker: {
        user_id: 42,
        cutover_version: V1_CUTOVER_VERSION,
        status: "completed",
        details_json: { birthdayFirstRun: "queued", memoryImportBridge: "offered" },
      },
    });
    const nullalisCutover = jest.fn();
    const listWorkspaceSlugs = jest.fn();

    const result = await runV1CutoverForUser({
      zakiUser: { id: 42, email: "beta@example.com", commercial_plan_id: "personal" },
      actorEmail: "as@novanuggets.com",
      requestId: "req-replay",
      nullalisCutover,
      listWorkspaceSlugs,
      env: {},
      ...db,
    });

    expect(result).toMatchObject({
      status: "skipped",
      idempotent: true,
      birthdayFirstRun: "queued",
      memoryImportBridge: "offered",
    });
    expect(nullalisCutover).not.toHaveBeenCalled();
    expect(listWorkspaceSlugs).not.toHaveBeenCalled();
    expect(db.calls.some((call) => /UPDATE zaki_unit_wallets/.test(call.text))).toBe(false);
    expect(
      db.calls.some(
        (call) =>
          /INSERT INTO zaki_v1_cutover_events/.test(call.text) &&
          call.params.includes("skipped_already_completed")
      )
    ).toBe(true);
  });

  test("fresh in-flight markers skip instead of running a duplicate reset", async () => {
    const db = makeCutoverDb({
      marker: {
        user_id: 42,
        cutover_version: V1_CUTOVER_VERSION,
        status: "running",
        started_at: new Date("2026-06-18T00:00:00.000Z"),
        updated_at: new Date("2026-06-18T00:01:00.000Z"),
      },
    });
    const nullalisCutover = jest.fn();

    const result = await runV1CutoverForUser({
      zakiUser: { id: 42, email: "beta@example.com", commercial_plan_id: "personal" },
      actorEmail: "as@novanuggets.com",
      requestId: "req-running",
      nullalisCutover,
      listWorkspaceSlugs: jest.fn(),
      env: {},
      now: () => Date.parse("2026-06-18T00:02:00.000Z"),
      ...db,
    });

    expect(result).toMatchObject({
      status: "skipped",
      reason: "already_running",
      idempotent: true,
    });
    expect(nullalisCutover).not.toHaveBeenCalled();
    expect(
      db.calls.some(
        (call) =>
          /INSERT INTO zaki_v1_cutover_events/.test(call.text) &&
          call.params.includes("skipped_already_running")
      )
    ).toBe(true);
  });

  test("fresh cutover stamps audit, resets wallet, archives workspaces, and calls engine once", async () => {
    const db = makeCutoverDb();
    const nullalisCutover = jest.fn(async () => ({
      ok: true,
      status: 200,
      body: {
        status: "applied",
        birthday_first_run: "queued",
        memory_import_bridge: "offered",
        archive_reversible: true,
      },
    }));
    const listWorkspaceSlugs = jest.fn(async () => ["alpha", "beta", "alpha", " "]);

    const result = await runV1CutoverForUser({
      zakiUser: { id: 42, email: "beta@example.com", commercial_plan_id: "personal" },
      actorEmail: "as@novanuggets.com",
      requestId: "req-1",
      nullalisCutover,
      listWorkspaceSlugs,
      env: {
        ZAKI_PLATFORM_PERSONAL_WEEKLY_ALLOWANCE_UNITS: "123",
        // Above the agent-reserve floor (40) so the configured override is the
        // value that actually lands — buildPlatformPlanPolicy clamps rolling
        // allowances up to the reserve floor (see agent-reserve-policy.js).
        ZAKI_PLATFORM_PERSONAL_ROLLING_ALLOWANCE_UNITS: "210",
        ZAKI_PLATFORM_BURST_WINDOW_HOURS: "5",
      },
      ...db,
    });

    expect(result).toMatchObject({
      status: "completed",
      idempotent: false,
      birthdayFirstRun: "queued",
      memoryImportBridge: "offered",
      archivedWorkspaceSlugs: ["alpha", "beta"],
    });
    expect(nullalisCutover).toHaveBeenCalledTimes(1);
    expect(nullalisCutover).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        requestId: "req-1",
        cutoverVersion: V1_CUTOVER_VERSION,
        idempotencyKey: expect.stringContaining("v1-cutover"),
      })
    );
    const walletReset = db.calls.find((call) => /UPDATE zaki_unit_wallets/.test(call.text));
    expect(walletReset.params.slice(0, 5)).toEqual([42, "personal", 123, 210, 5]);
    expect(walletReset.text).toMatch(/weekly_used_units = 0/);
    expect(walletReset.text).toMatch(/topup_units = 0/);
    expect(db.calls.some((call) => /UPDATE zaki_meter_holds/.test(call.text))).toBe(true);
    expect(
      db.calls.filter((call) => /INSERT INTO zaki_v1_cutover_workspace_archives/.test(call.text))
    ).toHaveLength(2);
    expect(
      db.calls.some(
        (call) =>
          /INSERT INTO zaki_v1_cutover_events/.test(call.text) &&
          call.params.includes("memory_import_bridge_offered")
      )
    ).toBe(true);
  });

  test("stale in-flight markers resume the idempotent cutover", async () => {
    const db = makeCutoverDb({
      marker: {
        user_id: 42,
        cutover_version: V1_CUTOVER_VERSION,
        status: "running",
        started_at: new Date("2026-06-18T00:00:00.000Z"),
        updated_at: new Date("2026-06-18T00:00:00.000Z"),
      },
    });
    const nullalisCutover = jest.fn(async () => ({
      ok: true,
      status: 200,
      body: {
        status: "already_applied",
        birthday_first_run: "queued",
        memory_import_bridge: "offered",
      },
    }));

    await expect(
      runV1CutoverForUser({
        zakiUser: { id: 42, email: "beta@example.com", commercial_plan_id: "personal" },
        actorEmail: "as@novanuggets.com",
        requestId: "req-stale",
        nullalisCutover,
        listWorkspaceSlugs: jest.fn(async () => []),
        env: {},
        now: () => Date.parse("2026-06-18T01:00:01.000Z"),
        runningStaleMs: 30 * 60 * 1000,
        ...db,
      })
    ).resolves.toMatchObject({
      status: "completed",
      birthdayFirstRun: "queued",
      memoryImportBridge: "offered",
    });
    expect(nullalisCutover).toHaveBeenCalledTimes(1);
  });

  test("batch cutover walks every candidate user through the same service", async () => {
    const db = makeCutoverDb({
      users: [
        { id: 42, email: "a@example.com", commercial_plan_id: "free" },
        { id: 43, email: "b@example.com", commercial_plan_id: "personal" },
      ],
    });
    const perUserRunner = jest.fn(async ({ zakiUser }) => ({
      userId: Number(zakiUser.id),
      status: "completed",
    }));

    await expect(
      runV1CutoverBatch({
        actorEmail: "as@novanuggets.com",
        requestId: "req-batch",
        perUserRunner,
        ...db,
      })
    ).resolves.toMatchObject({
      total: 2,
      completed: 2,
      failed: 0,
    });
    expect(perUserRunner).toHaveBeenCalledTimes(2);
  });

  test("batch selector rejects invalid user ids before querying", async () => {
    const db = makeCutoverDb();

    await expect(
      runV1CutoverBatch({
        actorEmail: "as@novanuggets.com",
        requestId: "req-bad-user",
        userId: "not-a-number",
        perUserRunner: jest.fn(),
        ...db,
      })
    ).rejects.toThrow("A valid ZAKI user id is required.");
    expect(db.calls).toHaveLength(0);
  });

  test("engine wrapper posts the V1 cutover with a stable idempotency key", async () => {
    const fetchWithTimeout = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        status: "applied",
        birthday_first_run: "queued",
        memory_import_bridge: "offered",
      }),
    }));

    await expect(
      requestNullalisV1Cutover({
        baseUrl: "http://nullalis.local/",
        internalToken: "secret",
        userId: 42,
        requestId: "req-http",
        cutoverVersion: V1_CUTOVER_VERSION,
        idempotencyKey: "v1-cutover:2026-06-v1:user:42",
        fetchWithTimeout,
        timeoutMs: 30000,
      })
    ).resolves.toMatchObject({
      ok: true,
      status: 200,
      body: {
        birthday_first_run: "queued",
        memory_import_bridge: "offered",
      },
    });

    expect(fetchWithTimeout).toHaveBeenCalledWith(
      "http://nullalis.local/api/v1/users/42/v1-cutover",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Internal-Token": "secret",
          "X-Zaki-User-Id": "42",
          "X-Request-Id": "req-http",
          "Idempotency-Key": "v1-cutover:2026-06-v1:user:42",
        }),
      }),
      30000,
      "Agent V1 cutover"
    );
  });
});

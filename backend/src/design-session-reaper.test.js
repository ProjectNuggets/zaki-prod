import { describe, expect, jest, test } from "@jest/globals";
import { reapIdleDesignSessions, REAPABLE_SESSION_STATES } from "./design-session-reaper.js";

const row = (over = {}) => ({
  session_id: "sess_01",
  project_id: "proj_01",
  owner_user_id: 154,
  tenant_id: "default",
  checkpoint_generation: 3,
  ...over,
});

describe("design session idle reaper", () => {
  test("selects idle sessions past the TTL and drives controller.stop for each", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [row(), row({ session_id: "sess_02" })] });
    const controller = { stop: jest.fn().mockResolvedValue({ session: { state: "STOPPED", generation: 3 } }) };
    const updateSessionState = jest.fn().mockResolvedValue(undefined);

    const result = await reapIdleDesignSessions({
      dbQuery,
      controller,
      updateSessionState,
      idleTtlMs: 15 * 60 * 1000,
      now: () => 1_000_000_000_000,
    });

    expect(result).toEqual({ scanned: 2, reaped: 2, failed: 0 });
    // query used the reapable-states array + a cutoff = now - ttl
    const [, params] = dbQuery.mock.calls[0];
    expect(params[0]).toEqual(REAPABLE_SESSION_STATES);
    expect(params[1]).toBe(new Date(1_000_000_000_000 - 15 * 60 * 1000).toISOString());
    // stop called with the row's identity + expectedGeneration, userId stringified
    expect(controller.stop).toHaveBeenCalledTimes(2);
    expect(controller.stop.mock.calls[0][0]).toMatchObject({
      sessionId: "sess_01",
      userId: "154",
      expectedGeneration: 3,
    });
    expect(updateSessionState).toHaveBeenCalledTimes(2);
  });

  test("a checkpoint-failed stop is counted, not fatal — the sweep keeps going", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [row(), row({ session_id: "sess_02" })] });
    const controller = {
      stop: jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error("CHECKPOINT_FAILED"), { code: "DESIGN_CONTROLLER_UNAVAILABLE" }))
        .mockResolvedValueOnce({ session: { state: "STOPPED", generation: 3 } }),
    };
    const updateSessionState = jest.fn().mockResolvedValue(undefined);

    // must NOT throw — B0a force-deleted the pod, so the slot is freed regardless
    const result = await reapIdleDesignSessions({
      dbQuery,
      controller,
      updateSessionState,
      idleTtlMs: 60_000,
    });

    expect(result).toEqual({ scanned: 2, reaped: 1, failed: 1 });
    expect(controller.stop).toHaveBeenCalledTimes(2); // second session still attempted
    expect(updateSessionState).toHaveBeenCalledTimes(1); // only the successful one recorded
  });

  test("no idle sessions → no controller calls", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    const controller = { stop: jest.fn() };
    const result = await reapIdleDesignSessions({
      dbQuery,
      controller,
      updateSessionState: jest.fn(),
      idleTtlMs: 60_000,
    });
    expect(result).toEqual({ scanned: 0, reaped: 0, failed: 0 });
    expect(controller.stop).not.toHaveBeenCalled();
  });

  test("rejects a non-positive TTL (guards against reaping everything)", async () => {
    await expect(
      reapIdleDesignSessions({ dbQuery: jest.fn(), controller: { stop: jest.fn() }, updateSessionState: jest.fn(), idleTtlMs: 0 })
    ).rejects.toThrow(/positive idleTtlMs/);
  });
});

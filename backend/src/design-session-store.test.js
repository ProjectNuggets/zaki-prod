import { describe, expect, jest, test } from "@jest/globals";
import {
  beginDesignSessionDrain,
  commitDesignCheckpoint,
  ensureDesignSession,
  readDesignSessionBinding,
  touchDesignSessionActivity,
  updateDesignSessionObservedState,
} from "./design-session-store.js";

describe("design session store", () => {
  test("atomically moves the authoritative generation into DRAINING", async () => {
    const query = jest.fn().mockResolvedValue({
      rows: [{
        session_id: "sess_01",
        project_id: "project_01",
        owner_user_id: "42",
        tenant_id: "default",
        state: "DRAINING",
        checkpoint_generation: "7",
      }],
    });
    const runInTransaction = (callback) => callback({ query });

    await expect(beginDesignSessionDrain({
      runInTransaction,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      requestId: "req_stop_01",
    })).resolves.toMatchObject({ state: "DRAINING", generation: 7 });
    expect(query.mock.calls[0]?.[0]).toContain("state = 'DRAINING'");
    expect(query.mock.calls[0]?.[0]).toContain("checkpoint_generation = $5");
    expect(query.mock.calls[0]?.[0]).toContain("state IN ('REQUESTED', 'STARTING', 'RESTORING', 'READY', 'ACTIVE', 'IDLE')");
  });

  test("treats stopping a session that never started as already terminal", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          session_id: "sess_01",
          project_id: "project_01",
          owner_user_id: "42",
          tenant_id: "default",
          state: "FAILED",
          checkpoint_generation: "0",
        }],
      });
    const runInTransaction = (callback) => callback({ query });

    await expect(beginDesignSessionDrain({
      runInTransaction,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 0,
      requestId: "req_stop_failed",
    })).resolves.toMatchObject({ state: "FAILED", generation: 0 });
  });

  test("creates or reuses one authoritative session per owned project", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ project_id: "project_01" }] })
      .mockResolvedValueOnce({
        rows: [{
          session_id: "sess_01",
          project_id: "project_01",
          owner_user_id: "42",
          tenant_id: "default",
          state: "REQUESTED",
          checkpoint_generation: "0",
        }],
      });
    const runInTransaction = (callback) => callback({ query });

    await expect(ensureDesignSession({
      runInTransaction,
      userId: 42,
      projectId: "project_01",
      tenantId: "default",
      requestId: "req_01",
      createSessionId: () => "sess_01",
    })).resolves.toMatchObject({
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "REQUESTED",
      generation: 0,
    });
    expect(query.mock.calls[0]?.[0]).toContain("FOR UPDATE");
    expect(query.mock.calls[1]?.[0]).toContain("ON CONFLICT (project_id)");
  });

  test("commits a monotonic checkpoint with compare-and-swap and accepts an exact retry", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          session_id: "sess_01",
          project_id: "project_01",
          owner_user_id: "42",
          tenant_id: "default",
          checkpoint_generation: "8",
          checkpoint_sha256: "b".repeat(64),
          checkpoint_bytes: "4096",
          checkpoint_object_key: "sessions/sess_01/checkpoints/0000000008.tgz",
        }],
      });
    const runInTransaction = (callback) => callback({ query });

    await expect(commitDesignCheckpoint({
      runInTransaction,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      expectedGeneration: 7,
      generation: 8,
      bytes: 4096,
      sha256: "b".repeat(64),
      objectKey: "sessions/sess_01/checkpoints/0000000008.tgz",
      requestId: "req_02",
    })).resolves.toEqual({ committed: false, idempotent: true, generation: 8 });
    expect(query.mock.calls[0]?.[0]).toContain("owner_user_id = $3");
    expect(query.mock.calls[0]?.[0]).toContain("checkpoint_generation = $5");
    expect(query.mock.calls[0]?.[0]).toContain("checkpoint_generation = $6");
    expect(query.mock.calls[0]?.[0]).toContain("state = 'CHECKPOINTING'");
    expect(query.mock.calls[0]?.[0]).not.toContain("state = 'STOPPED'");
  });

  test("reads a callback binding only when the complete tuple matches", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await expect(readDesignSessionBinding({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
    })).resolves.toBeNull();
    expect(dbQuery.mock.calls[0]?.[1]).toEqual([
      "sess_01",
      "project_01",
      42,
      "default",
    ]);
  });

  test("B1 sessionScope=user: one session per USER via ON CONFLICT (owner_user_id)", async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ project_id: "project_02" }] })
      .mockResolvedValueOnce({
        rows: [{
          session_id: "sess_seed",
          project_id: "project_01", // reused session keeps its stable SEED project, not project_02
          owner_user_id: "42",
          tenant_id: "default",
          state: "READY",
          checkpoint_generation: "3",
        }],
      });
    const runInTransaction = (callback) => callback({ query });

    await expect(ensureDesignSession({
      runInTransaction,
      userId: 42,
      projectId: "project_02",
      tenantId: "default",
      requestId: "req_u1",
      createSessionId: () => "sess_new",
      sessionScope: "user",
    })).resolves.toMatchObject({
      sessionId: "sess_seed",
      projectId: "project_01",
      userId: "42",
    });
    // still validates the user owns the project they are focusing
    expect(query.mock.calls[0]?.[0]).toContain("FOR UPDATE");
    // per-user conflict target, NOT the legacy per-project one
    expect(query.mock.calls[1]?.[0]).toContain("ON CONFLICT (owner_user_id)");
    expect(query.mock.calls[1]?.[0]).not.toContain("ON CONFLICT (project_id)");
  });

  test("B1 sessionScope=user: readBinding validates (session, user, tenant), drops projectId", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await expect(readDesignSessionBinding({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_focused", // a project other than the seed — must still resolve
      userId: "42",
      tenantId: "default",
      sessionScope: "user",
    })).resolves.toBeNull();
    // no project_id predicate; params carry only (session, user, tenant)
    expect(dbQuery.mock.calls[0]?.[0]).not.toContain("project_id = $2");
    expect(dbQuery.mock.calls[0]?.[1]).toEqual(["sess_01", 42, "default"]);
  });

  test("records controller state only at the hub-owned generation", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [{ session_id: "sess_01" }] });
    await expect(updateDesignSessionObservedState({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "READY",
      generation: 7,
      requestId: "req_state_01",
    })).resolves.toBe(true);
    expect(dbQuery.mock.calls[0]?.[0]).toContain("checkpoint_generation = $6");
  });

  test("leaves the state guard inert when no expected state is given", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [{ session_id: "sess_01" }] });
    await expect(updateDesignSessionObservedState({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "READY",
      generation: 7,
      requestId: "req_state_02",
    })).resolves.toBe(true);
    // Reporting an observation carries no claim about the prior state, so the guard is passed as
    // NULL and the generation alone places the write.
    expect(dbQuery.mock.calls[0]?.[1]?.[7]).toBeNull();
  });

  test("guards a state revert with the expected state so a concurrent transition wins", async () => {
    // rows: [] models the row having already moved on (e.g. another request finished the stop),
    // so the guarded UPDATE matches nothing and reports it did not write.
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await expect(updateDesignSessionObservedState({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "ACTIVE",
      generation: 7,
      requestId: "req_revert_01",
      expectedState: "DRAINING",
    })).resolves.toBe(false);
    // A stop settles into STOPPED without bumping the generation, so the generation CAS cannot
    // tell "nobody moved this row" from "the stop already finished". The state predicate draws
    // that line: the write lands only while the row is still the state the caller read.
    expect(dbQuery.mock.calls[0]?.[0]).toContain("($8::text IS NULL OR state = $8)");
    expect(dbQuery.mock.calls[0]?.[1]?.[7]).toBe("DRAINING");
  });

  test("rejects an invalid expected state before touching the database", async () => {
    const dbQuery = jest.fn();
    await expect(updateDesignSessionObservedState({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
      state: "ACTIVE",
      generation: 7,
      expectedState: "NOT_A_STATE",
    })).rejects.toMatchObject({ code: "DESIGN_SESSION_INPUT_INVALID" });
    expect(dbQuery).not.toHaveBeenCalled();
  });

  test("touches only the freshness columns for the caller's own session, no state or generation CAS", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [{ session_id: "sess_01" }] });
    await expect(touchDesignSessionActivity({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
    })).resolves.toBe(true);
    const [sql, params] = dbQuery.mock.calls[0];
    // Bumps updated_at (the reaper's idle predicate) and last_seen_at (mirrors the poll)...
    expect(sql).toContain("updated_at = NOW()");
    expect(sql).toContain("last_seen_at = NOW()");
    // ...and nothing else: proxied work is a heartbeat, not a lifecycle transition. No state
    // write and no checkpoint_generation CAS, so it can never move the row or race a stop.
    expect(sql).not.toContain("SET state");
    expect(sql).not.toContain("checkpoint_generation");
    // Scoped by the full identity tuple, so it can only ever refresh the caller's own row.
    expect(sql).toContain("owner_user_id = $3");
    expect(sql).toContain("tenant_id = $4");
    expect(params).toEqual(["sess_01", "project_01", 42, "default"]);
  });

  test("reports no match when the scoped touch updates nothing", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await expect(touchDesignSessionActivity({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "42",
      tenantId: "default",
    })).resolves.toBe(false);
  });

  test("rejects an invalid identity before touching the database", async () => {
    const dbQuery = jest.fn();
    await expect(touchDesignSessionActivity({
      dbQuery,
      sessionId: "sess_01",
      projectId: "project_01",
      userId: "0",
      tenantId: "default",
    })).rejects.toMatchObject({ code: "DESIGN_SESSION_INPUT_INVALID" });
    expect(dbQuery).not.toHaveBeenCalled();
  });
});

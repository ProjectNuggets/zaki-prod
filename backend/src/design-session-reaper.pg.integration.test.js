import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { reapIdleDesignSessions } from "./design-session-reaper.js";
import { touchDesignSessionActivity } from "./design-session-store.js";

// The reaper's unit test mocks dbQuery and only asserts the query PARAMETERS — nothing executes
// the real SELECT against real rows, so the safety property is untested end to end. This proves
// it against real PostgreSQL: an idle-past-TTL session IS claimed and a fresh session is NOT.
// The two seeded rows differ ONLY in updated_at (both ACTIVE), so the test isolates the idle
// predicate itself — state is held constant and updated_at is the sole discriminator.
//
// Gated on LEDGER_TEST_DATABASE_URL (the repo's *.pg.integration.test.js convention); skips
// cleanly when no test database is provisioned. CI provisions the DB.
const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

// A fake controller: the reaper's injection seam for the worker stop. It records which sessions
// it was asked to stop so the test can assert selection without a real worker or engine.
function recordingController(stoppedSessionIds) {
  return {
    stop: async ({ sessionId }) => {
      stoppedSessionIds.push(sessionId);
      return { session: { state: "STOPPED", generation: 0 } };
    },
  };
}

d("Design idle reaper — real PostgreSQL claim query safety property", () => {
  let db;
  let userId;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenantId = `tenant-reaper-${suffix}`;
  const idleProjectId = `design-project-idle-${suffix}`;
  const idleSessionId = `design-session-idle-${suffix}`;
  const freshProjectId = `design-project-fresh-${suffix}`;
  const freshSessionId = `design-session-fresh-${suffix}`;
  const IDLE_TTL_MS = 15 * 60 * 1000;

  beforeAll(async () => {
    process.env.DATABASE_URL = RUN;
    process.env.NODE_ENV = "test";
    process.env.ZAKI_DESIGN_ENABLED = "false";
    process.env.ZAKI_DESIGN_SESSION_CONTROLLER_ENABLED = "false";
    delete process.env.PGSSLMODE;

    db = await import("./db.js");
    await db.initDb();

    const user = await db.dbGet(
      `INSERT INTO zaki_users (email, password_hash, created_at, updated_at)
       VALUES ($1, 'x', NOW(), NOW()) RETURNING id`,
      [`design-reaper+${suffix}@test.local`]
    );
    userId = Number(user.id);

    for (const projectId of [idleProjectId, freshProjectId]) {
      await db.dbQuery(
        `INSERT INTO zaki_design_projects
           (project_id, owner_user_id, name, status, created_at, updated_at)
         VALUES ($1, $2, 'Reaper fixture', 'active', NOW(), NOW())`,
        [projectId, userId]
      );
    }

    // Idle row: ACTIVE, updated_at an hour ago — well past the 15m TTL, so it MUST be claimed.
    await db.dbQuery(
      `INSERT INTO zaki_design_sessions
         (session_id, project_id, owner_user_id, tenant_id, state,
          checkpoint_generation, created_at, updated_at, last_seen_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', 4,
               NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour')`,
      [idleSessionId, idleProjectId, userId, tenantId]
    );
    // Fresh row: ACTIVE, updated_at NOW — identical state, differs only in freshness, so it MUST
    // be spared. This is the session doing real work whose worker must not be descaled.
    await db.dbQuery(
      `INSERT INTO zaki_design_sessions
         (session_id, project_id, owner_user_id, tenant_id, state,
          checkpoint_generation, created_at, updated_at, last_seen_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', 9, NOW(), NOW(), NOW())`,
      [freshSessionId, freshProjectId, userId, tenantId]
    );
  });

  afterAll(async () => {
    if (!db || !userId) return;
    // CASCADE from the user removes both projects and both sessions.
    await db.dbQuery("DELETE FROM zaki_users WHERE id = $1", [userId]);
  });

  it("claims the idle-past-TTL session and spares the fresh ACTIVE one", async () => {
    const stoppedSessionIds = [];
    const result = await reapIdleDesignSessions({
      dbQuery: db.dbQuery,
      controller: recordingController(stoppedSessionIds),
      // Keep the observed-state write a no-op so the seeded rows are not mutated between tests;
      // this test is about which rows the real SELECT returns, not the post-stop reconcile.
      updateSessionState: async () => true,
      idleTtlMs: IDLE_TTL_MS,
      // High so the LIMIT can never push our idle row out even in a shared test database.
      maxPerSweep: 1000,
    });

    // The real claim query returned the idle row and drove stop for it...
    expect(stoppedSessionIds).toContain(idleSessionId);
    // ...and did NOT touch the fresh one — the ONLY thing keeping it alive is its fresh
    // updated_at, since both rows are ACTIVE. This is the safety property, proven end to end.
    expect(stoppedSessionIds).not.toContain(freshSessionId);
    expect(result.scanned).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);
  }, 15_000);

  it("spares a formerly-idle session once a proxy activity touch refreshes updated_at", async () => {
    // FIX (data-loss window): proxied design work now bumps updated_at. Prove it against real PG —
    // refresh the idle row exactly as the proxy route does, then re-run the reaper: the row that
    // was reaped a moment ago is now spared, because updated_at is fresh again. Sustained proxy
    // work keeps a session out of the reaper.
    const refreshed = await touchDesignSessionActivity({
      dbQuery: db.dbQuery,
      sessionId: idleSessionId,
      projectId: idleProjectId,
      userId,
      tenantId,
    });
    expect(refreshed).toBe(true);

    const stoppedSessionIds = [];
    await reapIdleDesignSessions({
      dbQuery: db.dbQuery,
      controller: recordingController(stoppedSessionIds),
      updateSessionState: async () => true,
      idleTtlMs: IDLE_TTL_MS,
      maxPerSweep: 1000,
    });

    // No longer selected: the touch moved updated_at inside the TTL window.
    expect(stoppedSessionIds).not.toContain(idleSessionId);
    expect(stoppedSessionIds).not.toContain(freshSessionId);
  }, 15_000);
});

import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

d("Design session migration — real PostgreSQL expand-contract safety", () => {
  let db;
  let userId;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const projectId = `design-project-${suffix}`;
  const sessionId = `design-session-${suffix}`;

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
      [`design-migration+${suffix}@test.local`]
    );
    userId = Number(user.id);

    await db.dbQuery(
      `INSERT INTO zaki_design_projects
         (project_id, owner_user_id, name, status, created_at, updated_at)
       VALUES ($1, $2, 'Migration sentinel', 'active', NOW(), NOW())`,
      [projectId, userId]
    );
    await db.dbQuery(
      `INSERT INTO zaki_design_sessions
         (session_id, project_id, owner_user_id, tenant_id, state,
          checkpoint_generation, checkpoint_object_key, created_at, updated_at)
       VALUES ($1, $2, $3, 'tenant-sentinel', 'STOPPED', 7,
               'projects/sentinel/checkpoints/0000000007.tgz', NOW(), NOW())`,
      [sessionId, projectId, userId]
    );
  });

  afterAll(async () => {
    if (!db || !userId) return;
    await db.dbQuery("DELETE FROM zaki_users WHERE id = $1", [userId]);
  });

  it("is idempotent with both Design gates off and preserves existing session data", async () => {
    const startedAt = performance.now();
    await db.initDb();
    const repeatMigrationMs = performance.now() - startedAt;

    const session = await db.dbGet(
      `SELECT session_id, project_id, owner_user_id, tenant_id, state,
              checkpoint_generation, checkpoint_object_key
         FROM zaki_design_sessions
        WHERE session_id = $1`,
      [sessionId]
    );
    expect(session).toMatchObject({
      session_id: sessionId,
      project_id: projectId,
      owner_user_id: String(userId),
      tenant_id: "tenant-sentinel",
      state: "STOPPED",
      checkpoint_generation: "7",
      checkpoint_object_key: "projects/sentinel/checkpoints/0000000007.tgz",
    });

    const index = await db.dbGet(
      `SELECT indexname
         FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'zaki_design_sessions'
          AND indexname = 'idx_zaki_design_sessions_owner_state'`
    );
    expect(index?.indexname).toBe("idx_zaki_design_sessions_owner_state");

    // The reaper-serving composite index is provisioned by the same migration, keyed on the
    // reaper's ownerless (state, updated_at) scan.
    const reaperIndex = await db.dbGet(
      `SELECT indexname
         FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'zaki_design_sessions'
          AND indexname = 'idx_zaki_design_sessions_state_updated'`
    );
    expect(reaperIndex?.indexname).toBe("idx_zaki_design_sessions_state_updated");
    expect(repeatMigrationMs).toBeLessThan(10_000);
  }, 15_000);
});

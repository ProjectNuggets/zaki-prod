import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, jest, test } from "@jest/globals";
import { buildDesignSessionRouter } from "./design-session-routes.js";
import { createDesignSessionProxyAuthorizer } from "./design-session-metering.js";
import { readDesignSessionBinding } from "./design-session-store.js";
import { createDesignWorkbenchAccess } from "./design-workbench-access.js";
import {
  resolveEffectivePlatformEntitlement,
  resolvePlatformWalletPlanForUser,
} from "./platform-entitlement-context.js";
import { buildPlatformEntitlementSummary } from "./platform-policy.js";

const RUN = process.env.LEDGER_TEST_DATABASE_URL;
const d = RUN ? describe : describe.skip;

d("Design session billing identity — real PostgreSQL wallet boundary", () => {
  let db;
  let ensureWallet;
  let readWallet;
  let userId;
  let projectId;
  let sessionId;

  beforeAll(async () => {
    process.env.DATABASE_URL = RUN;
    process.env.NODE_ENV = "test";
    delete process.env.PGSSLMODE;

    db = await import("./db.js");
    ({ ensureWallet, readWallet } = await import("./unit-ledger.js"));
    await db.initDb();

    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    projectId = `design-project-${suffix}`;
    sessionId = `design-session-${suffix}`;
    const user = await db.dbGet(
      `INSERT INTO zaki_users
         (email, password_hash, verified, plan_tier, plan_status,
          current_period_end, created_at, updated_at)
       VALUES ($1, 'x', TRUE, 'personal', 'active', '2099-01-01T00:00:00.000Z', NOW(), NOW())
       RETURNING id`,
      [`design-billing+${suffix}@test.local`]
    );
    userId = Number(user.id);

    await db.dbQuery(
      `INSERT INTO zaki_design_projects
         (project_id, owner_user_id, name, status, created_at, updated_at)
       VALUES ($1, $2, 'Billing identity sentinel', 'active', NOW(), NOW())`,
      [projectId, userId]
    );
    await db.dbQuery(
      `INSERT INTO zaki_design_sessions
         (session_id, project_id, owner_user_id, tenant_id, state,
          checkpoint_generation, created_at, updated_at)
       VALUES ($1, $2, $3, 'default', 'READY', 7, NOW(), NOW())`,
      [sessionId, projectId, userId]
    );
    await ensureWallet({ userId, planId: "personal", env: {} });
    await db.dbQuery(
      `UPDATE zaki_unit_wallets
          SET weekly_used_units = 17,
              topup_units = 11
        WHERE user_id = $1`,
      [userId]
    );
  });

  afterAll(async () => {
    if (!db || !userId) return;
    await db.dbQuery("DELETE FROM zaki_users WHERE id = $1", [userId]);
  });

  test("a paid cookie mutation preserves the paid wallet through the production authorizer", async () => {
    const issueMeterGrantForIdentity = jest.fn(async ({ identity }) => {
      const effective = resolveEffectivePlatformEntitlement(identity.zakiUser);
      const platform = buildPlatformEntitlementSummary({
        commercialPlanId: effective.commercial?.planId || "spaces_free",
        effectiveTier: effective.tier,
        source: effective.source,
        premium: effective.premium,
      });
      const planId = resolvePlatformWalletPlanForUser(identity.zakiUser);
      expect(platform.plan.id).toBe(planId);
      await ensureWallet({ userId: identity.userId, planId, env: {} });
      const wallet = await readWallet(identity.userId);
      return {
        allowed: true,
        grant: {
          grantId: "11111111-1111-1111-1111-111111111111",
          action: "design_file_write",
          idempotencyKey: "design-paid-wallet",
          planTier: wallet.plan_id,
        },
        meter: {
          plan: { tier: wallet.plan_id },
          rolling: { remaining: 183 },
          weekly: { remaining: 983 },
        },
      };
    });
    const authorizeProxy = createDesignSessionProxyAuthorizer({
      absoluteMaxRequestBytes: 200 * 1024 * 1024,
      issueMeterGrantForIdentity,
    });
    const controllerProxy = jest.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "content-type": "application/json" } }
    ));
    const access = createDesignWorkbenchAccess({
      secret: "controller-secret-at-least-16",
      secure: false,
    });
    const cookie = access.issue({
      userId: String(userId),
      sessionId,
      projectId,
      generation: 7,
    }).split(";")[0];
    const app = express();
    app.use("/api/design/sessions", buildDesignSessionRouter({
      enabled: true,
      resolveUser: jest.fn(),
      resolveBillingUserById: (boundUserId) => db.dbGet(
        `SELECT id, email, verified, plan_tier, plan_status, current_period_end
           FROM zaki_users
          WHERE id = $1`,
        [Number(boundUserId)]
      ),
      resolveProxyAccess: (req, boundSessionId) => access.resolve(req, boundSessionId),
      ensureSession: jest.fn(),
      readSessionBinding: readDesignSessionBinding,
      updateSessionState: jest.fn(),
      runInTransaction: jest.fn(),
      dbQuery: db.dbQuery,
      createSessionId: jest.fn(),
      controller: { ensure: jest.fn(), status: jest.fn(), stop: jest.fn(), proxy: controllerProxy },
      getRequestId: () => "req_design_paid_wallet",
      authorizeProxy,
    }));

    const response = await request(app)
      .post(`/api/design/sessions/${sessionId}/proxy/api/projects/${projectId}/files`)
      .set("x-zaki-project-id", projectId)
      .set("cookie", cookie)
      .set("idempotency-key", "design-paid-wallet")
      .send({ name: "paid-concept.html" });

    expect(response.status).toBe(200);
    expect(response.headers["x-zaki-meter-plan"]).toBe("personal");
    expect(controllerProxy).toHaveBeenCalledTimes(1);
    expect(issueMeterGrantForIdentity).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "default",
      identity: expect.objectContaining({
        userId: String(userId),
        tenantId: "default",
        zakiUser: expect.objectContaining({ plan_tier: "personal", plan_status: "active" }),
      }),
    }));
    const wallet = await readWallet(userId);
    expect(wallet.plan_id).toBe("personal");
    expect(Number(wallet.weekly_allowance_units)).toBe(1000);
    expect(Number(wallet.burst_allowance_units)).toBe(200);
    expect(Number(wallet.weekly_used_units)).toBe(17);
    expect(Number(wallet.topup_units)).toBe(11);
  });
});

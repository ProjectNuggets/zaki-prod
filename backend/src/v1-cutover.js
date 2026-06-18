import { fetchNullclawPath } from "./agent-client.js";
import { buildPlatformPlanPolicy, normalizePlatformPlanId } from "./platform-policy.js";

export const V1_CUTOVER_VERSION = "2026-06-v1";

const COMPLETED_STATUS = "completed";
const RUNNING_STATUS = "running";
const FAILED_STATUS = "failed";
const DEFAULT_RUNNING_STALE_MS = 30 * 60 * 1000;

export const V1_CUTOVER_DDL = `
CREATE TABLE IF NOT EXISTS zaki_v1_cutover_markers (
  user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
  cutover_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'reverted')),
  request_id TEXT,
  actor_email TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  reverted_at TIMESTAMPTZ,
  wallet_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  archived_workspaces_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  engine_response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cutover_version)
);

CREATE INDEX IF NOT EXISTS idx_zaki_v1_cutover_markers_status
  ON zaki_v1_cutover_markers(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS zaki_v1_cutover_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES zaki_users(id) ON DELETE SET NULL,
  cutover_version TEXT NOT NULL,
  request_id TEXT,
  actor_email TEXT,
  event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'skipped')),
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zaki_v1_cutover_events_user_created
  ON zaki_v1_cutover_events(user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_zaki_v1_cutover_events_version_created
  ON zaki_v1_cutover_events(cutover_version, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS zaki_v1_cutover_workspace_archives (
  user_id BIGINT NOT NULL REFERENCES zaki_users(id) ON DELETE CASCADE,
  cutover_version TEXT NOT NULL,
  workspace_slug TEXT NOT NULL,
  hidden_reason TEXT NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  restored_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, cutover_version, workspace_slug)
);
`;

function jsonParam(value) {
  return JSON.stringify(value ?? {});
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRequestId(value) {
  const normalized = String(value || "").trim();
  return normalized || `v1-cutover-${Date.now()}`;
}

export function normalizeCutoverVersion(value = V1_CUTOVER_VERSION) {
  const normalized = String(value || "").trim();
  if (!normalized) return V1_CUTOVER_VERSION;
  return normalized.replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "") || V1_CUTOVER_VERSION;
}

export function normalizeV1CutoverUser(row) {
  const id = Number(row?.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("A valid ZAKI user id is required for V1 cutover.");
  }
  return {
    id,
    email: normalizeEmail(row?.email),
    planId: normalizePlatformPlanId(row?.commercial_plan_id || row?.plan_tier || row?.plan_id || "free"),
  };
}

function normalizeWorkspaceSlugs(values = []) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function normalizeOptionalUserId(value) {
  if (value == null || !String(value).trim()) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("A valid ZAKI user id is required.");
  }
  return id;
}

function isFreshRunningMarker(marker, { nowMs, runningStaleMs }) {
  if (marker?.status !== RUNNING_STATUS) return false;
  const rawTimestamp = marker.updated_at || marker.started_at;
  const timestampMs = rawTimestamp instanceof Date ? rawTimestamp.getTime() : Date.parse(String(rawTimestamp || ""));
  if (!Number.isFinite(timestampMs)) return true;
  return nowMs - timestampMs < runningStaleMs;
}

function extractEngineBody(result) {
  return result?.body || result?.responseJson || result?.response || {};
}

function summarizeEngineResult(result) {
  const body = extractEngineBody(result);
  return {
    status: body.status || (result?.ok ? "applied" : "failed"),
    birthdayFirstRun: body.birthday_first_run || body.birthdayFirstRun || "queued",
    memoryImportBridge: body.memory_import_bridge || body.memoryImportBridge || "offered",
    archiveReversible: body.archive_reversible ?? body.archiveReversible ?? true,
    raw: body,
  };
}

async function recordCutoverEvent(
  client,
  { userId, cutoverVersion, requestId, actorEmail, event, status, details = {} }
) {
  const result = await client.query(
    `INSERT INTO zaki_v1_cutover_events (
       user_id,
       cutover_version,
       request_id,
       actor_email,
       event,
       status,
       details_json
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     RETURNING id, user_id, cutover_version, event, status, details_json, created_at`,
    [userId, cutoverVersion, requestId, actorEmail, event, status, jsonParam(details)]
  );
  return result.rows[0] || null;
}

async function readMarkerForUpdate(client, userId, cutoverVersion) {
  const result = await client.query(
    `SELECT *
     FROM zaki_v1_cutover_markers
     WHERE user_id = $1 AND cutover_version = $2
     FOR UPDATE`,
    [userId, cutoverVersion]
  );
  return result.rows[0] || null;
}

async function upsertRunningMarker(client, { userId, cutoverVersion, requestId, actorEmail }) {
  const result = await client.query(
    `INSERT INTO zaki_v1_cutover_markers (
       user_id,
       cutover_version,
       status,
       request_id,
       actor_email,
       started_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (user_id, cutover_version) DO UPDATE SET
       status = $3,
       request_id = EXCLUDED.request_id,
       actor_email = EXCLUDED.actor_email,
       updated_at = NOW()
     WHERE zaki_v1_cutover_markers.status <> 'completed'
     RETURNING *`,
    [userId, cutoverVersion, RUNNING_STATUS, requestId, actorEmail]
  );
  return result.rows[0] || null;
}

async function failMarker(client, { userId, cutoverVersion, requestId, actorEmail, error }) {
  await client.query(
    `UPDATE zaki_v1_cutover_markers
     SET status = $3,
         request_id = $4,
         actor_email = $5,
         details_json = $6::jsonb,
         updated_at = NOW()
     WHERE user_id = $1 AND cutover_version = $2`,
    [
      userId,
      cutoverVersion,
      FAILED_STATUS,
      requestId,
      actorEmail,
      jsonParam({ error: String(error?.message || error || "cutover failed") }),
    ]
  );
}

function planWalletBaseline(planId, env) {
  const policy = buildPlatformPlanPolicy({ env });
  const plan = normalizePlatformPlanId(planId);
  const planPolicy = policy.plans[plan] || policy.plans.free;
  return {
    planId: plan,
    weeklyAllowanceUnits: planPolicy.weeklyAllowanceUnits ?? 0,
    burstAllowanceUnits: planPolicy.rollingAllowanceUnits ?? 0,
    burstWindowHours: policy.burstWindowHours,
  };
}

async function resetWalletToV1Baseline(client, { userId, planId, env }) {
  const baseline = planWalletBaseline(planId, env);
  const before = await client.query(`SELECT * FROM zaki_unit_wallets WHERE user_id = $1 FOR UPDATE`, [userId]);
  const walletBefore = before.rows[0] || null;
  let after = await client.query(
    `UPDATE zaki_unit_wallets
     SET plan_id = $2,
         weekly_allowance_units = $3,
         burst_allowance_units = $4,
         burst_window_hours = $5,
         weekly_used_units = 0,
         topup_units = 0,
         weekly_anchor_at = NOW(),
         weekly_reset_at = NOW() + INTERVAL '7 days',
         version = version + 1,
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [
      userId,
      baseline.planId,
      baseline.weeklyAllowanceUnits,
      baseline.burstAllowanceUnits,
      baseline.burstWindowHours,
    ]
  );
  if (!after.rows[0]) {
    after = await client.query(
      `INSERT INTO zaki_unit_wallets (
         user_id,
         plan_id,
         weekly_allowance_units,
         burst_allowance_units,
         burst_window_hours,
         weekly_used_units,
         topup_units,
         weekly_anchor_at,
         weekly_reset_at
       )
       VALUES ($1, $2, $3, $4, $5, 0, 0, NOW(), NOW() + INTERVAL '7 days')
       RETURNING *`,
      [
        userId,
        baseline.planId,
        baseline.weeklyAllowanceUnits,
        baseline.burstAllowanceUnits,
        baseline.burstWindowHours,
      ]
    );
  }
  return {
    before: walletBefore,
    after: after.rows[0] || null,
    baseline,
  };
}

async function expireActiveHolds(client, { userId, cutoverVersion }) {
  const result = await client.query(
    `UPDATE zaki_meter_holds
     SET state = 'expired',
         settled_at = COALESCE(settled_at, NOW()),
         settle_idempotency_key = COALESCE(settle_idempotency_key, $2),
         raw_facts_json = raw_facts_json || $3::jsonb
     WHERE user_id = $1 AND state = 'reserved'
     RETURNING id`,
    [
      userId,
      `v1-cutover:${cutoverVersion}`,
      jsonParam({ expiredBy: "v1_cutover", cutoverVersion }),
    ]
  );
  return result.rows.map((row) => row.id);
}

async function archiveWorkspaceSlugs(client, { userId, cutoverVersion, workspaceSlugs }) {
  const slugs = normalizeWorkspaceSlugs(workspaceSlugs);
  for (const slug of slugs) {
    await client.query(
      `INSERT INTO zaki_v1_cutover_workspace_archives (
         user_id,
         cutover_version,
         workspace_slug,
         hidden_reason,
         archived_at
       )
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, cutover_version, workspace_slug) DO UPDATE SET
         restored_at = NULL`,
      [userId, cutoverVersion, slug, `v1_cutover:${cutoverVersion}`]
    );
    await client.query(
      `INSERT INTO zaki_hidden_workspaces (user_id, workspace_slug, reason, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, workspace_slug)
       DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()`,
      [userId, slug, `v1_cutover:${cutoverVersion}`]
    );
  }
  return slugs;
}

async function clearLocalAgentProjection(client, userId) {
  await client.query(
    `DELETE FROM zaki_bot_messages
     WHERE user_id = $1`,
    [userId]
  );
  await client.query(
    `DELETE FROM zaki_bot_threads
     WHERE user_id = $1`,
    [userId]
  );
}

async function completeMarker(
  client,
  {
    userId,
    cutoverVersion,
    requestId,
    actorEmail,
    wallet,
    expiredHoldIds,
    archivedWorkspaceSlugs,
    engineSummary,
  }
) {
  const details = {
    birthdayFirstRun: engineSummary.birthdayFirstRun,
    memoryImportBridge: engineSummary.memoryImportBridge,
    walletReset: true,
    expiredHoldCount: expiredHoldIds.length,
    archivedWorkspaceCount: archivedWorkspaceSlugs.length,
    archiveReversible: engineSummary.archiveReversible,
  };
  const result = await client.query(
    `UPDATE zaki_v1_cutover_markers
     SET status = 'completed',
         request_id = $3,
         actor_email = $4,
         completed_at = NOW(),
         wallet_snapshot_json = $5::jsonb,
         archived_workspaces_json = $6::jsonb,
         engine_response_json = $7::jsonb,
         details_json = $8::jsonb,
         updated_at = NOW()
     WHERE user_id = $1 AND cutover_version = $2
     RETURNING *`,
    [
      userId,
      cutoverVersion,
      requestId,
      actorEmail,
      jsonParam(wallet),
      jsonParam(archivedWorkspaceSlugs),
      jsonParam(engineSummary.raw),
      jsonParam(details),
    ]
  );
  return result.rows[0] || null;
}

export async function requestNullalisV1Cutover({
  baseUrl,
  internalToken,
  userId,
  requestId,
  cutoverVersion = V1_CUTOVER_VERSION,
  idempotencyKey,
  fetchWithTimeout,
  timeoutMs = 30000,
}) {
  const response = await fetchNullclawPath({
    baseUrl,
    internalToken,
    userId,
    requestId,
    path: `/api/v1/users/${encodeURIComponent(String(userId))}/v1-cutover`,
    method: "POST",
    body: {
      cutover_version: normalizeCutoverVersion(cutoverVersion),
      request_id: requestId,
    },
    fetchWithTimeout,
    timeoutMs,
    label: "Agent V1 cutover",
    extraHeaders: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
  });
  let body = null;
  if (response && typeof response.json === "function") {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }
  return {
    ok: Boolean(response?.ok),
    status: response?.status ?? null,
    body: body || {},
  };
}

export async function runV1CutoverForUser({
  zakiUser,
  actorEmail,
  requestId,
  cutoverVersion = V1_CUTOVER_VERSION,
  withDbTransaction,
  listWorkspaceSlugs = async () => [],
  nullalisCutover,
  env = process.env,
  now = () => Date.now(),
  runningStaleMs = DEFAULT_RUNNING_STALE_MS,
}) {
  if (typeof withDbTransaction !== "function") {
    throw new Error("withDbTransaction dependency is required.");
  }
  if (typeof nullalisCutover !== "function") {
    throw new Error("nullalisCutover dependency is required.");
  }

  const user = normalizeV1CutoverUser(zakiUser);
  const version = normalizeCutoverVersion(cutoverVersion);
  const normalizedActor = normalizeEmail(actorEmail);
  const normalizedRequestId = normalizeRequestId(requestId);

  const start = await withDbTransaction(async (client) => {
    const existing = await readMarkerForUpdate(client, user.id, version);
    if (existing?.status === COMPLETED_STATUS) {
      const details = existing.details_json || {};
      await recordCutoverEvent(client, {
        userId: user.id,
        cutoverVersion: version,
        requestId: normalizedRequestId,
        actorEmail: normalizedActor,
        event: "skipped_already_completed",
        status: "skipped",
        details,
      });
      return {
        proceed: false,
        result: {
          userId: user.id,
          status: "skipped",
          idempotent: true,
          birthdayFirstRun: details.birthdayFirstRun || "queued",
          memoryImportBridge: details.memoryImportBridge || "offered",
        },
      };
    }
    if (isFreshRunningMarker(existing, { nowMs: now(), runningStaleMs })) {
      await recordCutoverEvent(client, {
        userId: user.id,
        cutoverVersion: version,
        requestId: normalizedRequestId,
        actorEmail: normalizedActor,
        event: "skipped_already_running",
        status: "skipped",
        details: {
          startedAt: existing.started_at || null,
          updatedAt: existing.updated_at || null,
        },
      });
      return {
        proceed: false,
        result: {
          userId: user.id,
          status: "skipped",
          reason: "already_running",
          idempotent: true,
          birthdayFirstRun: "queued",
          memoryImportBridge: "offered",
        },
      };
    }
    await upsertRunningMarker(client, {
      userId: user.id,
      cutoverVersion: version,
      requestId: normalizedRequestId,
      actorEmail: normalizedActor,
    });
    await recordCutoverEvent(client, {
      userId: user.id,
      cutoverVersion: version,
      requestId: normalizedRequestId,
      actorEmail: normalizedActor,
      event: "started",
      status: "started",
      details: { planId: user.planId },
    });
    return { proceed: true };
  });

  if (!start.proceed) {
    return start.result;
  }

  const idempotencyKey = `v1-cutover:${version}:user:${user.id}`;
  try {
    const workspaceSlugs = normalizeWorkspaceSlugs(await listWorkspaceSlugs(user));
    const engineResult = await nullalisCutover({
      userId: user.id,
      requestId: normalizedRequestId,
      cutoverVersion: version,
      idempotencyKey,
    });
    if (!engineResult?.ok) {
      throw new Error(`Nullalis V1 cutover failed with status ${engineResult?.status ?? "unknown"}.`);
    }
    const engineSummary = summarizeEngineResult(engineResult);

    const completed = await withDbTransaction(async (client) => {
      const expiredHoldIds = await expireActiveHolds(client, {
        userId: user.id,
        cutoverVersion: version,
      });
      const wallet = await resetWalletToV1Baseline(client, {
        userId: user.id,
        planId: user.planId,
        env,
      });
      const archivedWorkspaceSlugs = await archiveWorkspaceSlugs(client, {
        userId: user.id,
        cutoverVersion: version,
        workspaceSlugs,
      });
      await clearLocalAgentProjection(client, user.id);
      await recordCutoverEvent(client, {
        userId: user.id,
        cutoverVersion: version,
        requestId: normalizedRequestId,
        actorEmail: normalizedActor,
        event: "birthday_first_run_queued",
        status: "succeeded",
        details: { engineStatus: engineSummary.status },
      });
      await recordCutoverEvent(client, {
        userId: user.id,
        cutoverVersion: version,
        requestId: normalizedRequestId,
        actorEmail: normalizedActor,
        event: "memory_import_bridge_offered",
        status: "succeeded",
        details: { engineStatus: engineSummary.status },
      });
      const marker = await completeMarker(client, {
        userId: user.id,
        cutoverVersion: version,
        requestId: normalizedRequestId,
        actorEmail: normalizedActor,
        wallet,
        expiredHoldIds,
        archivedWorkspaceSlugs,
        engineSummary,
      });
      await recordCutoverEvent(client, {
        userId: user.id,
        cutoverVersion: version,
        requestId: normalizedRequestId,
        actorEmail: normalizedActor,
        event: "completed",
        status: "succeeded",
        details: {
          archivedWorkspaceCount: archivedWorkspaceSlugs.length,
          expiredHoldCount: expiredHoldIds.length,
        },
      });
      return { marker, archivedWorkspaceSlugs, expiredHoldIds, wallet };
    });

    return {
      userId: user.id,
      status: "completed",
      idempotent: false,
      birthdayFirstRun: engineSummary.birthdayFirstRun,
      memoryImportBridge: engineSummary.memoryImportBridge,
      archivedWorkspaceSlugs: completed.archivedWorkspaceSlugs,
      expiredHoldIds: completed.expiredHoldIds,
    };
  } catch (error) {
    await withDbTransaction(async (client) => {
      await failMarker(client, {
        userId: user.id,
        cutoverVersion: version,
        requestId: normalizedRequestId,
        actorEmail: normalizedActor,
        error,
      });
      await recordCutoverEvent(client, {
        userId: user.id,
        cutoverVersion: version,
        requestId: normalizedRequestId,
        actorEmail: normalizedActor,
        event: "failed",
        status: "failed",
        details: { error: String(error?.message || error) },
      });
    });
    throw error;
  }
}

export async function listV1CutoverUsers({ dbAll, userId, limit } = {}) {
  if (typeof dbAll !== "function") {
    throw new Error("dbAll dependency is required.");
  }
  const params = [];
  const where = [];
  const normalizedUserId = normalizeOptionalUserId(userId);
  if (normalizedUserId != null) {
    params.push(normalizedUserId);
    where.push(`id = $${params.length}`);
  }
  const limitValue = Math.max(1, Math.min(10000, Number(limit) || 10000));
  params.push(limitValue);
  const query = `
    SELECT id, email, NULL::text AS commercial_plan_id, plan_tier, NULL::text AS plan_id
    FROM zaki_users
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY id ASC
    LIMIT $${params.length}`;
  return dbAll(query, params);
}

export async function listV1CutoverAuditEvents({
  dbAll,
  userId,
  cutoverVersion = V1_CUTOVER_VERSION,
  limit = 200,
} = {}) {
  if (typeof dbAll !== "function") {
    throw new Error("dbAll dependency is required.");
  }
  const params = [normalizeCutoverVersion(cutoverVersion)];
  const where = ["cutover_version = $1"];
  const normalizedUserId = normalizeOptionalUserId(userId);
  if (normalizedUserId != null) {
    params.push(normalizedUserId);
    where.push(`user_id = $${params.length}`);
  }
  params.push(Math.max(1, Math.min(1000, Number(limit) || 200)));
  return dbAll(
    `SELECT id, user_id, cutover_version, request_id, actor_email, event, status, details_json, created_at
     FROM zaki_v1_cutover_events
     WHERE ${where.join(" AND ")}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length}`,
    params
  );
}

export async function runV1CutoverBatch({
  actorEmail,
  requestId,
  cutoverVersion = V1_CUTOVER_VERSION,
  dbAll,
  userId,
  limit,
  perUserRunner = runV1CutoverForUser,
  ...perUserOptions
}) {
  const users = await listV1CutoverUsers({ dbAll, userId, limit });
  const results = [];
  for (const zakiUser of users) {
    try {
      results.push(
        await perUserRunner({
          ...perUserOptions,
          zakiUser,
          actorEmail,
          requestId,
          cutoverVersion,
        })
      );
    } catch (error) {
      results.push({
        userId: Number(zakiUser.id),
        status: "failed",
        error: String(error?.message || error),
      });
    }
  }
  return {
    cutoverVersion: normalizeCutoverVersion(cutoverVersion),
    total: results.length,
    completed: results.filter((row) => row.status === "completed").length,
    skipped: results.filter((row) => row.status === "skipped").length,
    failed: results.filter((row) => row.status === "failed").length,
    results,
  };
}

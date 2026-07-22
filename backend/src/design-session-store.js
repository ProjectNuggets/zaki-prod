const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SESSION_STATES = new Set([
  "REQUESTED", "STARTING", "RESTORING", "READY", "ACTIVE", "IDLE",
  "DRAINING", "CHECKPOINTING", "STOPPED", "FAILED",
]);

export class DesignSessionStoreError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = "DesignSessionStoreError";
    this.code = code;
    this.status = status;
  }
}

export async function ensureDesignSession({
  runInTransaction,
  userId,
  projectId,
  tenantId,
  requestId,
  createSessionId,
}) {
  const ownerUserId = positiveUserId(userId);
  const normalizedProjectId = opaqueId(projectId, "projectId");
  const normalizedTenantId = opaqueId(tenantId, "tenantId");
  const sessionId = opaqueId(createSessionId(), "sessionId");
  return runInTransaction(async (transaction) => {
    const ownedProject = await transaction.query(
      `
        SELECT project_id
          FROM zaki_design_projects
         WHERE project_id = $1
           AND owner_user_id = $2
           AND status <> 'deleted'
         FOR UPDATE
      `,
      [normalizedProjectId, ownerUserId]
    );
    if (!ownedProject.rows[0]) {
      throw new DesignSessionStoreError("DESIGN_PROJECT_NOT_FOUND", "Design project was not found.", 404);
    }
    const result = await transaction.query(
      `
        INSERT INTO zaki_design_sessions
          (session_id, project_id, owner_user_id, tenant_id, state,
           checkpoint_generation, last_request_id, created_at, updated_at, last_seen_at)
        VALUES ($1, $2, $3, $4, 'REQUESTED', 0, $5, NOW(), NOW(), NOW())
        ON CONFLICT (project_id)
        DO UPDATE SET
          last_request_id = EXCLUDED.last_request_id,
          last_seen_at = NOW(),
          updated_at = NOW()
        WHERE zaki_design_sessions.owner_user_id = EXCLUDED.owner_user_id
          AND zaki_design_sessions.tenant_id = EXCLUDED.tenant_id
        RETURNING session_id, project_id, owner_user_id, tenant_id, state,
                  checkpoint_generation, checkpoint_sha256, checkpoint_bytes,
                  checkpoint_object_key
      `,
      [sessionId, normalizedProjectId, ownerUserId, normalizedTenantId, nullableText(requestId)]
    );
    const row = result.rows[0];
    if (!row) {
      throw new DesignSessionStoreError("DESIGN_SESSION_CONFLICT", "Design project already has another session binding.");
    }
    return normalizeSessionRow(row);
  });
}

export async function readDesignSessionBinding({
  dbQuery,
  sessionId,
  projectId,
  userId,
  tenantId,
  lock = false,
}) {
  const result = await dbQuery(
    `
      SELECT session_id, project_id, owner_user_id, tenant_id, state,
             checkpoint_generation, checkpoint_sha256, checkpoint_bytes,
             checkpoint_object_key
        FROM zaki_design_sessions
       WHERE session_id = $1
         AND project_id = $2
         AND owner_user_id = $3
         AND tenant_id = $4
       ${lock ? "FOR UPDATE" : ""}
    `,
    [
      opaqueId(sessionId, "sessionId"),
      opaqueId(projectId, "projectId"),
      positiveUserId(userId),
      opaqueId(tenantId, "tenantId"),
    ]
  );
  return result.rows[0] ? normalizeSessionRow(result.rows[0]) : null;
}

export async function beginDesignSessionDrain({
  runInTransaction,
  sessionId,
  projectId,
  userId,
  tenantId,
  expectedGeneration,
  requestId,
}) {
  const normalized = {
    sessionId: opaqueId(sessionId, "sessionId"),
    projectId: opaqueId(projectId, "projectId"),
    userId: positiveUserId(userId),
    tenantId: opaqueId(tenantId, "tenantId"),
    expectedGeneration: generationNumber(expectedGeneration, "expectedGeneration"),
  };
  return runInTransaction(async (transaction) => {
    const updated = await transaction.query(
      `
        UPDATE zaki_design_sessions
           SET state = 'DRAINING',
               last_request_id = $6,
               last_seen_at = NOW(),
               updated_at = NOW()
         WHERE session_id = $1
           AND project_id = $2
           AND owner_user_id = $3
           AND tenant_id = $4
           AND checkpoint_generation = $5
           AND state IN ('REQUESTED', 'STARTING', 'RESTORING', 'READY', 'ACTIVE', 'IDLE')
         RETURNING session_id, project_id, owner_user_id, tenant_id, state,
                   checkpoint_generation, checkpoint_sha256, checkpoint_bytes,
                   checkpoint_object_key
      `,
      [
        normalized.sessionId,
        normalized.projectId,
        normalized.userId,
        normalized.tenantId,
        normalized.expectedGeneration,
        nullableText(requestId),
      ]
    );
    if (updated.rows[0]) return normalizeSessionRow(updated.rows[0]);

    const existing = await transaction.query(
      `
        SELECT session_id, project_id, owner_user_id, tenant_id, state,
               checkpoint_generation, checkpoint_sha256, checkpoint_bytes,
               checkpoint_object_key
          FROM zaki_design_sessions
         WHERE session_id = $1
           AND project_id = $2
           AND owner_user_id = $3
           AND tenant_id = $4
         FOR UPDATE
      `,
      [normalized.sessionId, normalized.projectId, normalized.userId, normalized.tenantId]
    );
    if (!existing.rows[0]) {
      throw new DesignSessionStoreError("DESIGN_SESSION_NOT_FOUND", "Design session was not found.", 404);
    }
    const session = normalizeSessionRow(existing.rows[0]);
    if (session.generation !== normalized.expectedGeneration) {
      throw new DesignSessionStoreError("DESIGN_CHECKPOINT_CAS_CONFLICT", "Checkpoint generation changed.");
    }
    // FAILED belongs here with the other terminal states: a session that never started has
    // nothing left to drain, so stopping it is a no-op success, not a state conflict.
    if (["DRAINING", "CHECKPOINTING", "STOPPED", "FAILED"].includes(session.state)) return session;
    throw new DesignSessionStoreError("DESIGN_SESSION_STATE_CONFLICT", "Design session cannot be stopped from its current state.");
  });
}

export async function commitDesignCheckpoint({
  runInTransaction,
  sessionId,
  projectId,
  userId,
  tenantId,
  expectedGeneration,
  generation,
  bytes,
  sha256,
  objectKey,
  requestId,
}) {
  const normalized = {
    sessionId: opaqueId(sessionId, "sessionId"),
    projectId: opaqueId(projectId, "projectId"),
    userId: positiveUserId(userId),
    tenantId: opaqueId(tenantId, "tenantId"),
    expectedGeneration: generationNumber(expectedGeneration, "expectedGeneration"),
    generation: generationNumber(generation, "generation"),
    bytes: byteCount(bytes),
    sha256: sha256Value(sha256),
    objectKey: checkpointObjectKey(objectKey, projectId, generation),
  };
  if (normalized.generation !== normalized.expectedGeneration + 1) {
    throw new DesignSessionStoreError("DESIGN_CHECKPOINT_GENERATION_INVALID", "Checkpoint generation is not monotonic.", 400);
  }

  return runInTransaction(async (transaction) => {
    const updated = await transaction.query(
      `
        UPDATE zaki_design_sessions
           SET checkpoint_generation = $6,
               checkpoint_bytes = $7,
               checkpoint_sha256 = $8,
               checkpoint_object_key = $9,
               state = 'CHECKPOINTING',
               stopped_at = NULL,
               last_request_id = $10,
               updated_at = NOW(),
               last_seen_at = NOW()
         WHERE session_id = $1
           AND project_id = $2
           AND owner_user_id = $3
           AND tenant_id = $4
           AND checkpoint_generation = $5
           AND state IN ('DRAINING', 'CHECKPOINTING')
         RETURNING checkpoint_generation
      `,
      [
        normalized.sessionId,
        normalized.projectId,
        normalized.userId,
        normalized.tenantId,
        normalized.expectedGeneration,
        normalized.generation,
        normalized.bytes,
        normalized.sha256,
        normalized.objectKey,
        nullableText(requestId),
      ]
    );
    if (updated.rows[0]) {
      return { committed: true, idempotent: false, generation: normalized.generation };
    }

    const existing = await transaction.query(
      `
        SELECT session_id, project_id, owner_user_id, tenant_id, checkpoint_generation,
               checkpoint_sha256, checkpoint_bytes, checkpoint_object_key
          FROM zaki_design_sessions
         WHERE session_id = $1
           AND project_id = $2
           AND owner_user_id = $3
           AND tenant_id = $4
         FOR UPDATE
      `,
      [normalized.sessionId, normalized.projectId, normalized.userId, normalized.tenantId]
    );
    const row = existing.rows[0];
    if (
      row &&
      Number(row.checkpoint_generation) === normalized.generation &&
      row.checkpoint_sha256 === normalized.sha256 &&
      Number(row.checkpoint_bytes) === normalized.bytes &&
      row.checkpoint_object_key === normalized.objectKey
    ) {
      return { committed: false, idempotent: true, generation: normalized.generation };
    }
    throw new DesignSessionStoreError("DESIGN_CHECKPOINT_CAS_CONFLICT", "Checkpoint generation changed.");
  });
}

export async function updateDesignSessionObservedState({
  dbQuery,
  sessionId,
  projectId,
  userId,
  tenantId,
  state,
  generation,
  requestId,
}) {
  const normalizedState = String(state || "");
  if (!SESSION_STATES.has(normalizedState)) {
    throw new DesignSessionStoreError("DESIGN_SESSION_INPUT_INVALID", "session state is invalid.", 400);
  }
  const result = await dbQuery(
    `
      UPDATE zaki_design_sessions
         SET state = $5,
             last_request_id = $7,
             last_seen_at = NOW(),
             updated_at = NOW(),
             stopped_at = CASE WHEN $5 = 'STOPPED' THEN NOW() ELSE NULL END
       WHERE session_id = $1
         AND project_id = $2
         AND owner_user_id = $3
         AND tenant_id = $4
         AND checkpoint_generation = $6
       RETURNING session_id
    `,
    [
      opaqueId(sessionId, "sessionId"),
      opaqueId(projectId, "projectId"),
      positiveUserId(userId),
      opaqueId(tenantId, "tenantId"),
      normalizedState,
      generationNumber(generation, "generation"),
      nullableText(requestId),
    ]
  );
  return Boolean(result.rows[0]);
}

export function designCheckpointObjectKey(projectId, generation) {
  const normalizedProjectId = opaqueId(projectId, "projectId");
  const normalizedGeneration = generationNumber(generation, "generation");
  return `projects/${normalizedProjectId}/checkpoints/${String(normalizedGeneration).padStart(10, "0")}.tgz`;
}

function normalizeSessionRow(row) {
  const generation = Number(row.checkpoint_generation);
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new DesignSessionStoreError("DESIGN_SESSION_ROW_INVALID", "Design session generation is invalid.", 500);
  }
  return {
    sessionId: String(row.session_id),
    projectId: String(row.project_id),
    userId: String(row.owner_user_id),
    tenantId: String(row.tenant_id),
    state: String(row.state),
    generation,
    checkpointSha256: row.checkpoint_sha256 || null,
    checkpointBytes: row.checkpoint_bytes === null || row.checkpoint_bytes === undefined
      ? null
      : Number(row.checkpoint_bytes),
    checkpointObjectKey: row.checkpoint_object_key || null,
  };
}

function opaqueId(value, field) {
  const normalized = String(value || "").trim();
  if (!OPAQUE_ID.test(normalized)) {
    throw new DesignSessionStoreError("DESIGN_SESSION_INPUT_INVALID", `${field} is invalid.`, 400);
  }
  return normalized;
}

function positiveUserId(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new DesignSessionStoreError("DESIGN_SESSION_INPUT_INVALID", "userId is invalid.", 400);
  }
  return parsed;
}

function generationNumber(value, field) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new DesignSessionStoreError("DESIGN_SESSION_INPUT_INVALID", `${field} is invalid.`, 400);
  }
  return parsed;
}

function byteCount(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 256 * 1024 * 1024) {
    throw new DesignSessionStoreError("DESIGN_SESSION_INPUT_INVALID", "checkpoint bytes are invalid.", 400);
  }
  return parsed;
}

function sha256Value(value) {
  const normalized = String(value || "").trim();
  if (!SHA256.test(normalized)) {
    throw new DesignSessionStoreError("DESIGN_SESSION_INPUT_INVALID", "checkpoint SHA-256 is invalid.", 400);
  }
  return normalized;
}

function checkpointObjectKey(value, projectId, generation) {
  const expected = designCheckpointObjectKey(projectId, generation);
  if (value !== expected) {
    throw new DesignSessionStoreError("DESIGN_SESSION_INPUT_INVALID", "checkpoint object key is invalid.", 400);
  }
  return expected;
}

function nullableText(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, 180) : null;
}

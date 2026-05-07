import crypto from "node:crypto";

const ACTIONS = new Set(["export", "delete"]);
const STATUSES = new Set(["started", "succeeded", "completed_with_errors", "failed"]);

function normalizeAction(value) {
  const action = String(value || "").trim().toLowerCase();
  return ACTIONS.has(action) ? action : "export";
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return STATUSES.has(status) ? status : "failed";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildLearningAuditSubjectHash(zakiUser = {}) {
  const email = normalizeEmail(zakiUser.email);
  const id = zakiUser.id === undefined || zakiUser.id === null ? "" : String(zakiUser.id);
  return crypto.createHash("sha256").update(`${id}:${email}`).digest("hex");
}

function countResourceArray(value) {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return null;
  for (const key of ["sessions", "books", "items", "entries", "agents", "bots", "souls"]) {
    if (Array.isArray(value[key])) return value[key].length;
  }
  return null;
}

export function summarizeLearningExportSnapshot(snapshot = {}) {
  const resources = snapshot?.resources && typeof snapshot.resources === "object"
    ? snapshot.resources
    : {};
  const resourceCounts = {};
  for (const [key, value] of Object.entries(resources)) {
    const count = countResourceArray(value);
    resourceCounts[key] = count === null ? "unknown" : count;
  }
  return {
    available: Boolean(snapshot?.available),
    reason: snapshot?.reason || null,
    exportedAt: snapshot?.exportedAt || null,
    resourceCounts,
    errorCount: Array.isArray(snapshot?.errors) ? snapshot.errors.length : 0,
  };
}

export function summarizeLearningDeletionResult(result = {}) {
  return {
    attempted: Boolean(result?.attempted),
    reason: result?.reason || null,
    deletedCount: Array.isArray(result?.deleted) ? result.deleted.length : 0,
    deletedResources: Array.isArray(result?.deleted)
      ? result.deleted.map((item) => item?.resource).filter(Boolean)
      : [],
  };
}

export async function recordLearningAccountAuditEvent({
  dbQuery,
  zakiUser,
  action,
  status,
  requestId,
  details = {},
}) {
  if (typeof dbQuery !== "function") {
    throw new Error("dbQuery is required.");
  }
  const userId = zakiUser?.id === undefined || zakiUser?.id === null ? null : Number(zakiUser.id);
  const subjectHash = buildLearningAuditSubjectHash(zakiUser);
  const result = await dbQuery(
    `INSERT INTO zaki_learning_account_audit_events
       (user_id, subject_hash, action, status, request_id, details_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
     RETURNING id, user_id, subject_hash, action, status, request_id, details_json, created_at`,
    [
      Number.isFinite(userId) ? userId : null,
      subjectHash,
      normalizeAction(action),
      normalizeStatus(status),
      requestId || null,
      JSON.stringify(details || {}),
    ]
  );
  return result.rows?.[0] || null;
}

export async function listLearningAccountAuditEvents({ dbQuery, zakiUser, limit = 50 }) {
  if (typeof dbQuery !== "function") {
    throw new Error("dbQuery is required.");
  }
  const subjectHash = buildLearningAuditSubjectHash(zakiUser);
  const safeLimit = Math.max(1, Math.min(100, Number.parseInt(String(limit || 50), 10) || 50));
  const result = await dbQuery(
    `SELECT id, action, status, request_id, details_json, created_at
     FROM zaki_learning_account_audit_events
     WHERE subject_hash = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [subjectHash, safeLimit]
  );
  return result.rows || [];
}

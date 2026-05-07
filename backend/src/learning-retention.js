const DEFAULT_AUDIT_EVENT_RETENTION_DAYS = 730;
const DEFAULT_CLEANUP_INTERVAL_HOURS = 24;
const DEFAULT_TRANSIENT_ARTIFACT_RETENTION_DAYS = 90;
const DEFAULT_STALE_TASK_RETENTION_DAYS = 30;

function parsePositiveInteger(raw, fallback, max = 100_000) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return fallback;
  return Math.min(max, Math.floor(value));
}

function parseBoolean(raw, fallback) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  return fallback;
}

export function resolveLearningRetentionPolicy(env = process.env) {
  return {
    enabled: parseBoolean(env?.ZAKI_LEARNING_RETENTION_CLEANUP_ENABLED, true),
    cleanupIntervalHours: parsePositiveInteger(
      env?.ZAKI_LEARNING_RETENTION_CLEANUP_INTERVAL_HOURS,
      DEFAULT_CLEANUP_INTERVAL_HOURS,
      24 * 30
    ),
    auditEventRetentionDays: parsePositiveInteger(
      env?.ZAKI_LEARNING_AUDIT_EVENT_RETENTION_DAYS,
      DEFAULT_AUDIT_EVENT_RETENTION_DAYS,
      3650
    ),
    activeAccountContentRetention: "account_lifetime",
    deletedAccountContentRetention: "delete_on_account_delete",
    uploadedSourceRetention: "account_lifetime",
    generatedArtifactRetention: "account_lifetime",
    transientArtifactRetentionDays: parsePositiveInteger(
      env?.ZAKI_LEARNING_TRANSIENT_ARTIFACT_RETENTION_DAYS,
      DEFAULT_TRANSIENT_ARTIFACT_RETENTION_DAYS,
      3650
    ),
    staleTaskRetentionDays: parsePositiveInteger(
      env?.ZAKI_LEARNING_STALE_TASK_RETENTION_DAYS,
      DEFAULT_STALE_TASK_RETENTION_DAYS,
      3650
    ),
  };
}

export async function cleanupLearningRetention({
  dbQuery,
  policy = resolveLearningRetentionPolicy(),
  nowDate = new Date(),
} = {}) {
  if (typeof dbQuery !== "function") {
    throw new Error("dbQuery is required.");
  }
  const resolvedPolicy = {
    ...resolveLearningRetentionPolicy({}),
    ...(policy || {}),
  };
  if (!resolvedPolicy.enabled) {
    return {
      enabled: false,
      deletedAuditEvents: 0,
      policy: resolvedPolicy,
    };
  }

  const nowIso = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
  const auditRetentionDays = parsePositiveInteger(
    resolvedPolicy.auditEventRetentionDays,
    DEFAULT_AUDIT_EVENT_RETENTION_DAYS,
    3650
  );
  const result = await dbQuery(
    `DELETE FROM zaki_learning_account_audit_events
     WHERE created_at < ($1::timestamptz - ($2::int * INTERVAL '1 day'))`,
    [nowIso, auditRetentionDays]
  );

  return {
    enabled: true,
    deletedAuditEvents: Number(result?.rowCount || 0),
    policy: resolvedPolicy,
  };
}

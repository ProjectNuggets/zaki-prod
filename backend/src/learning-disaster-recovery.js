const DEFAULT_BACKUP_FREQUENCY_HOURS = 24;
const DEFAULT_RESTORE_DRILL_FREQUENCY_DAYS = 30;
const DEFAULT_RPO_HOURS = 24;
const DEFAULT_RTO_HOURS = 4;

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

function normalizeString(raw) {
  return String(raw || "").trim();
}

function buildGate(id, ok, message, detail = {}) {
  return {
    id,
    ok: Boolean(ok),
    message,
    ...detail,
  };
}

export function resolveLearningDisasterRecoveryPolicy(env = process.env) {
  const tenantDataRoot =
    normalizeString(env?.LEARNING_ENGINE_TENANT_DATA_ROOT) ||
    normalizeString(env?.ZAKI_TENANT_DATA_ROOT);
  const backupTarget = normalizeString(env?.ZAKI_LEARNING_BACKUP_TARGET);
  const backupProvider = normalizeString(env?.ZAKI_LEARNING_BACKUP_PROVIDER);
  const immutableImageTag = normalizeString(env?.ZAKI_LEARNING_ENGINE_IMAGE_TAG);
  const lastRestoreDrillAt = normalizeString(env?.ZAKI_LEARNING_LAST_RESTORE_DRILL_AT);

  return {
    backupsEnabled: parseBoolean(env?.ZAKI_LEARNING_BACKUPS_ENABLED, false),
    backupProvider: backupProvider || null,
    backupTargetConfigured: Boolean(backupTarget),
    tenantDataRootConfigured: Boolean(tenantDataRoot),
    immutableImageTagConfigured: Boolean(immutableImageTag),
    lastRestoreDrillAt: lastRestoreDrillAt || null,
    backupFrequencyHours: parsePositiveInteger(
      env?.ZAKI_LEARNING_BACKUP_FREQUENCY_HOURS,
      DEFAULT_BACKUP_FREQUENCY_HOURS,
      24 * 30
    ),
    restoreDrillFrequencyDays: parsePositiveInteger(
      env?.ZAKI_LEARNING_RESTORE_DRILL_FREQUENCY_DAYS,
      DEFAULT_RESTORE_DRILL_FREQUENCY_DAYS,
      365
    ),
    rpoHours: parsePositiveInteger(env?.ZAKI_LEARNING_RPO_HOURS, DEFAULT_RPO_HOURS, 24 * 30),
    rtoHours: parsePositiveInteger(env?.ZAKI_LEARNING_RTO_HOURS, DEFAULT_RTO_HOURS, 24 * 30),
  };
}

function restoreDrillFresh(policy, nowDate) {
  if (!policy.lastRestoreDrillAt) return false;
  const last = Date.parse(policy.lastRestoreDrillAt);
  const now = (nowDate instanceof Date ? nowDate : new Date(nowDate)).getTime();
  if (!Number.isFinite(last) || !Number.isFinite(now)) return false;
  const maxAgeMs = policy.restoreDrillFrequencyDays * 24 * 60 * 60 * 1000;
  return now - last <= maxAgeMs;
}

export function buildLearningDisasterRecoveryStatus({
  env = process.env,
  nowDate = new Date(),
  learningEnabled = false,
  learningConfigured = false,
} = {}) {
  const policy = resolveLearningDisasterRecoveryPolicy(env);
  const restoreFresh = restoreDrillFresh(policy, nowDate);
  const gates = [
    buildGate(
      "learning_configured",
      !learningEnabled || learningConfigured,
      learningEnabled
        ? "Learning engine must be configured before backup status can be trusted."
        : "Learning is disabled; backup gates are not release-blocking."
    ),
    buildGate(
      "tenant_data_root",
      policy.tenantDataRootConfigured,
      "Tenant data root must be explicit for restore and DR procedures."
    ),
    buildGate(
      "backups_enabled",
      policy.backupsEnabled,
      "Learning backups must be enabled before paid-user rollout."
    ),
    buildGate(
      "backup_target",
      policy.backupTargetConfigured,
      "Learning backup target must be configured outside the application host."
    ),
    buildGate(
      "immutable_image_tag",
      policy.immutableImageTagConfigured,
      "Learning engine deployments must use immutable image tags."
    ),
    buildGate(
      "restore_drill_fresh",
      restoreFresh,
      "A restore drill must be completed within the configured drill window.",
      { lastRestoreDrillAt: policy.lastRestoreDrillAt }
    ),
  ];

  return {
    ready: gates.every((gate) => gate.ok),
    generatedAt: (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString(),
    policy,
    gates,
  };
}

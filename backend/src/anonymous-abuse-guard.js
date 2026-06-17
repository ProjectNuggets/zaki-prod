import crypto from "node:crypto";
import { getCloudflareAwareClientIp } from "./security-rate-limit.js";
import { getQuotaResetAtUtcIso } from "./daily-quota.js";

function normalizeUsedCount(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

export function buildAnonymousDeviceSignalHash(req, { secret = "", anonymousSessionId = "" } = {}) {
  void anonymousSessionId;
  const ip = getCloudflareAwareClientIp(req);
  const userAgent = String(req?.headers?.["user-agent"] || "").slice(0, 240);
  const material = [`ip=${ip}`, `ua=${userAgent}`].join("\n");
  const key = String(secret || "").trim();
  if (key) {
    return crypto.createHmac("sha256", key).update(material).digest("hex");
  }
  return crypto.createHash("sha256").update(material).digest("hex");
}

export async function readAnonymousDeviceUsage({
  dbGet,
  deviceSignalHash,
  bucket,
  nowDate = new Date(),
}) {
  const nowIso = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
  const row = await dbGet(
    `
      SELECT used_count
      FROM zaki_anonymous_device_usage
      WHERE device_signal_hash = $1
        AND usage_date = (($3::timestamptz AT TIME ZONE 'UTC')::date)
        AND bucket = $2
      LIMIT 1
    `,
    [deviceSignalHash, bucket, nowIso]
  );
  return normalizeUsedCount(row?.used_count);
}

export async function consumeAnonymousDeviceQuota({
  dbQuery,
  dbGet,
  deviceSignalHash,
  bucket,
  limit,
  nowDate = new Date(),
}) {
  const safeLimit = Math.max(1, Math.floor(Number(limit || 1)));
  const nowIso = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
  const resetAt = getQuotaResetAtUtcIso(nowDate);
  const insertResult = await dbQuery(
    `
      INSERT INTO zaki_anonymous_device_usage (device_signal_hash, usage_date, bucket, used_count, updated_at)
      VALUES ($1, (($4::timestamptz AT TIME ZONE 'UTC')::date), $2, 1, NOW())
      ON CONFLICT (device_signal_hash, usage_date, bucket)
      DO UPDATE
      SET used_count = zaki_anonymous_device_usage.used_count + 1,
          updated_at = NOW()
      WHERE zaki_anonymous_device_usage.used_count < $3
      RETURNING used_count
    `,
    [deviceSignalHash, bucket, safeLimit, nowIso]
  );
  const row = insertResult?.rows?.[0];
  if (row) {
    const used = normalizeUsedCount(row.used_count);
    return {
      allowed: true,
      limit: safeLimit,
      used,
      remaining: Math.max(0, safeLimit - used),
      resetAt,
      period: "day",
    };
  }
  const currentUsed = await readAnonymousDeviceUsage({
    dbGet,
    deviceSignalHash,
    bucket,
    nowDate,
  });
  return {
    allowed: false,
    limit: safeLimit,
    used: currentUsed,
    remaining: 0,
    resetAt,
    period: "day",
  };
}

export async function cleanupAnonymousDeviceUsage({ dbQuery, retentionDays = 14 } = {}) {
  const safeRetentionDays = Math.max(1, Math.floor(Number(retentionDays || 14)));
  await dbQuery(
    `
      DELETE FROM zaki_anonymous_device_usage
      WHERE usage_date < ((NOW() AT TIME ZONE 'UTC')::date - $1::int)
    `,
    [safeRetentionDays]
  );
}

import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const DEFAULT_MESSAGE = {
  success: false,
  error: "rate_limited",
  message: "Too many requests. Please retry shortly.",
};

function firstHeaderValue(value) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "");
}

function normalizeIp(value) {
  const raw = firstHeaderValue(value).trim();
  if (!raw) return "";
  return raw.split(",")[0].trim().replace(/^\[|\]$/g, "");
}

export function getCloudflareAwareClientIp(req) {
  return (
    normalizeIp(req?.headers?.["cf-connecting-ip"]) ||
    normalizeIp(req?.headers?.["true-client-ip"]) ||
    normalizeIp(req?.headers?.["x-forwarded-for"]) ||
    normalizeIp(req?.ip) ||
    "unknown"
  );
}

export class DbRateLimitStore {
  constructor({ dbQuery, windowMs }) {
    if (typeof dbQuery !== "function") {
      throw new Error("DbRateLimitStore requires dbQuery.");
    }
    this.dbQuery = dbQuery;
    this.windowMs = Math.max(1, Math.floor(Number(windowMs || 60_000)));
  }

  async increment(key) {
    const result = await this.dbQuery(
      `
        INSERT INTO zaki_rate_limit_hits (rate_key, total_hits, reset_at, updated_at)
        VALUES ($1, 1, NOW() + ($2::int * INTERVAL '1 millisecond'), NOW())
        ON CONFLICT (rate_key)
        DO UPDATE
        SET total_hits = CASE
              WHEN zaki_rate_limit_hits.reset_at <= NOW() THEN 1
              ELSE zaki_rate_limit_hits.total_hits + 1
            END,
            reset_at = CASE
              WHEN zaki_rate_limit_hits.reset_at <= NOW()
                THEN NOW() + ($2::int * INTERVAL '1 millisecond')
              ELSE zaki_rate_limit_hits.reset_at
            END,
            updated_at = NOW()
        RETURNING total_hits, reset_at
      `,
      [key, this.windowMs]
    );
    const row = result?.rows?.[0] || {};
    return {
      totalHits: Math.max(1, Number(row.total_hits || 1)),
      resetTime: row.reset_at ? new Date(row.reset_at) : new Date(Date.now() + this.windowMs),
    };
  }

  async decrement(key) {
    await this.dbQuery(
      `
        UPDATE zaki_rate_limit_hits
        SET total_hits = GREATEST(total_hits - 1, 0),
            updated_at = NOW()
        WHERE rate_key = $1
          AND reset_at > NOW()
      `,
      [key]
    );
  }

  async resetKey(key) {
    await this.dbQuery("DELETE FROM zaki_rate_limit_hits WHERE rate_key = $1", [key]);
  }
}

export async function cleanupExpiredRateLimitHits({ dbQuery, retentionHours = 24 } = {}) {
  const safeRetentionHours = Math.max(1, Math.floor(Number(retentionHours || 24)));
  await dbQuery(
    `
      DELETE FROM zaki_rate_limit_hits
      WHERE reset_at < NOW() - ($1::int * INTERVAL '1 hour')
    `,
    [safeRetentionHours]
  );
}

export function createPersistentRateLimit({
  dbQuery,
  prefix,
  windowMs,
  limit,
  message = DEFAULT_MESSAGE,
} = {}) {
  const normalizedPrefix = String(prefix || "route").trim() || "route";
  const safeWindowMs = Math.max(1, Math.floor(Number(windowMs || 60_000)));
  const safeLimit = Math.max(1, Math.floor(Number(limit || 60)));
  return rateLimit({
    windowMs: safeWindowMs,
    limit: safeLimit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store: new DbRateLimitStore({ dbQuery, windowMs: safeWindowMs }),
    keyGenerator: (req) => {
      const ip = getCloudflareAwareClientIp(req);
      return `${normalizedPrefix}:${ip.includes(":") ? ipKeyGenerator(ip, 64) : ip}`;
    },
    handler: (_req, res) => {
      res.status(429).json(message);
    },
    validate: {
      trustProxy: false,
      xForwardedForHeader: false,
      forwardedHeader: false,
    },
  });
}

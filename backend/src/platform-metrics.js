// platform-metrics.js — read-only DAU/MAU/usage analytics derived from data ZAKI already captures.
//
// No new instrumentation is required to answer "do we have DAU?". Active users are derived from the union
// of metered activity — zaki_meter_holds.reserved_at (every metered action, incl. free tier, reserves
// units), zaki_meter_grants.created_at (display-ledger spokes: agent/learn/design/anon), and
// zaki_usage_events.created_at — and cross-checked against session activity (zaki_sessions.last_used_at).
// Signups come from zaki_users.created_at. Every row is timestamped, so this backfills full history.
//
// The audit's caveat is handled by reporting BOTH meter-derived and session-derived active users so a
// reader can spot undercounting (e.g. a hypothetical free/unmetered cohort). All queries are read-only.

const INT = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Union of per-action activity rows across the three event sources. `range` is a literal SQL interval
// expression built ONLY from a validated integer (never user input) to keep this parameter-free + safe.
function activityUnion(range) {
  return `
    SELECT user_id, reserved_at AS at, product_id FROM zaki_meter_holds
      WHERE user_id IS NOT NULL AND reserved_at >= NOW() - ${range}
    UNION ALL
    SELECT user_id, created_at AS at, product_id FROM zaki_meter_grants
      WHERE user_id IS NOT NULL AND created_at >= NOW() - ${range}
    UNION ALL
    SELECT user_id, created_at AS at, product_id FROM zaki_usage_events
      WHERE created_at >= NOW() - ${range}
  `;
}

/**
 * Compute platform usage metrics.
 * @param {(text: string, params?: any[]) => Promise<any[]>} dbAll - returns result rows
 * @param {{ windowDays?: number }} opts
 */
export async function getUsageMetrics(dbAll, { windowDays = 30 } = {}) {
  if (typeof dbAll !== "function") {
    throw new Error("getUsageMetrics requires a dbAll(text, params) function");
  }
  const days = clampInt(windowDays, 1, 90, 30);
  const seriesRange = `(${days}::int * INTERVAL '1 day')`;

  const [activeRows, sessionRows, seriesRows, perProductRows, signupRows, signupSeriesRows, totalsRows] =
    await Promise.all([
      // Active users (meter-derived) over fixed 1d / 7d / 30d windows.
      dbAll(`
        WITH activity AS (${activityUnion("INTERVAL '30 days'")})
        SELECT
          COUNT(DISTINCT user_id) FILTER (WHERE at >= NOW() - INTERVAL '1 day')  AS dau,
          COUNT(DISTINCT user_id) FILTER (WHERE at >= NOW() - INTERVAL '7 days')  AS wau,
          COUNT(DISTINCT user_id)                                                AS mau
        FROM activity
      `),
      // Active users (session-derived) — cross-check, independent of billing.
      dbAll(`
        SELECT
          COUNT(DISTINCT user_id) FILTER (WHERE last_used_at >= NOW() - INTERVAL '1 day')  AS dau,
          COUNT(DISTINCT user_id) FILTER (WHERE last_used_at >= NOW() - INTERVAL '7 days')  AS wau,
          COUNT(DISTINCT user_id) FILTER (WHERE last_used_at >= NOW() - INTERVAL '30 days') AS mau
        FROM zaki_sessions
        WHERE revoked_at IS NULL
      `),
      // Daily active-user series over the requested window.
      dbAll(`
        WITH activity AS (${activityUnion(seriesRange)})
        SELECT date_trunc('day', at)::date AS day, COUNT(DISTINCT user_id) AS active_users
        FROM activity GROUP BY 1 ORDER BY 1
      `),
      // Per-product usage over the requested window (which spoke is used, by how many).
      dbAll(`
        WITH activity AS (${activityUnion(seriesRange)})
        SELECT product_id,
               COUNT(DISTINCT user_id) AS users,
               COUNT(*)                AS actions
        FROM activity GROUP BY product_id ORDER BY users DESC, actions DESC
      `),
      // Signup totals.
      dbAll(`
        SELECT
          COUNT(*)                                                          AS total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')    AS new_1d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')   AS new_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')  AS new_30d
        FROM zaki_users
      `),
      // Daily signup series over the requested window.
      dbAll(`
        SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS signups
        FROM zaki_users WHERE created_at >= NOW() - ${seriesRange} GROUP BY 1 ORDER BY 1
      `),
      // User + plan totals.
      dbAll(`
        SELECT
          COUNT(*)                                              AS total_users,
          COUNT(*) FILTER (WHERE plan_status = 'active')        AS active_plan_users,
          COUNT(*) FILTER (WHERE COALESCE(plan_tier,'free') <> 'free') AS paid_tier_users
        FROM zaki_users
      `),
    ]);

  const active = activeRows[0] || {};
  const session = sessionRows[0] || {};
  const signups = signupRows[0] || {};
  const totals = totalsRows[0] || {};

  return {
    generatedAt: new Date().toISOString(),
    windowDays: days,
    activeUsers: { dau: INT(active.dau), wau: INT(active.wau), mau: INT(active.mau), source: "meter+usage events" },
    sessionActiveUsers: { dau: INT(session.dau), wau: INT(session.wau), mau: INT(session.mau), source: "zaki_sessions.last_used_at" },
    dauSeries: seriesRows.map((r) => ({ day: r.day, activeUsers: INT(r.active_users) })),
    perProduct: perProductRows.map((r) => ({ productId: r.product_id, users: INT(r.users), actions: INT(r.actions) })),
    signups: {
      total: INT(signups.total),
      new1d: INT(signups.new_1d),
      new7d: INT(signups.new_7d),
      new30d: INT(signups.new_30d),
      series: signupSeriesRows.map((r) => ({ day: r.day, signups: INT(r.signups) })),
    },
    totals: {
      totalUsers: INT(totals.total_users),
      activePlanUsers: INT(totals.active_plan_users),
      paidTierUsers: INT(totals.paid_tier_users),
    },
  };
}

export const __test__ = { clampInt, activityUnion };

#!/usr/bin/env node

import crypto from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const ZAKI_BOT_SPACE_ID = "zaki-bot";
const CANONICAL_RE = /^agent:zaki-bot:user:([^:]+):(thread|task|cron):(.+)$/;
const LEGACY_MAIN_RE = /^agent:zaki-bot:user:([^:]+):main$/;

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const key = String(rawKey || "").trim();
    const value = rest.length === 0 ? "true" : rest.join("=");
    if (key) options[key] = value;
  }
  return options;
}

function normalizeSessionKey(sessionKey) {
  const raw = String(sessionKey || "").trim();
  const legacy = raw.match(LEGACY_MAIN_RE);
  if (legacy?.[1]) return `agent:zaki-bot:user:${legacy[1]}:thread:main`;
  return raw;
}

function buildSessionKey(userId, threadId) {
  return `agent:zaki-bot:user:${String(userId).trim()}:thread:${String(threadId).trim()}`;
}

function parseSessionKey(sessionKey) {
  const normalized = normalizeSessionKey(sessionKey);
  const match = normalized.match(CANONICAL_RE);
  if (!match) return { normalized, userId: null, lane: "unknown", threadId: null };
  return {
    normalized,
    userId: match[1] || null,
    lane: match[2] || "unknown",
    threadId: match[2] === "thread" ? match[3] || null : null,
  };
}

function normalizeBaseUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/g, "");
  if (!raw) return "";
  return raw;
}

async function fetchCanonicalSessionKeys({ baseUrl, internalToken, userId }) {
  const response = await fetch(`${baseUrl}/api/v1/users/${encodeURIComponent(userId)}/sessions`, {
    method: "GET",
    headers: {
      "X-Internal-Token": internalToken,
      "X-Zaki-User-Id": String(userId),
      "X-Request-Id": `cleanup-agent-projections-${crypto.randomUUID()}`,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      String(data?.error || data?.message || "").trim() || `nullalis_${response.status}`,
    );
  }
  const sessions = Array.isArray(data?.sessions)
    ? data.sessions
    : Array.isArray(data)
      ? data
      : [];
  return new Set(
    sessions
      .map((session) => normalizeSessionKey(session?.session_key))
      .filter((key) => parseSessionKey(key).lane === "thread"),
  );
}

async function loadLocalProjectionRows(pool, { userId = null, email = null, limit = 500 }) {
  const params = [ZAKI_BOT_SPACE_ID, limit];
  let userFilter = "";
  if (userId) {
    params.push(String(userId));
    userFilter = `AND local_rows.user_id = $${params.length}`;
  }
  if (email) {
    params.push(String(email).toLowerCase());
    userFilter += ` AND LOWER(users.email) = $${params.length}`;
  }

  const result = await pool.query(
    `
    WITH local_rows AS (
      SELECT
        user_id,
        space_id,
        thread_id,
        title,
        last_active_at AS last_active,
        TRUE AS has_thread,
        0::bigint AS message_count
      FROM zaki_bot_threads
      WHERE space_id = $1
      UNION ALL
      SELECT
        user_id,
        space_id,
        thread_id,
        NULL::text AS title,
        MAX(created_at) AS last_active,
        FALSE AS has_thread,
        COUNT(*)::bigint AS message_count
      FROM zaki_bot_messages
      WHERE space_id = $1
      GROUP BY user_id, space_id, thread_id
    )
    SELECT
      local_rows.user_id,
      users.email,
      local_rows.thread_id,
      MAX(local_rows.title) FILTER (WHERE local_rows.title IS NOT NULL) AS title,
      MAX(local_rows.last_active) AS last_active,
      BOOL_OR(local_rows.has_thread) AS has_thread,
      SUM(local_rows.message_count)::bigint AS message_count
    FROM local_rows
    JOIN zaki_users users ON users.id = local_rows.user_id
    WHERE TRUE
      ${userFilter}
    GROUP BY local_rows.user_id, users.email, local_rows.thread_id
    ORDER BY MAX(local_rows.last_active) DESC NULLS LAST
    LIMIT $2
    `,
    params,
  );
  return result.rows;
}

async function deleteLocalProjection(pool, rows) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let messagesDeleted = 0;
    let threadsDeleted = 0;
    for (const row of rows) {
      const messages = await client.query(
        `DELETE FROM zaki_bot_messages
         WHERE user_id = $1 AND space_id = $2 AND thread_id = $3`,
        [row.user_id, ZAKI_BOT_SPACE_ID, row.thread_id],
      );
      const threads = await client.query(
        `DELETE FROM zaki_bot_threads
         WHERE user_id = $1 AND space_id = $2 AND thread_id = $3`,
        [row.user_id, ZAKI_BOT_SPACE_ID, row.thread_id],
      );
      messagesDeleted += Number(messages.rowCount || 0);
      threadsDeleted += Number(threads.rowCount || 0);
    }
    await client.query("COMMIT");
    return { messagesDeleted, threadsDeleted };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || options.h) {
    console.log("Dry-run stale ZAKI Agent local projection cleanup.");
    console.log("");
    console.log("Usage:");
    console.log("  npm --prefix backend run agent:sessions:cleanup-projections -- --limit=500");
    console.log("  npm --prefix backend run agent:sessions:cleanup-projections -- --user-id=42 --apply");
    console.log("");
    console.log("Options:");
    console.log("  --apply          Hard-delete reported local-only projection rows");
    console.log("  --user-id=<id>   Restrict to one ZAKI user id");
    console.log("  --email=<email>  Restrict to one ZAKI user email");
    console.log("  --limit=<n>      Max local projections to inspect; default 500");
    process.exit(0);
  }

  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  const baseUrl = normalizeBaseUrl(process.env.NULLALIS_BASE_URL || process.env.NULLCLAW_BASE_URL);
  const internalToken = String(
    process.env.NULLALIS_INTERNAL_TOKEN || process.env.NULLCLAW_INTERNAL_TOKEN || "",
  ).trim();

  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  if (!baseUrl) throw new Error("NULLALIS_BASE_URL/NULLCLAW_BASE_URL is not set.");
  if (!internalToken) throw new Error("NULLALIS_INTERNAL_TOKEN/NULLCLAW_INTERNAL_TOKEN is not set.");

  const pool = new Pool({ connectionString: databaseUrl });
  const apply = options.apply === "true";
  const rows = await loadLocalProjectionRows(pool, {
    userId: options["user-id"] || null,
    email: options.email || null,
    limit: Math.max(1, Math.min(10_000, Number(options.limit || 500))),
  });

  const canonicalByUser = new Map();
  const staleRows = [];
  const errors = [];

  for (const row of rows) {
    const userId = String(row.user_id);
    if (!canonicalByUser.has(userId)) {
      try {
        canonicalByUser.set(userId, await fetchCanonicalSessionKeys({ baseUrl, internalToken, userId }));
      } catch (error) {
        errors.push({ userId, email: row.email, error: error?.message || "session_list_failed" });
        canonicalByUser.set(userId, null);
      }
    }
    const canonical = canonicalByUser.get(userId);
    if (!canonical) continue;
    const sessionKey = buildSessionKey(userId, row.thread_id);
    if (!canonical.has(sessionKey)) {
      staleRows.push({
        user_id: userId,
        email: row.email,
        thread_id: row.thread_id,
        session_key: sessionKey,
        title: row.title,
        last_active: row.last_active,
        has_thread: row.has_thread,
        message_count: Number(row.message_count || 0),
      });
    }
  }

  let deleteResult = null;
  if (apply && staleRows.length > 0) {
    deleteResult = await deleteLocalProjection(pool, staleRows);
  }

  await pool.end();

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry_run",
        inspected: rows.length,
        stale_count: staleRows.length,
        stale_rows: staleRows,
        nullalis_errors: errors,
        deleted: deleteResult,
      },
      null,
      2,
    ),
  );

  if (errors.length > 0 && apply) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});

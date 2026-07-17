import { createHash, timingSafeEqual } from "node:crypto";
import express from "express";

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function buildDesignInternalReadRouter({ callbackToken, source }) {
  const expectedToken = requiredToken(callbackToken);
  if (!source || ["index", "item", "search"].some((name) => typeof source[name] !== "function")) {
    throw new Error("Design internal read source is invalid.");
  }
  const router = express.Router();
  router.use((req, res, next) => {
    const auth = String(req.get("authorization") || "");
    const actual = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!tokensEqual(actual, expectedToken)) {
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid Design controller credential." } });
    }
    next();
  });

  router.get("/users/:userId/index", async (req, res) => {
    const userId = numericUserId(req.params.userId);
    const since = normalizedSince(req.query.since);
    const limit = normalizedLimit(req.query.limit, 200, 50);
    if (!userId || since === null || limit === null) return invalidRequest(res);
    try {
      const result = await source.index({
        userId,
        since,
        limit,
        requestId: requestId(req),
      });
      if (!result) return notFound(res, "USER_NOT_FOUND", "Design user scope was not found.");
      return res.json(result);
    } catch {
      return unavailable(res);
    }
  });

  router.get("/users/:userId/item/:itemId", async (req, res) => {
    const userId = numericUserId(req.params.userId);
    const itemId = req.params.itemId;
    if (!userId || !OPAQUE_ID.test(itemId)) return notFound(res, "ITEM_NOT_FOUND", "Design item was not found.");
    try {
      const result = await source.item({ userId, itemId, requestId: requestId(req) });
      if (!result) return notFound(res, "ITEM_NOT_FOUND", "Design item was not found.");
      if (Buffer.byteLength(result.item?.content || "", "utf8") > 256 * 1024) {
        return res.status(413).json({ error: { code: "ITEM_TOO_LARGE", message: "Design item exceeds the read cap." } });
      }
      return res.json(result);
    } catch {
      return unavailable(res);
    }
  });

  router.get("/users/:userId/search", async (req, res) => {
    const userId = numericUserId(req.params.userId);
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = normalizedLimit(req.query.limit, 50, 20);
    if (!userId || !query || query.length > 512 || limit === null) return invalidRequest(res);
    try {
      const result = await source.search({
        userId,
        query,
        limit,
        requestId: requestId(req),
      });
      if (!result) return notFound(res, "USER_NOT_FOUND", "Design user scope was not found.");
      return res.json(result);
    } catch {
      return unavailable(res);
    }
  });

  return router;
}

export function createDesignInternalReadSource({ dbQuery }) {
  return {
    async index({ userId, since, limit }) {
      const result = await dbQuery(
        `
          SELECT u.id AS user_exists, p.project_id, p.name, p.status,
                 p.metadata_json, p.updated_at
            FROM zaki_users u
            LEFT JOIN zaki_design_projects p
              ON p.owner_user_id = u.id
             AND p.status <> 'deleted'
             AND ($2::timestamptz IS NULL OR p.updated_at > $2::timestamptz)
           WHERE u.id = $1
           ORDER BY p.updated_at DESC NULLS LAST
           LIMIT $3
        `,
        [Number(userId), since || null, limit + 1]
      );
      return indexRows(result.rows, limit);
    },
    async item({ userId, itemId }) {
      const result = await dbQuery(
        `
          SELECT project_id, name, status, metadata_json, created_at, updated_at
            FROM zaki_design_projects
           WHERE owner_user_id = $1
             AND project_id = $2
             AND status <> 'deleted'
           LIMIT 1
        `,
        [Number(userId), itemId]
      );
      const row = result.rows[0];
      if (!row) return null;
      const item = projectIndexItem(row);
      return {
        item: {
          ...item,
          content: JSON.stringify({
            id: row.project_id,
            name: row.name,
            status: row.status,
            metadata: safeMetadata(row.metadata_json),
            created_at: toIso(row.created_at),
            updated_at: toIso(row.updated_at),
          }),
          content_type: "application/json",
        },
        truncated: false,
      };
    },
    async search({ userId, query, limit }) {
      const result = await dbQuery(
        `
          SELECT u.id AS user_exists, p.project_id, p.name, p.status,
                 p.metadata_json, p.updated_at
            FROM zaki_users u
            LEFT JOIN zaki_design_projects p
              ON p.owner_user_id = u.id
             AND p.status <> 'deleted'
             AND p.name ILIKE $2 ESCAPE '\\'
           WHERE u.id = $1
           ORDER BY p.updated_at DESC NULLS LAST
           LIMIT $3
        `,
        [Number(userId), `%${escapeLike(query)}%`, limit + 1]
      );
      return indexRows(result.rows, limit);
    },
  };
}

function indexRows(rows, limit) {
  if (!rows[0]) return null;
  const projects = rows.filter((row) => row.project_id).slice(0, limit);
  return {
    items: projects.map(projectIndexItem),
    truncated: rows.filter((row) => row.project_id).length > limit,
  };
}

function projectIndexItem(row) {
  return {
    id: String(row.project_id),
    kind: "project",
    title: String(row.name || "Untitled design workspace").slice(0, 512),
    updated_at: toIso(row.updated_at),
  };
}

function safeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid Design timestamp");
  return date.toISOString();
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, (match) => `\\${match}`);
}

function normalizedSince(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value ? value : null;
}

function normalizedLimit(value, maximum, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? Math.min(maximum, parsed) : null;
}

function numericUserId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? String(parsed) : null;
}

function requestId(req) {
  const value = String(req.get("x-request-id") || "");
  return OPAQUE_ID.test(value) ? value : null;
}

function requiredToken(value) {
  const token = String(value || "").trim();
  if (token.length < 16 || token.length > 4096) throw new Error("Design callback token is invalid.");
  return token;
}

function tokensEqual(left, right) {
  if (!left || !right) return false;
  const leftDigest = createHash("sha256").update(left).digest();
  const rightDigest = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function invalidRequest(res) {
  return res.status(400).json({ error: { code: "INVALID_REQUEST", message: "Invalid Design read request." } });
}

function notFound(res, code, message) {
  return res.status(404).json({ error: { code, message } });
}

function unavailable(res) {
  return res.status(503).json({ error: { code: "DESIGN_READ_UNAVAILABLE", message: "Design read source is unavailable." } });
}

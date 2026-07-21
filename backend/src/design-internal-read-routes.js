import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import express from "express";

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const CURSOR_TOKEN = /^[A-Za-z0-9_-]{1,1024}$/;

export class BadCursorError extends Error {
  constructor() {
    super("Design read cursor is invalid.");
    this.name = "BadCursorError";
  }
}

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
    const cursor = normalizedCursor(req.query.cursor);
    if (!userId || since === null || limit === null || cursor === null) return invalidRequest(res);
    try {
      const result = await source.index({
        userId,
        since,
        limit,
        requestId: requestId(req),
        ...(cursor === undefined ? {} : { cursor }),
      });
      // Non-enumeration: an unknown user and a known user with no projects are the
      // same 200 empty page — index never confirms whether a user id exists.
      return res.json(result || emptyPage());
    } catch (error) {
      if (error instanceof BadCursorError) return badCursor(res);
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
    const cursor = normalizedCursor(req.query.cursor);
    if (!userId || !query || query.length > 512 || limit === null || cursor === null) return invalidRequest(res);
    try {
      const result = await source.search({
        userId,
        query,
        limit,
        requestId: requestId(req),
        ...(cursor === undefined ? {} : { cursor }),
      });
      // Same non-enumeration guarantee as index (see above).
      return res.json(result || emptyPage());
    } catch (error) {
      if (error instanceof BadCursorError) return badCursor(res);
      return unavailable(res);
    }
  });

  return router;
}

export function createDesignInternalReadSource({ dbQuery, cursorSecret }) {
  const secret = requiredToken(cursorSecret);
  return {
    async index({ userId, since, limit, cursor }) {
      // No LEFT JOIN on zaki_users: an unknown user and a known user with no
      // projects both return zero rows -> the same empty page (non-enumeration).
      const controls = { since: since ?? null };
      const offset = cursor ? decodeCursor(cursor, { route: "index", userId, controls, secret }).offset : 0;
      const result = await dbQuery(
        `
          SELECT project_id, name, status, metadata_json, updated_at
            FROM zaki_design_projects
           WHERE owner_user_id = $1
             AND status <> 'deleted'
             AND ($2::timestamptz IS NULL OR updated_at > $2::timestamptz)
           ORDER BY updated_at DESC, project_id DESC
           LIMIT $3 OFFSET $4
        `,
        [Number(userId), since || null, limit + 1, offset]
      );
      return pageFrom(result.rows, limit, { route: "index", userId, offset, controls, secret });
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
    async search({ userId, query, limit, cursor }) {
      const controls = { q: query };
      const offset = cursor ? decodeCursor(cursor, { route: "search", userId, controls, secret }).offset : 0;
      const result = await dbQuery(
        `
          SELECT project_id, name, status, metadata_json, updated_at
            FROM zaki_design_projects
           WHERE owner_user_id = $1
             AND status <> 'deleted'
             AND name ILIKE $2 ESCAPE '\\'
           ORDER BY updated_at DESC, project_id DESC
           LIMIT $3 OFFSET $4
        `,
        [Number(userId), `%${escapeLike(query)}%`, limit + 1, offset]
      );
      return pageFrom(result.rows, limit, { route: "search", userId, offset, controls, secret });
    },
  };
}

function pageFrom(rows, limit, { route, userId, offset, controls, secret }) {
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(projectIndexItem);
  const page = { items, truncated: hasMore };
  if (hasMore) {
    // ponytail: offset cursor, not keyset — Design projects are a small single-user
    // list, and offset avoids the timestamptz micros-vs-millis skip that keyset on
    // updated_at hits. No snapshot binding (unlike Minutes) because there is no
    // evaluation snapshot to pin; page drift under concurrent mutation is acceptable
    // here. Move to keyset if a user's project count ever makes offset paging costly.
    page.next_cursor = encodeCursor({ route, userId, offset: offset + items.length, controls, secret });
  }
  return page;
}

function emptyPage() {
  return { items: [], truncated: false };
}

function controlsDigest(controls) {
  const canonical = JSON.stringify(
    Object.fromEntries(Object.entries(controls).sort(([a], [b]) => a.localeCompare(b)))
  );
  return createHash("sha256").update(canonical).digest("hex");
}

function encodeCursor({ route, userId, offset, controls, secret }) {
  const payload = Buffer.from(
    JSON.stringify({ v: 1, route, user: userId, offset, controls: controlsDigest(controls) }),
    "utf8"
  );
  const signature = createHmac("sha256", secret).update(payload).digest();
  return Buffer.concat([payload, signature]).toString("base64url");
}

function decodeCursor(value, { route, userId, controls, secret }) {
  let raw;
  try {
    raw = Buffer.from(value, "base64url");
  } catch {
    throw new BadCursorError();
  }
  if (raw.length <= 32) throw new BadCursorError();
  const payload = raw.subarray(0, raw.length - 32);
  const signature = raw.subarray(raw.length - 32);
  const expected = createHmac("sha256", secret).update(payload).digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
    throw new BadCursorError();
  }
  let decoded;
  try {
    decoded = JSON.parse(payload.toString("utf8"));
  } catch {
    throw new BadCursorError();
  }
  if (
    !decoded ||
    decoded.v !== 1 ||
    decoded.route !== route ||
    decoded.user !== userId ||
    // A cursor is only valid against the same filter it was minted from — a client
    // cannot resume an index paged by since=X into a since=Y (or search q=A into q=B) set.
    decoded.controls !== controlsDigest(controls) ||
    !Number.isSafeInteger(decoded.offset) ||
    decoded.offset < 0
  ) {
    throw new BadCursorError();
  }
  return { offset: decoded.offset };
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

function normalizedCursor(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !CURSOR_TOKEN.test(value)) return null;
  return value;
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

// Distinct from INVALID_REQUEST so the controller can tell a bad paging cursor (a
// stale/tampered token to reject) apart from any other 400 (a controller<->hub
// contract mismatch, which must not masquerade as "cursor is invalid").
function badCursor(res) {
  return res.status(400).json({ error: { code: "BAD_CURSOR", message: "Design read cursor is invalid." } });
}

function notFound(res, code, message) {
  return res.status(404).json({ error: { code, message } });
}

function unavailable(res) {
  return res.status(503).json({ error: { code: "DESIGN_READ_UNAVAILABLE", message: "Design read source is unavailable." } });
}

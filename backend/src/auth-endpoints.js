// ZAKI auth HTTP endpoints — Phase 1 (OATH-03, OATH-07, OATH-08, OATH-11)
// Mounts as: app.use("/api/auth", buildAuthRouter())

import express from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";

import { dbGet, dbQuery } from "./db.js";
import { rotateRefreshToken, signAccessTokenForUser } from "./zaki-auth.js";
import { COOKIE_NAME, buildRefreshCookie, buildClearedRefreshCookie } from "./zaki-session-cookie.js";

/** Manual cookie parser — no cookie-parser dependency (locked decision). */
export function parseRefreshCookie(req) {
  const header = req && req.headers && req.headers.cookie;
  if (!header) return null;
  const parts = String(header).split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const name = trimmed.slice(0, eqIdx).trim();
    if (name === COOKIE_NAME) {
      return trimmed.slice(eqIdx + 1).trim();
    }
  }
  return null;
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * AUTH-06 concurrent refresh guard.
 * If primary lookup misses OR rotateRefreshToken throws SESSION_NOT_FOUND,
 * check whether THIS user had a session rotated in the last 5 seconds (i.e. a sibling
 * tab already completed the rotate). If so, mint a new access token for that user
 * and return it — no new session row inserted (the sibling already inserted one).
 * Returns { accessToken, userId } on hit, null on miss.
 */
async function tryConcurrentRefreshGuard(tokenHash) {
  // Inner subquery intentionally omits revoked_at IS NULL: the winning tab already
  // revoked the original token hash, so we must still be able to resolve user_id from it.
  const recent = await dbGet(
    `SELECT s.id, s.user_id, u.email
       FROM zaki_sessions s
       JOIN zaki_users u ON u.id = s.user_id
       WHERE s.user_id = (SELECT user_id FROM zaki_sessions WHERE refresh_token_hash = $1)
         AND s.created_at > NOW() - INTERVAL '5 seconds'
         AND s.revoked_at IS NULL
       ORDER BY s.created_at DESC
       LIMIT 1`,
    [tokenHash]
  );
  if (!recent) return null;
  const accessToken = await signAccessTokenForUser({ id: recent.user_id, email: recent.email });
  return { accessToken, userId: recent.user_id };
}

/** Express handler: POST /api/auth/refresh — rotate refresh token, return new access JWT. */
async function handleRefresh(req, res) {
  try {
    const rawToken = parseRefreshCookie(req);
    if (!rawToken) {
      res.status(401).json({ error: "no_refresh_token" });
      return;
    }
    const tokenHash = sha256Hex(rawToken);

    const session = await dbGet(
      `SELECT s.id, s.user_id, u.email
         FROM zaki_sessions s
         JOIN zaki_users u ON u.id = s.user_id
         WHERE s.refresh_token_hash = $1
           AND s.revoked_at IS NULL
           AND s.expires_at > NOW()`,
      [tokenHash]
    );

    if (!session) {
      // Primary lookup missed → check the concurrent refresh guard
      const guarded = await tryConcurrentRefreshGuard(tokenHash);
      if (guarded) {
        console.log(`[ZakiAudit] session_refresh userId=${guarded.userId} ip=${req?.ip ?? "unknown"} guard=primary_miss`);
        res.status(200).json({ token: guarded.accessToken });
        return;
      }
      res.status(401).json({ error: "invalid_refresh_token" });
      return;
    }

    const zakiUser = { id: session.user_id, email: session.email };
    let rotateResult;
    try {
      rotateResult = await rotateRefreshToken(tokenHash, zakiUser, req);
    } catch (rotateErr) {
      if (rotateErr && rotateErr.code === "SESSION_NOT_FOUND") {
        const guarded = await tryConcurrentRefreshGuard(tokenHash);
        if (guarded) {
          console.log(`[ZakiAudit] session_refresh userId=${guarded.userId} ip=${req?.ip ?? "unknown"} guard=rotate_race`);
          res.status(200).json({ token: guarded.accessToken });
          return;
        }
        res.status(401).json({ error: "invalid_refresh_token" });
        return;
      }
      throw rotateErr;
    }

    const { accessToken, refreshToken: newRefreshToken } = rotateResult;
    res.setHeader("Set-Cookie", [buildRefreshCookie(newRefreshToken)]);
    console.log(`[ZakiAudit] session_refresh userId=${session.user_id} ip=${req?.ip ?? "unknown"}`);
    res.status(200).json({ token: accessToken });
  } catch (err) {
    console.error("[ZakiAuth] /api/auth/refresh error:", err && err.message);
    res.status(500).json({ error: "server_error" });
  }
}

/** Express handler: POST /api/auth/logout — revoke session, clear cookie. Idempotent. */
async function handleLogout(req, res) {
  try {
    const rawToken = parseRefreshCookie(req);
    if (rawToken) {
      const tokenHash = sha256Hex(rawToken);
      // Look up user_id BEFORE revoke so we can log it. Single query, no race window for audit.
      const session = await dbGet(
        `SELECT user_id FROM zaki_sessions WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
        [tokenHash]
      );
      await dbQuery(
        `UPDATE zaki_sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
        [tokenHash]
      );
      if (session?.user_id) {
        console.log(`[ZakiAudit] session_revoke userId=${session.user_id} reason=logout ip=${req?.ip ?? "unknown"}`);
      }
    }
    res.setHeader("Set-Cookie", [buildClearedRefreshCookie()]);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[ZakiAuth] /api/auth/logout error:", err && err.message);
    res.status(500).json({ error: "server_error" });
  }
}

/** Build the rate limiter for POST /refresh — 60 requests / 15 min / IP (OATH-11). */
function buildRefreshLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too_many_refresh_requests" },
  });
}

/**
 * Build the express.Router for /api/auth — mounted via app.use("/api/auth", buildAuthRouter()) in index.js.
 * Returns a fresh router each call so test suites can reset rate-limit state by remounting.
 */
export function buildAuthRouter() {
  const router = express.Router();
  router.post("/refresh", buildRefreshLimiter(), handleRefresh);
  router.post("/logout", handleLogout);
  return router;
}

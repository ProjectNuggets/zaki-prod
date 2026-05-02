// ZAKI auth HTTP endpoints — Phase 1 (OATH-03, OATH-07, OATH-08, OATH-11)
// Mounts as: app.use("/api/auth", buildAuthRouter())

import express from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";

import { dbGet, dbQuery } from "./db.js";
import { rotateRefreshToken } from "./zaki-auth.js";
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
      res.status(401).json({ error: "invalid_refresh_token" });
      return;
    }

    const zakiUser = { id: session.user_id, email: session.email };
    const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(
      tokenHash,
      zakiUser,
      req
    );

    res.setHeader("Set-Cookie", [buildRefreshCookie(newRefreshToken)]);
    res.status(200).json({ token: accessToken });
  } catch (err) {
    if (err && err.code === "SESSION_NOT_FOUND") {
      res.status(401).json({ error: "invalid_refresh_token" });
      return;
    }
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
      await dbQuery(
        `UPDATE zaki_sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
        [tokenHash]
      );
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

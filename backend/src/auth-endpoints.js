// ZAKI auth HTTP endpoints — Phase 1 (OATH-03, OATH-07, OATH-08)
// Mounts as: app.use("/api/auth", buildAuthRouter())

import express from "express";
import crypto from "node:crypto";

import { dbGet, dbQuery } from "./db.js";
import {
  rotateRefreshToken,
  signAccessTokenForUser,
  verifyZakiAccessToken,
} from "./zaki-auth.js";
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

function parseBearerToken(req) {
  const header = String(req?.headers?.authorization || "");
  if (!/^Bearer\s+\S+$/i.test(header)) return null;
  return header.slice(header.indexOf(" ") + 1).trim();
}

function getCandidateSessionBinding(payload) {
  const sessionId = String(payload?.sid || "").trim();
  const userId = String(payload?.sub || "").trim();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      sessionId
    ) ||
    !/^[1-9][0-9]*$/.test(userId)
  ) {
    return null;
  }
  return { sessionId, userId };
}

/**
 * AUTH-06 concurrent refresh guard.
 * If primary lookup misses OR rotateRefreshToken throws SESSION_NOT_FOUND,
 * check whether the presented token's own session was rotated in the last 5 seconds
 * (i.e. a sibling tab already completed the rotate). The source row points to its
 * exact replacement, so a historical revoked token can never inherit an unrelated
 * newer session for the same user. If that replacement is still active, mint an
 * access token for it — no new session row is inserted.
 * Returns { accessToken, userId } on hit, null on miss.
 */
async function tryConcurrentRefreshGuard(tokenHash) {
  const recent = await dbGet(
    `SELECT replacement.id, replacement.user_id, u.email
       FROM zaki_sessions presented
       JOIN zaki_sessions replacement
         ON replacement.id = presented.replaced_by_session_id
        AND replacement.user_id = presented.user_id
       JOIN zaki_users u ON u.id = replacement.user_id
       WHERE presented.refresh_token_hash = $1
         AND presented.revoked_at > NOW() - INTERVAL '5 seconds'
         AND replacement.created_at > NOW() - INTERVAL '5 seconds'
         AND replacement.revoked_at IS NULL
         AND replacement.expires_at > NOW()
       LIMIT 1`,
    [tokenHash]
  );
  if (!recent) return null;
  const accessToken = await signAccessTokenForUser(
    { id: recent.user_id, email: recent.email },
    recent.id
  );
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

/**
 * Revoke one verified candidate session without reading or changing the shared
 * refresh cookie. This is intentionally separate from ordinary logout: a stale
 * reauthentication failure may arrive after a newer tab has replaced that
 * cookie, so a Set-Cookie clear here could revoke the wrong account.
 */
async function handleCandidateLogout(req, res) {
  try {
    const token = parseBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "candidate_auth_required" });
      return;
    }

    const binding = getCandidateSessionBinding(await verifyZakiAccessToken(token));
    if (!binding) {
      res.status(401).json({ error: "invalid_candidate_session" });
      return;
    }

    const result = await dbQuery(
      `UPDATE zaki_sessions
          SET revoked_at = NOW()
        WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [binding.sessionId, binding.userId]
    );
    const revoked = Boolean(result?.rowCount);
    if (revoked) {
      console.log(
        `[ZakiAudit] session_revoke userId=${binding.userId} reason=candidate_auth_failure ip=${req?.ip ?? "unknown"}`
      );
    }
    // Do not set a cookie here. The bearer binds the revocation to B while the
    // browser's HttpOnly cookie may already belong to a newer account C.
    res.status(200).json({ success: true, revoked });
  } catch (err) {
    console.error("[ZakiAuth] /api/auth/logout/candidate error:", err && err.message);
    res.status(500).json({ error: "server_error" });
  }
}

/**
 * Build the express.Router for /api/auth — mounted via app.use("/api/auth", buildAuthRouter()) in index.js.
 * Returns a fresh router each call so test suites can reset rate-limit state by remounting.
 */
export function buildAuthRouter() {
  const router = express.Router();
  router.post("/refresh", handleRefresh);
  router.post("/logout", handleLogout);
  router.post("/logout/candidate", handleCandidateLogout);
  return router;
}

// ZAKI session auth — Phase 1 (OATH-01..12)
// JWT mint/verify, refresh token rotation, session revocation.
// CONTRACT: this module never sends HTTP responses. Errors propagate to callers.

import crypto from "node:crypto";
import { SignJWT, jwtVerify, decodeJwt } from "jose";

import { dbQuery, dbGet, withDbTransaction } from "./db.js";

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;       // 15 minutes
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CLEANUP_AGE_INTERVAL = "7 days";
const MAX_ACTIVE_SESSIONS_PER_USER = 20; // Revoke oldest sessions beyond this cap
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Lazy load — DO NOT cache at module scope (tests set env after import). See Pitfall 1.
function getSigningKey() {
  const hex = process.env.ZAKI_JWT_SIGNING_KEY;
  if (!hex) {
    const err = new Error("[ZakiAuth] ZAKI_JWT_SIGNING_KEY not set");
    err.code = "SIGNING_KEY_MISSING";
    throw err;
  }
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    const err = new Error("[ZakiAuth] ZAKI_JWT_SIGNING_KEY must be a 64-character hex string (256 bits)");
    err.code = "SIGNING_KEY_INVALID";
    throw err;
  }
  return new Uint8Array(Buffer.from(hex, "hex"));
}

function getKid() {
  return process.env.ZAKI_JWT_KID || "v1";
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function signAccessToken(zakiUser, sessionId = null) {
  return new SignJWT({
    email: zakiUser.email,
    ...(sessionId ? { sid: String(sessionId) } : {}),
  })
    .setProtectedHeader({ alg: "HS256", kid: getKid() })
    .setIssuer("zaki")
    .setSubject(String(zakiUser.id))
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSigningKey());
}

/**
 * Mint a new ZAKI session: insert zaki_sessions row + sign access JWT.
 * @param {{id:number|string, email:string}} zakiUser
 * @param {{ip?:string, headers:object}} req
 * @returns {Promise<{accessToken:string, refreshToken:string, refreshTokenHash:string, sessionId:string}>}
 */
export async function mintZakiSession(zakiUser, req) {
  const sessionId = crypto.randomUUID();
  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenHash = sha256Hex(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await dbQuery(
    `INSERT INTO zaki_sessions
       (id, user_id, refresh_token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      sessionId,
      zakiUser.id,
      refreshTokenHash,
      expiresAt,
      req?.ip ?? null,
      req?.headers?.["user-agent"] ?? null,
    ]
  );

  // Session cap: revoke sessions beyond the MAX_ACTIVE_SESSIONS_PER_USER oldest active ones.
  // Keeps the DB clean and limits blast radius if a refresh token is stolen.
  await dbQuery(
    `UPDATE zaki_sessions
        SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
        AND id NOT IN (
          SELECT id FROM zaki_sessions
           WHERE user_id = $1 AND revoked_at IS NULL
           ORDER BY created_at DESC
           LIMIT $2
        )`,
    [zakiUser.id, MAX_ACTIVE_SESSIONS_PER_USER]
  );

  console.log(`[ZakiAudit] session_mint userId=${zakiUser.id} ip=${req?.ip ?? "unknown"}`);

  const accessToken = await signAccessToken(zakiUser, sessionId);
  return { accessToken, refreshToken, refreshTokenHash, sessionId };
}

/**
 * Verify a ZAKI access token via local HS256 (no network call).
 * @returns {Promise<object|null>} payload on success, null on any failure
 */
export async function verifyZakiAccessToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      issuer: "zaki",
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verifies a signed ZAKI access token and, for newly issued sid-bound tokens,
 * confirms that the exact refresh session remains active. This makes a
 * candidate-session revocation take effect immediately instead of leaving its
 * access token usable until the short JWT expiry.
 *
 * Tokens issued before the sid claim was introduced remain valid for their
 * existing 15-minute lifetime so a rolling deploy does not drop active users.
 */
export async function verifyActiveZakiAccessToken(token) {
  const payload = await verifyZakiAccessToken(token);
  if (!payload) return null;

  const sessionId = String(payload.sid || "").trim();
  if (!sessionId) return payload;

  const userId = String(payload.sub || "").trim();
  if (!SESSION_ID_PATTERN.test(sessionId) || !/^[1-9][0-9]*$/.test(userId)) {
    return null;
  }

  try {
    const session = await dbGet(
      `SELECT id FROM zaki_sessions WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
      [sessionId, userId]
    );
    return session ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Atomically rotate a refresh token: revoke old row, insert new row, sign new access JWT.
 * @param {string} oldHash sha256 hex of the presented refresh token
 * @param {{id:number|string, email:string}} zakiUser
 * @param {{ip?:string, headers:object}} req
 * @returns {Promise<{accessToken:string, refreshToken:string, refreshTokenHash:string, sessionId:string}>}
 * @throws {Error} with .code === "SESSION_NOT_FOUND" when no active session matches
 */
export async function rotateRefreshToken(oldHash, zakiUser, req) {
  return withDbTransaction(async (client) => {
    const oldSession = await client.query(
      `SELECT id, user_id, expires_at, revoked_at FROM zaki_sessions WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW() FOR UPDATE`,
      [oldHash]
    );
    if (!oldSession.rows[0]) {
      const err = new Error("session_not_found");
      err.code = "SESSION_NOT_FOUND";
      throw err;
    }

    await client.query(
      `UPDATE zaki_sessions SET revoked_at = NOW() WHERE id = $1`,
      [oldSession.rows[0].id]
    );

    const sessionId = crypto.randomUUID();
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshTokenHash = sha256Hex(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await client.query(
      `INSERT INTO zaki_sessions
         (id, user_id, refresh_token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        sessionId,
        zakiUser.id,
        refreshTokenHash,
        expiresAt,
        req?.ip ?? null,
        req?.headers?.["user-agent"] ?? null,
      ]
    );

    const accessToken = await signAccessToken(zakiUser, sessionId);
    return { accessToken, refreshToken, refreshTokenHash, sessionId };
  });
}

/**
 * Mark all active sessions for a user as revoked (password change, account deletion).
 */
export async function revokeAllSessionsForUser(userId) {
  await dbQuery(
    `UPDATE zaki_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

/**
 * Decode a JWT payload WITHOUT verifying signature.
 * Used as a discriminator in Phase 2 (iss === "zaki" -> local verify, else TYP fallback).
 * @returns {object|null} payload or null on parse error
 */
export function tryDecodeJwtPayload(token) {
  try {
    return decodeJwt(token);
  } catch {
    return null;
  }
}

/**
 * Delete sessions older than 7 days (expired or revoked).
 * Exported only — scheduling is Phase 2 (AUTH-11).
 */
export async function cleanupExpiredSessions() {
  await dbQuery(
    `DELETE FROM zaki_sessions WHERE expires_at < NOW() - INTERVAL '${CLEANUP_AGE_INTERVAL}' OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '${CLEANUP_AGE_INTERVAL}')`
  );
}

/**
 * Sign an access JWT for an existing session's user — used by the concurrent refresh guard
 * (AUTH-06) which has already proven session validity via the recent-rotation lookup.
 * Does NOT insert a new zaki_sessions row.
 */
export async function signAccessTokenForUser(zakiUser, sessionId = null) {
  return signAccessToken(zakiUser, sessionId);
}

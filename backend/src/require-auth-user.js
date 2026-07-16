// ZAKI dual-auth middleware — Phase 2 (AUTH-01..05)
// ZAKI tokens (iss==='zaki') verify locally via jose; legacy TYP tokens fall back to
// /system/refresh-user with a 5-second AbortController timeout. On legacy success
// we mint a ZAKI session and surface it to the client via X-Zaki-Session-Upgrade.
// CONTRACT: return shape { email, zakiUser, sessionUser } is identical to the legacy
// index.js requireAuthUser — zero route-handler changes.

import {
  verifyActiveZakiAccessToken as defaultVerifyActiveZakiAccessToken,
  tryDecodeJwtPayload as defaultTryDecodeJwtPayload,
  mintZakiSession as defaultMintZakiSession,
} from "./zaki-auth.js";
import { dbGet } from "./db.js";

const TYP_FALLBACK_TIMEOUT_MS = 5000; // AUTH-04
const ZAKI_USER_COLUMNS = "id, email, verified, plan_tier, plan_status, nova_user_id, current_period_end, full_name, billing_updated_at, meter_entitlement_started_at"; // AUTH-03 — password_hash deliberately excluded

function extractBearerToken(req) {
  const header = req?.headers?.authorization;
  if (!header || !/^Bearer\s+\S+/i.test(String(header))) return null;
  return String(header).slice(String(header).indexOf(" ") + 1).trim();
}

export function createRequireAuthUser(deps) {
  const {
    novaSessionRequest,
    normalizeEmail,
    resolveCanonicalAgentUserId,
    mapBotBffAuthFailure,
    getOrCreateRequestId,
    NULLCLAW_DEV_USER_ID,
    buildDevAuthResultFromUserId,
    zakiAuthOverrides = {},
  } = deps;

  const verifyActiveZakiAccessToken =
    zakiAuthOverrides.verifyActiveZakiAccessToken || defaultVerifyActiveZakiAccessToken;
  const tryDecodeJwtPayload = zakiAuthOverrides.tryDecodeJwtPayload || defaultTryDecodeJwtPayload;
  const mintZakiSession = zakiAuthOverrides.mintZakiSession || defaultMintZakiSession;

  // SUN-02: resolve cutoff once at factory-creation time for test overrideability.
  // Tests inject via zakiAuthOverrides.legacyTypCutoffMs; production reads env at startup.
  const legacyTypCutoffMs = (() => {
    if ("legacyTypCutoffMs" in zakiAuthOverrides) return zakiAuthOverrides.legacyTypCutoffMs;
    const val = process.env.ZAKI_LEGACY_TYP_AUTH_CUTOFF;
    if (!val) return null;
    const ms = new Date(val).getTime();
    return Number.isNaN(ms) ? null : ms;
  })();

  // ZAKI path: local verify + DB lookup by id (AUTH-01, AUTH-03)
  async function resolveZakiPath(token) {
    try {
      const payload = await verifyActiveZakiAccessToken(token);
      if (!payload || !payload.sub) return { error: "invalid_token" };
      const userId = Number.parseInt(String(payload.sub), 10);
      if (!Number.isInteger(userId) || userId <= 0) return { error: "invalid_token" };
      const zakiUser = await dbGet(
        `SELECT ${ZAKI_USER_COLUMNS} FROM zaki_users WHERE id = $1`,
        [userId]
      );
      if (!zakiUser || !zakiUser.verified) return { error: "user_not_found" };
      return { ok: true, email: zakiUser.email, zakiUser, sessionUser: null };
    } catch (err) {
      console.error("[ZakiAuth] resolveZakiPath error:", err?.message);
      return { error: "invalid_token" };
    }
  }

  // Legacy TYP path: 5s AbortController timeout, mint ZAKI session on success (AUTH-02, AUTH-04, AUTH-05)
  async function resolveLegacyPath(authHeader, req, res) {
    // SUN-02: cutoff check — runs BEFORE any network call
    if (legacyTypCutoffMs !== null && Date.now() >= legacyTypCutoffMs) {
      return { error: "session_expired" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TYP_FALLBACK_TIMEOUT_MS);
    try {
      const sessionResponse = await novaSessionRequest(
        "/system/refresh-user",
        authHeader,
        { method: "GET", signal: controller.signal }
      );
      if (!sessionResponse?.ok) return { error: "invalid_token" };
      const sessionData = await sessionResponse.json().catch(() => null);
      if (!sessionData) return { error: "invalid_token" };
      // The TYP body uses { user: { username }} OR { email } depending on shape — handle both
      const rawEmail = sessionData?.user?.username || sessionData?.email || sessionData?.username;
      const email = normalizeEmail(String(rawEmail || ""));
      if (!email) return { error: "invalid_token" };

      const zakiUser = await dbGet(
        `SELECT ${ZAKI_USER_COLUMNS} FROM zaki_users WHERE email = $1`,
        [email]
      );
      if (!zakiUser) return { error: "user_not_found" };

      // M-03: apply verified check on legacy path for consistency with ZAKI path
      if (!zakiUser.verified) return { error: "user_not_found" };

      // Best-effort ZAKI session mint + X-Zaki-Session-Upgrade: 1 signal (AUTH-05)
      // The header value is a signal only — not the token. Frontend (Phase 3) calls
      // POST /api/auth/refresh to get the cookie + access token.
      try {
        await mintZakiSession({ id: zakiUser.id, email: zakiUser.email }, req);
        try { res.setHeader("X-Zaki-Session-Upgrade", "1"); } catch (_e) {}
        console.log(`[ZakiAudit] legacy_typ_path userId=${zakiUser.id} ip=${req?.ip ?? "unknown"}`);
      } catch (mintErr) {
        console.warn("[ZakiAuth] legacy path session mint failed:", mintErr?.message);
      }

      return { ok: true, email, zakiUser, sessionUser: sessionData.user || sessionData };
    } catch (err) {
      // AbortError or network failure → invalid_token (preserve existing 401 semantics)
      return { error: "invalid_token" };
    } finally {
      clearTimeout(timer);
    }
  }

  async function requireAuthUser(req, res) {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "auth_required" });
      return null;
    }
    const decoded = tryDecodeJwtPayload(token);
    const result = decoded?.iss === "zaki"
      ? await resolveZakiPath(token)
      : await resolveLegacyPath(req.headers.authorization, req, res);
    if (!result.ok) {
      if (result.error === "session_expired") {
        res.status(401).json({
          error: "session_expired",
          code: "session_expired",
          message: "Please log in again.",
        });
      } else {
        res.status(401).json({ error: result.error });
      }
      return null;
    }
    return { email: result.email, zakiUser: result.zakiUser, sessionUser: result.sessionUser };
  }

  async function requireBotBffContext(req, res, next) {
    const existingUserId = String(req.botBffContext?.userId || "").trim();
    if (existingUserId) { next(); return; }

    // Dev bypass — preserved verbatim from index.js:8728-8739
    if (NULLCLAW_DEV_USER_ID) {
      const devAuthResult = await buildDevAuthResultFromUserId(NULLCLAW_DEV_USER_ID);
      if (!devAuthResult) {
        return res.status(500).json({
          error: "Invalid NULLCLAW_DEV_USER_ID. Matching ZAKI user not found.",
          code: "invalid_dev_user_id",
        });
      }
      req.botBffContext = devAuthResult;
      next();
      return;
    }

    const requestId = getOrCreateRequestId(req);
    const token = extractBearerToken(req);
    if (!token) {
      const failure = mapBotBffAuthFailure("unauthorized", requestId);
      res.status(failure.status).json(failure.body);
      return;
    }

    const decoded = tryDecodeJwtPayload(token);
    const result = decoded?.iss === "zaki"
      ? await resolveZakiPath(token)
      : await resolveLegacyPath(req.headers.authorization, req, res);

    if (!result.ok) {
      const reason = result.error === "user_not_found" ? "forbidden" : "unauthorized";
      const failure = mapBotBffAuthFailure(reason, requestId);
      res.status(failure.status).json(failure.body);
      return;
    }

    const userId = resolveCanonicalAgentUserId({ zakiUser: result.zakiUser });
    if (!userId) {
      const failure = mapBotBffAuthFailure("forbidden", requestId);
      res.status(failure.status).json(failure.body);
      return;
    }

    req.botBffContext = {
      email: result.email,
      sessionUser: result.sessionUser,
      zakiUser: result.zakiUser,
      userId,
    };
    next();
  }

  return { requireAuthUser, requireBotBffContext };
}

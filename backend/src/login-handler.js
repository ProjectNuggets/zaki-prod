// ZAKI login handler — Phase 1 (OATH-01, OATH-03, OATH-04, OATH-05)
// Extracted from index.js so it can be tested in isolation.
//
// Phase 1 changes vs. legacy loginHandler:
//   - Mints ZAKI session right after bcrypt passes.
//   - Sets HttpOnly refresh cookie.
//   - TYP /request-token call is BEST-EFFORT with 5s AbortController timeout.
//   - Returns ZAKI access JWT in body — NOT the TYP token.
//
// Pre-bcrypt validation logic and error shapes are preserved from the legacy handler.

import bcrypt from "bcryptjs";

import { dbGet, dbQuery } from "./db.js";
import { mintZakiSession } from "./zaki-auth.js";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "zaki_refresh";
const COOKIE_DOMAIN = ".chatzaki.com";
const COOKIE_PATH = "/api/auth/refresh";
const TYP_TIMEOUT_MS = 5000; // RESEARCH.md Open Question A2

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function buildRefreshCookie(token) {
  const expires = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const secure = isProduction() ? "Secure; " : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; ${secure}SameSite=Strict; Domain=${COOKIE_DOMAIN}; Path=${COOKIE_PATH}; Expires=${expires.toUTCString()}`;
}

/** Best-effort TYP /request-token call with 5-second AbortController timeout. */
async function bestEffortTypFetch(typBase, normalizedEmail, password) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TYP_TIMEOUT_MS);
  try {
    const response = await fetch(`${typBase}/request-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: normalizedEmail, password: String(password) }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    if (data && typeof data.token === "string") return data.token;
    return null;
  } catch (err) {
    console.warn("[ZakiAuth] TYP best-effort call failed:", err && err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** TYP admin API helper for novaUserId resolution — inlined so login-handler.js has no index.js dependency. */
async function novaAdminFetch(path, options = {}) {
  const baseUrl = process.env.NOVA_TYP_BASE_URL;
  const apiKey = process.env.NOVA_TYP_API_KEY;
  if (!baseUrl || !apiKey) return null;
  const normalized = baseUrl.replace(/\/+$/, "");
  const apiBase = normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  const url = `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${apiKey}`);
  if (options.body) headers.set("Content-Type", "application/json");
  return fetch(url, { ...options, headers });
}

async function fetchNovaUserIdByUsername(username) {
  try {
    const resp = await novaAdminFetch("/v1/users", { method: "GET" });
    if (!resp || !resp.ok) return null;
    const data = await resp.json().catch(() => ({}));
    if (!Array.isArray(data?.users)) return null;
    const match = data.users.find(
      (u) => String(u.username).toLowerCase() === String(username).toLowerCase()
    );
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export async function loginHandler(req, res) {
  try {
    const { email, password, username } = req.body || {};
    const emailInput = email || username;

    if (!emailInput || !password) {
      res.status(400).json({
        valid: false,
        token: null,
        message: "Email and password are required.",
      });
      return;
    }

    const normalizedEmail = String(emailInput).trim().toLowerCase();

    const user = await dbGet("SELECT * FROM zaki_users WHERE email = $1", [normalizedEmail]);
    if (!user) {
      res.status(401).json({
        valid: false,
        token: null,
        message: "Invalid login credentials.",
      });
      return;
    }
    if (!user.verified) {
      res.status(401).json({
        valid: false,
        token: null,
        message: "Please verify your email before signing in.",
      });
      return;
    }
    if (!bcrypt.compareSync(String(password), user.password_hash)) {
      res.status(401).json({
        valid: false,
        token: null,
        message: "Invalid login credentials.",
      });
      return;
    }

    // novaUserId resolution — preserved from legacy handler for workspace compat (Phase 4 removes this)
    let novaUserId = user.nova_user_id ? Number(user.nova_user_id) : null;
    if (!novaUserId) {
      const fetchedId = await fetchNovaUserIdByUsername(normalizedEmail);
      if (fetchedId) {
        await dbQuery(
          `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
          [Number(fetchedId), new Date().toISOString(), user.id]
        );
        novaUserId = Number(fetchedId);
      } else {
        const createResp = await novaAdminFetch("/v1/admin/users/new", {
          method: "POST",
          body: JSON.stringify({
            username: normalizedEmail,
            password: String(password),
            role: "default",
          }),
        });
        if (createResp) {
          const payload = await createResp.json().catch(() => ({}));
          if (createResp.ok && payload?.user?.id) {
            await dbQuery(
              `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
              [Number(payload.user.id), new Date().toISOString(), user.id]
            );
            novaUserId = Number(payload.user.id);
          } else if (createResp.status === 401) {
            res.status(401).json({
              valid: false,
              token: null,
              message: "NOVA.TYP is not in multi-user mode.",
            });
            return;
          } else if (payload?.error && !String(payload.error).toLowerCase().includes("exists")) {
            res.status(400).json({
              valid: false,
              token: null,
              message: payload.error,
            });
            return;
          }
          if (payload?.error && String(payload.error).toLowerCase().includes("exists")) {
            const retryId = await fetchNovaUserIdByUsername(normalizedEmail);
            if (retryId) {
              await dbQuery(
                `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
                [Number(retryId), new Date().toISOString(), user.id]
              );
              novaUserId = Number(retryId);
            }
          }
        }
      }
    }

    // Phase 1: mint ZAKI session
    const { accessToken, refreshToken, refreshTokenHash } = await mintZakiSession(
      { id: user.id, email: user.email },
      req
    );

    // Phase 1: set HttpOnly refresh cookie before writing response body
    res.setHeader("Set-Cookie", [buildRefreshCookie(refreshToken)]);

    // Phase 1: best-effort TYP call with 5s AbortController timeout (OATH-05)
    // Resolve TYP base from NOVA_TYP_BASE_URL (matches getApiBase() normalization in index.js)
    const rawTypBase = process.env.NOVA_TYP_BASE_URL;
    const typApiBase = rawTypBase
      ? (() => { const n = rawTypBase.replace(/\/+$/, ""); return n.endsWith("/api") ? n : `${n}/api`; })()
      : null;
    const typToken = typApiBase
      ? await bestEffortTypFetch(typApiBase, normalizedEmail, password)
      : null;
    if (typToken) {
      try {
        await dbQuery(
          `UPDATE zaki_sessions SET typ_session_token = $1 WHERE refresh_token_hash = $2`,
          [typToken, refreshTokenHash]
        );
      } catch (updateErr) {
        console.warn("[ZakiAuth] failed to persist typ_session_token:", updateErr && updateErr.message);
      }
    }

    // Phase 1: return ZAKI access JWT — TYP token never returned to browser (OATH-04)
    res.status(200).json({ valid: true, token: accessToken });
  } catch (err) {
    const errorCode = String(err?.cause?.code || err?.code || "").trim();
    if (errorCode === "CERT_HAS_EXPIRED") {
      const message =
        "Local login failed because the configured NOVA.TYP TLS certificate has expired.";
      res.status(502).json({
        valid: false,
        token: null,
        message,
        error: message,
        code: "nova_typ_cert_expired",
      });
      return;
    }
    if (
      errorCode === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
      errorCode === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      errorCode === "ERR_TLS_CERT_ALTNAME_INVALID"
    ) {
      const message =
        "Local login failed because the configured NOVA.TYP TLS certificate is not trusted.";
      res.status(502).json({
        valid: false,
        token: null,
        message,
        error: message,
        code: "nova_typ_cert_invalid",
      });
      return;
    }
    const message =
      err?.message === "fetch failed"
        ? "Local login failed because NOVA.TYP is unreachable."
        : err?.message || "Server error.";
    res.status(500).json({
      valid: false,
      token: null,
      message,
      error: message,
    });
  }
}

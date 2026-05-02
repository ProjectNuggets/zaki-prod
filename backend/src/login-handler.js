// ZAKI login handler — Phase 4 (TYP-01)
// Extracted from index.js so it can be tested in isolation.
//
// Phase 4 changes vs. Phase 1:
//   - TYP best-effort call removed entirely (TYP-01).
//   - Legacy TYP user-id resolution block removed (TYP-01).
//   - Login is now: bcrypt validation → mintZakiSession → return ZAKI JWT.
//
// Pre-bcrypt validation logic and error shapes are preserved from the legacy handler.

import bcrypt from "bcryptjs";

import { dbGet } from "./db.js";
import { mintZakiSession } from "./zaki-auth.js";
import { buildRefreshCookie } from "./zaki-session-cookie.js";

export async function loginHandler(req, res) {
  try {
    const { email, password, username } = req.body || {};
    const emailInput = email || username;

    // --- input validation ---
    if (!emailInput || !password) {
      res.status(400).json({
        valid: false,
        token: null,
        message: "Email and password are required.",
      });
      return;
    }

    const normalizedEmail = String(emailInput).trim().toLowerCase();

    // --- DB lookup ---
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
    if (!(await bcrypt.compare(String(password), user.password_hash))) {
      res.status(401).json({
        valid: false,
        token: null,
        message: "Invalid login credentials.",
      });
      return;
    }

    // --- mint ZAKI session ---
    const { accessToken, refreshToken } = await mintZakiSession({ id: user.id, email: user.email }, req);
    console.log(`[ZakiAudit] login userId=${user.id} ip=${req?.ip ?? "unknown"}`);
    res.setHeader("Set-Cookie", [buildRefreshCookie(refreshToken)]);

    // --- return ZAKI JWT ---
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

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Readable } from "node:stream";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { initDb, dbGet, dbQuery } from "./db.js";
import { createMemoryRoutes, buildContext, processMessage, summarizeConversation } from "./memory.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);
const NOVA_TYP_BASE_URL = (process.env.NOVA_TYP_BASE_URL || "").trim();
const NOVA_TYP_API_KEY = (process.env.NOVA_TYP_API_KEY || "").trim();
const ZAKI_PUBLIC_URL = (process.env.ZAKI_PUBLIC_URL || "").trim();
const ZAKI_APP_URL = (process.env.ZAKI_APP_URL || "").trim();
const ZAKI_EMAIL_MODE = (process.env.ZAKI_EMAIL_MODE || "console").trim();
const SKIP_EMAIL_VERIFICATION = ["non", "none", "no"].includes(
  ZAKI_EMAIL_MODE.toLowerCase()
);
const ZAKI_VERIFY_TTL_MINUTES = Number(
  process.env.ZAKI_VERIFY_TTL_MINUTES || 60
);
const ZAKI_RESET_TTL_MINUTES = Number(
  process.env.ZAKI_RESET_TTL_MINUTES || 30
);
const ZAKI_INCLUDE_VERIFY_LINK =
  String(process.env.ZAKI_INCLUDE_VERIFY_LINK || "").toLowerCase() === "true";
const allowedOrigins = (process.env.ZAKI_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // In development, allow all origins
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
      // Allow file:// protocol for local development
      if (origin?.startsWith('file://')) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin not allowed"));
    },
    credentials: true,
  })
);

function getApiBase() {
  if (!NOVA_TYP_BASE_URL) return null;
  const normalized = NOVA_TYP_BASE_URL.replace(/\/+$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

async function novaAdminRequest(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("NOVA_TYP_BASE_URL is not configured.");
  if (!NOVA_TYP_API_KEY) throw new Error("NOVA_TYP_API_KEY is not configured.");

  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBase}${urlPath}`;
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${NOVA_TYP_API_KEY}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function novaSessionRequest(path, authHeader, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("NOVA_TYP_BASE_URL is not configured.");
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${apiBase}${urlPath}`;
  const headers = new Headers(options.headers || {});
  if (authHeader) {
    headers.set("Authorization", authHeader);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function fetchNovaUserIdByUsername(username) {
  const response = await novaAdminRequest("/v1/users", { method: "GET" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(data?.users)) {
    return null;
  }
  const match = data.users.find(
    (user) => String(user.username).toLowerCase() === String(username).toLowerCase()
  );
  return match?.id ?? null;
}

function buildProxyHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (
      [
        "host",
        "connection",
        "content-length",
        "accept-encoding",
        "transfer-encoding",
      ].includes(lower)
    ) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return headers;
}

function copyResponseHeaders(upstream, res) {
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      [
        "connection",
        "transfer-encoding",
        "content-encoding",
        "content-length",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "upgrade",
      ].includes(lower)
    ) {
      return;
    }
    res.setHeader(key, value);
  });
}

app.get("/health", (_, res) => {
  res.status(200).json({ ok: true });
});

// Initialize memory routes
app.use(express.json({ limit: "10mb" }));
createMemoryRoutes(app);

await initDb();

const smtpHost = (process.env.SMTP_HOST || "").trim();
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = (process.env.SMTP_USER || "").trim();
const smtpPass = (process.env.SMTP_PASS || "").trim();
const smtpFrom = (process.env.SMTP_FROM || "").trim();
const resendApiKey = (process.env.RESEND_API_KEY || "").trim();
const resendFrom = (process.env.RESEND_FROM || "").trim();

const mailer =
  ZAKI_EMAIL_MODE === "smtp" && smtpHost
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
      })
    : null;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseFromAddress(value, fallbackEmail) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { email: fallbackEmail, name: undefined };
  }
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "");
    const email = match[2].trim();
    return { email, name: name || undefined };
  }
  return { email: trimmed, name: undefined };
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function issueVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ZAKI_VERIFY_TTL_MINUTES * 60 * 1000;
  const now = new Date().toISOString();
  await dbQuery(
    `INSERT INTO verification_tokens (user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, expiresAt, now]
  );
  return { token, expiresAt };
}

async function issuePasswordResetToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ZAKI_RESET_TTL_MINUTES * 60 * 1000;
  const now = new Date().toISOString();
  await dbQuery(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, expiresAt, now]
  );
  return { token, expiresAt };
}

async function sendVerificationEmail(email, token) {
  const baseUrl =
    ZAKI_PUBLIC_URL ||
    `http://localhost:${PORT}`;
  const verifyUrl = `${baseUrl.replace(/\/+$/, "")}/verify?token=${token}`;
  const subject = "Verify your ZAKI account";
  const text = `Welcome to ZAKI! Verify your email by visiting: ${verifyUrl}`;

  if (ZAKI_EMAIL_MODE.toLowerCase() === "resend") {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    const from = parseFromAddress(resendFrom, "");
    if (!from.email) {
      throw new Error("RESEND_FROM is not configured.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: from.name ? `${from.name} <${from.email}>` : from.email,
          to: [email],
          subject,
          text,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Resend error (${response.status})${errorText ? `: ${errorText}` : ""}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  } else if (mailer) {
    await mailer.sendMail({
      from: smtpFrom || smtpUser || "no-reply@zaki.local",
      to: email,
      subject,
      text,
    });
  } else {
    console.log(`[ZAKI] Verification link for ${email}: ${verifyUrl}`);
  }

  return verifyUrl;
}

async function sendPasswordResetEmail(email, token) {
  const baseUrl =
    ZAKI_APP_URL ||
    ZAKI_PUBLIC_URL ||
    `http://localhost:${PORT}`;
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const resetBase = normalizedBase.endsWith("/api")
    ? normalizedBase.replace(/\/api$/, "")
    : normalizedBase;
  const resetUrl = `${resetBase}/reset?token=${token}`;
  const subject = "Reset your ZAKI password";
  const text = `Use this link to reset your password: ${resetUrl}`;

  if (ZAKI_EMAIL_MODE.toLowerCase() === "resend") {
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    const from = parseFromAddress(resendFrom, "");
    if (!from.email) {
      throw new Error("RESEND_FROM is not configured.");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: from.name ? `${from.name} <${from.email}>` : from.email,
          to: [email],
          subject,
          text,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Resend error (${response.status})${errorText ? `: ${errorText}` : ""}`
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  } else if (mailer) {
    await mailer.sendMail({
      from: smtpFrom || smtpUser || "no-reply@zaki.local",
      to: email,
      subject,
      text,
    });
  } else {
    console.log(`[ZAKI] Password reset link for ${email}: ${resetUrl}`);
  }

  return resetUrl;
}

app.post("/signup", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    const { email, password, name, dateOfBirth } = req.body || {};
    const normalizedEmail = normalizeEmail(email);
    const normalizedName = String(name || "").trim();
    const normalizedDob = String(dateOfBirth || "").trim();

    if (!normalizedEmail || !password || !normalizedName || !normalizedDob) {
      res.status(400).json({
        success: false,
        error: "Name, date of birth, email, and password are required.",
      });
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      res.status(400).json({
        success: false,
        error: "Please enter a valid email address.",
      });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDob)) {
      res.status(400).json({
        success: false,
        error: "Please enter a valid date of birth.",
      });
      return;
    }

    const now = new Date().toISOString();
    const existing = await dbGet(
      "SELECT * FROM zaki_users WHERE email = $1",
      [normalizedEmail]
    );
    const passwordHash = bcrypt.hashSync(String(password), 10);

    let userId = existing?.id;
    if (existing && existing.verified) {
      res.status(400).json({
        success: false,
        error: "Email already registered. Please sign in.",
      });
      return;
    }

    if (existing) {
      await dbQuery(
        `UPDATE zaki_users
         SET password_hash = $1, full_name = $2, date_of_birth = $3, updated_at = $4
         WHERE id = $5`,
        [passwordHash, normalizedName, normalizedDob, now, existing.id]
      );
    } else {
      const insertResult = await dbQuery(
        `INSERT INTO zaki_users
         (email, password_hash, full_name, date_of_birth, verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, false, $5, $6)
         RETURNING id`,
        [normalizedEmail, passwordHash, normalizedName, normalizedDob, now, now]
      );
      userId = insertResult.rows[0]?.id;
    }

    if (!userId) {
      res.status(500).json({ success: false, error: "Unable to create user." });
      return;
    }

    if (SKIP_EMAIL_VERIFICATION) {
      await dbQuery(
        `UPDATE zaki_users SET verified = true, updated_at = $1 WHERE id = $2`,
        [now, userId]
      );
      res.status(200).json({
        success: true,
        message: "Account created. You can sign in now.",
      });
      return;
    }

    const { token } = await issueVerificationToken(userId);
    const verificationLink = await sendVerificationEmail(
      normalizedEmail,
      token
    );

    res.status(200).json({
      success: true,
      message: "Check your email to verify your account.",
      verificationLink: ZAKI_INCLUDE_VERIFY_LINK ? verificationLink : undefined,
    });
  } catch (error) {
    console.error("[ZAKI] Signup error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Server error.",
    });
  }
});

app.post(
  "/password-reset/request",
  express.json({ limit: "1mb" }),
  async (req, res) => {
    try {
      const { email } = req.body || {};
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail) {
        res.status(400).json({
          success: false,
          error: "Email is required.",
        });
        return;
      }
      if (!isValidEmail(normalizedEmail)) {
        res.status(400).json({
          success: false,
          error: "Please enter a valid email address.",
        });
        return;
      }

      const user = await dbGet("SELECT * FROM zaki_users WHERE email = $1", [
        normalizedEmail,
      ]);

      if (user) {
        const { token } = await issuePasswordResetToken(user.id);
        const resetLink = await sendPasswordResetEmail(normalizedEmail, token);
        res.status(200).json({
          success: true,
          message: "If the account exists, a reset link has been sent.",
          resetLink: ZAKI_INCLUDE_VERIFY_LINK ? resetLink : undefined,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "If the account exists, a reset link has been sent.",
      });
    } catch (error) {
      console.error("[ZAKI] Password reset request error:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Server error.",
      });
    }
  }
);

app.post(
  "/password-reset/confirm",
  express.json({ limit: "1mb" }),
  async (req, res) => {
    try {
      const { token, password } = req.body || {};
      const normalizedToken = String(token || "").trim();
      const nextPassword = String(password || "");

      if (!normalizedToken || !nextPassword) {
        res.status(400).json({
          success: false,
          error: "Token and new password are required.",
        });
        return;
      }

      const record = await dbGet(
        `SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at
         FROM password_reset_tokens pr
         WHERE pr.token = $1`,
        [normalizedToken]
      );

      if (!record) {
        res.status(404).json({
          success: false,
          error: "Invalid reset token.",
        });
        return;
      }

      if (record.used_at) {
        res.status(400).json({
          success: false,
          error: "Reset token already used.",
        });
        return;
      }

      const expiresAt = Number(record.expires_at);
      if (Date.now() > expiresAt) {
        res.status(410).json({
          success: false,
          error: "Reset token expired.",
        });
        return;
      }

      const passwordHash = bcrypt.hashSync(String(nextPassword), 10);
      const now = Date.now();
      const nowIso = new Date().toISOString();

      const zakiUser = await dbGet("SELECT * FROM zaki_users WHERE id = $1", [
        record.user_id,
      ]);
      if (!zakiUser) {
        res.status(404).json({
          success: false,
          error: "User not found.",
        });
        return;
      }

      let novaUserId = zakiUser.nova_user_id
        ? Number(zakiUser.nova_user_id)
        : null;
      if (!novaUserId) {
        const fetchedId = await fetchNovaUserIdByUsername(zakiUser.email);
        if (fetchedId) {
          novaUserId = Number(fetchedId);
          await dbQuery(
            `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
            [novaUserId, nowIso, zakiUser.id]
          );
        }
      }

      if (novaUserId) {
        const novaResponse = await novaAdminRequest(`/v1/admin/users/${novaUserId}`, {
          method: "POST",
          body: JSON.stringify({ password: String(nextPassword) }),
        });
        const novaPayload = await novaResponse.json().catch(() => ({}));
        if (!novaResponse.ok || novaPayload?.success === false) {
          const errorMessage =
            novaPayload?.error ||
            (novaResponse.status === 401
              ? "NOVA.TYP is not in multi-user mode."
              : "Unable to update NOVA.TYP password.");
          res.status(400).json({
            success: false,
            error: errorMessage,
          });
          return;
        }
      }

      await dbQuery(
        `UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2`,
        [now, record.id]
      );
      await dbQuery(
        `UPDATE zaki_users SET password_hash = $1, updated_at = $2 WHERE id = $3`,
        [passwordHash, nowIso, record.user_id]
      );

      res.status(200).json({
        success: true,
        message: "Password updated. You can sign in now.",
      });
    } catch (error) {
      console.error("[ZAKI] Password reset confirm error:", error);
      res.status(500).json({
        success: false,
        error: error?.message || "Server error.",
      });
    }
  }
);

app.post("/login", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    const apiBase = getApiBase();
    if (!apiBase) {
      res.status(500).json({ error: "NOVA_TYP_BASE_URL is not configured." });
      return;
    }

    const { email, password, username } = req.body || {};
    const normalizedEmail = normalizeEmail(email || username);
    if (!normalizedEmail || !password) {
      res.status(400).json({
        valid: false,
        token: null,
        message: "Email and password are required.",
      });
      return;
    }

    const user = await dbGet("SELECT * FROM zaki_users WHERE email = $1", [
      normalizedEmail,
    ]);
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

    if (!user.nova_user_id) {
      // First, try to fetch existing NOVA user
      const fetchedId = await fetchNovaUserIdByUsername(normalizedEmail);
      
      if (fetchedId) {
        // Link existing NOVA user
        await dbQuery(
          `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
          [Number(fetchedId), new Date().toISOString(), user.id]
        );
      } else {
        // Create new NOVA user
        const createResponse = await novaAdminRequest("/v1/admin/users/new", {
          method: "POST",
          body: JSON.stringify({
            username: normalizedEmail,
            password: String(password),
            role: "default",
          }),
        });
        const payload = await createResponse.json().catch(() => ({}));
        if (createResponse.ok && payload?.user?.id) {
          await dbQuery(
            `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
            [Number(payload.user.id), new Date().toISOString(), user.id]
          );
        } else if (createResponse.status === 401) {
          res.status(401).json({
            valid: false,
            token: null,
            message: "NOVA.TYP is not in multi-user mode.",
          });
          return;
        } else if (payload?.error && !String(payload.error).toLowerCase().includes("exists")) {
          // Only fail if it's not a "user exists" error
          res.status(400).json({
            valid: false,
            token: null,
            message: payload.error,
          });
          return;
        }
        // If user exists error, fetch ID and continue
        if (payload?.error && String(payload.error).toLowerCase().includes("exists")) {
          const retryFetchId = await fetchNovaUserIdByUsername(normalizedEmail);
          if (retryFetchId) {
            await dbQuery(
              `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
              [Number(retryFetchId), new Date().toISOString(), user.id]
            );
          }
        }
      }
    }

    const response = await fetch(`${apiBase}/request-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: normalizedEmail,
        password: String(password),
      }),
    });
    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error?.message || "Server error." });
  }
});

app.post("/zaki/workspaces", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Missing authorization token." });
      return;
    }

    const sessionResponse = await novaSessionRequest(
      "/system/refresh-user",
      authHeader,
      { method: "GET" }
    );
    const sessionData = await sessionResponse.json().catch(() => ({}));
    if (!sessionResponse.ok || !sessionData?.success || !sessionData?.user) {
      res.status(401).json({ error: "Invalid session." });
      return;
    }

    const email = normalizeEmail(sessionData.user.username);
    const zakiUser = await dbGet(
      "SELECT * FROM zaki_users WHERE email = $1",
      [email]
    );
    if (!zakiUser) {
      res.status(404).json({ error: "ZAKI user not found." });
      return;
    }
    if (!zakiUser.verified) {
      res.status(403).json({ error: "Email is not verified." });
      return;
    }

    let novaUserId = zakiUser.nova_user_id
      ? Number(zakiUser.nova_user_id)
      : null;
    if (!novaUserId) {
      novaUserId = await fetchNovaUserIdByUsername(email);
      if (novaUserId) {
        await dbQuery(
          `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
          [Number(novaUserId), new Date().toISOString(), zakiUser.id]
        );
      }
    }

    if (!novaUserId) {
      res.status(400).json({
        error: "NOVA.TYP user not found. Please log out and log back in.",
      });
      return;
    }

    const { name } = req.body || {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: "Workspace name is required." });
      return;
    }

    const createResponse = await novaAdminRequest("/v1/workspace/new", {
      method: "POST",
      body: JSON.stringify({ name: String(name).trim() }),
    });
    const createData = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok || !createData?.workspace) {
      res.status(400).json({
        error: createData?.message || "Unable to create workspace.",
      });
      return;
    }

    const workspaceSlug = createData.workspace.slug;
    const assignResponse = await novaAdminRequest(
      `/v1/admin/workspaces/${workspaceSlug}/manage-users`,
      {
        method: "POST",
        body: JSON.stringify({ userIds: [Number(novaUserId)], reset: false }),
      }
    );
    const assignData = await assignResponse.json().catch(() => ({}));
    if (!assignResponse.ok || assignData?.success === false) {
      res.status(400).json({
        error: assignData?.error || "Workspace created, but user not assigned.",
      });
      return;
    }

    res.status(200).json({
      workspace: createData.workspace,
      message: createData.message || "Workspace created",
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || "Server error." });
  }
});

app.get("/verify", async (req, res) => {
  const token = String(req.query.token || "");
  const wantsJson =
    String(req.query.format || "").toLowerCase() === "json" ||
    String(req.headers.accept || "").includes("application/json");

  if (!token) {
    if (wantsJson) {
      res.status(400).json({ success: false, error: "Missing token." });
    } else {
      res.status(400).send("Missing verification token.");
    }
    return;
  }

  const record = await dbGet(
    `SELECT vt.id, vt.user_id, vt.expires_at, vt.used_at, u.email
     FROM verification_tokens vt
     JOIN zaki_users u ON u.id = vt.user_id
     WHERE vt.token = $1`,
    [token]
  );

  if (!record) {
    if (wantsJson) {
      res.status(404).json({ success: false, error: "Invalid token." });
    } else {
      res.status(404).send("Invalid verification token.");
    }
    return;
  }

  if (record.used_at) {
    if (wantsJson) {
      res.status(200).json({ success: true, message: "Already verified." });
    } else {
      res.status(200).send("Your email is already verified. You can sign in.");
    }
    return;
  }

  const expiresAt = Number(record.expires_at);
  if (Date.now() > expiresAt) {
    if (wantsJson) {
      res.status(410).json({ success: false, error: "Token expired." });
    } else {
      res.status(410).send("Verification link expired. Please sign up again.");
    }
    return;
  }

  const now = Date.now();
  const nowIso = new Date().toISOString();
  await dbQuery(`UPDATE verification_tokens SET used_at = $1 WHERE id = $2`, [
    now,
    record.id,
  ]);
  await dbQuery(
    `UPDATE zaki_users SET verified = true, updated_at = $1 WHERE id = $2`,
    [nowIso, record.user_id]
  );

  if (wantsJson) {
    res.status(200).json({
      success: true,
      message: "Email verified. You can sign in now.",
    });
  } else {
    res
      .status(200)
      .send("Email verified. Return to ZAKI and sign in.");
  }
});

// =============================================================================
// Chat Integration with Memory
// =============================================================================

/**
 * Intercept stream-chat requests to inject memory context
 * Route: POST /workspace/:slug/thread/:threadSlug/stream-chat
 */
app.post("/workspace/:slug/thread/:threadSlug/stream-chat", express.json({ limit: "10mb" }), async (req, res) => {
  try {
    const apiBase = getApiBase();
    if (!apiBase) {
      return res.status(500).json({ error: "NOVA_TYP_BASE_URL is not configured." });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization." });
    }

    // Get user from session
    const sessionResponse = await novaSessionRequest("/system/refresh-user", authHeader, { method: "GET" });
    const sessionData = await sessionResponse.json().catch(() => ({}));
    const userEmail = sessionData?.user?.username || null;

    const { message } = req.body || {};
    const originalMessage = String(message || "").trim();

    if (!originalMessage) {
      return res.status(400).json({ error: "Message is required." });
    }

    let enrichedMessage = originalMessage;
    let memoryInjected = false;

    // Inject memory context if we have a user
    if (userEmail) {
      try {
        // Build context from memory
        const memoryResult = await buildContext({
          userId: userEmail,
          query: originalMessage,
          maxChars: 1500,
        });

        if (memoryResult.context) {
          // Prepend memory context as natural buddy-style context
          enrichedMessage = `[About this person — use naturally, don't quote verbatim]\n${memoryResult.context}\n\n---\n\n${originalMessage}`;
          memoryInjected = true;
          console.log(`[Memory] Injected ${memoryResult.sources.length} memories for ${userEmail}`);
        }

        // Extract facts from user message (async, don't block)
        processMessage({ userId: userEmail, message: originalMessage, autoExtract: true }).catch(() => {});
      } catch (err) {
        console.warn("[Memory] Context injection failed:", err.message);
        // Continue without memory
      }
    }

    // Forward to NOVA.TYP with enriched message
    const { slug, threadSlug } = req.params;
    const targetUrl = `${apiBase}/workspace/${slug}/thread/${threadSlug}/stream-chat`;

    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({ message: enrichedMessage }),
    });

    // Stream the response back
    res.status(upstreamResponse.status);
    copyResponseHeaders(upstreamResponse, res);

    if (!upstreamResponse.body) {
      res.end();
      return;
    }

    // Add memory injection indicator to first chunk
    const reader = upstreamResponse.body.getReader();
    let firstChunk = true;

    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        
        // Optionally prepend memory indicator (disabled for now)
        // if (firstChunk && memoryInjected) {
        //   const indicator = new TextEncoder().encode('data: {"type":"memoryUsed","count":' + memoryResult.sources.length + '}\n\n');
        //   controller.enqueue(indicator);
        // }
        
        firstChunk = false;
        controller.enqueue(value);
      },
    });

    Readable.fromWeb(stream).pipe(res);
  } catch (error) {
    console.error("[Chat] Stream error:", error);
    res.status(500).json({ error: error?.message || "Chat stream failed." });
  }
});

// =============================================================================
// CONVERSATION SUMMARIZATION (Memory)
// =============================================================================

/**
 * POST /api/memory/end-session
 * Called when user leaves a thread - triggers conversation summarization
 */
app.post("/api/memory/end-session", express.json({ limit: "5mb" }), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.slice(7);
    let novaUserId, userEmail;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      novaUserId = payload.id || payload.userId || payload.sub;
      userEmail = payload.email;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get email from zaki_users if not in token
    if (!userEmail && novaUserId) {
      const userResult = await dbQuery(
        'SELECT email FROM zaki_users WHERE nova_user_id = $1',
        [novaUserId]
      );
      if (userResult.rows.length) {
        userEmail = userResult.rows[0].email;
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: "Could not determine user" });
    }

    const { messages, threadId, threadTitle } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length < 3) {
      // Skip summarization for very short conversations
      return res.json({ skipped: true, reason: "conversation_too_short" });
    }

    // Run summarization in background (don't block the response)
    summarizeConversation({
      userId: userEmail,
      messages,
      threadId,
      threadTitle,
    }).then((result) => {
      console.log(`[Memory] Session ended for ${userEmail}: ${result.memories?.length || 0} memories extracted`);
    }).catch((err) => {
      console.warn("[Memory] Summarization failed:", err.message);
    });

    res.json({ ok: true, queued: true });
  } catch (error) {
    console.error("[Memory] End session error:", error);
    res.status(500).json({ error: "Failed to process session end" });
  }
});

// =============================================================================
// SHARE CONVERSATION ROUTES
// =============================================================================

const SHARE_EXPIRY_DAYS = 10;

/**
 * POST /api/share/create
 * Create a shareable link for a conversation
 */
app.post("/api/share/create", express.json({ limit: "5mb" }), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.slice(7);
    // Decode JWT to get user ID (simplified - in production use proper JWT verification)
    let novaUserId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      novaUserId = payload.id || payload.userId || payload.sub;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    // Look up the zaki_users.id from nova_user_id
    const userResult = await dbQuery(
      'SELECT id FROM zaki_users WHERE nova_user_id = $1',
      [novaUserId]
    );
    
    if (!userResult.rows.length) {
      return res.status(401).json({ error: "User not found" });
    }
    
    const zakiUserId = userResult.rows[0].id;
    
    const { 
      workspaceSlug, 
      threadSlug, 
      title,
      conversation, // Array of messages
      isPasswordProtected = false,
      password = null
    } = req.body;
    
    if (!workspaceSlug || !threadSlug || !conversation || !Array.isArray(conversation)) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Generate unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');
    
    // Hash password if protected
    let passwordHash = null;
    if (isPasswordProtected && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }
    
    // Calculate expiry (10 days from now)
    const expiresAt = new Date(Date.now() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    await dbQuery(
      `INSERT INTO shared_conversations 
       (token, user_id, workspace_slug, thread_slug, title, conversation_snapshot, 
        is_password_protected, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        shareToken,
        zakiUserId,
        workspaceSlug,
        threadSlug,
        title || 'Shared Conversation',
        JSON.stringify(conversation),
        isPasswordProtected,
        passwordHash,
        expiresAt.toISOString()
      ]
    );
    
    const shareUrl = `${ZAKI_APP_URL || 'http://localhost:5173'}/share/${shareToken}`;
    
    res.json({
      success: true,
      token: shareToken,
      url: shareUrl,
      expiresAt: expiresAt.toISOString(),
      isPasswordProtected
    });
    
  } catch (error) {
    console.error("[Share] Create error:", error);
    res.status(500).json({ error: "Failed to create share link" });
  }
});

/**
 * GET /api/share/:token
 * Get shared conversation metadata (doesn't include content if password protected)
 */
app.get("/api/share/:token", async (req, res) => {
  try {
    const { token } = req.params;
    
    const share = await dbGet(
      `SELECT id, title, is_password_protected, expires_at, view_count, created_at
       FROM shared_conversations 
       WHERE token = $1`,
      [token]
    );
    
    if (!share) {
      return res.status(404).json({ error: "Share link not found" });
    }
    
    // Check if expired
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: "Share link has expired" });
    }
    
    res.json({
      title: share.title,
      isPasswordProtected: share.is_password_protected,
      expiresAt: share.expires_at,
      viewCount: share.view_count,
      createdAt: share.created_at
    });
    
  } catch (error) {
    console.error("[Share] Get error:", error);
    res.status(500).json({ error: "Failed to get share info" });
  }
});

/**
 * POST /api/share/:token/view
 * Get the actual conversation content (with optional password verification)
 */
app.post("/api/share/:token/view", express.json(), async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};
    
    const share = await dbGet(
      `SELECT * FROM shared_conversations WHERE token = $1`,
      [token]
    );
    
    if (!share) {
      return res.status(404).json({ error: "Share link not found" });
    }
    
    // Check if expired
    if (new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ error: "Share link has expired" });
    }
    
    // Verify password if protected
    if (share.is_password_protected) {
      if (!password) {
        return res.status(401).json({ error: "Password required", requiresPassword: true });
      }
      
      const isValid = await bcrypt.compare(password, share.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }
    
    // Increment view count
    await dbQuery(
      `UPDATE shared_conversations SET view_count = view_count + 1 WHERE id = $1`,
      [share.id]
    );
    
    // conversation_snapshot is already parsed by pg (JSONB column)
    const conversation = typeof share.conversation_snapshot === 'string' 
      ? JSON.parse(share.conversation_snapshot) 
      : share.conversation_snapshot;
    
    res.json({
      title: share.title,
      conversation,
      expiresAt: share.expires_at,
      viewCount: share.view_count + 1,
      createdAt: share.created_at
    });
    
  } catch (error) {
    console.error("[Share] View error:", error);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

/**
 * DELETE /api/share/:token
 * Delete a share link (owner only)
 */
app.delete("/api/share/:token", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.slice(7);
    let userId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.id || payload.userId || payload.sub;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    const { token: shareToken } = req.params;
    
    const result = await dbQuery(
      `DELETE FROM shared_conversations WHERE token = $1 AND user_id = $2`,
      [shareToken, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Share link not found or unauthorized" });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error("[Share] Delete error:", error);
    res.status(500).json({ error: "Failed to delete share link" });
  }
});

/**
 * GET /api/share/list
 * List all share links for the current user
 */
app.get("/api/share/list", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const token = authHeader.slice(7);
    let userId;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.id || payload.userId || payload.sub;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    const shares = await dbQuery(
      `SELECT token, title, is_password_protected, expires_at, view_count, created_at
       FROM shared_conversations 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({
      shares: shares.rows.map(s => ({
        token: s.token,
        title: s.title,
        isPasswordProtected: s.is_password_protected,
        expiresAt: s.expires_at,
        viewCount: s.view_count,
        createdAt: s.created_at,
        isExpired: new Date(s.expires_at) < new Date()
      }))
    });
    
  } catch (error) {
    console.error("[Share] List error:", error);
    res.status(500).json({ error: "Failed to list shares" });
  }
});

// =============================================================================
// CATCH-ALL PROXY
// =============================================================================

app.all("*", async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    const apiBase = getApiBase();
    if (!apiBase) {
      res.status(500).json({ error: "NOVA_TYP_BASE_URL is not configured." });
      return;
    }

    const targetUrl = `${apiBase}${req.originalUrl}`;
    const headers = buildProxyHeaders(req);
    const method = req.method.toUpperCase();
    const needsBody = !["GET", "HEAD"].includes(method);

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: needsBody ? req : undefined,
      duplex: needsBody ? "half" : undefined,
    });

    res.status(upstream.status);
    copyResponseHeaders(upstream, res);

    if (!upstream.body) {
      res.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error?.message || "Proxy error." });
  }
});

app.listen(PORT, () => {
  console.log(`ZAKI backend listening on port ${PORT}`);
});

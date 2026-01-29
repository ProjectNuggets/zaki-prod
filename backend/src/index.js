import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Readable } from "node:stream";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { initDb, dbGet, dbQuery } from "./db.js";
import { createMemoryRoutes, buildContext, processMessage } from "./memory.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);
const NOVA_TYP_BASE_URL = (process.env.NOVA_TYP_BASE_URL || "").trim();
const NOVA_TYP_API_KEY = (process.env.NOVA_TYP_API_KEY || "").trim();
const ZAKI_PUBLIC_URL = (process.env.ZAKI_PUBLIC_URL || "").trim();
const ZAKI_EMAIL_MODE = (process.env.ZAKI_EMAIL_MODE || "console").trim();
const SKIP_EMAIL_VERIFICATION = ["non", "none", "no"].includes(
  ZAKI_EMAIL_MODE.toLowerCase()
);
const ZAKI_VERIFY_TTL_MINUTES = Number(
  process.env.ZAKI_VERIFY_TTL_MINUTES || 60
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
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
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

async function sendVerificationEmail(email, token) {
  const baseUrl =
    ZAKI_PUBLIC_URL ||
    `http://localhost:${PORT}`;
  const verifyUrl = `${baseUrl.replace(/\/+$/, "")}/verify?token=${token}`;
  const subject = "Verify your ZAKI account";
  const text = `Welcome to ZAKI! Verify your email by visiting: ${verifyUrl}`;

  if (mailer) {
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
    res.status(500).json({
      success: false,
      error: error?.message || "Server error.",
    });
  }
});

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
      } else if (
        payload?.error &&
        String(payload.error).toLowerCase().includes("exists")
      ) {
        await dbQuery(
          `UPDATE zaki_users SET updated_at = $1 WHERE id = $2`,
          [new Date().toISOString(), user.id]
        );
      } else if (createResponse.status === 401) {
        res.status(401).json({
          valid: false,
          token: null,
          message: "NOVA.TYP is not in multi-user mode.",
        });
        return;
      } else if (payload?.error) {
        res.status(400).json({
          valid: false,
          token: null,
          message: payload.error,
        });
        return;
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
          // Prepend memory context as a system instruction
          enrichedMessage = `[MEMORY CONTEXT - Use this to personalize your response]\n${memoryResult.context}\n\n[USER MESSAGE]\n${originalMessage}`;
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

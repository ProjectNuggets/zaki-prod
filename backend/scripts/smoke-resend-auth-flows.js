#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { dbGet, dbQuery, initDb } from "../src/db.js";
import { resolveLegalPolicyVersion } from "../src/legal-consent.js";

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "backend", ".env"),
    path.resolve(process.cwd(), "..", ".env"),
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), "backend", ".env.local"),
    path.resolve(process.cwd(), "..", ".env.local"),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: envPath.endsWith(".env.local") });
    }
  }
}

function parseFromAddress(value) {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  const email = match ? match[2].trim() : trimmed;
  const domain = email.includes("@") ? email.split("@").pop().toLowerCase() : "";
  return { email, domain };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { response, body };
}

async function checkResendDomain({ apiKey, fromDomain }) {
  const response = await fetch("https://api.resend.com/domains", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Resend domain check failed with HTTP ${response.status}.`);
  }
  const domains = Array.isArray(body?.data) ? body.data : [];
  const match = domains.find((domain) => String(domain?.name || "").toLowerCase() === fromDomain);
  if (!match) {
    throw new Error(`Resend sender domain ${fromDomain} was not found on the account.`);
  }
  const status = String(match?.status || "").toLowerCase();
  if (status !== "verified") {
    throw new Error(`Resend sender domain ${fromDomain} is ${status || "not verified"}.`);
  }
  return {
    id: match.id,
    name: match.name,
    status: match.status,
    region: match.region || null,
  };
}

async function main() {
  loadEnv();

  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const emailMode = String(process.env.ZAKI_EMAIL_MODE || "").trim().toLowerCase();
  const { email: fromEmail, domain: fromDomain } = parseFromAddress(process.env.RESEND_FROM);
  const backendUrl = String(
    process.env.ZAKI_SMOKE_BACKEND_URL ||
      process.env.ZAKI_PUBLIC_URL ||
      "http://localhost:8787"
  ).replace(/\/+$/, "");

  if (emailMode !== "resend") {
    throw new Error(`ZAKI_EMAIL_MODE must be resend for this smoke test; got ${emailMode || "unset"}.`);
  }
  if (!apiKey) throw new Error("RESEND_API_KEY is required.");
  if (!fromEmail || !fromDomain) throw new Error("RESEND_FROM must be a valid sender email.");

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const email = `delivered+zaki-auth-${runId}@resend.dev`;
  const initialPassword = `ZakiSmoke-${runId}!`;
  const resetPassword = `ZakiSmokeReset-${runId}!`;
  const policyVersion = resolveLegalPolicyVersion(process.env.ZAKI_LEGAL_POLICY_VERSION);

  const domain = await checkResendDomain({ apiKey, fromDomain });
  await initDb();

  const signup = await requestJson(`${backendUrl}/signup`, {
    method: "POST",
    body: JSON.stringify({
      email,
      password: initialPassword,
      name: "ZAKI Resend Smoke",
      legalConsentAccepted: true,
      legalPolicyVersion: policyVersion,
    }),
  });
  if (!signup.response.ok || signup.body?.success !== true) {
    throw new Error(`Signup flow failed with HTTP ${signup.response.status}: ${JSON.stringify(signup.body)}`);
  }

  const verification = await dbGet(
    `SELECT vt.token
     FROM verification_tokens vt
     JOIN zaki_users u ON u.id = vt.user_id
     WHERE u.email = $1
     ORDER BY vt.id DESC
     LIMIT 1`,
    [email]
  );
  if (!verification?.token) {
    throw new Error("Signup did not create a verification token.");
  }

  const verify = await requestJson(
    `${backendUrl}/api/verify?format=json&token=${encodeURIComponent(verification.token)}`,
    { method: "GET" }
  );
  if (!verify.response.ok || verify.body?.success !== true) {
    throw new Error(`Verification link failed with HTTP ${verify.response.status}: ${JSON.stringify(verify.body)}`);
  }

  const resetRequest = await requestJson(`${backendUrl}/password-reset/request`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!resetRequest.response.ok || resetRequest.body?.success !== true) {
    throw new Error(
      `Password reset request failed with HTTP ${resetRequest.response.status}: ${JSON.stringify(resetRequest.body)}`
    );
  }

  const reset = await dbGet(
    `SELECT pr.token
     FROM password_reset_tokens pr
     JOIN zaki_users u ON u.id = pr.user_id
     WHERE u.email = $1
     ORDER BY pr.id DESC
     LIMIT 1`,
    [email]
  );
  if (!reset?.token) {
    throw new Error("Password reset request did not create a reset token.");
  }

  const resetConfirm = await requestJson(`${backendUrl}/password-reset/confirm`, {
    method: "POST",
    body: JSON.stringify({
      token: reset.token,
      password: resetPassword,
    }),
  });
  if (!resetConfirm.response.ok || resetConfirm.body?.success !== true) {
    throw new Error(
      `Password reset confirm failed with HTTP ${resetConfirm.response.status}: ${JSON.stringify(resetConfirm.body)}`
    );
  }

  const login = await requestJson(`${backendUrl}/login`, {
    method: "POST",
    body: JSON.stringify({
      email,
      password: resetPassword,
    }),
  });
  if (!login.response.ok || login.body?.valid !== true || !login.body?.token) {
    throw new Error(`Login with reset password failed with HTTP ${login.response.status}: ${JSON.stringify(login.body)}`);
  }

  if (String(process.env.ZAKI_SMOKE_KEEP_USERS || "").toLowerCase() !== "true") {
    await dbQuery("DELETE FROM zaki_users WHERE email = $1", [email]);
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        resendDomain: domain,
        fromDomain,
        testRecipient: "delivered+zaki-auth-<run>@resend.dev",
        signupEmailAccepted: true,
        verificationLinkWorks: true,
        passwordResetEmailAccepted: true,
        passwordResetConfirmWorks: true,
        loginWithResetPasswordWorks: true,
        testUserDeleted: String(process.env.ZAKI_SMOKE_KEEP_USERS || "").toLowerCase() !== "true",
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});

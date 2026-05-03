/**
 * End-to-end smoke test for the ZAKI auth layer.
 * Run: node scripts/smoke-test.mjs [email] [password]
 *
 * Without credentials: tests JWT verification path, 401 guards, refresh, logout.
 * With credentials:    also tests real login → ZAKI JWT issuance.
 */

import { SignJWT } from "jose";
import { createHash, randomBytes, createSecretKey } from "node:crypto";
import pg from "pg";

const BASE = `http://localhost:${process.env.PORT || 8787}`;
const KEY_HEX = process.env.ZAKI_JWT_SIGNING_KEY;
const DB_URL = process.env.DATABASE_URL;
const [, , EMAIL_ARG, PASS_ARG] = process.argv;

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  passed++;
}
function fail(label, detail) {
  console.error(`  ✗ ${label}`);
  if (detail) console.error(`    ${detail}`);
  failed++;
}
function section(title) {
  console.log(`\n── ${title}`);
}

async function mintJwt(sub, email, expiresIn = "15m") {
  const key = createSecretKey(Buffer.from(KEY_HEX, "hex"));
  return new SignJWT({ iss: "zaki", sub: String(sub), email })
    .setProtectedHeader({ alg: "HS256", kid: "k1" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

async function request(method, path, opts = {}) {
  const { body, headers = {}, cookie } = opts;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  try { json = await res.clone().json(); } catch {}
  return { res, json, status: res.status, headers: res.headers };
}

// ─────────────────────────────────────────────
//  1. Infrastructure
// ─────────────────────────────────────────────
section("1. Infrastructure");

{
  const { json, status } = await request("GET", "/health");
  status === 200 && json?.ok && json?.database === "connected"
    ? ok("GET /health → 200 ok, database connected")
    : fail("GET /health", `status=${status} body=${JSON.stringify(json)}`);
}
{
  const { json, status } = await request("GET", "/ready");
  status === 200 && json?.ok
    ? ok("GET /ready → 200 ok")
    : fail("GET /ready", `status=${status}`);
}

// ─────────────────────────────────────────────
//  2. 401 guard — no token
// ─────────────────────────────────────────────
section("2. 401 guard — unauthenticated requests");

const PROTECTED = [
  ["GET", "/api/profile"],
  ["GET", "/api/usage/quota"],
  ["GET", "/api/entitlements"],
];
for (const [method, path] of PROTECTED) {
  const { status, json } = await request(method, path);
  status === 401 && json?.error
    ? ok(`${method} ${path} → 401 ${json.error}`)
    : fail(`${method} ${path} unauth guard`, `status=${status}`);
}

// ─────────────────────────────────────────────
//  3. 401 guard — bad token formats
// ─────────────────────────────────────────────
section("3. 401 guard — malformed / tampered tokens");

const BAD_TOKENS = [
  ["garbage string", "not-a-jwt"],
  ["expired header only", "Bearer eyJhbGciOiJIUzI1NiJ9.e30.bad"],
  ["truncated JWT", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"],
];
for (const [label, token] of BAD_TOKENS) {
  const { status } = await request("GET", "/api/profile", {
    headers: { Authorization: token.startsWith("Bearer") ? token : `Bearer ${token}` },
  });
  status === 401
    ? ok(`${label} → 401`)
    : fail(`${label} should 401`, `got ${status}`);
}

// ─────────────────────────────────────────────
//  4. Real user from DB — ZAKI JWT path
// ─────────────────────────────────────────────
section("4. ZAKI JWT verification path (real DB user)");

let testUser = null;
let accessToken = null;
let refreshCookie = null;

try {
  const db = new pg.Client({ connectionString: DB_URL });
  await db.connect();
  const { rows } = await db.query(
    "SELECT id, email FROM zaki_users WHERE verified = true ORDER BY id LIMIT 1"
  );
  testUser = rows[0] || null;
  await db.end();
} catch (e) {
  fail("DB query for test user", e.message);
}

if (testUser) {
  ok(`Found test user: id=${testUser.id} email=${testUser.email}`);

  accessToken = await mintJwt(testUser.id, testUser.email);

  const { status, json } = await request("GET", "/api/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // /api/profile returns TYP shape: { success, user: { username } }
  const profileEmail = json?.user?.username || json?.email;
  status === 200 && profileEmail === testUser.email
    ? ok(`GET /api/profile → 200, email matches`)
    : fail("GET /api/profile with ZAKI JWT", `status=${status} body=${JSON.stringify(json)}`);

  // Quota endpoint
  {
    const { status: s, json: j } = await request("GET", "/api/usage/quota", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    s === 200
      ? ok(`GET /api/usage/quota → 200`)
      : fail("GET /api/usage/quota", `status=${s} body=${JSON.stringify(j)}`);
  }

  // Expired JWT must 401
  const expiredToken = await mintJwt(testUser.id, testUser.email, "-1s");
  {
    const { status: s } = await request("GET", "/api/profile", {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    s === 401
      ? ok("Expired ZAKI JWT → 401")
      : fail("Expired JWT should 401", `got ${s}`);
  }
} else {
  fail("No verified user in DB — skipping ZAKI path tests", "");
}

// ─────────────────────────────────────────────
//  5. Refresh + Logout (requires a real session row)
// ─────────────────────────────────────────────
section("5. Token refresh + logout");

if (testUser) {
  // Create a real session row via DB
  const db2 = new pg.Client({ connectionString: DB_URL });
  await db2.connect();

  const rawToken = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(rawToken).digest("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    await db2.query(
      `INSERT INTO zaki_sessions (user_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [testUser.id, hash, expires]
    );
    ok("Inserted test refresh session into zaki_sessions");
    refreshCookie = `zaki_refresh=${rawToken}`;
  } catch (e) {
    fail("Insert test session", e.message);
  }

  await db2.end();

  // POST /api/auth/refresh
  if (refreshCookie) {
    const { status, json, headers } = await request("POST", "/api/auth/refresh", {
      cookie: refreshCookie,
    });
    if (status === 200 && json?.token) {
      ok(`POST /api/auth/refresh → 200, new token issued`);
      // Use new token to verify it works
      const newToken = json.token;
      const { status: s2, json: j2 } = await request("GET", "/api/usage/quota", {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      s2 === 200
        ? ok("New token from refresh → /api/usage/quota 200 (ZAKI auth verified)")
        : fail("New token from refresh should work on protected route", `got ${s2} ${JSON.stringify(j2)}`);

      // Reuse old refresh token after rotation — within the 5s concurrent-refresh guard window
      // the server may return a new token (guard hit) or 401. Both are correct.
      const { status: s3, json: j3 } = await request("POST", "/api/auth/refresh", {
        cookie: refreshCookie,
      });
      s3 === 401
        ? ok("Old refresh token after rotation → 401 (hard reject)")
        : (s3 === 200 && j3?.token)
          ? ok("Old refresh token after rotation → 200 via concurrent guard (correct within 5s window)")
          : fail("Old refresh token replay gave unexpected response", `${s3} ${JSON.stringify(j3)}`);

      // Logout — need to find the new cookie from the rotate response
      const setCookie = headers.get("set-cookie") || "";
      const newCookieMatch = setCookie.match(/zaki_refresh=([^;]+)/);
      if (newCookieMatch) {
        const newRefreshCookie = `zaki_refresh=${newCookieMatch[1]}`;
        const { status: s4 } = await request("POST", "/api/auth/logout", {
          cookie: newRefreshCookie,
        });
        s4 === 200
          ? ok("POST /api/auth/logout → 200")
          : fail("POST /api/auth/logout", `got ${s4}`);

        // After logout, refresh should 401
        const { status: s5 } = await request("POST", "/api/auth/refresh", {
          cookie: newRefreshCookie,
        });
        s5 === 401
          ? ok("Refresh after logout → 401")
          : fail("Refresh after logout should 401", `got ${s5}`);
      } else {
        fail("Could not extract new refresh cookie from rotate response", setCookie);
      }
    } else {
      fail("POST /api/auth/refresh", `status=${status} body=${JSON.stringify(json)}`);
    }
  }
}

// ─────────────────────────────────────────────
//  6. Real login (optional — requires CLI args)
// ─────────────────────────────────────────────
section("6. Real login flow");

if (EMAIL_ARG && PASS_ARG) {
  const { status, json, headers } = await request("POST", "/api/auth/login", {
    body: { email: EMAIL_ARG, password: PASS_ARG },
  });
  if (status === 200 && json?.token) {
    ok(`POST /api/auth/login → 200, ZAKI token issued`);
    const setCookie = headers.get("set-cookie") || "";
    setCookie.includes("zaki_refresh")
      ? ok("HttpOnly zaki_refresh cookie set")
      : fail("Missing zaki_refresh cookie in login response", setCookie);

    // Verify token is a ZAKI JWT (iss=zaki)
    try {
      const payload = JSON.parse(Buffer.from(json.token.split(".")[1], "base64url").toString());
      payload.iss === "zaki"
        ? ok(`JWT iss="zaki", sub="${payload.sub}"`)
        : fail("JWT iss should be 'zaki'", JSON.stringify(payload));
    } catch (e) {
      fail("Could not decode login JWT", e.message);
    }
  } else {
    fail("POST /api/auth/login", `status=${status} body=${JSON.stringify(json)}`);
  }
} else {
  console.log("  (skipped — pass email and password as args to test real login)");
  console.log("  Usage: node scripts/smoke-test.mjs user@example.com password123");
}

// ─────────────────────────────────────────────
//  7. Legacy cutoff guard
// ─────────────────────────────────────────────
section("7. Legacy cutoff guard (env-based)");

if (process.env.ZAKI_LEGACY_TYP_AUTH_CUTOFF) {
  console.log(`  ZAKI_LEGACY_TYP_AUTH_CUTOFF=${process.env.ZAKI_LEGACY_TYP_AUTH_CUTOFF} — cutoff active`);
} else {
  ok("ZAKI_LEGACY_TYP_AUTH_CUTOFF not set — legacy path open (expected for migration window)");
}

// ─────────────────────────────────────────────
//  Summary
// ─────────────────────────────────────────────
console.log(`\n${"─".repeat(48)}`);
console.log(`  ${passed} passed   ${failed} failed`);
if (failed > 0) {
  console.error(`\n  SMOKE TEST FAILED`);
  process.exit(1);
} else {
  console.log(`\n  ALL CHECKS PASSED`);
}

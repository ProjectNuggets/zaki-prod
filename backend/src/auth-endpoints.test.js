import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import crypto from "node:crypto";
import { SignJWT, decodeJwt } from "jose";

const dbQueryMock = jest.fn();
const dbGetMock = jest.fn();
const withDbTransactionMock = jest.fn(async (cb) => cb({ query: dbQueryMock }));
jest.unstable_mockModule("./db.js", () => ({
  dbQuery: dbQueryMock,
  dbGet: dbGetMock,
  dbAll: jest.fn(),
  withDbTransaction: withDbTransactionMock,
}));

let buildAuthRouter;
beforeAll(async () => {
  process.env.ZAKI_JWT_SIGNING_KEY = "a".repeat(64);
  process.env.ZAKI_JWT_KID = "test-v1";
  process.env.NODE_ENV = "production"; // so cookie includes Secure
  ({ buildAuthRouter } = await import("./auth-endpoints.js"));
});

beforeEach(() => {
  dbQueryMock.mockReset();
  dbGetMock.mockReset();
  withDbTransactionMock.mockClear();
  withDbTransactionMock.mockImplementation(async (cb) => cb({ query: dbQueryMock }));
});

function makeApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.use("/api/auth", buildAuthRouter());
  return app;
}

async function signCandidateAccessToken({ userId, sessionId }) {
  return new SignJWT({
    email: "alfred@chatzaki.com",
    ...(sessionId ? { sid: sessionId } : {}),
  })
    .setProtectedHeader({ alg: "HS256", kid: "test-v1" })
    .setIssuer("zaki")
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new Uint8Array(Buffer.from("a".repeat(64), "hex")));
}

describe("POST /api/auth/refresh (OATH-07)", () => {
  it("returns 401 when no zaki_refresh cookie", async () => {
    const res = await request(makeApp()).post("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("no_refresh_token");
  });

  it("returns 401 when cookie does not match any session", async () => {
    dbGetMock.mockResolvedValue(null);
    const res = await request(makeApp())
      .post("/api/auth/refresh")
      .set("Cookie", "zaki_refresh=" + "a".repeat(64));
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_refresh_token");
  });

  it("rotates: returns new access token + sets new refresh cookie", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    dbGetMock.mockResolvedValue({ id: "sess-1", user_id: 42, email: "alfred@chatzaki.com", expires_at: new Date(Date.now()+86400000), revoked_at: null });
    dbQueryMock.mockImplementation(async (sql) => {
      if (/SELECT.*FOR UPDATE/i.test(sql)) {
        return { rows: [{ id: "sess-1", user_id: 42, expires_at: new Date(Date.now()+86400000), revoked_at: null }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const res = await request(makeApp())
      .post("/api/auth/refresh")
      .set("Cookie", `zaki_refresh=${rawToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    const cookies = res.headers["set-cookie"] || [];
    const setCookie = cookies.find((c) => c.startsWith("zaki_refresh="));
    expect(setCookie).toBeDefined();
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Secure/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    expect(setCookie).toMatch(/Domain=\.chatzaki\.com/);
    expect(setCookie).toMatch(/Path=\/api\/auth/);
  });
});

describe("POST /api/auth/logout (OATH-08)", () => {
  it("revokes session and clears cookie when valid cookie present", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    const res = await request(makeApp())
      .post("/api/auth/logout")
      .set("Cookie", `zaki_refresh=${rawToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(dbQueryMock).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE zaki_sessions SET revoked_at = NOW\(\)/i),
      expect.any(Array)
    );
    const setCookie = (res.headers["set-cookie"] || []).find((c) => c.startsWith("zaki_refresh="));
    expect(setCookie).toMatch(/Max-Age=0/);
  });

  it("returns 200 + clears cookie even when no cookie present", async () => {
    const res = await request(makeApp()).post("/api/auth/logout");
    expect(res.status).toBe(200);
    const setCookie = (res.headers["set-cookie"] || []).find((c) => c.startsWith("zaki_refresh="));
    expect(setCookie).toMatch(/Max-Age=0/);
  });
});

describe("POST /api/auth/logout/candidate", () => {
  it("revokes only the bearer-bound candidate session and never clears a newer refresh cookie", async () => {
    const candidateSessionId = "2e1ef5a9-7908-4420-8c23-7965f808b999";
    const candidateAccessToken = await signCandidateAccessToken({
      userId: 42,
      sessionId: candidateSessionId,
    });
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });

    const res = await request(makeApp())
      .post("/api/auth/logout/candidate")
      .set("Authorization", `Bearer ${candidateAccessToken}`)
      // Model account C claiming the browser's shared refresh cookie after
      // candidate B already holds its access token.
      .set("Cookie", `zaki_refresh=${crypto.randomBytes(32).toString("hex")}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, revoked: true });
    expect(dbQueryMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /UPDATE\s+zaki_sessions\s+SET\s+revoked_at\s+=\s+NOW\(\)\s+WHERE\s+id\s+=\s+\$1\s+AND\s+user_id\s+=\s+\$2\s+AND\s+revoked_at\s+IS\s+NULL/i
      ),
      [candidateSessionId, "42"]
    );
    // This endpoint must be safe even if a newer tab has already replaced the
    // shared HttpOnly cookie. Clearing it in a delayed response would log C out.
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects a sid-less bearer without mutating or clearing the shared cookie", async () => {
    const sidLessToken = await signCandidateAccessToken({ userId: 42 });

    const res = await request(makeApp())
      .post("/api/auth/logout/candidate")
      .set("Authorization", `Bearer ${sidLessToken}`)
      .set("Cookie", `zaki_refresh=${crypto.randomBytes(32).toString("hex")}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "invalid_candidate_session" });
    expect(dbQueryMock).not.toHaveBeenCalled();
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("POST /api/auth/refresh — concurrent refresh guard (AUTH-06)", () => {
  it("returns existing token when the presented session has a recent linked replacement", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    // First dbGet (the standard lookup) returns null → falls into guard path
    dbGetMock.mockResolvedValueOnce(null);
    // Second dbGet (the guard's secondary lookup) returns the linked replacement.
    const recentSessionId = "053f526d-a5d1-48df-a2b3-4ad8d114a6dc";
    dbGetMock.mockResolvedValueOnce({ id: recentSessionId, user_id: 42, email: "alfred@chatzaki.com" });
    const res = await request(makeApp()).post("/api/auth/refresh").set("Cookie", `zaki_refresh=${rawToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(decodeJwt(res.body.token).sid).toBe(recentSessionId);
    // The guard SQL should reference NOW() - INTERVAL '5 seconds' — assert dbGet was called with that pattern
    const guardCall = dbGetMock.mock.calls.find(([sql]) => /INTERVAL '5 seconds'/i.test(sql));
    expect(guardCall).toBeDefined();
    expect(guardCall?.[0]).toMatch(/replaced_by_session_id/i);
    expect(guardCall?.[0]).toMatch(
      /presented\.revoked_at\s*>\s*NOW\(\)\s*-\s*INTERVAL '5 seconds'/i
    );
  });

  it("rejects a historical revoked token when it has no linked replacement session", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const unrelatedRecentSession = {
      id: "053f526d-a5d1-48df-a2b3-4ad8d114a6dc",
      user_id: 42,
      email: "alfred@chatzaki.com",
    };
    let lookupCount = 0;
    dbGetMock.mockImplementation(async (sql) => {
      lookupCount += 1;
      if (lookupCount === 1) return null; // primary active-session lookup

      // Model a historical revoked token for user 42 alongside a newly active
      // but unrelated session. Only a query that follows an explicit rotation
      // link may recover a sibling-tab refresh.
      return /replaced_by_session_id/i.test(sql) ? null : unrelatedRecentSession;
    });

    const res = await request(makeApp())
      .post("/api/auth/refresh")
      .set("Cookie", `zaki_refresh=${rawToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "invalid_refresh_token" });
  });

  it("returns 401 invalid_refresh_token when guard's secondary lookup also returns null", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    dbGetMock.mockResolvedValueOnce(null); // primary lookup miss
    dbGetMock.mockResolvedValueOnce(null); // guard miss
    const res = await request(makeApp()).post("/api/auth/refresh").set("Cookie", `zaki_refresh=${rawToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_refresh_token");
  });

  it("returns existing token when rotateRefreshToken throws SESSION_NOT_FOUND but a recent session exists", async () => {
    const rawToken = crypto.randomBytes(32).toString("hex");
    dbGetMock.mockResolvedValueOnce({ id: "sess-1", user_id: 42, email: "alfred@chatzaki.com", expires_at: new Date(Date.now()+86400000), revoked_at: null });
    // rotateRefreshToken FOR UPDATE finds nothing → throws SESSION_NOT_FOUND
    dbQueryMock.mockImplementation(async (sql) => {
      if (/SELECT.*FOR UPDATE/i.test(sql)) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });
    // Guard secondary lookup finds recent session
    dbGetMock.mockResolvedValueOnce({ id: "sess-recent", user_id: 42, email: "alfred@chatzaki.com" });
    const res = await request(makeApp()).post("/api/auth/refresh").set("Cookie", `zaki_refresh=${rawToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });
});

describe("POST /api/auth/refresh — [ZakiAudit] session_refresh log (AUTH-07)", () => {
  it("logs [ZakiAudit] session_refresh userId=<id> ip=<ip> after successful rotate", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const rawToken = crypto.randomBytes(32).toString("hex");
    dbGetMock.mockResolvedValue({ id: "sess-1", user_id: 42, email: "alfred@chatzaki.com", expires_at: new Date(Date.now()+86400000), revoked_at: null });
    dbQueryMock.mockImplementation(async (sql) => {
      if (/SELECT.*FOR UPDATE/i.test(sql)) return { rows: [{ id: "sess-1", user_id: 42, expires_at: new Date(Date.now()+86400000), revoked_at: null }], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    await request(makeApp()).post("/api/auth/refresh").set("Cookie", `zaki_refresh=${rawToken}`);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[ZakiAudit\] session_refresh userId=42/));
    logSpy.mockRestore();
  });
});

describe("POST /api/auth/logout — [ZakiAudit] session_revoke log (AUTH-07)", () => {
  it("logs [ZakiAudit] session_revoke userId=<id> reason=logout", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const rawToken = crypto.randomBytes(32).toString("hex");
    dbGetMock.mockResolvedValue({ user_id: 42 });
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    await request(makeApp()).post("/api/auth/logout").set("Cookie", `zaki_refresh=${rawToken}`);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[ZakiAudit\] session_revoke.*reason=logout/));
    logSpy.mockRestore();
  });
});

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import crypto from "node:crypto";

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

describe("POST /api/auth/refresh (OATH-07, OATH-11)", () => {
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
    expect(setCookie).toMatch(/Path=\/api\/auth\/refresh/);
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

describe("Rate limiter on /api/auth/refresh (OATH-11)", () => {
  it("buildAuthRouter exports a refreshLimiter or installs rate limit middleware", async () => {
    const mod = await import("./auth-endpoints.js");
    // The router must include rate limiting; either expose it or assert behavior.
    // We assert by sending 61 requests and expecting at least one 429.
    const app = makeApp();
    let saw429 = false;
    for (let i = 0; i < 65; i++) {
      const r = await request(app).post("/api/auth/refresh"); // 401 normally
      if (r.status === 429) { saw429 = true; break; }
    }
    expect(saw429).toBe(true);
  }, 30000);
});

import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const dbGetMock = jest.fn();
const dbQueryMock = jest.fn();
const withDbTransactionMock = jest.fn(async (cb) => cb({ query: dbQueryMock }));

jest.unstable_mockModule("./db.js", () => ({
  dbQuery: dbQueryMock,
  dbGet: dbGetMock,
  dbAll: jest.fn(),
  withDbTransaction: withDbTransactionMock,
}));

const fetchMock = jest.fn();
global.fetch = fetchMock;

let loginHandler;
beforeAll(async () => {
  process.env.ZAKI_JWT_SIGNING_KEY = "a".repeat(64);
  process.env.ZAKI_JWT_KID = "test-v1";
  process.env.NODE_ENV = "production";
  process.env.NOVA_TYP_BASE_URL = "http://typ:3001/api";
  ({ loginHandler } = await import("./login-handler.js"));
});

beforeEach(() => {
  dbGetMock.mockReset();
  dbQueryMock.mockReset();
  fetchMock.mockReset();
  withDbTransactionMock.mockClear();
  withDbTransactionMock.mockImplementation(async (cb) => cb({ query: dbQueryMock }));
});

function makeApp() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.post("/login", loginHandler);
  return app;
}

// bcryptjs hash of "password" with rounds=4 (fast for tests, still valid bcrypt)
const BCRYPT_HASH_FOR_PASSWORD = "$2a$04$GZJl0Ju7BhV3MEN8EvWGpuZSYFHlOrPHWpDoBNHuoWQp/rCW3quKS";

describe("loginHandler — ZAKI session minting (OATH-01..05, OATH-10)", () => {
  it("OATH-04: response body is { valid:true, token:<ZAKI JWT> } — no TYP token in body", async () => {
    dbGetMock.mockResolvedValue({ id: 42, email: "alfred@chatzaki.com", password_hash: BCRYPT_HASH_FOR_PASSWORD, verified: 1, nova_user_id: 7 });
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: "TYP-OPAQUE-TOKEN" }) });

    const res = await request(makeApp()).post("/login").send({ email: "alfred@chatzaki.com", password: "password" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(typeof res.body.token).toBe("string");
    // Must be a JWT (3 dot-separated parts), NOT the TYP opaque token
    expect(res.body.token.split(".").length).toBe(3);
    expect(res.body.token).not.toBe("TYP-OPAQUE-TOKEN");
    const { decodeJwt } = await import("jose");
    const payload = decodeJwt(res.body.token);
    expect(payload.iss).toBe("zaki");
    expect(payload.sub).toBe("42");
  });

  it("OATH-03: sets HttpOnly refresh cookie with locked attributes", async () => {
    dbGetMock.mockResolvedValue({ id: 42, email: "alfred@chatzaki.com", password_hash: BCRYPT_HASH_FOR_PASSWORD, verified: 1, nova_user_id: 7 });
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: "TYP-OPAQUE" }) });

    const res = await request(makeApp()).post("/login").send({ email: "alfred@chatzaki.com", password: "password" });
    const setCookie = (res.headers["set-cookie"] || []).find((c) => c.startsWith("zaki_refresh="));
    expect(setCookie).toBeDefined();
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Secure/);
    expect(setCookie).toMatch(/SameSite=Strict/);
    expect(setCookie).toMatch(/Domain=\.chatzaki\.com/);
    expect(setCookie).toMatch(/Path=\/api\/auth\/refresh/);
  });

  it("OATH-05: login succeeds when TYP fetch rejects (best-effort)", async () => {
    dbGetMock.mockResolvedValue({ id: 42, email: "alfred@chatzaki.com", password_hash: BCRYPT_HASH_FOR_PASSWORD, verified: 1, nova_user_id: 7 });
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await request(makeApp()).post("/login").send({ email: "alfred@chatzaki.com", password: "password" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(typeof res.body.token).toBe("string");
  });

  it("OATH-05: login succeeds when TYP returns non-OK", async () => {
    dbGetMock.mockResolvedValue({ id: 42, email: "alfred@chatzaki.com", password_hash: BCRYPT_HASH_FOR_PASSWORD, verified: 1, nova_user_id: 7 });
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: "down" }) });

    const res = await request(makeApp()).post("/login").send({ email: "alfred@chatzaki.com", password: "password" });
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it("OATH-05: when TYP succeeds, an UPDATE writes typ_session_token to zaki_sessions", async () => {
    dbGetMock.mockResolvedValue({ id: 42, email: "alfred@chatzaki.com", password_hash: BCRYPT_HASH_FOR_PASSWORD, verified: 1, nova_user_id: 7 });
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: "TYP-OPAQUE-XYZ" }) });

    await request(makeApp()).post("/login").send({ email: "alfred@chatzaki.com", password: "password" });
    expect(dbQueryMock).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE zaki_sessions SET typ_session_token = \$1 WHERE refresh_token_hash = \$2/i),
      ["TYP-OPAQUE-XYZ", expect.stringMatching(/^[0-9a-f]{64}$/)]
    );
  });
});

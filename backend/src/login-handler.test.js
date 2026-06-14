// Tests for login-handler.js [ZakiAudit] login log (AUTH-07)
// Phase 4: TYP fetch removed — fetchMock no longer needed.
// Mocking patterns mirror auth-endpoints.test.js verbatim.

import { jest } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";

const dbGetMock = jest.fn();
const dbQueryMock = jest.fn();
const withDbTransactionMock = jest.fn(async (cb) => cb({ query: dbQueryMock }));

jest.unstable_mockModule("./db.js", () => ({
  dbQuery: dbQueryMock,
  dbGet: dbGetMock,
  dbAll: jest.fn(),
  withDbTransaction: withDbTransactionMock,
}));

const mintZakiSessionMock = jest.fn();
const revokeAllSessionsForUserMock = jest.fn();

jest.unstable_mockModule("./zaki-auth.js", () => ({
  mintZakiSession: mintZakiSessionMock,
  verifyZakiAccessToken: jest.fn(),
  tryDecodeJwtPayload: jest.fn(),
  revokeAllSessionsForUser: revokeAllSessionsForUserMock,
}));

const buildRefreshCookieMock = jest.fn(() => "zaki_refresh=mock; HttpOnly");
const buildClearedRefreshCookieMock = jest.fn(() => "zaki_refresh=; Max-Age=0");

jest.unstable_mockModule("./zaki-session-cookie.js", () => ({
  COOKIE_NAME: "zaki_refresh",
  buildRefreshCookie: buildRefreshCookieMock,
  buildClearedRefreshCookie: buildClearedRefreshCookieMock,
}));

let loginHandler;

beforeAll(async () => {
  process.env.ZAKI_JWT_SIGNING_KEY = "a".repeat(64);
  process.env.ZAKI_JWT_KID = "test-v1";
  process.env.NODE_ENV = "test";
  ({ loginHandler } = await import("./login-handler.js"));
});

beforeEach(() => {
  dbGetMock.mockReset();
  dbQueryMock.mockReset();
  withDbTransactionMock.mockClear();
  withDbTransactionMock.mockImplementation(async (cb) => cb({ query: dbQueryMock }));
  mintZakiSessionMock.mockReset();
  revokeAllSessionsForUserMock.mockReset();
  buildRefreshCookieMock.mockReturnValue("zaki_refresh=mock; HttpOnly");
});

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
}

describe("loginHandler — [ZakiAudit] login log (AUTH-07)", () => {
  it("logs [ZakiAudit] login userId=<id> ip=<ip> after successful bcrypt+mint", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Return a verified user with a known bcrypt hash for "testpass"
    // Use a pre-computed hash so we don't need to run bcrypt in test setup
    const { default: bcrypt } = await import("bcryptjs");
    const passwordHash = await bcrypt.hash("testpass", 4);

    dbGetMock.mockResolvedValue({
      id: 42,
      email: "a@chatzaki.com",
      verified: true,
      password_hash: passwordHash,
      nova_user_id: 7,
    });

    mintZakiSessionMock.mockResolvedValue({
      accessToken: "zaki-access-jwt",
      refreshToken: "refresh-token",
      refreshTokenHash: "refresh-hash",
    });

    const req = {
      body: { email: "a@chatzaki.com", password: "testpass" },
      ip: "10.0.0.5",
      headers: { "user-agent": "jest" },
    };
    const res = makeRes();

    await loginHandler(req, res);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[ZakiAudit\] login userId=42 ip=10\.0\.0\.5/)
    );

    logSpy.mockRestore();
  });

  it("throttles repeated invalid credential attempts for the same email", async () => {
    dbGetMock.mockResolvedValue(null);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = makeRes();
      await loginHandler(
        {
          body: { email: "blocked-login@example.com", password: "wrong" },
          ip: "10.0.0.5",
          headers: { "user-agent": "jest" },
        },
        res
      );
      expect(res.status).toHaveBeenCalledWith(401);
    }

    const throttledRes = makeRes();
    await loginHandler(
      {
        body: { email: "blocked-login@example.com", password: "wrong" },
        ip: "10.0.0.5",
        headers: { "user-agent": "jest" },
      },
      throttledRes
    );

    expect(throttledRes.status).toHaveBeenCalledWith(429);
    expect(throttledRes.json).toHaveBeenCalledWith({
      valid: false,
      token: null,
      message: "Too many failed login attempts. Try again later.",
    });
  });

  it("keeps backend index routes wired to the shared login handler", () => {
    const indexSource = fs.readFileSync(
      path.join(process.cwd(), "src/index.js"),
      "utf8"
    );

    expect(indexSource).toContain('import { loginHandler as zakiLoginHandler } from "./login-handler.js";');
    expect(indexSource).toContain('app.post("/login", zakiLoginHandler);');
    expect(indexSource).toContain('app.post("/api/login", zakiLoginHandler);');
    expect(indexSource).not.toMatch(/const\s+loginHandler\s*=\s*async/);
  });
});

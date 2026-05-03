// Tests for login-handler.js [ZakiAudit] login log (AUTH-07)
// Phase 4: TYP fetch removed — fetchMock no longer needed.
// Mocking patterns mirror auth-endpoints.test.js verbatim.

import { jest } from "@jest/globals";

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
});

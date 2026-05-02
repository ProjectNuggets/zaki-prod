import { jest } from "@jest/globals";
import crypto from "node:crypto";

// --- Mocks (must come before dynamic import) ---
const dbQueryMock = jest.fn();
const dbGetMock = jest.fn();
const dbAllMock = jest.fn();
const withDbTransactionMock = jest.fn(async (cb) => cb({ query: dbQueryMock }));

jest.unstable_mockModule("./db.js", () => ({
  dbQuery: dbQueryMock,
  dbGet: dbGetMock,
  dbAll: dbAllMock,
  withDbTransaction: withDbTransactionMock,
}));

// 64-char hex (256-bit) signing key for tests
const TEST_SIGNING_KEY = "a".repeat(64);

let zakiAuth;
beforeAll(async () => {
  process.env.ZAKI_JWT_SIGNING_KEY = TEST_SIGNING_KEY;
  process.env.ZAKI_JWT_KID = "test-v1";
  zakiAuth = await import("./zaki-auth.js");
});

beforeEach(() => {
  dbQueryMock.mockReset();
  dbGetMock.mockReset();
  dbAllMock.mockReset();
  withDbTransactionMock.mockClear();
  withDbTransactionMock.mockImplementation(async (cb) => cb({ query: dbQueryMock }));
});

const fakeUser = { id: 42, email: "alfred@chatzaki.com" };
const fakeReq = { ip: "10.0.0.1", headers: { "user-agent": "jest" } };

describe("mintZakiSession (OATH-01, OATH-02)", () => {
  it("returns accessToken, refreshToken, refreshTokenHash", async () => {
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    const result = await zakiAuth.mintZakiSession(fakeUser, fakeReq);
    expect(typeof result.accessToken).toBe("string");
    expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
    expect(result.refreshTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.refreshTokenHash).toBe(
      crypto.createHash("sha256").update(result.refreshToken).digest("hex")
    );
  });

  it("INSERTs into zaki_sessions with user_id, refresh_token_hash, expires_at, ip, ua", async () => {
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    await zakiAuth.mintZakiSession(fakeUser, fakeReq);
    expect(dbQueryMock).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO zaki_sessions/i),
      expect.arrayContaining([42, expect.stringMatching(/^[0-9a-f]{64}$/), expect.any(Date), "10.0.0.1", "jest"])
    );
  });

  it("accessToken is HS256 JWT with iss=zaki, sub=<userId>, email, jti, kid header", async () => {
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    const { accessToken } = await zakiAuth.mintZakiSession(fakeUser, fakeReq);
    const { decodeJwt, decodeProtectedHeader } = await import("jose");
    const header = decodeProtectedHeader(accessToken);
    expect(header.alg).toBe("HS256");
    expect(header.kid).toBe("test-v1");
    const payload = decodeJwt(accessToken);
    expect(payload.iss).toBe("zaki");
    expect(payload.sub).toBe("42");
    expect(payload.email).toBe("alfred@chatzaki.com");
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.exp - payload.iat).toBe(15 * 60);
  });

  it("logs [ZakiAudit] session_mint userId=<id> ip=<ip> (AUTH-07)", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    await zakiAuth.mintZakiSession(fakeUser, fakeReq);
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[ZakiAudit\] session_mint userId=42 ip=10\.0\.0\.1/));
    logSpy.mockRestore();
  });
});

describe("verifyZakiAccessToken (OATH-01)", () => {
  it("returns payload for valid token", async () => {
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    const { accessToken } = await zakiAuth.mintZakiSession(fakeUser, fakeReq);
    const payload = await zakiAuth.verifyZakiAccessToken(accessToken);
    expect(payload).not.toBeNull();
    expect(payload.iss).toBe("zaki");
    expect(payload.sub).toBe("42");
  });
  it("returns null for tampered token", async () => {
    const result = await zakiAuth.verifyZakiAccessToken("not.a.jwt");
    expect(result).toBeNull();
  });
  it("returns null for token signed with different key", async () => {
    const { SignJWT } = await import("jose");
    const otherKey = new Uint8Array(Buffer.from("b".repeat(64), "hex"));
    const bad = await new SignJWT({ email: "x" }).setProtectedHeader({ alg: "HS256" })
      .setIssuer("zaki").setSubject("42").setExpirationTime("15m").setIssuedAt().sign(otherKey);
    expect(await zakiAuth.verifyZakiAccessToken(bad)).toBeNull();
  });
});

describe("rotateRefreshToken (OATH-07)", () => {
  it("revokes old row and inserts new row inside withDbTransaction", async () => {
    const oldHash = "f".repeat(64);
    dbQueryMock.mockImplementation(async (sql) => {
      if (/SELECT.*FOR UPDATE/i.test(sql)) {
        return { rows: [{ id: "old-uuid", user_id: 42, expires_at: new Date(Date.now()+86400000), revoked_at: null }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const result = await zakiAuth.rotateRefreshToken(oldHash, fakeUser, fakeReq);
    expect(withDbTransactionMock).toHaveBeenCalled();
    expect(dbQueryMock).toHaveBeenCalledWith(expect.stringMatching(/UPDATE zaki_sessions SET revoked_at/i), expect.arrayContaining(["old-uuid"]));
    expect(dbQueryMock).toHaveBeenCalledWith(expect.stringMatching(/INSERT INTO zaki_sessions/i), expect.any(Array));
    expect(typeof result.accessToken).toBe("string");
    expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
  });
  it("throws Error with code SESSION_NOT_FOUND when old row missing", async () => {
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(zakiAuth.rotateRefreshToken("missing", fakeUser, fakeReq))
      .rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
  });
});

describe("revokeAllSessionsForUser", () => {
  it("UPDATEs all active sessions for user_id", async () => {
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 3 });
    await zakiAuth.revokeAllSessionsForUser(42);
    expect(dbQueryMock).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE zaki_sessions SET revoked_at = NOW\(\) WHERE user_id = \$1 AND revoked_at IS NULL/i),
      [42]
    );
  });
});

describe("tryDecodeJwtPayload", () => {
  it("returns payload object for valid jwt", async () => {
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 1 });
    const { accessToken } = await zakiAuth.mintZakiSession(fakeUser, fakeReq);
    const payload = zakiAuth.tryDecodeJwtPayload(accessToken);
    expect(payload.iss).toBe("zaki");
  });
  it("returns null for garbage", () => {
    expect(zakiAuth.tryDecodeJwtPayload("garbage")).toBeNull();
  });
});

describe("cleanupExpiredSessions", () => {
  it("DELETEs rows older than 7 days (expired or revoked)", async () => {
    dbQueryMock.mockResolvedValue({ rows: [], rowCount: 5 });
    await zakiAuth.cleanupExpiredSessions();
    expect(dbQueryMock).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM zaki_sessions WHERE expires_at < NOW\(\) - INTERVAL '7 days' OR \(revoked_at IS NOT NULL AND revoked_at < NOW\(\) - INTERVAL '7 days'\)/i)
    );
  });
});

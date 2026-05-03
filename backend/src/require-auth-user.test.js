// RED tests for Phase 2 require-auth-user.js (created by Wave 2)
// These tests MUST fail with "Cannot find module './require-auth-user.js'" until 02-02-PLAN runs.
// Mocking patterns mirror zaki-auth.test.js verbatim.

import { jest } from "@jest/globals";

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

const verifyZakiAccessTokenMock = jest.fn();
const tryDecodeJwtPayloadMock = jest.fn();
const mintZakiSessionMock = jest.fn();
const revokeAllSessionsForUserMock = jest.fn();

jest.unstable_mockModule("./zaki-auth.js", () => ({
  verifyZakiAccessToken: verifyZakiAccessTokenMock,
  tryDecodeJwtPayload: tryDecodeJwtPayloadMock,
  mintZakiSession: mintZakiSessionMock,
  revokeAllSessionsForUser: revokeAllSessionsForUserMock,
}));

const TEST_SIGNING_KEY = "a".repeat(64);

// Injected dependency mocks (Wave 2 contract: createRequireAuthUser({ ... }))
const novaSessionRequestMock = jest.fn();
const normalizeEmailMock = jest.fn((email) => email.trim().toLowerCase());
const resolveCanonicalAgentUserIdMock = jest.fn((ctx) => String(ctx.zakiUser?.id || ""));
const mapBotBffAuthFailureMock = jest.fn((reason, requestId) => ({ status: 401, body: { error: reason } }));
const getOrCreateRequestIdMock = jest.fn(() => "req-test-id");
const buildDevAuthResultFromUserIdMock = jest.fn();

let requireAuthUser;
let requireBotBffContext;
let createRequireAuthUserFn;

const standardDeps = () => ({
  novaSessionRequest: novaSessionRequestMock,
  normalizeEmail: normalizeEmailMock,
  resolveCanonicalAgentUserId: resolveCanonicalAgentUserIdMock,
  mapBotBffAuthFailure: mapBotBffAuthFailureMock,
  getOrCreateRequestId: getOrCreateRequestIdMock,
  NULLCLAW_DEV_USER_ID: null,
  buildDevAuthResultFromUserId: buildDevAuthResultFromUserIdMock,
});

beforeAll(async () => {
  process.env.ZAKI_JWT_SIGNING_KEY = TEST_SIGNING_KEY;
  process.env.ZAKI_JWT_KID = "test-v1";
  delete process.env.NULLCLAW_DEV_USER_ID;

  const mod = await import("./require-auth-user.js");
  createRequireAuthUserFn = mod.createRequireAuthUser;
  const factory = createRequireAuthUserFn(standardDeps());
  requireAuthUser = factory.requireAuthUser;
  requireBotBffContext = factory.requireBotBffContext;
});

beforeEach(() => {
  dbQueryMock.mockReset();
  dbGetMock.mockReset();
  dbAllMock.mockReset();
  withDbTransactionMock.mockClear();
  withDbTransactionMock.mockImplementation(async (cb) => cb({ query: dbQueryMock }));
  verifyZakiAccessTokenMock.mockReset();
  tryDecodeJwtPayloadMock.mockReset();
  mintZakiSessionMock.mockReset();
  revokeAllSessionsForUserMock.mockReset();
  novaSessionRequestMock.mockReset();
  normalizeEmailMock.mockImplementation((email) => email.trim().toLowerCase());
  resolveCanonicalAgentUserIdMock.mockImplementation((ctx) => String(ctx.zakiUser?.id || ""));
  mapBotBffAuthFailureMock.mockImplementation((reason, requestId) => ({ status: 401, body: { error: reason } }));
  getOrCreateRequestIdMock.mockImplementation(() => "req-test-id");
  buildDevAuthResultFromUserIdMock.mockReset();
  delete process.env.NULLCLAW_DEV_USER_ID;
});

function makeRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), setHeader: jest.fn() };
}
function makeReq(overrides = {}) {
  return { headers: { authorization: "Bearer test-token", ...(overrides.headers || {}) }, ip: "10.0.0.5", ...overrides };
}

// ---------------------------------------------------------------------------
// 1. Token extraction (AUTH-01)
// ---------------------------------------------------------------------------
describe("requireAuthUser — token extraction (AUTH-01)", () => {
  it("returns 401 + auth_required when no Authorization header", async () => {
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const result = await requireAuthUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "auth_required" }));
    expect(result).toBeNull();
  });

  it("returns 401 when Authorization header is malformed (no Bearer prefix)", async () => {
    const req = makeReq({ headers: { authorization: "Token abc" } });
    const res = makeRes();
    const result = await requireAuthUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "auth_required" }));
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. ZAKI path (AUTH-01, AUTH-03, AUTH-04)
// ---------------------------------------------------------------------------
describe("requireAuthUser — ZAKI path (AUTH-01, AUTH-03, AUTH-04)", () => {
  const fakeRow = {
    id: 42,
    email: "a@chatzaki.com",
    verified: true,
    plan_tier: "free",
    plan_status: "active",
    nova_user_id: 7,
    current_period_end: null,
  };

  it("calls verifyZakiAccessToken when iss === 'zaki' and DOES NOT call novaSessionRequest", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({ iss: "zaki", sub: "42" });
    verifyZakiAccessTokenMock.mockResolvedValue({ iss: "zaki", sub: "42", email: "a@chatzaki.com" });
    dbGetMock.mockResolvedValue(fakeRow);

    const req = makeReq({ headers: { authorization: "Bearer zaki-token-here" } });
    const res = makeRes();
    const result = await requireAuthUser(req, res);

    expect(verifyZakiAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(verifyZakiAccessTokenMock).toHaveBeenCalledWith("zaki-token-here");
    expect(novaSessionRequestMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ email: "a@chatzaki.com", zakiUser: fakeRow, sessionUser: null });
  });

  it("returns 401 invalid_token when verifyZakiAccessToken returns null", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({ iss: "zaki", sub: "42" });
    verifyZakiAccessTokenMock.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();
    const result = await requireAuthUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_token" }));
    expect(result).toBeNull();
  });

  it("returns 401 user_not_found when zaki_users row missing", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({ iss: "zaki", sub: "42" });
    verifyZakiAccessTokenMock.mockResolvedValue({ iss: "zaki", sub: "42", email: "a@chatzaki.com" });
    dbGetMock.mockResolvedValue(null);

    const req = makeReq();
    const res = makeRes();
    const result = await requireAuthUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "user_not_found" }));
    expect(result).toBeNull();
  });

  it("returns 401 user_not_found when zakiUser.verified === false", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({ iss: "zaki", sub: "42" });
    verifyZakiAccessTokenMock.mockResolvedValue({ iss: "zaki", sub: "42", email: "a@chatzaki.com" });
    dbGetMock.mockResolvedValue({ ...fakeRow, verified: false });

    const req = makeReq();
    const res = makeRes();
    const result = await requireAuthUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "user_not_found" }));
    expect(result).toBeNull();
  });

  it("SELECT query specifies columns and EXCLUDES password_hash (AUTH-03)", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({ iss: "zaki", sub: "42" });
    verifyZakiAccessTokenMock.mockResolvedValue({ iss: "zaki", sub: "42", email: "a@chatzaki.com" });
    dbGetMock.mockResolvedValue(fakeRow);

    const req = makeReq();
    const res = makeRes();
    await requireAuthUser(req, res);

    const [sql, args] = dbGetMock.mock.calls[0];
    expect(sql).toMatch(/SELECT id, email, verified, plan_tier, plan_status, nova_user_id, current_period_end FROM zaki_users WHERE id = \$1/);
    expect(args).toEqual([42]);
    expect(sql).not.toMatch(/password_hash/i);
  });
});

// ---------------------------------------------------------------------------
// 3. Legacy TYP path (AUTH-02, AUTH-04, AUTH-05)
// ---------------------------------------------------------------------------
describe("requireAuthUser — legacy TYP path (AUTH-02, AUTH-04, AUTH-05)", () => {
  const fakeRow = {
    id: 42,
    email: "a@chatzaki.com",
    verified: true,
    plan_tier: "free",
    plan_status: "active",
    nova_user_id: 7,
    current_period_end: null,
  };

  it("calls novaSessionRequest with /system/refresh-user when iss !== 'zaki'", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ email: "a@chatzaki.com", username: "a@chatzaki.com" }),
    });
    dbGetMock.mockResolvedValue(fakeRow);
    mintZakiSessionMock.mockResolvedValue({ accessToken: "new-jwt", refreshToken: "rt", refreshTokenHash: "hash" });

    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    const result = await requireAuthUser(req, res);

    expect(novaSessionRequestMock).toHaveBeenCalledTimes(1);
    expect(novaSessionRequestMock).toHaveBeenCalledWith(
      "/system/refresh-user",
      "Bearer legacy-token",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).toMatchObject({
      email: "a@chatzaki.com",
      zakiUser: fakeRow,
      sessionUser: { email: "a@chatzaki.com", username: "a@chatzaki.com" },
    });
  });

  it("aborts after 5 seconds via AbortController (AUTH-04)", async () => {
    jest.useFakeTimers();
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockImplementation(
      (path, header, opts) =>
        new Promise((_, reject) => {
          opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
        })
    );

    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();

    const promise = requireAuthUser(req, res);
    jest.advanceTimersByTime(5001);
    const result = await promise;

    expect(result).toBeNull();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_token" }));

    jest.useRealTimers();
  });

  it("mints ZAKI session and sets X-Zaki-Session-Upgrade header on legacy success (AUTH-05)", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ email: "a@chatzaki.com", username: "a@chatzaki.com" }),
    });
    dbGetMock.mockResolvedValue(fakeRow);
    mintZakiSessionMock.mockResolvedValue({ accessToken: "new-jwt", refreshToken: "rt", refreshTokenHash: "hash" });

    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    await requireAuthUser(req, res);

    expect(mintZakiSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, email: "a@chatzaki.com" }),
      req
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-Zaki-Session-Upgrade", "1");
  });

  it("legacy SELECT uses email column and EXCLUDES password_hash (AUTH-03)", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ email: "a@chatzaki.com", username: "a@chatzaki.com" }),
    });
    dbGetMock.mockResolvedValue(fakeRow);
    mintZakiSessionMock.mockResolvedValue({ accessToken: "new-jwt", refreshToken: "rt", refreshTokenHash: "hash" });

    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    await requireAuthUser(req, res);

    const [sql] = dbGetMock.mock.calls[0];
    expect(sql).toMatch(/SELECT id, email, verified, plan_tier, plan_status, nova_user_id, current_period_end FROM zaki_users WHERE email = \$1/);
    expect(sql).not.toMatch(/password_hash/i);
  });

  it("returns 401 invalid_token when novaSessionRequest returns ok=false", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    const req = makeReq();
    const res = makeRes();
    const result = await requireAuthUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_token" }));
    expect(result).toBeNull();
  });

  it("returns 401 invalid_token when TYP body has no email", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const req = makeReq();
    const res = makeRes();
    const result = await requireAuthUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "invalid_token" }));
    expect(result).toBeNull();
  });

  it("legacy session mint failure does NOT block the request (best-effort)", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ email: "a@chatzaki.com", username: "a@chatzaki.com" }),
    });
    dbGetMock.mockResolvedValue(fakeRow);
    mintZakiSessionMock.mockRejectedValue(new Error("db down"));

    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    const result = await requireAuthUser(req, res);

    expect(result).not.toBeNull();
    expect(result).toMatchObject({ email: "a@chatzaki.com", zakiUser: fakeRow });
    expect(res.setHeader).not.toHaveBeenCalledWith("X-Zaki-Session-Upgrade", expect.anything());
  });
});

// ---------------------------------------------------------------------------
// 4. [ZakiAudit] legacy_typ_path log (AUTH-07)
// ---------------------------------------------------------------------------
describe("requireAuthUser — [ZakiAudit] legacy_typ_path log (AUTH-07)", () => {
  const fakeRow = {
    id: 42,
    email: "a@chatzaki.com",
    verified: true,
    plan_tier: "free",
    plan_status: "active",
    nova_user_id: 7,
    current_period_end: null,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("logs `[ZakiAudit] legacy_typ_path userId=<id> ip=<ip>` on legacy success", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ email: "a@chatzaki.com", username: "a@chatzaki.com" }),
    });
    dbGetMock.mockResolvedValue(fakeRow);
    mintZakiSessionMock.mockResolvedValue({ accessToken: "new-jwt", refreshToken: "rt", refreshTokenHash: "hash" });

    const req = makeReq({ ip: "10.0.0.5", headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    await requireAuthUser(req, res);

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[ZakiAudit\] legacy_typ_path userId=42 ip=10\.0\.0\.5/)
    );
  });
});

// ---------------------------------------------------------------------------
// 5. requireBotBffContext — same dual-auth (AUTH-02)
// ---------------------------------------------------------------------------
describe("requireBotBffContext — same dual-auth (AUTH-02)", () => {
  const fakeRow = {
    id: 42,
    email: "a@chatzaki.com",
    verified: true,
    plan_tier: "free",
    plan_status: "active",
    nova_user_id: 7,
    current_period_end: null,
  };

  it("calls verifyZakiAccessToken when iss === 'zaki' (does not hit network)", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({ iss: "zaki", sub: "42" });
    verifyZakiAccessTokenMock.mockResolvedValue({ iss: "zaki", sub: "42", email: "a@chatzaki.com" });
    dbGetMock.mockResolvedValue(fakeRow);

    const req = makeReq({ headers: { authorization: "Bearer zaki-token" } });
    const res = makeRes();
    const nextMock = jest.fn();
    await requireBotBffContext(req, res, nextMock);

    expect(verifyZakiAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(novaSessionRequestMock).not.toHaveBeenCalled();
    expect(nextMock).toHaveBeenCalled();
    expect(req.botBffContext).toMatchObject({
      email: "a@chatzaki.com",
      zakiUser: fakeRow,
      userId: expect.any(String),
    });
  });

  it("uses TYP fallback when iss missing — sets req.botBffContext from TYP response", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ email: "a@chatzaki.com", username: "a@chatzaki.com" }),
    });
    dbGetMock.mockResolvedValue(fakeRow);
    mintZakiSessionMock.mockResolvedValue({ accessToken: "new-jwt", refreshToken: "rt", refreshTokenHash: "hash" });

    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    const nextMock = jest.fn();
    await requireBotBffContext(req, res, nextMock);

    expect(novaSessionRequestMock).toHaveBeenCalledTimes(1);
    expect(nextMock).toHaveBeenCalled();
    expect(req.botBffContext).toMatchObject({
      email: "a@chatzaki.com",
      sessionUser: { email: "a@chatzaki.com", username: "a@chatzaki.com" },
    });
  });

  it("preserves dev-mode bypass via NULLCLAW_DEV_USER_ID env var", async () => {
    // Create a factory with NULLCLAW_DEV_USER_ID set
    const devBuildDevAuthResult = jest.fn().mockResolvedValue({
      email: "dev@localhost",
      sessionUser: { username: "dev@localhost" },
      zakiUser: { id: 99 },
      userId: "99",
    });
    const devMod = await import("./require-auth-user.js");
    const devFactory = devMod.createRequireAuthUser({
      novaSessionRequest: novaSessionRequestMock,
      normalizeEmail: normalizeEmailMock,
      resolveCanonicalAgentUserId: resolveCanonicalAgentUserIdMock,
      mapBotBffAuthFailure: mapBotBffAuthFailureMock,
      getOrCreateRequestId: getOrCreateRequestIdMock,
      NULLCLAW_DEV_USER_ID: "99",
      buildDevAuthResultFromUserId: devBuildDevAuthResult,
    });

    const req = makeReq();
    const res = makeRes();
    const nextMock = jest.fn();
    await devFactory.requireBotBffContext(req, res, nextMock);

    expect(verifyZakiAccessTokenMock).not.toHaveBeenCalled();
    expect(novaSessionRequestMock).not.toHaveBeenCalled();
    expect(nextMock).toHaveBeenCalled();
    expect(req.botBffContext).toMatchObject({ userId: "99" });
  });
});

// ---------------------------------------------------------------------------
// 6. SUN-02 — cutoff guard (legacyTypCutoffMs via zakiAuthOverrides)
// ---------------------------------------------------------------------------
describe("resolveLegacyPath — SUN-02 cutoff guard", () => {
  const legacySuccess = () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    novaSessionRequestMock.mockResolvedValue({
      ok: true,
      json: async () => ({ email: "a@chatzaki.com" }),
    });
    dbGetMock.mockResolvedValue({ id: 42, email: "a@chatzaki.com", verified: true, plan_tier: "free", plan_status: "active", nova_user_id: 7, current_period_end: null });
    mintZakiSessionMock.mockResolvedValue({ accessToken: "t", refreshToken: "r", refreshTokenHash: "h" });
  };

  const makeCutoffFactory = (legacyTypCutoffMs) =>
    createRequireAuthUserFn({ ...standardDeps(), zakiAuthOverrides: { legacyTypCutoffMs } });

  it("proceeds normally when cutoff is null (unset)", async () => {
    legacySuccess();
    const { requireAuthUser: authUser } = makeCutoffFactory(null);
    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    const result = await authUser(req, res);
    expect(novaSessionRequestMock).toHaveBeenCalledTimes(1);
    expect(result).not.toBeNull();
  });

  it("proceeds normally when cutoff is in the future", async () => {
    legacySuccess();
    const { requireAuthUser: authUser } = makeCutoffFactory(Date.now() + 86400000);
    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    await authUser(req, res);
    expect(novaSessionRequestMock).toHaveBeenCalledTimes(1);
  });

  it("returns 401 session_expired without calling TYP when cutoff is in the past", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    const { requireAuthUser: authUser } = makeCutoffFactory(Date.now() - 1000);
    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    const result = await authUser(req, res);
    expect(novaSessionRequestMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "session_expired",
      code: "session_expired",
      message: "Please log in again.",
    });
    expect(result).toBeNull();
  });

  it("proceeds normally when legacyTypCutoffMs is NaN (invalid date)", async () => {
    legacySuccess();
    const { requireAuthUser: authUser } = makeCutoffFactory(NaN);
    const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
    const res = makeRes();
    await authUser(req, res);
    expect(novaSessionRequestMock).toHaveBeenCalledTimes(1);
  });

  it("blocks at the exact cutoff boundary (Date.now() === cutoffMs)", async () => {
    tryDecodeJwtPayloadMock.mockReturnValue({});
    const cutoffMs = 1_700_000_000_000;
    jest.useFakeTimers();
    jest.setSystemTime(cutoffMs);
    try {
      const { requireAuthUser: authUser } = makeCutoffFactory(cutoffMs);
      const req = makeReq({ headers: { authorization: "Bearer legacy-token" } });
      const res = makeRes();
      const result = await authUser(req, res);
      expect(novaSessionRequestMock).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(result).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});

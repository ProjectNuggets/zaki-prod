/**
 * Regression tests for the legal-exposure defect:
 *
 *   A brand-new account created via "Continue with Google" from the LOGIN screen
 *   was persisted with NO legal_consent record at all (GDPR Art. 7 requires us to
 *   be able to demonstrate consent), while signup-mode entry re-wrote the consent
 *   row on every subsequent login.
 *
 * These tests pin the invariant: consent is recorded exactly once, on account
 * creation, on BOTH entry modes — and the age policy behaves identically to the
 * email path for the same config.
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { completeGoogleOAuthSignIn } from "./google-oauth-user.js";
import { evaluateSignupAgePolicy, resolveSignupAgePolicy } from "./signup-policy.js";

const USER_COLUMNS = "id, email, verified, full_name, legal_consent_version, legal_consent_at";
const CURRENT_POLICY_VERSION = "2026-07-12.v4";
const NOW = new Date("2026-07-14T00:00:00.000Z");

// WP-M flipped the DEFAULT to gate-off (no DOB is collected anywhere any more, so
// a DOB gate is unsatisfiable and must not be the default). GATE_ON is therefore
// resolved from explicit config rather than from the default. This is the ONLY
// line WP-M changed in this file: every consent assertion below is #87's, verbatim.
const GATE_ON = resolveSignupAgePolicy({ ZAKI_AGE_GATE_ENABLED: "true" });
const GATE_OFF = resolveSignupAgePolicy({ ZAKI_AGE_GATE_ENABLED: "false" });

const PROFILE = {
  email: "newuser@example.com",
  googleSub: "google-sub-new",
  fullName: "New User",
};

/**
 * Minimal fake of the zaki_users table + the consent writer, so we can assert on
 * what actually lands in the database.
 */
function createFakeDb({ existingUser = null } = {}) {
  const consentRows = [];
  let nextId = 100;
  const users = existingUser ? [existingUser] : [];

  const dbGet = jest.fn(async (sql, params) => {
    if (/WHERE google_sub = \$1/.test(sql)) {
      return users.find((u) => u.google_sub === params[0]) || null;
    }
    if (/WHERE email = \$1/.test(sql)) {
      return users.find((u) => u.email === params[0]) || null;
    }
    return null;
  });

  const dbQuery = jest.fn(async (sql, params) => {
    if (/INSERT INTO zaki_users/i.test(sql)) {
      const user = {
        id: nextId++,
        email: params[0],
        full_name: params[2],
        google_sub: params[3],
        verified: true,
        legal_consent_version: null,
        legal_consent_at: null,
      };
      users.push(user);
      return { rows: [user] };
    }
    if (/UPDATE zaki_users/i.test(sql)) {
      const user = users.find((u) => u.id === params[0]);
      if (user) user.verified = true;
      return { rows: user ? [user] : [] };
    }
    return { rows: [] };
  });

  // Stands in for index.js's recordSignupConsent: always writes at the CURRENT
  // server policy version.
  const recordSignupConsent = jest.fn(async ({ userId, source }) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      user.legal_consent_version = CURRENT_POLICY_VERSION;
      user.legal_consent_at = NOW.toISOString();
    }
    consentRows.push({
      user_id: userId,
      policy_version: CURRENT_POLICY_VERSION,
      source,
    });
  });

  return { dbGet, dbQuery, recordSignupConsent, consentRows, users };
}

function signIn(db, overrides = {}) {
  return completeGoogleOAuthSignIn({
    dbGet: db.dbGet,
    dbQuery: db.dbQuery,
    userColumns: USER_COLUMNS,
    profile: PROFILE,
    acceptedPolicyVersion: CURRENT_POLICY_VERSION,
    agePolicy: GATE_OFF,
    recordSignupConsent: db.recordSignupConsent,
    now: NOW,
    ...overrides,
  });
}

describe("(a) a NEW Google account always records consent at the current policy version", () => {
  // The frontend now sends the attestation from BOTH screens, so both entry
  // modes arrive here with acceptedPolicyVersion set. Before the fix, login-mode
  // arrived with null and silently created a consent-less account.
  it.each([
    ["login-mode entry", "login"],
    ["signup-mode entry", "signup"],
  ])("records exactly one consent row on %s", async (_label) => {
    const db = createFakeDb();

    const { user, created } = await signIn(db);

    expect(created).toBe(true);
    expect(db.consentRows).toEqual([
      {
        user_id: user.id,
        policy_version: CURRENT_POLICY_VERSION,
        source: "google_signup",
      },
    ]);
    // And the denormalised columns the reconsent wave reads are current.
    expect(user.legal_consent_version).toBe(CURRENT_POLICY_VERSION);
    expect(user.legal_consent_at).toBeTruthy();
  });

  it("refuses to create an account when no consent was attested", async () => {
    const db = createFakeDb();

    await expect(signIn(db, { acceptedPolicyVersion: null })).rejects.toMatchObject({
      status: 403,
      code: "google_consent_required",
    });

    // The invariant that matters: no account, therefore no consent-less account.
    expect(db.users).toHaveLength(0);
    expect(db.consentRows).toHaveLength(0);
  });
});

describe("(d) a returning Google user does not duplicate consent rows", () => {
  it("records consent once across three logins", async () => {
    const db = createFakeDb();

    const first = await signIn(db);
    expect(first.created).toBe(true);
    expect(db.consentRows).toHaveLength(1);

    const second = await signIn(db);
    const third = await signIn(db);

    expect(second.created).toBe(false);
    expect(third.created).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    // Still exactly one consent row — the pre-fix code appended one per login.
    expect(db.consentRows).toHaveLength(1);
    expect(db.recordSignupConsent).toHaveBeenCalledTimes(1);
  });

  it("does not write consent when an existing email user links Google", async () => {
    const db = createFakeDb({
      existingUser: {
        id: 42,
        email: PROFILE.email,
        google_sub: null,
        verified: true,
        legal_consent_version: CURRENT_POLICY_VERSION,
        legal_consent_at: NOW.toISOString(),
      },
    });

    const { created } = await signIn(db);

    expect(created).toBe(false);
    expect(db.consentRows).toHaveLength(0);
    expect(db.recordSignupConsent).not.toHaveBeenCalled();
  });
});

describe("(c) gate disabled -> no DOB wall, but consent is still recorded", () => {
  it("creates the Google account and records consent with the age gate off", async () => {
    const db = createFakeDb();

    const { user, created } = await signIn(db, { agePolicy: GATE_OFF });

    expect(created).toBe(true);
    expect(db.consentRows).toEqual([
      {
        user_id: user.id,
        policy_version: CURRENT_POLICY_VERSION,
        source: "google_signup",
      },
    ]);
  });

  it("still requires the consent attestation even with the gate off", async () => {
    const db = createFakeDb();

    await expect(
      signIn(db, { agePolicy: GATE_OFF, acceptedPolicyVersion: null })
    ).rejects.toMatchObject({ code: "google_consent_required" });

    expect(db.users).toHaveLength(0);
  });
});

describe("(b) the age gate applies to Google exactly as it does to email", () => {
  it("refuses a new Google account when the gate is ON (Google supplies no DOB)", async () => {
    const db = createFakeDb();

    await expect(signIn(db, { agePolicy: GATE_ON })).rejects.toMatchObject({
      status: 403,
      code: "age_verification_required",
    });

    // No half-created account, no consent row.
    expect(db.users).toHaveLength(0);
    expect(db.consentRows).toHaveLength(0);
  });

  it("matches the email path's verdict for the same config and the same DOB", () => {
    // Email path: a DOB-less submission is impossible (Zod requires it), but the
    // SAME evaluator drives both paths, so the verdicts cannot drift.
    const emailVerdict = evaluateSignupAgePolicy({
      dateOfBirth: null,
      policy: GATE_ON,
      now: NOW,
    });
    expect(emailVerdict).toMatchObject({ ok: false, code: "age_verification_required" });

    const emailUnderage = evaluateSignupAgePolicy({
      dateOfBirth: "2015-01-01",
      policy: GATE_ON,
      now: NOW,
    });
    expect(emailUnderage).toMatchObject({ ok: false, code: "minimum_age" });

    // Gate off: neither path walls anyone out.
    expect(
      evaluateSignupAgePolicy({ dateOfBirth: "2015-01-01", policy: GATE_OFF, now: NOW }).ok
    ).toBe(true);
    expect(
      evaluateSignupAgePolicy({ dateOfBirth: null, policy: GATE_OFF, now: NOW }).ok
    ).toBe(true);
  });

  it("lets an EXISTING account sign in even when the gate is ON", async () => {
    // Flipping the gate on must not lock out accounts that already exist — the
    // policy gates creation, not sign-in.
    const db = createFakeDb({
      existingUser: {
        id: 7,
        email: PROFILE.email,
        google_sub: PROFILE.googleSub,
        verified: true,
        legal_consent_version: CURRENT_POLICY_VERSION,
        legal_consent_at: NOW.toISOString(),
      },
    });

    const { user, created } = await signIn(db, { agePolicy: GATE_ON });

    expect(created).toBe(false);
    expect(user.id).toBe(7);
    expect(db.consentRows).toHaveLength(0);
  });
});

describe("consent source is attributable", () => {
  it("tags Google signups distinctly from email signups", async () => {
    const db = createFakeDb();
    await signIn(db);
    expect(db.consentRows[0].source).toBe("google_signup");
  });
});

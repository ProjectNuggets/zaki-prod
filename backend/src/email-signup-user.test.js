/**
 * WP-M — drop DOB collection entirely (GDPR Art. 5(1)(c), data minimisation).
 *
 * The age gate is off in every environment, so the birthdate the email form
 * collected was persisted and never enforced. These tests pin the two things that
 * have to be true for that removal to be real rather than cosmetic:
 *
 *   (b) NO DATE OF BIRTH IS PERSISTED for a new account, and
 *   (c) CONSENT IS STILL RECORDED on the email path — #87 made a consent row an
 *       invariant of account creation, and WP-M must not weaken it.
 *
 * (a) — "email signup succeeds with no DOB in the payload" — is pinned in
 * legal-consent.test.js (the Zod schema) and LoginScreen.test.tsx (the request the
 * browser actually sends).
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { completeEmailSignup } from "./email-signup-user.js";

const NOW = "2026-07-14T00:00:00.000Z";

function createFakeDb({ existingUser = null } = {}) {
  const consentRows = [];
  const statements = [];
  let nextId = 500;
  const users = existingUser ? [existingUser] : [];

  const dbGet = jest.fn(async (sql, params) => {
    statements.push({ sql, params });
    if (/WHERE email = \$1/.test(sql)) {
      return users.find((u) => u.email === params[0]) || null;
    }
    return null;
  });

  const dbQuery = jest.fn(async (sql, params) => {
    statements.push({ sql, params });
    if (/INSERT INTO zaki_users/i.test(sql)) {
      const user = {
        id: nextId++,
        email: params[0],
        password_hash: params[1],
        full_name: params[2],
        verified: false,
      };
      users.push(user);
      return { rows: [{ id: user.id }] };
    }
    if (/UPDATE zaki_users/i.test(sql)) {
      return { rows: [] };
    }
    return { rows: [] };
  });

  const recordSignupConsent = jest.fn(async ({ userId, source }) => {
    consentRows.push({ user_id: userId, source });
  });

  return { dbGet, dbQuery, recordSignupConsent, consentRows, statements, users };
}

function signUp(db, overrides = {}) {
  return completeEmailSignup({
    dbGet: db.dbGet,
    dbQuery: db.dbQuery,
    email: "newuser@example.com",
    passwordHash: "hashed-password",
    fullName: "New User",
    recordSignupConsent: db.recordSignupConsent,
    now: NOW,
    ...overrides,
  });
}

/** Every SQL string the signup touched, as one blob. */
function allSql(db) {
  return db.statements.map((s) => s.sql).join("\n");
}

/** Every bound parameter the signup passed to the DB, flattened. */
function allParams(db) {
  return db.statements.flatMap((s) => s.params || []);
}

describe("(b) WP-M: no date of birth is persisted for a new account", () => {
  let db;
  beforeEach(() => {
    db = createFakeDb();
  });

  it("creates the account", async () => {
    const { userId, created } = await signUp(db);
    expect(created).toBe(true);
    expect(userId).toBeTruthy();
  });

  it("never names date_of_birth in ANY statement it issues", async () => {
    await signUp(db);
    expect(allSql(db)).not.toMatch(/date_of_birth/i);
  });

  it("the INSERT column list contains no birthdate column", async () => {
    await signUp(db);

    const insert = db.statements.find((s) => /INSERT INTO zaki_users/i.test(s.sql));
    expect(insert).toBeDefined();
    expect(insert.sql).not.toMatch(/date_of_birth/i);
    expect(insert.sql).toMatch(
      /\(email, password_hash, full_name, verified, created_at, updated_at\)/
    );
  });

  it("binds no date-shaped value anywhere (nothing that could be a birthdate)", async () => {
    await signUp(db);

    // created_at / updated_at are full ISO timestamps; a birthdate would be a bare
    // YYYY-MM-DD. Assert no bound param is a bare calendar date.
    const bareDates = allParams(db).filter(
      (p) => typeof p === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p)
    );
    expect(bareDates).toEqual([]);
  });

  it("does not write date_of_birth when re-signing up over an unverified row", async () => {
    const existing = createFakeDb({
      existingUser: {
        id: 42,
        email: "newuser@example.com",
        verified: false,
        date_of_birth: "1995-01-15", // legacy value already in the column
      },
    });

    const { userId, created } = await signUp(existing);

    expect(created).toBe(false);
    expect(userId).toBe(42);

    const update = existing.statements.find((s) => /UPDATE zaki_users/i.test(s.sql));
    expect(update).toBeDefined();
    expect(update.sql).not.toMatch(/date_of_birth/i);
    // The legacy value is neither refreshed nor cleared — this is the "stop
    // writing" half of expand-contract. Dropping the column is a separate,
    // owner-approved migration.
    expect(allSql(existing)).not.toMatch(/date_of_birth/i);
  });

  it("refuses a duplicate verified account without touching consent", async () => {
    const existing = createFakeDb({
      existingUser: { id: 7, email: "newuser@example.com", verified: true },
    });

    await expect(signUp(existing)).rejects.toMatchObject({
      status: 400,
      code: "email_already_registered",
    });
    expect(existing.recordSignupConsent).not.toHaveBeenCalled();
  });
});

describe("(c) WP-M does not weaken #87: consent is still recorded on the EMAIL path", () => {
  it("records exactly one consent row, attributed to the email signup source", async () => {
    const db = createFakeDb();

    const { userId } = await signUp(db);

    expect(db.recordSignupConsent).toHaveBeenCalledTimes(1);
    expect(db.consentRows).toEqual([{ user_id: userId, source: "signup" }]);
  });

  it("records consent on re-signup over an unverified row too (unchanged behaviour)", async () => {
    const db = createFakeDb({
      existingUser: { id: 42, email: "newuser@example.com", verified: false },
    });

    await signUp(db);

    expect(db.recordSignupConsent).toHaveBeenCalledTimes(1);
    expect(db.consentRows).toEqual([{ user_id: 42, source: "signup" }]);
  });

  it("consent recording is NOT conditional on anything WP-M removed", async () => {
    // Nothing about the (now absent) birthdate can gate the consent write: the
    // signup carries no DOB at all, and consent is still written.
    const db = createFakeDb();

    await signUp(db);

    expect(allSql(db)).not.toMatch(/date_of_birth/i);
    expect(db.consentRows).toHaveLength(1);
  });
});

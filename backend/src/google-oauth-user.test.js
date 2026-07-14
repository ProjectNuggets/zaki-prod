import { describe, expect, it, jest } from "@jest/globals";
import { findOrCreateGoogleUser } from "./google-oauth-user.js";

const USER_COLUMNS = "id, email, verified, full_name";

describe("findOrCreateGoogleUser", () => {
  it("links an existing email/password user and marks the email verified", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 42,
        email: "ada@example.com",
        verified: false,
        full_name: "",
        google_sub: null,
      });
    const linkedUser = {
      id: 42,
      email: "ada@example.com",
      verified: true,
      full_name: "Ada Lovelace",
    };
    const dbQuery = jest.fn().mockResolvedValue({ rows: [linkedUser] });

    await expect(
      findOrCreateGoogleUser({
        dbGet,
        dbQuery,
        userColumns: USER_COLUMNS,
        email: "ada@example.com",
        googleSub: "google-sub-1",
        fullName: "Ada Lovelace",
      })
    ).resolves.toEqual({ user: linkedUser, created: false });

    expect(dbQuery).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE zaki_users[\s\S]+verified = TRUE[\s\S]+auth_provider/i),
      expect.arrayContaining([42, "google-sub-1", "Ada Lovelace"])
    );
  });

  it("creates a verified Google user when no local account exists", async () => {
    const dbGet = jest.fn().mockResolvedValue(null);
    const createdUser = {
      id: 77,
      email: "grace@example.com",
      verified: true,
      full_name: "Grace Hopper",
    };
    const dbQuery = jest.fn().mockResolvedValue({ rows: [createdUser] });

    await expect(
      findOrCreateGoogleUser({
        dbGet,
        dbQuery,
        userColumns: USER_COLUMNS,
        email: "grace@example.com",
        googleSub: "google-sub-2",
        fullName: "Grace Hopper",
      })
    ).resolves.toEqual({ user: createdUser, created: true });

    expect(dbQuery).toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO zaki_users[\s\S]+google_sub, auth_provider/i),
      [
        "grace@example.com",
        expect.stringMatching(/^\$2[aby]\$/),
        "Grace Hopper",
        "google-sub-2",
        expect.any(String),
      ]
    );
  });

  it("reports created:false for a returning Google user so consent is not re-written", async () => {
    const returningUser = {
      id: 77,
      email: "grace@example.com",
      verified: true,
      full_name: "Grace Hopper",
    };
    const dbGet = jest.fn().mockResolvedValueOnce({
      ...returningUser,
      google_sub: "google-sub-2",
    });
    const dbQuery = jest.fn().mockResolvedValue({ rows: [returningUser] });

    await expect(
      findOrCreateGoogleUser({
        dbGet,
        dbQuery,
        userColumns: USER_COLUMNS,
        email: "grace@example.com",
        googleSub: "google-sub-2",
        fullName: "Grace Hopper",
      })
    ).resolves.toEqual({ user: returningUser, created: false });

    // Matched on google_sub — no INSERT, so no new account and no consent row.
    expect(dbQuery).not.toHaveBeenCalledWith(
      expect.stringMatching(/INSERT INTO zaki_users/i),
      expect.anything()
    );
  });

  it("runs assertCanCreate before inserting a brand-new account", async () => {
    const dbGet = jest.fn().mockResolvedValue(null);
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [{ id: 5, email: "new@example.com", verified: true, full_name: "New" }],
    });
    const calls = [];
    const assertCanCreate = jest.fn(() => calls.push("assert"));
    dbQuery.mockImplementation(async () => {
      calls.push("insert");
      return { rows: [{ id: 5, email: "new@example.com", verified: true, full_name: "New" }] };
    });

    await findOrCreateGoogleUser({
      dbGet,
      dbQuery,
      userColumns: USER_COLUMNS,
      email: "new@example.com",
      googleSub: "google-sub-new",
      fullName: "New",
      assertCanCreate,
    });

    expect(assertCanCreate).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["assert", "insert"]);
  });

  it("creates NO user row when assertCanCreate rejects the signup", async () => {
    const dbGet = jest.fn().mockResolvedValue(null);
    const dbQuery = jest.fn();
    const assertCanCreate = jest.fn(() => {
      const err = new Error("Consent required.");
      err.status = 403;
      err.code = "google_consent_required";
      throw err;
    });

    await expect(
      findOrCreateGoogleUser({
        dbGet,
        dbQuery,
        userColumns: USER_COLUMNS,
        email: "blocked@example.com",
        googleSub: "google-sub-blocked",
        fullName: "Blocked",
        assertCanCreate,
      })
    ).rejects.toMatchObject({ status: 403, code: "google_consent_required" });

    // The critical invariant: a refused signup leaves no account behind.
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it("does not run assertCanCreate for a returning user", async () => {
    const returningUser = { id: 9, email: "back@example.com", verified: true, full_name: "Back" };
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce({ ...returningUser, google_sub: "google-sub-back" });
    const dbQuery = jest.fn().mockResolvedValue({ rows: [returningUser] });
    const assertCanCreate = jest.fn();

    await expect(
      findOrCreateGoogleUser({
        dbGet,
        dbQuery,
        userColumns: USER_COLUMNS,
        email: "back@example.com",
        googleSub: "google-sub-back",
        fullName: "Back",
        assertCanCreate,
      })
    ).resolves.toMatchObject({ created: false });

    // Signup policy gates account CREATION, not sign-in. Flipping the age gate on
    // must not lock out accounts that already exist.
    expect(assertCanCreate).not.toHaveBeenCalled();
  });

  it("rejects email linking when the local user is already linked to a different Google subject", async () => {
    const dbGet = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 42,
        email: "ada@example.com",
        verified: true,
        full_name: "Ada",
        google_sub: "google-sub-original",
      });
    const dbQuery = jest.fn();

    await expect(
      findOrCreateGoogleUser({
        dbGet,
        dbQuery,
        userColumns: USER_COLUMNS,
        email: "ada@example.com",
        googleSub: "google-sub-other",
        fullName: "Ada Lovelace",
      })
    ).rejects.toMatchObject({ status: 409, code: "google_account_mismatch" });

    expect(dbQuery).not.toHaveBeenCalled();
  });
});

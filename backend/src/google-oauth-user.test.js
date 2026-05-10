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
    ).resolves.toEqual(linkedUser);

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
    ).resolves.toEqual(createdUser);

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

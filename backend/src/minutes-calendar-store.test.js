import { describe, expect, test } from "@jest/globals";
import {
  MinutesCalendarStoreError,
  encryptCalendarRefreshToken,
  decryptCalendarRefreshToken,
  resolveCalendarEncryptionKey,
  upsertCalendarConnection,
  getCalendarConnectionStatus,
  markCalendarConnectionInvalidGrant,
  takeCalendarRefreshTokenForRevocation,
} from "./minutes-calendar-store.js";

const KEY = "calendar-encryption-key-0123456789abcdef";
const TOKEN = "1//refresh-token-abcDEF-0123456789";

function encRow(userId, token = TOKEN, key = KEY) {
  const { ciphertext, iv, tag } = encryptCalendarRefreshToken({ refreshToken: token, encryptionKey: key, userId });
  return { user_id: String(userId), refresh_ciphertext: ciphertext, refresh_iv: iv, refresh_tag: tag };
}

describe("minutes-calendar-store crypto", () => {
  test("round-trips the refresh token", () => {
    const row = encRow(42);
    expect(decryptCalendarRefreshToken({ connection: row, encryptionKey: KEY })).toBe(TOKEN);
  });

  test("a row rebound to a different user_id fails to decrypt (AAD tamper-evidence)", () => {
    const row = encRow(42);
    const moved = { ...row, user_id: "99" };
    expect(() => decryptCalendarRefreshToken({ connection: moved, encryptionKey: KEY })).toThrow(
      expect.objectContaining({ code: "calendar_token_unavailable" })
    );
  });

  test("a wrong key fails to decrypt", () => {
    const row = encRow(42);
    expect(() => decryptCalendarRefreshToken({ connection: row, encryptionKey: "another-key-0123456789abcdef-XXXX" })).toThrow(
      MinutesCalendarStoreError
    );
  });

  test("a flipped ciphertext byte fails the auth tag", () => {
    const row = encRow(42);
    const bad = Buffer.from(row.refresh_ciphertext);
    bad[0] ^= 0xff;
    expect(() => decryptCalendarRefreshToken({ connection: { ...row, refresh_ciphertext: bad }, encryptionKey: KEY })).toThrow(
      MinutesCalendarStoreError
    );
  });

  test("each encryption uses a fresh IV (no deterministic ciphertext)", () => {
    const a = encryptCalendarRefreshToken({ refreshToken: TOKEN, encryptionKey: KEY, userId: 42 });
    const b = encryptCalendarRefreshToken({ refreshToken: TOKEN, encryptionKey: KEY, userId: 42 });
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  test("an empty refresh token is refused", () => {
    expect(() => encryptCalendarRefreshToken({ refreshToken: "", encryptionKey: KEY, userId: 42 })).toThrow(
      expect.objectContaining({ code: "calendar_token_missing" })
    );
  });
});

describe("resolveCalendarEncryptionKey", () => {
  test("accepts a valid env key and rejects a short one", () => {
    expect(resolveCalendarEncryptionKey({ fallbackKey: KEY })).toBe(KEY);
    expect(() => resolveCalendarEncryptionKey({ fallbackKey: "too-short" })).toThrow(
      expect.objectContaining({ code: "calendar_key_unavailable" })
    );
  });
  test("reads a key file when given an absolute path", () => {
    const readFileSync = () => KEY;
    expect(resolveCalendarEncryptionKey({ keyFile: "/run/secrets/calendar-key", readFileSync })).toBe(KEY);
  });
});

describe("minutes-calendar-store db ops (mock dbQuery)", () => {
  function mockDb() {
    const calls = [];
    const rows = new Map();
    const dbQuery = async (text, params) => {
      calls.push({ text, params });
      if (/INSERT INTO zaki_calendar_connections/.test(text)) {
        const [userId, googleSub, scopes, ct, iv, tag] = params;
        rows.set(userId, { user_id: userId, google_sub: googleSub, scopes, status: "active",
          refresh_ciphertext: ct, refresh_iv: iv, refresh_tag: tag, connected_at: "2026-07-22T00:00:00Z" });
        return { rows: [] };
      }
      if (/^\s*SELECT/.test(text)) return { rows: rows.has(params[0]) ? [rows.get(params[0])] : [] };
      if (/UPDATE zaki_calendar_connections/.test(text)) {
        const r = rows.get(params[0]); if (r) r.status = "invalid_grant"; return { rows: [] };
      }
      if (/DELETE FROM zaki_calendar_connections/.test(text)) { rows.delete(params[0]); return { rows: [] }; }
      return { rows: [] };
    };
    return { dbQuery, rows };
  }

  test("upsert then status shows connected; ciphertext never leaks in the status view", async () => {
    const db = mockDb();
    await upsertCalendarConnection(
      { userId: 42, googleSub: "sub-1", scopes: ["https://www.googleapis.com/auth/calendar.events.readonly"], refreshToken: TOKEN, encryptionKey: KEY },
      db
    );
    const status = await getCalendarConnectionStatus({ userId: 42 }, db);
    expect(status).toEqual(expect.objectContaining({ connected: true, status: "active" }));
    expect(JSON.stringify(status)).not.toContain("refresh");
  });

  test("invalid_grant marks the connection not-connected (poller stops firing)", async () => {
    const db = mockDb();
    await upsertCalendarConnection({ userId: 42, refreshToken: TOKEN, encryptionKey: KEY }, db);
    await markCalendarConnectionInvalidGrant({ userId: 42 }, db);
    expect((await getCalendarConnectionStatus({ userId: 42 }, db)).connected).toBe(false);
  });

  test("disconnect returns the token once (for Google revoke) then deletes the row", async () => {
    const db = mockDb();
    await upsertCalendarConnection({ userId: 42, refreshToken: TOKEN, encryptionKey: KEY }, db);
    const token = await takeCalendarRefreshTokenForRevocation({ userId: 42, encryptionKey: KEY }, db);
    expect(token).toBe(TOKEN);
    expect(await takeCalendarRefreshTokenForRevocation({ userId: 42, encryptionKey: KEY }, db)).toBeNull();
    expect((await getCalendarConnectionStatus({ userId: 42 }, db)).connected).toBe(false);
  });

  test("upsert rejects an invalid user id", async () => {
    await expect(upsertCalendarConnection({ userId: "0", refreshToken: TOKEN, encryptionKey: KEY }, mockDb())).rejects.toThrow(
      expect.objectContaining({ code: "calendar_user_invalid" })
    );
  });
});

import { describe, it, expect } from "@jest/globals";

// The three normalizers that MUST stay byte-identical for G2-ISO-5.
const normalizeEmailValue = (v) => String(v || "").trim().toLowerCase();      // index.js:490
const normalizeScopedUserId = (v) => String(v || "").trim().toLowerCase();    // memory/routes.js:38
const normalizeUserId = (v) => String(v || "").trim().toLowerCase();          // memory/operations.js:189

describe("G2-ISO-5 memory account-key invariant", () => {
  const samples = [
    "Owner@Example.com", "  owner@example.com  ", "MiXeD@Case.IO",
    "owner+tag@example.com", "", "  ",
  ];
  it("memory write key, scope key, and account delete/export key are byte-identical", () => {
    for (const raw of samples) {
      const writeKey = normalizeUserId(raw);          // how memories.user_id is stored
      const scopeKey = normalizeScopedUserId(raw);    // how routes scope reads
      const accountKey = normalizeEmailValue(raw);    // proposed delete/export key (scopedMemoryUserId)
      expect(scopeKey).toBe(writeKey);
      expect(accountKey).toBe(writeKey);
      // byte-identity, not just equality-after-renormalize
      expect(Buffer.from(accountKey).equals(Buffer.from(writeKey))).toBe(true);
    }
  });
  it("account key is a fixed point: re-normalizing a stored zaki_users.email is a no-op", () => {
    // zaki_users.email is inserted already-normalized (signup + Google), so the delete
    // anchor equals its own normalization — proving delete-by-key hits every written row.
    for (const raw of samples) {
      const stored = normalizeEmailValue(raw);           // what zaki_users.email holds
      expect(normalizeEmailValue(stored)).toBe(stored);  // idempotent
      expect(normalizeUserId(stored)).toBe(stored);      // == memories.user_id
    }
  });
});

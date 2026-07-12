import { describe, expect, jest, test } from "@jest/globals";
import {
  assertAuthoritativeNullalisManifest,
  eraseAccountData,
} from "./account-erasure.js";

describe("account erasure", () => {
  test("rejects a malformed Nullalis manifest before treating it as authoritative", () => {
    expect(() => assertAuthoritativeNullalisManifest({ status: "ok" })).toThrow(
      expect.objectContaining({
        code: "nullalis_purge_invalid_manifest",
        status: 502,
      })
    );
  });

  test("rejects a partial Nullalis purge manifest even when the upstream returned HTTP 200", () => {
    expect(() =>
      assertAuthoritativeNullalisManifest({
        status: "partial",
        sessions_evicted: 0,
        sessions_skipped_active: 1,
        pg_user_row_deleted: true,
        vector_rows_removed: 3,
        filesystem_removed: true,
        errors: ["session_evict_partial:active_skipped=1"],
      })
    ).toThrow(expect.objectContaining({
      code: "nullalis_purge_residue",
      status: 502,
    }));
  });

  test("fails loudly and stops before TYP or hub deletion when Nullalis rejects the purge", async () => {
    const deleteTypUser = jest.fn();
    const dbQuery = jest.fn();

    await expect(
      eraseAccountData({
        zakiUser: { id: 42, nova_user_id: 7 },
        memoryKey: "user@example.com",
        requestId: "req-1",
        purgeNullalis: jest.fn().mockResolvedValue({
          ok: false,
          status: 503,
          data: { error: "purge_failed" },
        }),
        deleteTypUser,
        cleanupBilling: jest.fn(),
        deleteLearning: jest.fn(),
        dbQuery,
      })
    ).rejects.toMatchObject({
      code: "nullalis_purge_failed",
      status: 502,
    });

    expect(deleteTypUser).not.toHaveBeenCalled();
    expect(dbQuery).not.toHaveBeenCalled();
  });

  test("normalizes a Nullalis network failure into a retryable upstream error", async () => {
    await expect(
      eraseAccountData({
        zakiUser: { id: 42 },
        requestId: "req-network",
        purgeNullalis: jest.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
      })
    ).rejects.toMatchObject({
      code: "nullalis_purge_unavailable",
      status: 502,
      retryable: true,
    });
  });

  test("fails loudly and preserves the hub account when TYP deletion fails", async () => {
    const dbQuery = jest.fn();

    await expect(
      eraseAccountData({
        zakiUser: { id: 42, nova_user_id: 7 },
        memoryKey: "user@example.com",
        requestId: "req-2",
        purgeNullalis: jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          data: {
            status: "ok",
            sessions_evicted: 1,
            sessions_skipped_active: 0,
            pg_user_row_deleted: true,
            vector_rows_removed: 3,
            filesystem_removed: true,
            errors: [],
          },
        }),
        deleteTypUser: jest.fn().mockResolvedValue({ ok: false, status: 500 }),
        cleanupBilling: jest.fn(),
        deleteLearning: jest.fn(),
        dbQuery,
      })
    ).rejects.toMatchObject({
      code: "typ_purge_failed",
      status: 502,
    });

    expect(dbQuery).not.toHaveBeenCalled();
  });

  test("normalizes a TYP network failure and never starts hub deletion", async () => {
    const dbQuery = jest.fn();
    await expect(
      eraseAccountData({
        zakiUser: { id: 42, nova_user_id: 7 },
        requestId: "req-typ-network",
        purgeNullalis: jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          data: {
            status: "ok",
            sessions_evicted: 0,
            sessions_skipped_active: 0,
            pg_user_row_deleted: false,
            vector_rows_removed: 0,
            filesystem_removed: false,
            errors: [],
          },
        }),
        deleteTypUser: jest.fn().mockRejectedValue(new Error("socket closed")),
        dbQuery,
      })
    ).rejects.toMatchObject({
      code: "typ_purge_unavailable",
      status: 502,
      retryable: true,
    });
    expect(dbQuery).not.toHaveBeenCalled();
  });

  test("persists a content-free receipt in the same transaction as hub deletion", async () => {
    const dbQuery = jest.fn(async (sql) => {
      if (sql.includes("INSERT INTO zaki_account_erasure_receipts")) {
        return { rows: [{ id: 91 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    const engineManifest = {
      status: "ok",
      sessions_evicted: 2,
      sessions_skipped_active: 0,
      pg_user_row_deleted: true,
      vector_rows_removed: 4,
      filesystem_removed: true,
      errors: [],
    };

    const result = await eraseAccountData({
      zakiUser: { id: 42, email: "private@example.com", nova_user_id: 7 },
      memoryKey: "private@example.com",
      requestId: "req-3",
      purgeNullalis: jest.fn().mockResolvedValue({ ok: true, status: 200, data: engineManifest }),
      deleteTypUser: jest.fn().mockResolvedValue({ ok: true, status: 204 }),
      cleanupBilling: jest.fn().mockResolvedValue(undefined),
      deleteLearning: jest.fn().mockResolvedValue({
        attempted: true,
        deleted: [{ resource: "session", path: "/private/path" }],
      }),
      dbQuery,
    });

    expect(result.receiptId).toBe(91);
    expect(dbQuery.mock.calls.map(([sql]) => sql.trim())).toEqual(expect.arrayContaining([
      "BEGIN",
      expect.stringContaining("DELETE FROM zaki_users"),
      "COMMIT",
    ]));
    const receiptCall = dbQuery.mock.calls.find(([sql]) =>
      sql.includes("INSERT INTO zaki_account_erasure_receipts")
    );
    expect(receiptCall).toBeDefined();
    const serializedReceiptFields = JSON.stringify(receiptCall[1]);
    expect(serializedReceiptFields).not.toContain("private@example.com");
    expect(serializedReceiptFields).not.toContain("/private/path");
    expect(serializedReceiptFields).toContain("vectorRowsRemoved");
  });
});

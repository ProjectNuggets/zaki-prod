import { describe, expect, jest, test } from "@jest/globals";
import {
  buildLearningAuditSubjectHash,
  listLearningAccountAuditEvents,
  recordLearningAccountAuditEvent,
  summarizeLearningDeletionResult,
  summarizeLearningExportSnapshot,
} from "./learning-governance-audit.js";

describe("learning governance audit helpers", () => {
  test("builds stable non-PII subject hashes", () => {
    const first = buildLearningAuditSubjectHash({ id: 7, email: "Boss@Example.com " });
    const second = buildLearningAuditSubjectHash({ id: 7, email: "boss@example.com" });
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  test("summarizes export snapshots without copying resource payloads", () => {
    expect(
      summarizeLearningExportSnapshot({
        available: true,
        exportedAt: "2026-05-07T12:00:00.000Z",
        resources: {
          sessions: { sessions: [{ id: "s1" }, { id: "s2" }] },
          books: { books: [{ id: "b1", title: "Private" }] },
          memory: { value: "opaque" },
        },
        errors: [{ resource: "skills" }],
      })
    ).toEqual({
      available: true,
      reason: null,
      exportedAt: "2026-05-07T12:00:00.000Z",
      resourceCounts: {
        sessions: 2,
        books: 1,
        memory: "unknown",
      },
      errorCount: 1,
    });
  });

  test("summarizes deletion results by count and resource type", () => {
    expect(
      summarizeLearningDeletionResult({
        attempted: true,
        deleted: [
          { resource: "session", path: "/private/1" },
          { resource: "book", path: "/private/2" },
        ],
      })
    ).toEqual({
      attempted: true,
      reason: null,
      deletedCount: 2,
      deletedResources: ["session", "book"],
    });
  });

  test("records audit rows with normalized action and status", async () => {
    const dbQuery = jest.fn(async () => ({
      rows: [
        {
          id: 1,
          action: "delete",
          status: "succeeded",
          details_json: { deletedCount: 2 },
        },
      ],
    }));

    const row = await recordLearningAccountAuditEvent({
      dbQuery,
      zakiUser: { id: 7, email: "boss@example.com" },
      action: "DELETE",
      status: "SUCCEEDED",
      requestId: "req-1",
      details: { deletedCount: 2 },
    });

    expect(row).toMatchObject({ id: 1, action: "delete", status: "succeeded" });
    expect(dbQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO"), [
      7,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      "delete",
      "succeeded",
      "req-1",
      JSON.stringify({ deletedCount: 2 }),
    ]);
  });

  test("lists current user's audit rows by subject hash", async () => {
    const dbQuery = jest.fn(async () => ({
      rows: [{ id: 3, action: "export", status: "succeeded" }],
    }));
    await expect(
      listLearningAccountAuditEvents({
        dbQuery,
        zakiUser: { id: 7, email: "boss@example.com" },
        limit: 500,
      })
    ).resolves.toEqual([{ id: 3, action: "export", status: "succeeded" }]);
    expect(dbQuery).toHaveBeenCalledWith(expect.stringContaining("LIMIT $2"), [
      expect.stringMatching(/^[a-f0-9]{64}$/),
      100,
    ]);
  });
});

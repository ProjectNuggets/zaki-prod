import { describe, expect, jest, test } from "@jest/globals";
import {
  cleanupLearningRetention,
  resolveLearningRetentionPolicy,
} from "./learning-retention.js";

describe("learning retention policy", () => {
  test("resolves conservative hosted defaults", () => {
    expect(resolveLearningRetentionPolicy({})).toMatchObject({
      enabled: true,
      cleanupIntervalHours: 24,
      auditEventRetentionDays: 730,
      activeAccountContentRetention: "account_lifetime",
      deletedAccountContentRetention: "delete_on_account_delete",
      uploadedSourceRetention: "account_lifetime",
      generatedArtifactRetention: "account_lifetime",
      transientArtifactRetentionDays: 90,
      staleTaskRetentionDays: 30,
    });
  });

  test("allows operator overrides for cleanup windows", () => {
    expect(
      resolveLearningRetentionPolicy({
        ZAKI_LEARNING_RETENTION_CLEANUP_ENABLED: "false",
        ZAKI_LEARNING_RETENTION_CLEANUP_INTERVAL_HOURS: "6",
        ZAKI_LEARNING_AUDIT_EVENT_RETENTION_DAYS: "365",
        ZAKI_LEARNING_TRANSIENT_ARTIFACT_RETENTION_DAYS: "14",
        ZAKI_LEARNING_STALE_TASK_RETENTION_DAYS: "7",
      })
    ).toMatchObject({
      enabled: false,
      cleanupIntervalHours: 6,
      auditEventRetentionDays: 365,
      transientArtifactRetentionDays: 14,
      staleTaskRetentionDays: 7,
    });
  });

  test("deletes expired learning audit events with bound interval parameters", async () => {
    const dbQuery = jest.fn(async () => ({ rowCount: 4 }));
    await expect(
      cleanupLearningRetention({
        dbQuery,
        nowDate: new Date("2026-05-07T12:00:00.000Z"),
        policy: {
          enabled: true,
          auditEventRetentionDays: 90,
        },
      })
    ).resolves.toMatchObject({
      enabled: true,
      deletedAuditEvents: 4,
    });
    expect(dbQuery).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM"), [
      "2026-05-07T12:00:00.000Z",
      90,
    ]);
  });

  test("skips cleanup when disabled", async () => {
    const dbQuery = jest.fn();
    await expect(
      cleanupLearningRetention({
        dbQuery,
        policy: {
          enabled: false,
          auditEventRetentionDays: 90,
        },
      })
    ).resolves.toMatchObject({
      enabled: false,
      deletedAuditEvents: 0,
    });
    expect(dbQuery).not.toHaveBeenCalled();
  });
});

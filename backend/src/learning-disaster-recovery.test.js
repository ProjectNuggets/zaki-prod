import { describe, expect, test } from "@jest/globals";
import {
  buildLearningDisasterRecoveryStatus,
  resolveLearningDisasterRecoveryPolicy,
} from "./learning-disaster-recovery.js";

describe("learning disaster recovery policy", () => {
  test("defaults to not ready until backup configuration and restore evidence exist", () => {
    const status = buildLearningDisasterRecoveryStatus({
      env: {},
      nowDate: new Date("2026-05-07T12:00:00.000Z"),
      learningEnabled: true,
      learningConfigured: true,
    });

    expect(status.ready).toBe(false);
    expect(status.policy).toMatchObject({
      backupsEnabled: false,
      backupTargetConfigured: false,
      tenantDataRootConfigured: false,
      immutableImageTagConfigured: false,
      backupFrequencyHours: 24,
      restoreDrillFrequencyDays: 30,
      rpoHours: 24,
      rtoHours: 4,
    });
    expect(status.gates.filter((gate) => !gate.ok).map((gate) => gate.id)).toEqual([
      "tenant_data_root",
      "backups_enabled",
      "backup_target",
      "immutable_image_tag",
      "restore_drill_fresh",
    ]);
  });

  test("reports ready when all configured gates and recent restore drill are present", () => {
    const status = buildLearningDisasterRecoveryStatus({
      env: {
        LEARNING_ENGINE_TENANT_DATA_ROOT: "/srv/zaki-learning/users",
        ZAKI_LEARNING_BACKUPS_ENABLED: "true",
        ZAKI_LEARNING_BACKUP_PROVIDER: "s3",
        ZAKI_LEARNING_BACKUP_TARGET: "s3://zaki-learning-prod",
        ZAKI_LEARNING_ENGINE_IMAGE_TAG: "ghcr.io/projectnuggets/zaki-learning-engine:sha-abc",
        ZAKI_LEARNING_LAST_RESTORE_DRILL_AT: "2026-05-01T00:00:00.000Z",
      },
      nowDate: new Date("2026-05-07T12:00:00.000Z"),
      learningEnabled: true,
      learningConfigured: true,
    });

    expect(status.ready).toBe(true);
    expect(status.policy).toMatchObject({
      backupProvider: "s3",
      backupTargetConfigured: true,
      tenantDataRootConfigured: true,
      immutableImageTagConfigured: true,
    });
  });

  test("marks stale restore drills as not ready", () => {
    const status = buildLearningDisasterRecoveryStatus({
      env: {
        LEARNING_ENGINE_TENANT_DATA_ROOT: "/srv/zaki-learning/users",
        ZAKI_LEARNING_BACKUPS_ENABLED: "true",
        ZAKI_LEARNING_BACKUP_TARGET: "s3://zaki-learning-prod",
        ZAKI_LEARNING_ENGINE_IMAGE_TAG: "sha-abc",
        ZAKI_LEARNING_LAST_RESTORE_DRILL_AT: "2026-03-01T00:00:00.000Z",
        ZAKI_LEARNING_RESTORE_DRILL_FREQUENCY_DAYS: "30",
      },
      nowDate: new Date("2026-05-07T12:00:00.000Z"),
      learningEnabled: true,
      learningConfigured: true,
    });

    expect(status.ready).toBe(false);
    expect(status.gates.find((gate) => gate.id === "restore_drill_fresh")).toMatchObject({
      ok: false,
      lastRestoreDrillAt: "2026-03-01T00:00:00.000Z",
    });
  });

  test("normalizes operator policy overrides", () => {
    expect(
      resolveLearningDisasterRecoveryPolicy({
        ZAKI_TENANT_DATA_ROOT: "/data/users",
        ZAKI_LEARNING_BACKUPS_ENABLED: "yes",
        ZAKI_LEARNING_BACKUP_FREQUENCY_HOURS: "6",
        ZAKI_LEARNING_RESTORE_DRILL_FREQUENCY_DAYS: "14",
        ZAKI_LEARNING_RPO_HOURS: "6",
        ZAKI_LEARNING_RTO_HOURS: "2",
      })
    ).toMatchObject({
      backupsEnabled: true,
      tenantDataRootConfigured: true,
      backupFrequencyHours: 6,
      restoreDrillFrequencyDays: 14,
      rpoHours: 6,
      rtoHours: 2,
    });
  });
});

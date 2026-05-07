import { describe, expect, test } from "@jest/globals";
import {
  buildLearningDeploymentReadinessStatus,
  isImmutableImageRef,
  resolveLearningDeploymentPolicy,
} from "./learning-deployment-readiness.js";

describe("learning deployment readiness", () => {
  test("accepts digest and git-sha image references as immutable", () => {
    expect(isImmutableImageRef("ghcr.io/zaki/app@sha256:" + "a".repeat(64))).toBe(true);
    expect(isImmutableImageRef("ghcr.io/zaki/app:sha-abcdef1")).toBe(true);
    expect(isImmutableImageRef("ghcr.io/zaki/app:v20260507-abcdef1")).toBe(true);
    expect(isImmutableImageRef("ghcr.io/zaki/app:" + "a".repeat(40))).toBe(true);
  });

  test("rejects missing and mutable image references", () => {
    expect(isImmutableImageRef("")).toBe(false);
    expect(isImmutableImageRef("ghcr.io/zaki/app")).toBe(false);
    expect(isImmutableImageRef("ghcr.io/zaki/app:latest")).toBe(false);
    expect(isImmutableImageRef("ghcr.io/zaki/app:prod")).toBe(false);
    expect(isImmutableImageRef("ghcr.io/zaki/app:release")).toBe(false);
  });

  test("defaults to not ready until operator deployment gates are configured", () => {
    const status = buildLearningDeploymentReadinessStatus({
      env: {},
      nowDate: new Date("2026-05-07T12:00:00.000Z"),
      learningEnabled: true,
      learningConfigured: false,
      retentionPolicy: { enabled: true },
      disasterRecoveryStatus: { ready: false },
    });

    expect(status.ready).toBe(false);
    expect(status.gates.filter((gate) => !gate.ok).map((gate) => gate.id)).toEqual([
      "central_auth_signing_key",
      "learning_enabled_configured",
      "learning_internal_token",
      "tenant_data_root",
      "zaki_image_immutable",
      "learning_engine_image_immutable",
      "learning_source_mirror_pinned",
      "operator_ai_stack_configured",
      "disaster_recovery_ready",
    ]);
    expect(status.finalUserSetup.operatorManagedSettings).toContain("LLM/model/provider routing");
  });

  test("reports ready with central auth, pinned images, source mirror, retention, and DR", () => {
    const env = {
      ZAKI_JWT_SIGNING_KEY: "a".repeat(64),
      LEARNING_ENGINE_BASE_URL: "http://learning:8001",
      LEARNING_ENGINE_INTERNAL_TOKEN: "internal-token",
      LEARNING_ENGINE_TENANT_DATA_ROOT: "/srv/zaki-learning/users",
      ZAKI_APP_IMAGE_TAG: "ghcr.io/projectnuggets/zaki:sha-abcdef123456",
      ZAKI_LEARNING_ENGINE_IMAGE_TAG:
        "ghcr.io/projectnuggets/zaki-learning-engine@sha256:" + "b".repeat(64),
      ZAKI_LEARNING_ENGINE_SOURCE_REPOSITORY:
        "github.com/projectnuggets/zaki-learning-engine",
      ZAKI_LEARNING_ENGINE_SOURCE_COMMIT: "c".repeat(40),
      ZAKI_LEARNING_LLM_PROVIDER: "together",
      ZAKI_LEARNING_LLM_MODEL: "moonshotai/Kimi-K2.5",
      ZAKI_LEARNING_EMBEDDING_PROVIDER: "together",
      ZAKI_LEARNING_EMBEDDING_MODEL: "intfloat/multilingual-e5-large-instruct",
      ZAKI_LEARNING_SEARCH_PROVIDER: "brave",
    };

    const status = buildLearningDeploymentReadinessStatus({
      env,
      nowDate: new Date("2026-05-07T12:00:00.000Z"),
      learningEnabled: true,
      learningConfigured: true,
      retentionPolicy: { enabled: true },
      disasterRecoveryStatus: { ready: true },
    });

    expect(status.ready).toBe(true);
    expect(status.gates.every((gate) => gate.ok)).toBe(true);
    expect(resolveLearningDeploymentPolicy(env)).toMatchObject({
      zakiAuthSigningKeyConfigured: true,
      learningBaseUrlConfigured: true,
      learningInternalTokenConfigured: true,
      tenantDataRootConfigured: true,
      zakiImageRefImmutable: true,
      learningImageRefImmutable: true,
      sourceRepositoryConfigured: true,
      sourceCommitPinned: true,
      aiStackConfigured: true,
    });
  });

  test("marks disabled retention as a blocker", () => {
    const readyEnv = {
      ZAKI_JWT_SIGNING_KEY: "a".repeat(64),
      LEARNING_ENGINE_BASE_URL: "http://learning:8001",
      LEARNING_ENGINE_INTERNAL_TOKEN: "internal-token",
      LEARNING_ENGINE_TENANT_DATA_ROOT: "/srv/zaki-learning/users",
      ZAKI_APP_IMAGE_TAG: "ghcr.io/projectnuggets/zaki:sha-abcdef123456",
      ZAKI_LEARNING_ENGINE_IMAGE_TAG: "ghcr.io/projectnuggets/engine:sha-abcdef123456",
      ZAKI_LEARNING_ENGINE_SOURCE_REPOSITORY:
        "github.com/projectnuggets/zaki-learning-engine",
      ZAKI_LEARNING_ENGINE_SOURCE_COMMIT: "c".repeat(40),
      ZAKI_LEARNING_LLM_PROVIDER: "together",
      ZAKI_LEARNING_LLM_MODEL: "moonshotai/Kimi-K2.5",
      ZAKI_LEARNING_EMBEDDING_PROVIDER: "together",
      ZAKI_LEARNING_EMBEDDING_MODEL: "intfloat/multilingual-e5-large-instruct",
      ZAKI_LEARNING_SEARCH_PROVIDER: "brave",
    };

    const status = buildLearningDeploymentReadinessStatus({
      env: readyEnv,
      learningEnabled: true,
      learningConfigured: true,
      retentionPolicy: { enabled: false },
      disasterRecoveryStatus: { ready: true },
    });

    expect(status.ready).toBe(false);
    expect(status.gates.find((gate) => gate.id === "retention_policy_enabled")).toMatchObject({
      ok: false,
    });
  });
});

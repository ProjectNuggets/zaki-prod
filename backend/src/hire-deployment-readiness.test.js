import { describe, expect, test } from "@jest/globals";
import {
  buildHireDeploymentReadinessStatus,
  buildHireUserReadinessStatus,
  resolveHireDeploymentPolicy,
} from "./hire-deployment-readiness.js";

describe("hire deployment readiness", () => {
  test("defaults to not ready until operator deployment gates are configured", () => {
    const status = buildHireDeploymentReadinessStatus({
      env: {},
      nowDate: new Date("2026-05-20T12:00:00.000Z"),
      hireEnabled: true,
      hireConfigured: false,
      engineReadiness: null,
    });

    expect(status.ready).toBe(false);
    expect(status.gates.filter((gate) => !gate.ok).map((gate) => gate.id)).toEqual([
      "central_auth_signing_key",
      "hire_enabled_configured",
      "hire_internal_token",
      "hire_meter_signing_key",
      "zaki_image_immutable",
      "hire_engine_image_immutable",
      "hire_source_mirror_pinned",
      "operator_ai_stack_configured",
      "source_policy_configured",
      "automation_controls_configured",
      "quota_policy_configured",
      "downstream_hire_engine_ready",
    ]);
    expect(status.finalUserSetup.operatorManagedSettings).toContain("source discovery providers and credentials");
  });

  test("reports ready with pinned images, source mirror, automation controls, quotas, and downstream readiness", () => {
    const env = {
      ZAKI_JWT_SIGNING_KEY: "a".repeat(64),
      ZAKI_METER_GRANT_SIGNING_SECRET: "hire-meter-signing-key-production-2026",
      HIRE_ENGINE_BASE_URL: "http://hire:8002",
      HIRE_ENGINE_INTERNAL_TOKEN: "internal-token",
      ZAKI_APP_IMAGE_TAG: "ghcr.io/projectnuggets/zaki:sha-abcdef123456",
      ZAKI_HIRE_ENGINE_IMAGE_TAG: "ghcr.io/projectnuggets/zaki-hire-engine:sha-" + "b".repeat(40),
      ZAKI_HIRE_ENGINE_SOURCE_REPOSITORY: "github.com/projectnuggets/zaki-hire-engine",
      ZAKI_HIRE_ENGINE_SOURCE_COMMIT: "c".repeat(40),
      ZAKI_HIRE_LLM_PROVIDER: "together",
      ZAKI_HIRE_LLM_MODEL: "openai/gpt-oss-120b",
      ZAKI_HIRE_SOURCE_POLICY_VERSION: "2026-05-20.v1",
      ZAKI_HIRE_BROWSER_AUTOMATION_ENABLED: "true",
      ZAKI_HIRE_AUTO_APPLY_ENABLED: "true",
      ZAKI_HIRE_AUTO_APPLY_CONSENT_REQUIRED: "true",
      ZAKI_HIRE_AUTO_APPLY_AUDIT_REQUIRED: "true",
      ZAKI_HIRE_WEEKLY_PROMPT_BUCKET: "hire_weekly",
      ZAKI_HIRE_WEEKLY_PROMPT_LIMIT: "10",
    };

    const status = buildHireDeploymentReadinessStatus({
      env,
      nowDate: new Date("2026-05-20T12:00:00.000Z"),
      hireEnabled: true,
      hireConfigured: true,
      engineReadiness: { ready: true, status: "ready", blocking: [], degraded: [] },
    });

    expect(status.ready).toBe(true);
    expect(status.status).toBe("ready");
    expect(status.gates.every((gate) => gate.ok)).toBe(true);
    expect(resolveHireDeploymentPolicy(env)).toMatchObject({
      zakiAuthSigningKeyConfigured: true,
      hireMeterSigningKeyConfigured: true,
      hireBaseUrlConfigured: true,
      hireInternalTokenConfigured: true,
      hireImageRefImmutable: true,
      sourceRepositoryConfigured: true,
      sourceCommitPinned: true,
      aiStackConfigured: true,
      sourcePolicyConfigured: true,
      automationControlsConfigured: true,
      quotaPolicyConfigured: true,
    });
  });

  test("keeps ZAKI release gate blocked when downstream engine reports degraded", () => {
    const readyEnv = {
      ZAKI_JWT_SIGNING_KEY: "a".repeat(64),
      ZAKI_METER_GRANT_SIGNING_SECRET: "hire-meter-signing-key-production-2026",
      HIRE_ENGINE_BASE_URL: "http://hire:8002",
      HIRE_ENGINE_INTERNAL_TOKEN: "internal-token",
      ZAKI_BACKEND_IMAGE_TAG: "ghcr.io/projectnuggets/zaki-api:sha-abcdef123456",
      ZAKI_HIRE_ENGINE_IMAGE_TAG: "ghcr.io/projectnuggets/zaki-hire-engine:sha-" + "b".repeat(40),
      ZAKI_HIRE_ENGINE_SOURCE_REPOSITORY: "github.com/projectnuggets/zaki-hire-engine",
      ZAKI_HIRE_ENGINE_SOURCE_COMMIT: "c".repeat(40),
      ZAKI_HIRE_LLM_PROVIDER: "together",
      ZAKI_HIRE_LLM_MODEL: "openai/gpt-oss-120b",
      ZAKI_HIRE_SOURCE_POLICY_VERSION: "2026-05-20.v1",
      ZAKI_HIRE_BROWSER_AUTOMATION_ENABLED: "true",
      ZAKI_HIRE_AUTO_APPLY_ENABLED: "true",
      ZAKI_HIRE_AUTO_APPLY_CONSENT_REQUIRED: "true",
      ZAKI_HIRE_AUTO_APPLY_AUDIT_REQUIRED: "true",
      ZAKI_HIRE_WEEKLY_PROMPT_BUCKET: "hire_weekly",
      ZAKI_HIRE_WEEKLY_PROMPT_LIMIT: "10",
    };

    const status = buildHireDeploymentReadinessStatus({
      env: readyEnv,
      hireEnabled: true,
      hireConfigured: true,
      engineReadiness: {
        ready: false,
        status: "degraded",
        blocking: [],
        degraded: ["source_policy"],
      },
    });

    expect(status.ready).toBe(false);
    expect(status.gates.find((gate) => gate.id === "downstream_hire_engine_ready")).toMatchObject({
      ok: false,
      downstream: {
        status: "degraded",
        degraded: ["source_policy"],
      },
    });
  });

  test("builds sanitized user-facing readiness without operator details", () => {
    const payload = buildHireUserReadinessStatus({
      hireEnabled: true,
      hireConfigured: true,
      engineHealth: { status: "alive", details_available: false },
      engineStatus: { scanning: false, reevaluating: true },
      deploymentReadiness: {
        ready: true,
        status: "ready",
        blocking: [],
        degraded: [],
        policy: {
          automation: {
            browserAutomationEnabled: true,
            autoApplyEnabled: true,
            autoApplyConsentRequired: true,
            autoApplyAuditRequired: true,
          },
        },
      },
      requestId: "req_123",
      nowDate: new Date("2026-05-20T12:00:00.000Z"),
    });

    expect(payload).toMatchObject({
      available: true,
      status: "ready",
      message: "ZAKI Hire is ready.",
      engine: {
        online: true,
        status: "alive",
        scanning: false,
        reevaluating: true,
      },
      capabilities: {
        pipeline: true,
        browserAutomation: true,
        autoApply: true,
      },
      operations: {
        operatorManagedSettings: true,
        userProviderSettingsExposed: false,
        billingManagedCentrally: true,
        quotaManagedCentrally: true,
      },
    });
    const raw = JSON.stringify(payload);
    expect(raw).not.toMatch(/token|secret|baseUrl|providerSecret|database/i);
  });

  test("marks user-facing readiness pending when Hire is not configured", () => {
    const payload = buildHireUserReadinessStatus({
      hireEnabled: true,
      hireConfigured: false,
    });

    expect(payload).toMatchObject({
      available: false,
      status: "not_configured",
      message: "ZAKI Hire activation is pending.",
      capabilities: {
        pipeline: false,
        autoApply: false,
      },
    });
  });
});

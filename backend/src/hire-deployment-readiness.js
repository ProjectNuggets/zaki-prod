import { isImmutableImageRef } from "./learning-deployment-readiness.js";

function normalizeString(raw) {
  return String(raw || "").trim();
}

function truthy(raw) {
  return ["1", "true", "yes", "on"].includes(normalizeString(raw).toLowerCase());
}

function positiveInteger(raw) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0;
}

function buildGate(id, ok, message, detail = {}) {
  return {
    id,
    ok: Boolean(ok),
    message,
    ...detail,
  };
}

function summarizeEngineReadiness(engineReadiness) {
  if (!engineReadiness || typeof engineReadiness !== "object") {
    return {
      ready: false,
      status: "not_checked",
      blocking: ["hire_engine_not_checked"],
      degraded: [],
    };
  }
  const blocking = Array.isArray(engineReadiness.blocking) ? engineReadiness.blocking : [];
  const degraded = Array.isArray(engineReadiness.degraded) ? engineReadiness.degraded : [];
  return {
    ready: Boolean(engineReadiness.ready),
    status: normalizeString(engineReadiness.status) || (engineReadiness.ready ? "ready" : "not_ready"),
    blocking,
    degraded,
  };
}

export function resolveHireDeploymentPolicy(env = process.env) {
  const zakiImageRef =
    normalizeString(env?.ZAKI_APP_IMAGE_TAG) ||
    normalizeString(env?.ZAKI_BACKEND_IMAGE_TAG) ||
    normalizeString(env?.ZAKI_IMAGE_TAG);
  const hireImageRef = normalizeString(env?.ZAKI_HIRE_ENGINE_IMAGE_TAG);
  const sourceRepository = normalizeString(env?.ZAKI_HIRE_ENGINE_SOURCE_REPOSITORY);
  const sourceCommit = normalizeString(env?.ZAKI_HIRE_ENGINE_SOURCE_COMMIT);
  const llmProvider =
    normalizeString(env?.ZAKI_HIRE_LLM_PROVIDER) ||
    normalizeString(env?.HIRE_LLM_PROVIDER);
  const llmModel =
    normalizeString(env?.ZAKI_HIRE_LLM_MODEL) ||
    normalizeString(env?.HIRE_LLM_MODEL);
  const sourcePolicyVersion =
    normalizeString(env?.ZAKI_HIRE_SOURCE_POLICY_VERSION) ||
    normalizeString(env?.HIRE_SOURCE_POLICY_VERSION);
  const quotaBucket = normalizeString(env?.ZAKI_HIRE_WEEKLY_PROMPT_BUCKET);
  const quotaLimit = normalizeString(env?.ZAKI_HIRE_WEEKLY_PROMPT_LIMIT);

  const automation = {
    browserAutomationEnabled: truthy(
      env?.ZAKI_HIRE_BROWSER_AUTOMATION_ENABLED ||
        env?.HIRE_BROWSER_AUTOMATION_ENABLED
    ),
    autoApplyEnabled: truthy(
      env?.ZAKI_HIRE_AUTO_APPLY_ENABLED ||
        env?.HIRE_AUTO_APPLY_ENABLED ||
        env?.JHM_AUTO_APPLY
    ),
    autoApplyConsentRequired: truthy(
      env?.ZAKI_HIRE_AUTO_APPLY_CONSENT_REQUIRED ||
        env?.HIRE_AUTO_APPLY_CONSENT_REQUIRED
    ),
    autoApplyAuditRequired: truthy(
      env?.ZAKI_HIRE_AUTO_APPLY_AUDIT_REQUIRED ||
        env?.HIRE_AUTO_APPLY_AUDIT_READY
    ),
  };

  return {
    zakiImageRefConfigured: Boolean(zakiImageRef),
    zakiImageRefImmutable: isImmutableImageRef(zakiImageRef),
    hireImageRefConfigured: Boolean(hireImageRef),
    hireImageRefImmutable: isImmutableImageRef(hireImageRef),
    zakiAuthSigningKeyConfigured: normalizeString(env?.ZAKI_JWT_SIGNING_KEY).length >= 64,
    hireBaseUrlConfigured: Boolean(normalizeString(env?.HIRE_ENGINE_BASE_URL || env?.ZAKI_HIRE_ENGINE_BASE_URL)),
    hireInternalTokenConfigured: Boolean(normalizeString(env?.HIRE_ENGINE_INTERNAL_TOKEN || env?.ZAKI_HIRE_ENGINE_INTERNAL_TOKEN)),
    sourceRepositoryConfigured: Boolean(sourceRepository),
    sourceCommitPinned: /^[a-f0-9]{40,64}$/i.test(sourceCommit),
    aiStackConfigured: Boolean(llmProvider && llmModel),
    sourcePolicyConfigured: Boolean(sourcePolicyVersion),
    quotaPolicyConfigured: Boolean(quotaBucket) && positiveInteger(quotaLimit),
    automationControlsConfigured: Object.values(automation).every(Boolean),
    aiStack: {
      llmProviderConfigured: Boolean(llmProvider),
      llmModelConfigured: Boolean(llmModel),
      llmProvider: llmProvider || "",
      llmModel: llmModel || "",
    },
    sourcePolicy: {
      configured: Boolean(sourcePolicyVersion),
      version: sourcePolicyVersion || "",
    },
    quotaPolicy: {
      configured: Boolean(quotaBucket) && positiveInteger(quotaLimit),
      bucket: quotaBucket || "",
      weeklyLimitConfigured: positiveInteger(quotaLimit),
    },
    automation,
  };
}

export function buildHireDeploymentReadinessStatus({
  env = process.env,
  nowDate = new Date(),
  hireEnabled = false,
  hireConfigured = false,
  engineReadiness = null,
} = {}) {
  const policy = resolveHireDeploymentPolicy(env);
  const downstream = summarizeEngineReadiness(engineReadiness);
  const gates = [
    buildGate(
      "central_auth_signing_key",
      policy.zakiAuthSigningKeyConfigured,
      "ZAKI central auth signing key must be configured with a production-strength value."
    ),
    buildGate(
      "hire_enabled_configured",
      !hireEnabled || hireConfigured,
      hireEnabled
        ? "Hire is enabled and must have base URL plus internal token configured."
        : "Hire is disabled; downstream connectivity is not release-blocking."
    ),
    buildGate(
      "hire_internal_token",
      !hireEnabled || policy.hireInternalTokenConfigured,
      "Hire engine internal token must be configured and operator-managed."
    ),
    buildGate(
      "zaki_image_immutable",
      policy.zakiImageRefImmutable,
      "ZAKI deployment must use an immutable app/backend image reference."
    ),
    buildGate(
      "hire_engine_image_immutable",
      policy.hireImageRefImmutable,
      "Hire engine deployment must use an immutable image reference."
    ),
    buildGate(
      "hire_source_mirror_pinned",
      policy.sourceRepositoryConfigured && policy.sourceCommitPinned,
      "Hire engine mirror repository and exact source commit must be recorded before rollout."
    ),
    buildGate(
      "operator_ai_stack_configured",
      !hireEnabled || policy.aiStackConfigured,
      "Hire LLM provider and model routing must be explicitly recorded as operator-managed deployment config.",
      { aiStack: policy.aiStack }
    ),
    buildGate(
      "source_policy_configured",
      !hireEnabled || policy.sourcePolicyConfigured,
      "Hire source discovery policy version must be recorded before rollout.",
      { sourcePolicy: policy.sourcePolicy }
    ),
    buildGate(
      "automation_controls_configured",
      !hireEnabled || policy.automationControlsConfigured,
      "Hire browser automation, auto-apply, consent, and audit controls must be explicitly recorded.",
      { automation: policy.automation }
    ),
    buildGate(
      "quota_policy_configured",
      !hireEnabled || policy.quotaPolicyConfigured,
      "Hire quota bucket and weekly prompt limit must be explicit until central OATH cost controls replace product-local caps.",
      { quotaPolicy: policy.quotaPolicy }
    ),
    buildGate(
      "downstream_hire_engine_ready",
      !hireEnabled || downstream.ready,
      "Hire engine deployment-readiness probe must be green.",
      { downstream }
    ),
  ];

  const ready = gates.every((gate) => gate.ok);
  return {
    ready,
    status: ready ? "ready" : "not_ready",
    generatedAt: (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString(),
    policy,
    gates,
    downstream,
    finalUserSetup: {
      auth: "ZAKI central auth account; no Hire provider credentials or operator settings exposed.",
      userManagedSettings: [
        "candidate profile",
        "resume and portfolio imports",
        "target role and lead filters",
        "lead status pipeline",
        "manual approval and consent for form read, apply preview, and submission",
      ],
      operatorManagedSettings: [
        "LLM/model/provider routing",
        "source discovery providers and credentials",
        "browser automation runtime",
        "auto-apply kill switch, consent, and audit policy",
        "Hire engine internal token",
        "PostgreSQL DSN and tenant storage root",
        "quota policy and unit-economics caps",
        "immutable deployment image references",
        "hire-engine mirror repository and pinned source commit",
      ],
    },
  };
}

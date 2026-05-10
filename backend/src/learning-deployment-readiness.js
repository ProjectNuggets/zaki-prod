const MUTABLE_IMAGE_TAGS = new Set(["latest", "main", "master", "dev", "stage", "staging", "prod", "production"]);

function normalizeString(raw) {
  return String(raw || "").trim();
}

function buildGate(id, ok, message, detail = {}) {
  return {
    id,
    ok: Boolean(ok),
    message,
    ...detail,
  };
}

function imageTagOf(imageRef) {
  const value = normalizeString(imageRef);
  if (!value || value.includes("@sha256:")) return value ? "digest" : "";
  const slash = value.lastIndexOf("/");
  const colon = value.lastIndexOf(":");
  if (colon <= slash) return "";
  return value.slice(colon + 1).trim();
}

export function isImmutableImageRef(imageRef) {
  const value = normalizeString(imageRef);
  if (!value) return false;
  if (/@sha256:[a-f0-9]{64}$/i.test(value)) return true;
  const tag = imageTagOf(value).toLowerCase();
  if (!tag || MUTABLE_IMAGE_TAGS.has(tag)) return false;
  return (
    /^sha-[a-f0-9]{7,64}$/i.test(tag) ||
    /^[a-f0-9]{40,64}$/i.test(tag) ||
    /^v\d{8,}-[a-f0-9]{7,64}$/i.test(tag)
  );
}

export function resolveLearningDeploymentPolicy(env = process.env) {
  const zakiImageRef =
    normalizeString(env?.ZAKI_APP_IMAGE_TAG) ||
    normalizeString(env?.ZAKI_BACKEND_IMAGE_TAG) ||
    normalizeString(env?.ZAKI_IMAGE_TAG);
  const learningImageRef = normalizeString(env?.ZAKI_LEARNING_ENGINE_IMAGE_TAG);
  const tenantDataRoot =
    normalizeString(env?.LEARNING_ENGINE_TENANT_DATA_ROOT) ||
    normalizeString(env?.ZAKI_TENANT_DATA_ROOT);
  const sourceRepository = normalizeString(env?.ZAKI_LEARNING_ENGINE_SOURCE_REPOSITORY);
  const sourceCommit = normalizeString(env?.ZAKI_LEARNING_ENGINE_SOURCE_COMMIT);
  const llmProvider =
    normalizeString(env?.ZAKI_LEARNING_LLM_PROVIDER) ||
    normalizeString(env?.LEARNING_ENGINE_LLM_BINDING) ||
    normalizeString(env?.LLM_BINDING);
  const llmModel =
    normalizeString(env?.ZAKI_LEARNING_LLM_MODEL) ||
    normalizeString(env?.LEARNING_ENGINE_LLM_MODEL) ||
    normalizeString(env?.LLM_MODEL);
  const embeddingProvider =
    normalizeString(env?.ZAKI_LEARNING_EMBEDDING_PROVIDER) ||
    normalizeString(env?.LEARNING_ENGINE_EMBEDDING_BINDING) ||
    normalizeString(env?.EMBEDDING_BINDING);
  const embeddingModel =
    normalizeString(env?.ZAKI_LEARNING_EMBEDDING_MODEL) ||
    normalizeString(env?.LEARNING_ENGINE_EMBEDDING_MODEL) ||
    normalizeString(env?.EMBEDDING_MODEL);
  const searchProvider =
    normalizeString(env?.ZAKI_LEARNING_SEARCH_PROVIDER) ||
    normalizeString(env?.LEARNING_ENGINE_SEARCH_PROVIDER) ||
    normalizeString(env?.SEARCH_PROVIDER);

  return {
    zakiImageRefConfigured: Boolean(zakiImageRef),
    zakiImageRefImmutable: isImmutableImageRef(zakiImageRef),
    learningImageRefConfigured: Boolean(learningImageRef),
    learningImageRefImmutable: isImmutableImageRef(learningImageRef),
    zakiAuthSigningKeyConfigured: normalizeString(env?.ZAKI_JWT_SIGNING_KEY).length >= 64,
    learningBaseUrlConfigured: Boolean(normalizeString(env?.LEARNING_ENGINE_BASE_URL)),
    learningInternalTokenConfigured: Boolean(normalizeString(env?.LEARNING_ENGINE_INTERNAL_TOKEN)),
    tenantDataRootConfigured: Boolean(tenantDataRoot),
    sourceRepositoryConfigured: Boolean(sourceRepository),
    sourceCommitPinned: /^[a-f0-9]{40,64}$/i.test(sourceCommit),
    aiStackConfigured: Boolean(
      llmProvider &&
        llmModel &&
        embeddingProvider &&
        embeddingModel &&
        searchProvider
    ),
    aiStack: {
      llmProviderConfigured: Boolean(llmProvider),
      llmModelConfigured: Boolean(llmModel),
      embeddingProviderConfigured: Boolean(embeddingProvider),
      embeddingModelConfigured: Boolean(embeddingModel),
      searchProviderConfigured: Boolean(searchProvider),
      llmProvider: llmProvider || "",
      llmModel: llmModel || "",
      embeddingProvider: embeddingProvider || "",
      embeddingModel: embeddingModel || "",
      searchProvider: searchProvider || "",
    },
  };
}

export function buildLearningDeploymentReadinessStatus({
  env = process.env,
  nowDate = new Date(),
  learningEnabled = false,
  learningConfigured = false,
  retentionPolicy = null,
  disasterRecoveryStatus = null,
} = {}) {
  const policy = resolveLearningDeploymentPolicy(env);
  const retentionEnabled = retentionPolicy?.enabled !== false;
  const disasterRecoveryReady = Boolean(disasterRecoveryStatus?.ready);
  const gates = [
    buildGate(
      "central_auth_signing_key",
      policy.zakiAuthSigningKeyConfigured,
      "ZAKI central auth signing key must be configured with a production-strength value."
    ),
    buildGate(
      "learning_enabled_configured",
      !learningEnabled || learningConfigured,
      learningEnabled
        ? "Learning is enabled and must have base URL plus internal token configured."
        : "Learning is disabled; downstream connectivity is not release-blocking."
    ),
    buildGate(
      "learning_internal_token",
      !learningEnabled || policy.learningInternalTokenConfigured,
      "Learning engine internal token must be configured and operator-managed."
    ),
    buildGate(
      "tenant_data_root",
      policy.tenantDataRootConfigured,
      "Learning tenant data root must be explicit for hosted user isolation and backup."
    ),
    buildGate(
      "zaki_image_immutable",
      policy.zakiImageRefImmutable,
      "ZAKI deployment must use an immutable app/backend image reference."
    ),
    buildGate(
      "learning_engine_image_immutable",
      policy.learningImageRefImmutable,
      "Learning engine deployment must use an immutable image reference."
    ),
    buildGate(
      "learning_source_mirror_pinned",
      policy.sourceRepositoryConfigured && policy.sourceCommitPinned,
      "Learning engine mirror repository and exact source commit must be recorded before rollout."
    ),
    buildGate(
      "operator_ai_stack_configured",
      !learningEnabled || policy.aiStackConfigured,
      "Learning LLM, embedding, and search routing must be explicitly recorded as operator-managed deployment config.",
      { aiStack: policy.aiStack }
    ),
    buildGate(
      "retention_policy_enabled",
      retentionEnabled,
      "Learning retention cleanup policy must remain enabled for hosted production."
    ),
    buildGate(
      "disaster_recovery_ready",
      disasterRecoveryReady,
      "Learning disaster recovery gates must be ready, including backup target and fresh restore drill."
    ),
  ];

  return {
    ready: gates.every((gate) => gate.ok),
    generatedAt: (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString(),
    policy,
    gates,
    finalUserSetup: {
      auth: "ZAKI central auth account; no learning-provider credentials or provider keys exposed.",
      userManagedSettings: [
        "knowledge sources",
        "documents and images",
        "books",
        "notebooks",
        "question bank",
        "skills",
        "memory",
        "tutor personas",
        "bot channels: WhatsApp, Telegram, Discord, Email, Slack",
      ],
      operatorManagedSettings: [
        "LLM/model/provider routing",
        "embedding and search provider routing",
        "learning engine internal token",
        "quota policy and unit-economics caps",
        "retention and backup policy",
        "immutable deployment image references",
        "learning-engine mirror repository and pinned source commit",
      ],
    },
  };
}

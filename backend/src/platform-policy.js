export const PLATFORM_POLICY_VERSION = "2026-05-19.platform.v1";

export const PLATFORM_PLAN_IDS = Object.freeze({
  FREE: "free",
  PERSONAL: "personal",
  PRO: "pro",
  PRO_MAX: "pro_max",
});

export const PLATFORM_PLAN_LADDER = Object.freeze([
  PLATFORM_PLAN_IDS.FREE,
  PLATFORM_PLAN_IDS.PERSONAL,
  PLATFORM_PLAN_IDS.PRO,
  PLATFORM_PLAN_IDS.PRO_MAX,
]);

export const ZAKI_PRODUCT_IDS = Object.freeze({
  SPACES: "spaces",
  AGENT: "agent",
  LEARN: "learn",
  BRAIN: "brain",
  CLI: "cli",
  LOCAL_APP: "local_app",
  EXTENSIONS: "extensions",
});

export const MEMORY_SCOPE_IDS = Object.freeze({
  PERSONAL_BRAIN: "personal_brain",
  WORKSPACE_MEMORY: "workspace_memory",
  LEARNER_MEMORY: "learner_memory",
  SESSION_MEMORY: "session_memory",
});

const PLAN_LABELS = Object.freeze({
  [PLATFORM_PLAN_IDS.FREE]: "Free",
  [PLATFORM_PLAN_IDS.PERSONAL]: "Personal",
  [PLATFORM_PLAN_IDS.PRO]: "Pro",
  [PLATFORM_PLAN_IDS.PRO_MAX]: "Pro MAX",
});

const LEGACY_PLATFORM_PLAN_ALIASES = Object.freeze({
  spaces_free: PLATFORM_PLAN_IDS.FREE,
  free: PLATFORM_PLAN_IDS.FREE,
  student: PLATFORM_PLAN_IDS.PERSONAL,
  personal: PLATFORM_PLAN_IDS.PERSONAL,
  legacy_personal: PLATFORM_PLAN_IDS.PERSONAL,
  access_code: PLATFORM_PLAN_IDS.PERSONAL,
  agent: PLATFORM_PLAN_IDS.PERSONAL,
  learn: PLATFORM_PLAN_IDS.PERSONAL,
  complete: PLATFORM_PLAN_IDS.PRO,
});

const CURRENT_PRODUCTS = Object.freeze([
  ZAKI_PRODUCT_IDS.SPACES,
  ZAKI_PRODUCT_IDS.AGENT,
  ZAKI_PRODUCT_IDS.LEARN,
  ZAKI_PRODUCT_IDS.BRAIN,
]);

const PRODUCT_DEFINITIONS = Object.freeze({
  [ZAKI_PRODUCT_IDS.SPACES]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.SPACES,
    label: "ZAKI Spaces",
    lifecycle: "current",
    quotaPolicyId: "spaces_workspace",
    memoryScope: MEMORY_SCOPE_IDS.WORKSPACE_MEMORY,
  }),
  [ZAKI_PRODUCT_IDS.AGENT]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.AGENT,
    label: "ZAKI Agent",
    lifecycle: "current",
    quotaPolicyId: "agent_personal",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  [ZAKI_PRODUCT_IDS.LEARN]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.LEARN,
    label: "ZAKI Learn",
    lifecycle: "current",
    quotaPolicyId: "learn_learner",
    memoryScope: MEMORY_SCOPE_IDS.LEARNER_MEMORY,
  }),
  [ZAKI_PRODUCT_IDS.BRAIN]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.BRAIN,
    label: "ZAKI Brain",
    lifecycle: "current",
    quotaPolicyId: "brain_memory",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  [ZAKI_PRODUCT_IDS.CLI]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.CLI,
    label: "ZAKI CLI",
    lifecycle: "future",
    quotaPolicyId: "cli_agent",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  [ZAKI_PRODUCT_IDS.LOCAL_APP]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.LOCAL_APP,
    label: "ZAKI Local App",
    lifecycle: "future",
    quotaPolicyId: "local_app_agent",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  [ZAKI_PRODUCT_IDS.EXTENSIONS]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.EXTENSIONS,
    label: "ZAKI Extensions",
    lifecycle: "future",
    quotaPolicyId: "extension_agent",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
});

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parsePositiveIntegerOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.floor(parsed);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function cloneProductDefinition(product) {
  return { ...product };
}

export function normalizePlatformPlanId(value, fallback = PLATFORM_PLAN_IDS.FREE) {
  const normalized = normalizeId(value);
  if (PLATFORM_PLAN_LADDER.includes(normalized)) return normalized;
  if (LEGACY_PLATFORM_PLAN_ALIASES[normalized]) {
    return LEGACY_PLATFORM_PLAN_ALIASES[normalized];
  }
  return PLATFORM_PLAN_LADDER.includes(fallback) ? fallback : PLATFORM_PLAN_IDS.FREE;
}

export function getPlatformPlanLabel(planId) {
  const normalized = normalizePlatformPlanId(planId);
  return PLAN_LABELS[normalized] || PLAN_LABELS[PLATFORM_PLAN_IDS.FREE];
}

export function buildPlatformProductCatalog({ includeFuture = true } = {}) {
  const productIds = includeFuture
    ? Object.values(ZAKI_PRODUCT_IDS)
    : CURRENT_PRODUCTS;
  return productIds.map((id) => cloneProductDefinition(PRODUCT_DEFINITIONS[id]));
}

function buildProductAccessMap(products) {
  return Object.fromEntries(
    products.map((product) => [
      product.id,
      {
        available: product.lifecycle === "current",
        lifecycle: product.lifecycle,
        quotaPolicyId: product.quotaPolicyId,
        memoryScope: product.memoryScope,
      },
    ])
  );
}

export function buildPlatformPlanPolicy({ env = process.env } = {}) {
  const burstWindowHours = parsePositiveInteger(
    env?.ZAKI_PLATFORM_BURST_WINDOW_HOURS,
    5
  );

  const weeklyAllowanceByPlan = {
    [PLATFORM_PLAN_IDS.FREE]: parsePositiveIntegerOrNull(
      env?.ZAKI_PLATFORM_FREE_WEEKLY_ALLOWANCE_UNITS
    ),
    [PLATFORM_PLAN_IDS.PERSONAL]: parsePositiveIntegerOrNull(
      env?.ZAKI_PLATFORM_PERSONAL_WEEKLY_ALLOWANCE_UNITS
    ),
    [PLATFORM_PLAN_IDS.PRO]: parsePositiveIntegerOrNull(
      env?.ZAKI_PLATFORM_PRO_WEEKLY_ALLOWANCE_UNITS
    ),
    [PLATFORM_PLAN_IDS.PRO_MAX]: parsePositiveIntegerOrNull(
      env?.ZAKI_PLATFORM_PRO_MAX_WEEKLY_ALLOWANCE_UNITS
    ),
  };

  const products = buildPlatformProductCatalog();

  return {
    policyVersion: PLATFORM_POLICY_VERSION,
    planLadder: [...PLATFORM_PLAN_LADDER],
    usageModel: "shared_weekly_allowance",
    burstWindowHours,
    numericLimitsFinalized: Object.values(weeklyAllowanceByPlan).every((value) => value !== null),
    plans: Object.fromEntries(
      PLATFORM_PLAN_LADDER.map((planId) => [
        planId,
        {
          id: planId,
          label: getPlatformPlanLabel(planId),
          weeklyAllowanceUnits: weeklyAllowanceByPlan[planId],
          weeklyAllowanceConfigured: weeklyAllowanceByPlan[planId] !== null,
          burstWindowHours,
          products: buildProductAccessMap(products),
        },
      ])
    ),
  };
}

export function resolvePlatformPlanForCommercialState({
  commercialPlanId = "",
  effectiveTier = "",
  premium = false,
} = {}) {
  const normalizedCommercialPlanId = normalizeId(commercialPlanId);
  if (normalizedCommercialPlanId) {
    return normalizePlatformPlanId(normalizedCommercialPlanId);
  }
  if (premium) return normalizePlatformPlanId(effectiveTier, PLATFORM_PLAN_IDS.PERSONAL);
  return PLATFORM_PLAN_IDS.FREE;
}

export function buildPlatformEntitlementSummary({
  commercialPlanId = "",
  effectiveTier = "",
  source = "free",
  premium = false,
  env = process.env,
} = {}) {
  const policy = buildPlatformPlanPolicy({ env });
  const planId = resolvePlatformPlanForCommercialState({
    commercialPlanId,
    effectiveTier,
    premium,
  });
  const plan = policy.plans[planId] || policy.plans[PLATFORM_PLAN_IDS.FREE];
  const products = buildPlatformProductCatalog();

  return {
    policyVersion: policy.policyVersion,
    planLadder: policy.planLadder,
    plan: {
      id: plan.id,
      label: plan.label,
      source,
      premium: Boolean(premium),
      legacyPlanId: commercialPlanId || null,
      migration: Boolean(commercialPlanId && commercialPlanId !== plan.id),
    },
    usage: {
      model: policy.usageModel,
      weeklyAllowanceUnits: plan.weeklyAllowanceUnits,
      weeklyAllowanceConfigured: plan.weeklyAllowanceConfigured,
      burstWindowHours: policy.burstWindowHours,
      productQuotaMode: "weighted_product_caps",
      numericLimitsFinalized: policy.numericLimitsFinalized,
    },
    products: Object.fromEntries(
      products.map((product) => [
        product.id,
        {
          label: product.label,
          available: product.lifecycle === "current",
          lifecycle: product.lifecycle,
          quotaPolicyId: product.quotaPolicyId,
          memoryScope: product.memoryScope,
        },
      ])
    ),
    memory: {
      scopes: [
        MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
        MEMORY_SCOPE_IDS.WORKSPACE_MEMORY,
        MEMORY_SCOPE_IDS.LEARNER_MEMORY,
        MEMORY_SCOPE_IDS.SESSION_MEMORY,
      ],
      personalAuthority: ZAKI_PRODUCT_IDS.AGENT,
      workspaceAuthority: ZAKI_PRODUCT_IDS.SPACES,
      learnerAuthority: ZAKI_PRODUCT_IDS.LEARN,
    },
  };
}

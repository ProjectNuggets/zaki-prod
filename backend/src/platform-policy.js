export const PLATFORM_POLICY_VERSION = "2026-05-19.platform.v1";
export const PRODUCT_REGISTRY_VERSION = "2026-05-22.product-registry.v1";
export const PLATFORM_METER_POLICY_VERSION = "2026-05-22.meter.v1";

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

import { resolveAgentReserveUnits } from "./agent-reserve-policy.js";

export const ZAKI_PRODUCT_IDS = Object.freeze({
  SPACES: "spaces",
  AGENT: "agent",
  LEARN: "learn",
  HIRE: "hire",
  DESIGN: "design",
  BRAIN: "brain",
  CLI: "cli",
  LOCAL_APP: "local_app",
  EXTENSIONS: "extensions",
});

export const MEMORY_SCOPE_IDS = Object.freeze({
  PERSONAL_BRAIN: "personal_brain",
  WORKSPACE_MEMORY: "workspace_memory",
  LEARNER_MEMORY: "learner_memory",
  HIRE_MEMORY: "hire_memory",
  DESIGN_MEMORY: "design_memory",
  SESSION_MEMORY: "session_memory",
});

export const PRODUCT_OPERATIONAL_STATES = Object.freeze({
  ENABLED: "enabled",
  DISABLED: "disabled",
  MAINTENANCE: "maintenance",
  DEGRADED: "degraded",
  HIDDEN: "hidden",
  READ_ONLY: "readOnly",
});

const PRODUCT_STATE_VALUES = new Set(Object.values(PRODUCT_OPERATIONAL_STATES));

export const PLATFORM_METER_CAPABILITIES = Object.freeze({
  TEXT_PROMPT: "text_prompt",
  TOOL_CALL: "tool_call",
  MEMORY_READ: "memory_read",
  MEMORY_WRITE: "memory_write",
  FILE_UPLOAD: "file_upload",
  FILE_INGEST_MB: "file_ingest_mb",
  IMAGE_GENERATION: "image_generation",
  DEEP_RESEARCH: "deep_research",
  VOICE_TURN: "voice_turn",
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
  hire: PLATFORM_PLAN_IDS.PERSONAL,
  complete: PLATFORM_PLAN_IDS.PRO,
});

const CURRENT_PRODUCTS = Object.freeze([
  ZAKI_PRODUCT_IDS.SPACES,
  ZAKI_PRODUCT_IDS.AGENT,
  ZAKI_PRODUCT_IDS.LEARN,
  ZAKI_PRODUCT_IDS.HIRE,
  ZAKI_PRODUCT_IDS.BRAIN,
]);

const PRODUCT_DEFINITIONS = Object.freeze({
  [ZAKI_PRODUCT_IDS.SPACES]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.SPACES,
    registryId: "spaces",
    label: "ZAKI Spaces",
    productKind: "product",
    lifecycle: "current",
    defaultState: PRODUCT_OPERATIONAL_STATES.ENABLED,
    visibleInSettings: true,
    route: "/spaces",
    entryPoint: "Spaces / Chat",
    quotaPolicyId: "spaces_workspace",
    memoryScope: MEMORY_SCOPE_IDS.WORKSPACE_MEMORY,
  }),
  [ZAKI_PRODUCT_IDS.AGENT]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.AGENT,
    registryId: "agent",
    label: "ZAKI Agent",
    productKind: "product",
    lifecycle: "current",
    defaultState: PRODUCT_OPERATIONAL_STATES.ENABLED,
    visibleInSettings: true,
    route: "/agent",
    entryPoint: "Agent workbench",
    quotaPolicyId: "agent_personal",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  [ZAKI_PRODUCT_IDS.LEARN]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.LEARN,
    registryId: "learning",
    label: "ZAKI Learn",
    productKind: "product",
    lifecycle: "current",
    // G4-1: not-ready future spoke — registry default DISABLED, matching Hire/Design.
    // The data path is separately gated by ZAKI_LEARNING_ENABLED; flip back per-env via
    // ZAKI_PRODUCT_STATE_LEARNING=enabled without a code change.
    defaultState: PRODUCT_OPERATIONAL_STATES.DISABLED,
    visibleInSettings: true,
    route: "/learn",
    entryPoint: "Learning",
    quotaPolicyId: "learn_learner",
    memoryScope: MEMORY_SCOPE_IDS.LEARNER_MEMORY,
  }),
  [ZAKI_PRODUCT_IDS.HIRE]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.HIRE,
    registryId: "hire",
    label: "ZAKI Hire",
    productKind: "product",
    lifecycle: "future",
    defaultState: PRODUCT_OPERATIONAL_STATES.DISABLED,
    visibleInSettings: true,
    route: "/hire",
    entryPoint: "Hire",
    quotaPolicyId: "hire_pipeline",
    memoryScope: MEMORY_SCOPE_IDS.HIRE_MEMORY,
  }),
  [ZAKI_PRODUCT_IDS.DESIGN]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.DESIGN,
    registryId: "design",
    label: "ZAKI Design",
    productKind: "product",
    lifecycle: "current",
    defaultState: PRODUCT_OPERATIONAL_STATES.DISABLED,
    visibleInSettings: true,
    route: "/design",
    entryPoint: "Design",
    quotaPolicyId: "design_studio",
    memoryScope: MEMORY_SCOPE_IDS.DESIGN_MEMORY,
  }),
  [ZAKI_PRODUCT_IDS.BRAIN]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.BRAIN,
    registryId: "brain",
    label: "ZAKI Brain",
    productKind: "control_plane",
    lifecycle: "current",
    defaultState: PRODUCT_OPERATIONAL_STATES.ENABLED,
    visibleInSettings: true,
    route: "/brain",
    entryPoint: "Memory control plane",
    quotaPolicyId: "brain_memory",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  [ZAKI_PRODUCT_IDS.CLI]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.CLI,
    registryId: "cli",
    label: "ZAKI CLI",
    productKind: "client",
    lifecycle: "future",
    defaultState: PRODUCT_OPERATIONAL_STATES.HIDDEN,
    visibleInSettings: false,
    route: null,
    entryPoint: "CLI",
    quotaPolicyId: "cli_agent",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  [ZAKI_PRODUCT_IDS.LOCAL_APP]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.LOCAL_APP,
    registryId: "local_app",
    label: "ZAKI Local App",
    productKind: "client",
    lifecycle: "future",
    defaultState: PRODUCT_OPERATIONAL_STATES.HIDDEN,
    visibleInSettings: false,
    route: null,
    entryPoint: "Local app",
    quotaPolicyId: "local_app_agent",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
  [ZAKI_PRODUCT_IDS.EXTENSIONS]: Object.freeze({
    id: ZAKI_PRODUCT_IDS.EXTENSIONS,
    registryId: "extensions",
    label: "ZAKI Extensions",
    productKind: "client",
    lifecycle: "future",
    defaultState: PRODUCT_OPERATIONAL_STATES.HIDDEN,
    visibleInSettings: false,
    route: null,
    entryPoint: "Extensions",
    quotaPolicyId: "extension_agent",
    memoryScope: MEMORY_SCOPE_IDS.PERSONAL_BRAIN,
  }),
});

const PRODUCT_STATE_ENV_KEYS = Object.freeze({
  [ZAKI_PRODUCT_IDS.SPACES]: "ZAKI_PRODUCT_STATE_SPACES",
  [ZAKI_PRODUCT_IDS.AGENT]: "ZAKI_PRODUCT_STATE_AGENT",
  [ZAKI_PRODUCT_IDS.LEARN]: "ZAKI_PRODUCT_STATE_LEARNING",
  [ZAKI_PRODUCT_IDS.HIRE]: "ZAKI_PRODUCT_STATE_HIRE",
  [ZAKI_PRODUCT_IDS.DESIGN]: "ZAKI_PRODUCT_STATE_DESIGN",
  [ZAKI_PRODUCT_IDS.BRAIN]: "ZAKI_PRODUCT_STATE_BRAIN",
  [ZAKI_PRODUCT_IDS.CLI]: "ZAKI_PRODUCT_STATE_CLI",
  [ZAKI_PRODUCT_IDS.LOCAL_APP]: "ZAKI_PRODUCT_STATE_LOCAL_APP",
  [ZAKI_PRODUCT_IDS.EXTENSIONS]: "ZAKI_PRODUCT_STATE_EXTENSIONS",
});

const DEFAULT_PRODUCT_METER_WEIGHTS = Object.freeze({
  [ZAKI_PRODUCT_IDS.SPACES]: 0.5,
  [ZAKI_PRODUCT_IDS.AGENT]: 0.75,
  [ZAKI_PRODUCT_IDS.LEARN]: 1,
  [ZAKI_PRODUCT_IDS.HIRE]: 1,
  [ZAKI_PRODUCT_IDS.DESIGN]: 1.5,
  [ZAKI_PRODUCT_IDS.BRAIN]: 0.05,
  [ZAKI_PRODUCT_IDS.CLI]: 0.75,
  [ZAKI_PRODUCT_IDS.LOCAL_APP]: 0.75,
  [ZAKI_PRODUCT_IDS.EXTENSIONS]: 0.75,
});

const DEFAULT_CAPABILITY_METER_WEIGHTS = Object.freeze({
  [PLATFORM_METER_CAPABILITIES.TEXT_PROMPT]: 1,
  [PLATFORM_METER_CAPABILITIES.TOOL_CALL]: 1.25,
  [PLATFORM_METER_CAPABILITIES.MEMORY_READ]: 0.1,
  [PLATFORM_METER_CAPABILITIES.MEMORY_WRITE]: 0.25,
  [PLATFORM_METER_CAPABILITIES.FILE_UPLOAD]: 0.5,
  [PLATFORM_METER_CAPABILITIES.FILE_INGEST_MB]: 0.1,
  [PLATFORM_METER_CAPABILITIES.IMAGE_GENERATION]: 2,
  [PLATFORM_METER_CAPABILITIES.DEEP_RESEARCH]: 3,
  [PLATFORM_METER_CAPABILITIES.VOICE_TURN]: 1.25,
});

const DEFAULT_WEEKLY_ALLOWANCE_UNITS = Object.freeze({
  [PLATFORM_PLAN_IDS.FREE]: 100,
  [PLATFORM_PLAN_IDS.PERSONAL]: 1000,
  [PLATFORM_PLAN_IDS.PRO]: 3000,
  [PLATFORM_PLAN_IDS.PRO_MAX]: 7500,
});

const DEFAULT_ROLLING_ALLOWANCE_UNITS = Object.freeze({
  [PLATFORM_PLAN_IDS.FREE]: 40,
  [PLATFORM_PLAN_IDS.PERSONAL]: 200,
  [PLATFORM_PLAN_IDS.PRO]: 600,
  [PLATFORM_PLAN_IDS.PRO_MAX]: 1500,
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

function parsePositiveIntegerWithDefault(value, fallback) {
  const parsed = parsePositiveIntegerOrNull(value);
  return parsed === null ? fallback : parsed;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function cloneProductDefinition(product) {
  return { ...product };
}

function normalizeProductOperationalState(value, fallback) {
  const normalized = String(value || "").trim();
  return PRODUCT_STATE_VALUES.has(normalized) ? normalized : fallback;
}

function normalizeIsoOrNull(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function resolveProductOperationalState(product, env = process.env) {
  const envKey = PRODUCT_STATE_ENV_KEYS[product.id];
  return normalizeProductOperationalState(
    envKey ? env?.[envKey] : null,
    product.defaultState || PRODUCT_OPERATIONAL_STATES.DISABLED
  );
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

export function buildPlatformProductRegistry({
  env = process.env,
  includeHidden = true,
  nowDate = new Date(),
} = {}) {
  const date = nowDate instanceof Date ? nowDate : new Date(nowDate);
  const generatedAt = Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date().toISOString();
  const products = buildPlatformProductCatalog()
    .map((product) => {
      const state = resolveProductOperationalState(product, env);
      return {
        productId: product.registryId || product.id,
        legacyProductId:
          product.registryId && product.registryId !== product.id ? product.id : null,
        label: product.label,
        productKind: product.productKind || "product",
        state,
        lifecycle: product.lifecycle,
        visibleInSettings: Boolean(product.visibleInSettings),
        route: product.route || null,
        entryPoint: product.entryPoint || product.label,
        quotaPolicyId: product.quotaPolicyId,
        memoryScope: product.memoryScope,
      };
    })
    .filter((product) => includeHidden || product.state !== PRODUCT_OPERATIONAL_STATES.HIDDEN);

  return {
    success: true,
    contractVersion: PRODUCT_REGISTRY_VERSION,
    policyVersion: PLATFORM_POLICY_VERSION,
    generatedAt,
    products,
  };
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
  const agentReserveFloor = resolveAgentReserveUnits(env);

  const weeklyAllowanceByPlan = {
    [PLATFORM_PLAN_IDS.FREE]: parsePositiveIntegerWithDefault(
      env?.ZAKI_PLATFORM_FREE_WEEKLY_ALLOWANCE_UNITS,
      DEFAULT_WEEKLY_ALLOWANCE_UNITS[PLATFORM_PLAN_IDS.FREE]
    ),
    [PLATFORM_PLAN_IDS.PERSONAL]: parsePositiveIntegerWithDefault(
      env?.ZAKI_PLATFORM_PERSONAL_WEEKLY_ALLOWANCE_UNITS,
      DEFAULT_WEEKLY_ALLOWANCE_UNITS[PLATFORM_PLAN_IDS.PERSONAL]
    ),
    [PLATFORM_PLAN_IDS.PRO]: parsePositiveIntegerWithDefault(
      env?.ZAKI_PLATFORM_PRO_WEEKLY_ALLOWANCE_UNITS,
      DEFAULT_WEEKLY_ALLOWANCE_UNITS[PLATFORM_PLAN_IDS.PRO]
    ),
    [PLATFORM_PLAN_IDS.PRO_MAX]: parsePositiveIntegerWithDefault(
      env?.ZAKI_PLATFORM_PRO_MAX_WEEKLY_ALLOWANCE_UNITS,
      DEFAULT_WEEKLY_ALLOWANCE_UNITS[PLATFORM_PLAN_IDS.PRO_MAX]
    ),
  };
  const rollingAllowanceByPlan = {
    [PLATFORM_PLAN_IDS.FREE]: parsePositiveIntegerWithDefault(
      env?.ZAKI_PLATFORM_FREE_ROLLING_ALLOWANCE_UNITS,
      DEFAULT_ROLLING_ALLOWANCE_UNITS[PLATFORM_PLAN_IDS.FREE]
    ),
    [PLATFORM_PLAN_IDS.PERSONAL]: parsePositiveIntegerWithDefault(
      env?.ZAKI_PLATFORM_PERSONAL_ROLLING_ALLOWANCE_UNITS,
      DEFAULT_ROLLING_ALLOWANCE_UNITS[PLATFORM_PLAN_IDS.PERSONAL]
    ),
    [PLATFORM_PLAN_IDS.PRO]: parsePositiveIntegerWithDefault(
      env?.ZAKI_PLATFORM_PRO_ROLLING_ALLOWANCE_UNITS,
      DEFAULT_ROLLING_ALLOWANCE_UNITS[PLATFORM_PLAN_IDS.PRO]
    ),
    [PLATFORM_PLAN_IDS.PRO_MAX]: parsePositiveIntegerWithDefault(
      env?.ZAKI_PLATFORM_PRO_MAX_ROLLING_ALLOWANCE_UNITS,
      DEFAULT_ROLLING_ALLOWANCE_UNITS[PLATFORM_PLAN_IDS.PRO_MAX]
    ),
  };
  for (const planId of PLATFORM_PLAN_LADDER) {
    rollingAllowanceByPlan[planId] = Math.max(
      rollingAllowanceByPlan[planId],
      agentReserveFloor
    );
  }

  const products = buildPlatformProductCatalog();

  return {
    policyVersion: PLATFORM_POLICY_VERSION,
    planLadder: [...PLATFORM_PLAN_LADDER],
    usageModel: "shared_weekly_allowance",
    burstWindowHours,
    numericLimitsFinalized: true,
    plans: Object.fromEntries(
      PLATFORM_PLAN_LADDER.map((planId) => [
        planId,
        {
          id: planId,
          label: getPlatformPlanLabel(planId),
          weeklyAllowanceUnits: weeklyAllowanceByPlan[planId],
          weeklyAllowanceConfigured: weeklyAllowanceByPlan[planId] !== null,
          rollingAllowanceUnits: rollingAllowanceByPlan[planId],
          rollingAllowanceConfigured: rollingAllowanceByPlan[planId] !== null,
          burstWindowHours,
          products: buildProductAccessMap(products),
        },
      ])
    ),
  };
}

// Higher of two ladder plans (free < personal < pro < pro_max). Used so the
// DISPLAYED plan never under-states what the customer actually pays for.
function higherLadderPlan(planA, planB) {
  const rankA = PLATFORM_PLAN_LADDER.indexOf(planA);
  const rankB = PLATFORM_PLAN_LADDER.indexOf(planB);
  return rankB > rankA ? planB : planA;
}

export function resolvePlatformPlanForCommercialState({
  commercialPlanId = "",
  effectiveTier = "",
  premium = false,
} = {}) {
  const normalizedCommercialPlanId = normalizeId(commercialPlanId);
  // The ladder tier from the live entitlement (personal/pro/pro_max). On a paid
  // subscription this is the SOURCE OF TRUTH for the plan badge.
  const ladderTier = premium
    ? normalizePlatformPlanId(effectiveTier, PLATFORM_PLAN_IDS.PERSONAL)
    : null;

  if (normalizedCommercialPlanId) {
    // Bug fix (PLAN PERSONAL on a Pro account): commercial SKUs collapse the
    // ladder — `legacy_personal` aliases to `personal` even when the customer's
    // real tier is `pro`/`pro_max`. The commercial alias is about PRODUCT access,
    // not the plan badge, so it must never DROP the displayed tier below the live
    // ladder tier. Take the higher of the two so:
    //   - complete (→pro) + personal effectiveTier   → pro     (unchanged)
    //   - legacy_personal (→personal) + pro tier      → pro     (the fix)
    //   - legacy_personal (→personal) + pro_max tier  → pro_max (the fix)
    const commercialPlan = normalizePlatformPlanId(normalizedCommercialPlanId);
    if (normalizedCommercialPlanId === "legacy_personal" && !premium) {
      return PLATFORM_PLAN_IDS.PRO;
    }
    if (premium && ladderTier) return higherLadderPlan(commercialPlan, ladderTier);
    return commercialPlan;
  }
  if (premium && ladderTier) return ladderTier;
  return PLATFORM_PLAN_IDS.FREE;
}

export function buildPlatformEntitlementSummary({
  commercialPlanId = "",
  effectiveTier = "",
  source = "free",
  premium = false,
  weeklyAllowanceEntitlementStartedAt = null,
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
      weeklyAllowancePeriod: "entitlement_week",
      weeklyAllowanceAnchorPolicy: "first_metered_use_after_entitlement_active",
      weeklyAllowanceEntitlementStartedAt: normalizeIsoOrNull(
        weeklyAllowanceEntitlementStartedAt
      ),
      weeklyAllowanceResetPolicy: "fixed_7_day_no_rollover",
      weeklyAllowanceRollover: false,
      rollingAllowanceUnits: plan.rollingAllowanceUnits,
      rollingAllowanceConfigured: plan.rollingAllowanceConfigured,
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
        MEMORY_SCOPE_IDS.HIRE_MEMORY,
        MEMORY_SCOPE_IDS.DESIGN_MEMORY,
        MEMORY_SCOPE_IDS.SESSION_MEMORY,
      ],
      personalAuthority: ZAKI_PRODUCT_IDS.AGENT,
      workspaceAuthority: ZAKI_PRODUCT_IDS.SPACES,
      learnerAuthority: ZAKI_PRODUCT_IDS.LEARN,
    },
  };
}

export function buildPlatformMeterPolicy({ env = process.env } = {}) {
  const productWeights = Object.fromEntries(
    Object.values(ZAKI_PRODUCT_IDS).map((productId) => [
      productId,
      {
        weight: parsePositiveNumber(
          env?.[`ZAKI_METER_PRODUCT_WEIGHT_${productId.toUpperCase()}`],
          DEFAULT_PRODUCT_METER_WEIGHTS[productId] || 1
        ),
      },
    ])
  );
  const capabilityWeights = Object.fromEntries(
    Object.values(PLATFORM_METER_CAPABILITIES).map((capability) => [
      capability,
      {
        weight: parsePositiveNumber(
          env?.[`ZAKI_METER_CAPABILITY_WEIGHT_${capability.toUpperCase()}`],
          DEFAULT_CAPABILITY_METER_WEIGHTS[capability] || 1
        ),
      },
    ])
  );

  return {
    contractVersion: PLATFORM_METER_POLICY_VERSION,
    products: productWeights,
    capabilities: capabilityWeights,
  };
}

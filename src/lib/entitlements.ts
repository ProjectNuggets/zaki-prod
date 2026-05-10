type EntitlementPayload = {
  plan?: {
    tier?: string | null;
    status?: string | null;
  } | null;
  access?: {
    active?: boolean;
  } | null;
  effective?: {
    tier?: string | null;
    status?: string | null;
    source?: string | null;
    premium?: boolean;
  } | null;
  commercial?: {
    planId?: string | null;
    label?: string | null;
    source?: string | null;
    grandfathered?: boolean;
    products?: ProductEntitlements | null;
  } | null;
} | null;

export type CommercialPlanId =
  | "spaces_free"
  | "agent"
  | "learn"
  | "complete"
  | "legacy_personal"
  | "access_code";

export type ProductEntitlements = {
  spaces?: {
    access?: boolean;
    authenticated?: boolean;
    memoryEligible?: boolean;
    uncapped?: boolean;
    quota?: string | null;
  } | null;
  agent?: {
    access?: boolean;
    preview?: boolean;
    weeklyFreeMessages?: number | null;
  } | null;
  learn?: {
    access?: boolean;
    preview?: boolean;
    weeklyFreeActions?: number | null;
  } | null;
  billing?: {
    paid?: boolean;
    wholeApp?: boolean;
    grandfathered?: boolean;
  } | null;
};

function normalizeTier(tier: string | null | undefined) {
  if (tier === "pro") return "personal";
  if (tier === "agent" || tier === "learn" || tier === "complete") return tier;
  if (tier === "legacy_personal" || tier === "access_code") return "personal";
  if (tier === "student" || tier === "personal") return tier;
  return "free";
}

function normalizeStatus(status: string | null | undefined) {
  const value = String(status || "").trim().toLowerCase();
  if (["active", "trialing", "past_due", "inactive", "canceled", "unpaid"].includes(value)) {
    return value as "active" | "trialing" | "past_due" | "inactive" | "canceled" | "unpaid";
  }
  return "inactive";
}

function hasPaidSubscription(payload: EntitlementPayload) {
  const tier = normalizeTier(payload?.plan?.tier);
  const status = normalizeStatus(payload?.plan?.status);
  return ["student", "personal", "agent", "learn", "complete"].includes(tier) && ["active", "trialing", "past_due"].includes(status);
}

export function resolveEffectiveEntitlement(payload: EntitlementPayload) {
  const effective = payload?.effective;
  if (effective && typeof effective === "object") {
    const tier = normalizeTier(effective.tier);
    const status = normalizeStatus(effective.status);
    const source =
      effective.source === "subscription" || effective.source === "access_code"
        ? effective.source
        : "free";
    const premium =
      typeof effective.premium === "boolean"
        ? effective.premium
        : source !== "free";
    return { tier, status, source, premium };
  }

  if (hasPaidSubscription(payload)) {
    return {
      tier: normalizeTier(payload?.plan?.tier),
      status: normalizeStatus(payload?.plan?.status),
      source: "subscription" as const,
      premium: true,
    };
  }

  if (payload?.access?.active) {
    return {
      tier: "personal" as const,
      status: "active" as const,
      source: "access_code" as const,
      premium: true,
    };
  }

  return {
    tier: "free" as const,
    status: normalizeStatus(payload?.plan?.status),
    source: "free" as const,
    premium: false,
  };
}

export function hasEffectivePaidAccess(payload: EntitlementPayload) {
  return resolveEffectiveEntitlement(payload).premium;
}

export function hasActiveSubscription(payload: EntitlementPayload) {
  return hasPaidSubscription(payload);
}

export function isActiveViaAccessCode(payload: EntitlementPayload) {
  return resolveEffectiveEntitlement(payload).source === "access_code";
}

export function resolveCommercialPlanId(payload: EntitlementPayload): CommercialPlanId {
  const value = String(payload?.commercial?.planId || "").trim().toLowerCase();
  if (
    value === "agent" ||
    value === "learn" ||
    value === "complete" ||
    value === "legacy_personal" ||
    value === "access_code"
  ) {
    return value;
  }
  return "spaces_free";
}

export function resolveProductEntitlements(payload: EntitlementPayload): ProductEntitlements {
  const products = payload?.commercial?.products;
  if (products && typeof products === "object") {
    return products;
  }

  const effective = resolveEffectiveEntitlement(payload);
  const wholeApp = effective.source === "access_code" || effective.tier === "personal";
  return {
    spaces: {
      access: true,
      authenticated: true,
      memoryEligible: true,
      uncapped: wholeApp,
      quota: wholeApp ? "uncapped" : "metered",
    },
    agent: {
      access: wholeApp,
      preview: !wholeApp,
      weeklyFreeMessages: wholeApp ? null : 10,
    },
    learn: {
      access: wholeApp,
      preview: !wholeApp,
      weeklyFreeActions: wholeApp ? null : 10,
    },
    billing: {
      paid: effective.premium,
      wholeApp,
      grandfathered: false,
    },
  };
}

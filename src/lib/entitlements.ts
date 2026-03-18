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
} | null;

function normalizeTier(tier: string | null | undefined) {
  if (tier === "pro") return "personal";
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
  return ["student", "personal"].includes(tier) && ["active", "trialing", "past_due"].includes(status);
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

// Launch-state vocabulary is deliberately closed. "coming_soon" is the ONE name for
// a visible-but-not-yet-live spoke; the old "waitlist" synonym is banned (WP-K).
export type ProductLaunchState =
  | "public_app"
  | "private_beta"
  | "coming_soon"
  | "hidden"
  | "unknown";

type ProductLaunchPolicy = {
  launchState: Exclude<ProductLaunchState, "unknown">;
  releaseRole: "spoke" | "support" | "hidden";
  appRoute?: string;
  marketingRoute?: string;
};

export const RELEASE_VISIBLE_SPOKES = ["agent", "spaces", "design", "minutes"] as const;

const PRODUCT_LAUNCH_POLICIES: Record<string, ProductLaunchPolicy> = {
  agent: {
    launchState: "public_app",
    releaseRole: "spoke",
    appRoute: "/agent",
    marketingRoute: "/products/agent",
  },
  "zaki-agent": {
    launchState: "public_app",
    releaseRole: "spoke",
    appRoute: "/agent",
    marketingRoute: "/products/agent",
  },
  "zaki-bot": {
    launchState: "public_app",
    releaseRole: "spoke",
    appRoute: "/agent",
    marketingRoute: "/products/agent",
  },
  // "spaces" is the canonical id AND the canonical display name for the chat lane.
  spaces: {
    launchState: "public_app",
    releaseRole: "spoke",
    appRoute: "/spaces",
    marketingRoute: "/products/spaces",
  },
  // Legacy inbound alias only (old marketing links, ?product=chat). Never a display name.
  chat: {
    launchState: "public_app",
    releaseRole: "spoke",
    appRoute: "/spaces",
    marketingRoute: "/products/spaces",
  },
  brain: {
    launchState: "public_app",
    releaseRole: "support",
    appRoute: "/brain",
    marketingRoute: "/products/brain",
  },
  learning: {
    launchState: "hidden",
    releaseRole: "hidden",
  },
  learn: {
    launchState: "hidden",
    releaseRole: "hidden",
  },
  hire: {
    launchState: "hidden",
    releaseRole: "hidden",
  },
  career: {
    launchState: "hidden",
    releaseRole: "hidden",
  },
  design: {
    launchState: "coming_soon",
    releaseRole: "spoke",
    appRoute: "/design",
    marketingRoute: "/product",
  },
  minutes: {
    launchState: "coming_soon",
    releaseRole: "spoke",
    appRoute: "/minutes",
    marketingRoute: "/product",
  },
  cli: {
    launchState: "hidden",
    releaseRole: "hidden",
  },
  local_app: {
    launchState: "hidden",
    releaseRole: "hidden",
  },
  extensions: {
    launchState: "hidden",
    releaseRole: "hidden",
  },
};

function getProductLaunchPolicy(productId?: string | null) {
  const key = String(productId || "").trim().toLowerCase();
  return PRODUCT_LAUNCH_POLICIES[key] || null;
}

export function getCanonicalAppProductRoute(productId?: string | null) {
  const policy = getProductLaunchPolicy(productId);
  return policy?.launchState === "public_app" ? policy.appRoute || null : null;
}

export function getProductLaunchState(productId?: string | null): ProductLaunchState {
  return getProductLaunchPolicy(productId)?.launchState || "unknown";
}

export function isProductVisibleInRelease(productId?: string | null) {
  const policy = getProductLaunchPolicy(productId);
  return Boolean(policy && policy.releaseRole !== "hidden");
}

export function isReleaseSpoke(productId?: string | null) {
  return getProductLaunchPolicy(productId)?.releaseRole === "spoke";
}

export function getProductMarketingRoute(productId?: string | null) {
  const policy = getProductLaunchPolicy(productId);
  return policy?.releaseRole === "hidden" ? null : policy?.marketingRoute || null;
}

export function getProductActivationRoute(productId?: string | null) {
  const policy = getProductLaunchPolicy(productId);
  if (!policy || policy.releaseRole === "hidden") return null;
  return policy?.appRoute || policy?.marketingRoute || null;
}

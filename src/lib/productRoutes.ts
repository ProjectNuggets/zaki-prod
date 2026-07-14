export type ProductLaunchState =
  | "public_app"
  | "private_beta"
  | "waitlist"
  | "hidden"
  | "unknown";

type ProductLaunchPolicy = {
  launchState: Exclude<ProductLaunchState, "unknown">;
  appRoute?: string;
  marketingRoute?: string;
};

const PRODUCT_LAUNCH_POLICIES: Record<string, ProductLaunchPolicy> = {
  agent: {
    launchState: "public_app",
    appRoute: "/agent",
    marketingRoute: "/products/agent",
  },
  "zaki-agent": {
    launchState: "public_app",
    appRoute: "/agent",
    marketingRoute: "/products/agent",
  },
  "zaki-bot": {
    launchState: "public_app",
    appRoute: "/agent",
    marketingRoute: "/products/agent",
  },
  spaces: {
    launchState: "public_app",
    appRoute: "/spaces",
    marketingRoute: "/products/spaces",
  },
  chat: {
    launchState: "public_app",
    appRoute: "/spaces",
    marketingRoute: "/products/spaces",
  },
  brain: {
    launchState: "public_app",
    appRoute: "/brain",
    marketingRoute: "/products/brain",
  },
  minutes: {
    launchState: "waitlist",
    marketingRoute: "/products/minutes",
  },
  "meeting-minutes": {
    launchState: "waitlist",
    marketingRoute: "/products/minutes",
  },
  learning: {
    launchState: "private_beta",
    appRoute: "/learn",
    marketingRoute: "/product",
  },
  learn: {
    launchState: "private_beta",
    appRoute: "/learn",
    marketingRoute: "/product",
  },
  hire: {
    launchState: "private_beta",
    appRoute: "/hire",
    marketingRoute: "/product",
  },
  design: {
    launchState: "waitlist",
    appRoute: "/design",
    marketingRoute: "/product",
  },
  cli: {
    launchState: "hidden",
  },
  local_app: {
    launchState: "hidden",
  },
  extensions: {
    launchState: "hidden",
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

export function getProductMarketingRoute(productId?: string | null) {
  return getProductLaunchPolicy(productId)?.marketingRoute || null;
}

export function getProductActivationRoute(productId?: string | null) {
  const policy = getProductLaunchPolicy(productId);
  return policy?.appRoute || policy?.marketingRoute || null;
}

const APP_PRODUCT_ROUTES: Record<string, string> = {
  agent: "/agent",
  "zaki-agent": "/agent",
  "zaki-bot": "/agent",
  spaces: "/spaces",
  chat: "/spaces",
  brain: "/brain",
  learning: "/learn",
  learn: "/learn",
  hire: "/hire",
  design: "/design",
};

export function getCanonicalAppProductRoute(productId?: string | null) {
  const key = String(productId || "").trim().toLowerCase();
  return APP_PRODUCT_ROUTES[key] || null;
}


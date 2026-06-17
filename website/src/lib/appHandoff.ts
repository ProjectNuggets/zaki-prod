export const APP_BASE_URL = String(import.meta.env.VITE_APP_BASE_URL || "https://chatzaki.ai").replace(/\/+$/, "");

export type AppIntent =
  | "dashboard"
  | "chat"
  | "agent"
  | "memory"
  | "plans"
  | "learn_waitlist"
  | "design_waitlist"
  | "hire_waitlist";

export type WebsiteProductId = "chat" | "agent" | "brain" | "learn" | "design" | "hire";
export type WebsiteProductState = "public" | "private_beta" | "waitlist";

export type WebsiteProductHandoff = {
  id: WebsiteProductId;
  name: string;
  state: WebsiteProductState;
  statusLabel: string;
  route: string;
  intent: AppIntent;
  source: string;
};

export const websiteProductHandoffs: WebsiteProductHandoff[] = [
  {
    id: "chat",
    name: "ZAKI Chat",
    state: "public",
    statusLabel: "Live",
    route: "/spaces",
    intent: "chat",
    source: "website_product_spaces",
  },
  {
    id: "agent",
    name: "ZAKI Agent",
    state: "public",
    statusLabel: "Live",
    route: "/agent",
    intent: "agent",
    source: "website_product_agent",
  },
  {
    id: "brain",
    name: "ZAKI Brain",
    state: "public",
    statusLabel: "Included",
    route: "/brain",
    intent: "memory",
    source: "website_product_brain",
  },
  {
    id: "learn",
    name: "ZAKI Learn",
    state: "private_beta",
    statusLabel: "Private access",
    route: "/",
    intent: "learn_waitlist",
    source: "website_product_learn",
  },
  {
    id: "design",
    name: "ZAKI Design",
    state: "waitlist",
    statusLabel: "Waitlist",
    route: "/",
    intent: "design_waitlist",
    source: "website_product_design",
  },
  {
    id: "hire",
    name: "ZAKI Carrier",
    state: "private_beta",
    statusLabel: "Private access",
    route: "/",
    intent: "hire_waitlist",
    source: "website_product_hire",
  },
];

export function appHandoffUrl(path = "/", source = "website_standalone", intent: AppIntent = "dashboard") {
  const url = new URL(path, APP_BASE_URL);
  url.searchParams.set("source", source);
  url.searchParams.set("intent", intent);
  return url.toString();
}

export function getWebsiteProductHandoff(productId: WebsiteProductId) {
  return websiteProductHandoffs.find((product) => product.id === productId);
}

export function productHandoffUrl(productId: WebsiteProductId) {
  const product = getWebsiteProductHandoff(productId);
  if (!product) return appHandoffUrl();
  return appHandoffUrl(product.route, product.source, product.intent);
}

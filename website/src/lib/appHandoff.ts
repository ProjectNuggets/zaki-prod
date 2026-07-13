import { getWebsiteRuntimeConfig } from "./runtimeConfig";

export const APP_BASE_URL = getWebsiteRuntimeConfig().appBaseUrl;

export type AppIntent =
  | "dashboard"
  | "chat"
  | "agent"
  | "memory"
  | "plans"
  | "design_waitlist"
  | "minutes_waitlist";

export type WebsiteProductId = "chat" | "agent" | "brain" | "design" | "minutes";
export type WebsiteProductState = "public" | "waitlist" | "coming_soon";

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
    id: "design",
    name: "ZAKI Design",
    state: "waitlist",
    statusLabel: "Waitlist",
    route: "/",
    intent: "design_waitlist",
    source: "website_product_design",
  },
  {
    id: "minutes",
    name: "ZAKI Minutes",
    state: "coming_soon",
    statusLabel: "Coming soon",
    route: "/",
    intent: "minutes_waitlist",
    source: "website_product_minutes",
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

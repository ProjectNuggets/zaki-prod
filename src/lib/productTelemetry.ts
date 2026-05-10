import { buildApiUrl, getAuthToken } from "./api";

export type ProductTelemetryEvent =
  | "pricing_viewed"
  | "upgrade_cta_clicked"
  | "checkout_started"
  | "checkout_succeeded"
  | "first_message_sent"
  | "first_memory_saved"
  | "activation_completed"
  | "image_rendered"
  | "voice_dictate_started"
  | "voice_dictate_completed"
  | "voice_dictate_failed";

export type ProductTelemetrySource =
  | "website_nav"
  | "website_pricing"
  | "website_product_agent"
  | "website_product_learn"
  | "website_product_complete"
  | "website_product_spaces"
  | "chat_input"
  | "settings"
  | "pricing_page"
  | "success_page";

export const PRODUCT_TELEMETRY_SOURCES = [
  "website_nav",
  "website_pricing",
  "website_product_agent",
  "website_product_learn",
  "website_product_complete",
  "website_product_spaces",
  "chat_input",
  "settings",
  "pricing_page",
  "success_page",
] as const satisfies readonly ProductTelemetrySource[];

export function isProductTelemetrySource(value: string): value is ProductTelemetrySource {
  return (PRODUCT_TELEMETRY_SOURCES as readonly string[]).includes(value);
}

export type ProductTelemetryViewport = "mobile" | "tablet" | "desktop";

export type ProductTelemetryPayload = {
  event: ProductTelemetryEvent;
  source: ProductTelemetrySource;
  language?: "en" | "ar";
  viewport?: ProductTelemetryViewport;
  plan?: "free" | "student" | "personal" | "agent" | "learn" | "complete" | null;
  interval?: "monthly" | "yearly" | null;
  timestamp?: string;
};

function resolveViewportClass(): ProductTelemetryViewport {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth || 1280;
  if (width <= 767) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

export async function trackProductEvent(payload: ProductTelemetryPayload) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(buildApiUrl("/api/telemetry/product-event"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      viewport: payload.viewport || resolveViewportClass(),
      timestamp: payload.timestamp || new Date().toISOString(),
    }),
  });
  let data: { success?: boolean; error?: string | null } = {};
  try {
    data = await response.json();
  } catch {
    // Ignore JSON parsing failures.
  }
  return { response, data };
}

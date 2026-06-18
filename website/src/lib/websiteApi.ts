import { getWebsiteRuntimeConfig } from "./runtimeConfig";

export function getWebsiteApiBase() {
  const WEBSITE_API_BASE_URL = getWebsiteRuntimeConfig().websiteApiBaseUrl;
  if (WEBSITE_API_BASE_URL) {
    return WEBSITE_API_BASE_URL.replace(/\/+$/, "");
  }
  if (typeof window === "undefined") return "";
  const { hostname, protocol } = window.location;
  const isHostedWebsiteHost =
    hostname === "chatzaki.com" ||
    hostname === "www.chatzaki.com" ||
    hostname.endsWith(".chatzaki.com") ||
    hostname === "chatzaki.ai" ||
    hostname.endsWith(".chatzaki.ai") ||
    hostname === "chatzaki.io" ||
    hostname.endsWith(".chatzaki.io");
  if (!isHostedWebsiteHost) {
    return `${protocol}//${hostname}:8787`;
  }
  return "";
}

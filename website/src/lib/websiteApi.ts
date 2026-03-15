const WEBSITE_API_BASE_URL = String(import.meta.env.VITE_WEBSITE_API_BASE_URL || "").trim();
const APP_URL = "https://app.chatzaki.com";

export function getWebsiteApiBase() {
  if (WEBSITE_API_BASE_URL) {
    return WEBSITE_API_BASE_URL.replace(/\/+$/, "");
  }
  if (typeof window === "undefined") return APP_URL;
  const { hostname, protocol } = window.location;
  const isProductionWebsiteHost =
    hostname === "chatzaki.com" ||
    hostname === "www.chatzaki.com" ||
    hostname.endsWith(".chatzaki.com");
  if (!isProductionWebsiteHost) {
    return `${protocol}//${hostname}:8787`;
  }
  return APP_URL;
}

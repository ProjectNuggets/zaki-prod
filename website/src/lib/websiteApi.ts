const WEBSITE_API_BASE_URL = String(import.meta.env.VITE_WEBSITE_API_BASE_URL || "").trim();

export function getWebsiteApiBase() {
  if (WEBSITE_API_BASE_URL) {
    return WEBSITE_API_BASE_URL.replace(/\/+$/, "");
  }
  if (typeof window === "undefined") return "";
  const { hostname, protocol } = window.location;
  const isProductionWebsiteHost =
    hostname === "chatzaki.com" ||
    hostname === "www.chatzaki.com" ||
    hostname.endsWith(".chatzaki.com");
  if (!isProductionWebsiteHost) {
    return `${protocol}//${hostname}:8787`;
  }
  return "";
}

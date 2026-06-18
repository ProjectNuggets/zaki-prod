type WebsiteRuntimeEnv = {
  APP_BASE_URL?: string;
  SITE_URL?: string;
  WEBSITE_API_BASE_URL?: string;
  ENVIRONMENT?: string;
};

declare global {
  interface Window {
    __ZAKI_WEBSITE_ENV__?: WebsiteRuntimeEnv;
  }
}

function cleanUrl(value: string, fallback: string) {
  const trimmed = String(value || "").trim();
  return (trimmed || fallback).replace(/\/+$/, "");
}

function runtimeValue(key: keyof WebsiteRuntimeEnv, fallback: string) {
  if (typeof window !== "undefined") {
    const value = window.__ZAKI_WEBSITE_ENV__?.[key];
    if (value) return value;
  }
  return fallback;
}

export function getWebsiteRuntimeConfig() {
  return {
    appBaseUrl: cleanUrl(
      runtimeValue("APP_BASE_URL", import.meta.env.VITE_APP_BASE_URL || "https://www.chatzaki.ai"),
      "https://www.chatzaki.ai"
    ),
    siteUrl: cleanUrl(
      runtimeValue("SITE_URL", import.meta.env.VITE_SITE_URL || "https://www.chatzaki.com"),
      "https://www.chatzaki.com"
    ),
    websiteApiBaseUrl: cleanUrl(
      runtimeValue("WEBSITE_API_BASE_URL", import.meta.env.VITE_WEBSITE_API_BASE_URL || ""),
      ""
    ),
    environment: String(
      runtimeValue("ENVIRONMENT", import.meta.env.VITE_ZAKI_WEBSITE_ENVIRONMENT || import.meta.env.MODE || "production")
    ),
  };
}

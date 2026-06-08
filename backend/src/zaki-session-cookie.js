// Shared cookie spec for ZAKI refresh tokens — imported by login-handler.js and auth-endpoints.js.
// Single source of truth for cookie attributes (OATH-03).

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const COOKIE_NAME = "zaki_refresh";
// Path covers both /api/auth/refresh and /api/auth/logout so the cookie is available to both.
export const COOKIE_PATH = "/api/auth";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function cookieDomainAttr() {
  const explicit = String(process.env.ZAKI_COOKIE_DOMAIN || "").trim();
  if (explicit) return `Domain=${explicit}; `;
  return isProduction() ? "Domain=.chatzaki.com; " : "";
}

export function buildRefreshCookie(token) {
  const expires = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const secure = isProduction() ? "Secure; " : "";
  // Domain is env-driven (ZAKI_COOKIE_DOMAIN), defaulting to .chatzaki.com in production.
  // In local dev, omitting Domain makes the browser bind the cookie to the request host
  // (localhost), which is required for Set-Cookie to be accepted at all when the response
  // origin is localhost.
  const domain = cookieDomainAttr();
  return `${COOKIE_NAME}=${token}; HttpOnly; ${secure}SameSite=Strict; ${domain}Path=${COOKIE_PATH}; Expires=${expires.toUTCString()}`;
}

export function buildClearedRefreshCookie() {
  const secure = isProduction() ? "Secure; " : "";
  const domain = cookieDomainAttr();
  return `${COOKIE_NAME}=; HttpOnly; ${secure}SameSite=Strict; ${domain}Path=${COOKIE_PATH}; Max-Age=0`;
}

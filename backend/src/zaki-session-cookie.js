// Shared cookie spec for ZAKI refresh tokens — imported by login-handler.js and auth-endpoints.js.
// Single source of truth for cookie attributes (OATH-03).

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const COOKIE_NAME = "zaki_refresh";
export const COOKIE_DOMAIN = ".chatzaki.com";
export const COOKIE_PATH = "/api/auth/refresh";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function buildRefreshCookie(token) {
  const expires = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const secure = isProduction() ? "Secure; " : "";
  return `${COOKIE_NAME}=${token}; HttpOnly; ${secure}SameSite=Strict; Domain=${COOKIE_DOMAIN}; Path=${COOKIE_PATH}; Expires=${expires.toUTCString()}`;
}

export function buildClearedRefreshCookie() {
  const secure = isProduction() ? "Secure; " : "";
  return `${COOKIE_NAME}=; HttpOnly; ${secure}SameSite=Strict; Domain=${COOKIE_DOMAIN}; Path=${COOKIE_PATH}; Max-Age=0`;
}

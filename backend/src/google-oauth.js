import crypto from "node:crypto";

export const GOOGLE_OAUTH_NONCE_COOKIE_NAME = "zaki_google_oauth_nonce";
const GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS = 10 * 60;
const GOOGLE_OAUTH_FAILURE_CODES = new Set([
  "google_oauth_unconfigured",
  "google_oauth_start_failed",
  "google_oauth_cancelled",
  "google_oauth_missing_code",
  "google_oauth_failed",
  "google_consent_required",
  "google_consent_stale",
  "age_verification_required",
  "minimum_age",
]);

export function isGoogleOAuthConfigured({ clientId, clientSecret, stateSecret } = {}) {
  return Boolean(
    String(clientId || "").trim() &&
      String(clientSecret || "").trim() &&
      String(stateSecret || "").trim()
  );
}

export function buildGoogleOAuthRedirectUri({
  configuredRedirectUri,
  publicUrl,
  protocol = "http",
  host,
} = {}) {
  const configured = String(configuredRedirectUri || "").trim();
  if (configured) return configured;
  const publicBase = String(publicUrl || `${protocol}://${host || "localhost"}`)
    .trim()
    .replace(/\/+$/, "");
  return `${publicBase}/api/auth/google/callback`;
}

export function sanitizeGoogleOAuthReturnTo(value) {
  const fallback = "/spaces";
  const raw = String(value || "").trim();
  if (
    !raw ||
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("//")
  ) {
    return fallback;
  }

  const parsed = new URL(raw.startsWith("/") ? raw : `/${raw}`, "https://zaki.local");
  parsed.searchParams.delete("auth");
  parsed.searchParams.delete("verified");
  const sanitized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  return sanitized || fallback;
}

export function createGoogleOAuthNonce() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashGoogleOAuthNonce(nonce) {
  const normalized = String(nonce || "").trim();
  if (!normalized) return "";
  return crypto.createHash("sha256").update(normalized).digest("base64url");
}

function cookieAttributes({ secure = false, maxAgeSeconds = GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS } = {}) {
  const attrs = [
    "Path=/api/auth/google/callback",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Number.parseInt(String(maxAgeSeconds), 10) || 0)}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

export function buildGoogleOAuthNonceCookie(
  nonce,
  { secure = false, maxAgeSeconds = GOOGLE_OAUTH_NONCE_MAX_AGE_SECONDS } = {}
) {
  return `${GOOGLE_OAUTH_NONCE_COOKIE_NAME}=${encodeURIComponent(
    String(nonce || "")
  )}; ${cookieAttributes({ secure, maxAgeSeconds })}`;
}

export function buildClearedGoogleOAuthNonceCookie({ secure = false } = {}) {
  return `${GOOGLE_OAUTH_NONCE_COOKIE_NAME}=; ${cookieAttributes({
    secure,
    maxAgeSeconds: 0,
  })}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function parseGoogleOAuthCookieHeader(header) {
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf("=");
      if (index <= 0) return cookies;
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
      return cookies;
    }, {});
}

export function extractGoogleOAuthNonceFromCookieHeader(header) {
  return String(parseGoogleOAuthCookieHeader(header)[GOOGLE_OAUTH_NONCE_COOKIE_NAME] || "").trim();
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function parseBase64urlJson(value) {
  return JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf8"));
}

export function signGoogleOAuthStatePayload(payload, stateSecret) {
  const secret = String(stateSecret || "").trim();
  if (!secret) {
    throw new Error("Google OAuth state secret is not configured.");
  }
  const body = base64urlJson(payload);
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGoogleOAuthState(state, stateSecret, { now = Date.now() } = {}) {
  const secret = String(stateSecret || "").trim();
  if (!secret) {
    throw new Error("Google OAuth state secret is not configured.");
  }
  const [body, sig] = String(state || "").split(".");
  if (!body || !sig) throw new Error("Invalid OAuth state.");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const provided = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (
    provided.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(provided, expectedBuffer)
  ) {
    throw new Error("Invalid OAuth state signature.");
  }
  const payload = parseBase64urlJson(body);
  if (!payload?.exp || Number(payload.exp) < now) {
    throw new Error("OAuth state expired.");
  }
  return {
    returnTo: sanitizeGoogleOAuthReturnTo(payload.returnTo),
    nonceHash: String(payload.nonceHash || "").trim(),
    legalPolicyVersion: String(payload.legalPolicyVersion || "").trim() || null,
  };
}

export function verifyGoogleOAuthNonceBinding({ cookieNonce, stateNonceHash }) {
  const expected = String(stateNonceHash || "").trim();
  const actual = hashGoogleOAuthNonce(cookieNonce);
  if (!expected || !actual) {
    const err = new Error("OAuth state nonce is missing.");
    err.status = 401;
    throw err;
  }
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    const err = new Error("OAuth state nonce mismatch.");
    err.status = 401;
    throw err;
  }
  return true;
}

function normalizeGoogleOAuthFailureCode(value) {
  const code = String(value || "").trim();
  return GOOGLE_OAUTH_FAILURE_CODES.has(code) ? code : "google_oauth_failed";
}

/**
 * Returns a start failure to the popup opener only when the caller requested
 * the one allowed popup destination. Start failures have no signed state yet,
 * so every other destination deliberately remains an API response.
 */
export function buildGoogleOAuthStartFailureRedirect({ appUrl, returnTo, errorCode } = {}) {
  if (sanitizeGoogleOAuthReturnTo(returnTo) !== "/?oauthPopup=google") return null;

  try {
    const popupUrl = new URL("/?oauthPopup=google", appUrl);
    popupUrl.searchParams.set("error", normalizeGoogleOAuthFailureCode(errorCode));
    return popupUrl.toString();
  } catch {
    return null;
  }
}

/**
 * Returns an OAuth failure to the popup opener only when the callback's signed
 * state and nonce cookie both prove that this browser initiated that exact popup
 * flow. All other failures fall back to the ordinary login page.
 */
export function buildGoogleOAuthCallbackFailureRedirect({
  appUrl,
  state,
  stateSecret,
  cookieNonce,
  errorCode,
} = {}) {
  const fallback = new URL("/?auth=login", appUrl);
  const safeErrorCode = normalizeGoogleOAuthFailureCode(errorCode);
  fallback.searchParams.set("error", safeErrorCode);

  try {
    const { returnTo, nonceHash } = verifyGoogleOAuthState(state, stateSecret);
    verifyGoogleOAuthNonceBinding({ cookieNonce, stateNonceHash: nonceHash });
    if (returnTo !== "/?oauthPopup=google") return fallback.toString();

    const popupUrl = new URL(returnTo, appUrl);
    popupUrl.searchParams.set("error", safeErrorCode);
    return popupUrl.toString();
  } catch {
    return fallback.toString();
  }
}

export function validateGoogleIdTokenInfoPayload(data, clientId) {
  const issuer = String(data?.iss || "");
  if (data?.aud !== clientId) {
    const err = new Error("Google ID token audience mismatch.");
    err.status = 401;
    throw err;
  }
  if (issuer !== "https://accounts.google.com" && issuer !== "accounts.google.com") {
    const err = new Error("Google ID token issuer mismatch.");
    err.status = 401;
    throw err;
  }
  if (String(data?.email_verified || "").toLowerCase() !== "true") {
    const err = new Error("Google email is not verified.");
    err.status = 403;
    throw err;
  }
  const email = String(data?.email || "").trim().toLowerCase();
  const googleSub = String(data?.sub || "").trim();
  if (!email || !googleSub) {
    const err = new Error("Google account payload is missing email or subject.");
    err.status = 401;
    throw err;
  }
  return {
    email,
    googleSub,
    fullName: String(data?.name || "").trim() || null,
  };
}

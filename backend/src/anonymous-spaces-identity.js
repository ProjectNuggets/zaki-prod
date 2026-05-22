import crypto from "node:crypto";

export const ANONYMOUS_SPACES_COOKIE_NAME = "zaki_anon";
export const ANONYMOUS_METER_COOKIE_NAME = "zaki_meter_anon";
const ANONYMOUS_SPACES_COOKIE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function base64Url(value) {
  return Buffer.from(String(value)).toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(String(value), "base64url").toString("utf8");
}

function parseCookieHeader(header) {
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

function signAnonymousId(id, issuedAt, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${id}.${issuedAt}`)
    .digest("base64url");
}

export function buildAnonymousSpacesCookie(id, secret, nowMs = Date.now()) {
  const issuedAt = String(nowMs);
  const payload = `${base64Url(id)}.${issuedAt}.${signAnonymousId(id, issuedAt, secret)}`;
  const expires = new Date(nowMs + ANONYMOUS_SPACES_COOKIE_TTL_MS);
  const secure = isProduction() ? "Secure; " : "";
  const domain = isProduction() ? "Domain=.chatzaki.com; " : "";
  return `${ANONYMOUS_SPACES_COOKIE_NAME}=${encodeURIComponent(payload)}; HttpOnly; ${secure}SameSite=Lax; ${domain}Path=/api/anonymous; Expires=${expires.toUTCString()}`;
}

export function buildAnonymousMeterCookie(id, secret, nowMs = Date.now()) {
  const issuedAt = String(nowMs);
  const payload = `${base64Url(id)}.${issuedAt}.${signAnonymousId(id, issuedAt, secret)}`;
  const expires = new Date(nowMs + ANONYMOUS_SPACES_COOKIE_TTL_MS);
  const secure = isProduction() ? "Secure; " : "";
  const domain = isProduction() ? "Domain=.chatzaki.com; " : "";
  return `${ANONYMOUS_METER_COOKIE_NAME}=${encodeURIComponent(payload)}; HttpOnly; ${secure}SameSite=Lax; ${domain}Path=/api; Expires=${expires.toUTCString()}`;
}

export function verifyAnonymousSpacesCookie(value, secret, nowMs = Date.now()) {
  const [encodedId, issuedAt, signature] = String(value || "").split(".");
  if (!encodedId || !issuedAt || !signature || !secret) return null;
  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs) || issuedAtMs <= 0) return null;
  if (issuedAtMs + ANONYMOUS_SPACES_COOKIE_TTL_MS < nowMs) return null;
  let id = "";
  try {
    id = fromBase64Url(encodedId);
  } catch {
    return null;
  }
  if (!id || id.length > 128) return null;
  const expected = signAnonymousId(id, issuedAt, secret);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length) return null;
  if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) return null;
  return id;
}

export function resolveAnonymousSpacesId(req, res, secret, nowMs = Date.now()) {
  const cookies = parseCookieHeader(req?.headers?.cookie);
  const existing = verifyAnonymousSpacesCookie(
    cookies[ANONYMOUS_SPACES_COOKIE_NAME],
    secret,
    nowMs
  );
  if (existing) return existing;

  const id = crypto.randomUUID();
  if (res && secret) {
    res.setHeader("Set-Cookie", buildAnonymousSpacesCookie(id, secret, nowMs));
  }
  return id;
}

export function resolveAnonymousMeterId(req, res, secret, nowMs = Date.now()) {
  const cookies = parseCookieHeader(req?.headers?.cookie);
  const existing = verifyAnonymousSpacesCookie(
    cookies[ANONYMOUS_METER_COOKIE_NAME],
    secret,
    nowMs
  );
  if (existing) return existing;

  const id = crypto.randomUUID();
  if (res && secret) {
    res.setHeader("Set-Cookie", buildAnonymousMeterCookie(id, secret, nowMs));
  }
  return id;
}

import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";

function isPrintableSecret(value) {
  const secret = String(value ?? "");
  return (
    secret.length >= 32 &&
    secret.length <= 512 &&
    secret === secret.trim() &&
    /^[\x20-\x7e]+$/.test(secret)
  );
}

export function isValidMinutesControlToken(value) {
  return isPrintableSecret(value);
}

// MINUTES_ENGINE_CONTROL_TOKEN(_FILE) is a server-only signing secret, not a
// bearer credential. Every outbound request mints a narrow, short-lived token
// from it so the engine can prove the token scope matches the request's subject.
export function isValidMinutesControlSigningKey(value) {
  return isPrintableSecret(value);
}

export function isValidMinutesCallbackHmacKey(value) {
  return isPrintableSecret(value);
}

// This key protects encrypted pre-spawn requests at rest. It intentionally is
// not the engine-scoped signing key: rotating the latter must never strand an
// ambiguous capture whose retry body is still needed for reconciliation.
export function isValidMinutesControlRecoveryKey(value) {
  return isPrintableSecret(value);
}

function resolveSecret({ tokenFile, fallbackToken, readFileSync, fileName, tokenName, validate }) {
  const resolvedFile = String(tokenFile || "").trim();
  let token = String(fallbackToken ?? "");
  if (resolvedFile) {
    if (!path.isAbsolute(resolvedFile) || typeof readFileSync !== "function") {
      throw new Error(`${fileName} is invalid.`);
    }
    try {
      token = String(readFileSync(resolvedFile, "utf8"));
    } catch (cause) {
      throw new Error(`${fileName} could not be read.`, { cause });
    }
  }
  if (!validate(token)) throw new Error(`${tokenName} is invalid.`);
  return token;
}

export function resolveMinutesControlToken({ tokenFile, fallbackToken, readFileSync }) {
  return resolveSecret({
    tokenFile,
    fallbackToken,
    readFileSync,
    fileName: "MINUTES_ENGINE_CONTROL_TOKEN_FILE",
    tokenName: "MINUTES_ENGINE_CONTROL_TOKEN",
    validate: isValidMinutesControlSigningKey,
  });
}

export const resolveMinutesControlSigningKey = resolveMinutesControlToken;

export function resolveMinutesControlRecoveryKey({ tokenFile, fallbackToken, readFileSync }) {
  return resolveSecret({
    tokenFile,
    fallbackToken,
    readFileSync,
    fileName: "MINUTES_CONTROL_RECOVERY_KEY_FILE",
    tokenName: "MINUTES_CONTROL_RECOVERY_KEY",
    validate: isValidMinutesControlRecoveryKey,
  });
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sign(encodedPayload, signingKey) {
  return createHmac("sha256", signingKey).update(encodedPayload, "utf8").digest("base64url");
}

function validScopeId(value) {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
}

export function mintMinutesControlAccessToken({
  signingKey,
  tenantId,
  userId,
  nowMs = Date.now(),
  ttlSeconds = 60,
} = {}) {
  if (!isValidMinutesControlSigningKey(signingKey)) throw new Error("MINUTES_ENGINE_CONTROL_TOKEN is invalid.");
  const normalizedTenantId = String(tenantId || "");
  const normalizedUserId = String(userId || "");
  const issuedAt = Math.floor(Number(nowMs) / 1_000);
  const ttl = Number(ttlSeconds);
  if (!validScopeId(normalizedTenantId) || !/^[1-9][0-9]{0,18}$/.test(normalizedUserId)) {
    throw new Error("invalid_minutes_control_token_scope");
  }
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(ttl) || ttl < 30 || ttl > 300) {
    throw new Error("invalid_minutes_control_token_ttl");
  }
  // Alphabetical fields make the encoded payload deterministic across Hub and
  // engine implementations; the HMAC covers the encoded bytes exactly.
  const payload = {
    aud: "zaki-control.v1",
    exp: issuedAt + ttl,
    iat: issuedAt,
    tenant_id: normalizedTenantId,
    user_id: normalizedUserId,
    v: 1,
  };
  const encodedPayload = base64urlJson(payload);
  return `${encodedPayload}.${sign(encodedPayload, signingKey)}`;
}

export function verifyMinutesControlAccessToken({ token, signingKey, nowMs = Date.now() } = {}) {
  if (!isValidMinutesControlSigningKey(signingKey)) return null;
  const [encodedPayload, encodedSignature, ...rest] = String(token || "").split(".");
  if (!encodedPayload || !encodedSignature || rest.length) return null;
  const expected = Buffer.from(sign(encodedPayload, signingKey), "utf8");
  const actual = Buffer.from(encodedSignature, "utf8");
  if (actual.byteLength !== expected.byteLength || !timingSafeEqual(actual, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const nowSeconds = Math.floor(Number(nowMs) / 1_000);
  if (
    !payload || payload.v !== 1 || payload.aud !== "zaki-control.v1" ||
    !validScopeId(payload.tenant_id) || !/^[1-9][0-9]{0,18}$/.test(payload.user_id) ||
    !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) ||
    payload.exp <= payload.iat || payload.exp - payload.iat > 300 ||
    !Number.isSafeInteger(nowSeconds) || payload.iat > nowSeconds || nowSeconds > payload.exp
  ) return null;
  return payload;
}

export function resolveMinutesCallbackHmacKey({ tokenFile, fallbackToken, readFileSync }) {
  return resolveSecret({
    tokenFile,
    fallbackToken,
    readFileSync,
    fileName: "MINUTES_ENGINE_CALLBACK_HMAC_KEY_FILE",
    tokenName: "MINUTES_ENGINE_CALLBACK_HMAC_KEY",
    validate: isValidMinutesCallbackHmacKey,
  });
}

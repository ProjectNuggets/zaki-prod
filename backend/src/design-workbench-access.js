import crypto from "node:crypto";

const COOKIE_PREFIX = "zaki_design_workbench_";
const MAX_AGE_SECONDS = 8 * 60 * 60;
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function createDesignWorkbenchAccess({ secret, secure = process.env.NODE_ENV === "production", now = () => Date.now() }) {
  const key = crypto.createHmac("sha256", requiredSecret(secret)).update("zaki-design-workbench-access-v2").digest();

  function issue(input) {
    const binding = requiredBinding(input);
    const issuedAt = Math.floor(now() / 1000);
    const body = Buffer.from(JSON.stringify({
      v: 2,
      sub: binding.userId,
      sid: binding.sessionId,
      pid: binding.projectId,
      gen: binding.generation,
      iat: issuedAt,
      exp: issuedAt + MAX_AGE_SECONDS,
    }))
      .toString("base64url");
    const signature = crypto.createHmac("sha256", key).update(body).digest("base64url");
    return `${cookieName(binding.sessionId)}=${body}.${signature}; Path=/api/design; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${secure ? "; Secure" : ""}`;
  }

  function resolve(req, expectedSessionId) {
    if (expectedSessionId !== undefined && !OPAQUE_ID.test(expectedSessionId)) return null;
    const cookies = readCookies(req?.headers?.cookie);
    const candidates = expectedSessionId
      ? [[cookieName(expectedSessionId), cookies.get(cookieName(expectedSessionId))]]
      : [...cookies.entries()].filter(([name]) => name.startsWith(COOKIE_PREFIX));
    for (const [, token] of candidates) {
      const binding = resolveToken(token);
      if (binding && (!expectedSessionId || binding.sessionId === expectedSessionId)) return binding;
    }
    return null;
  }

  function revoke(sessionId) {
    if (!OPAQUE_ID.test(String(sessionId || ""))) {
      throw new Error("Design workbench session is invalid.");
    }
    return `${cookieName(sessionId)}=; Path=/api/design; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
  }

  function resolveToken(token) {
    if (!token) return null;
    const [body, signature, extra] = token.split(".");
    if (!body || !signature || extra) return null;
    const expected = crypto.createHmac("sha256", key).update(body).digest();
    let received;
    try { received = Buffer.from(signature, "base64url"); } catch { return null; }
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
      const current = Math.floor(now() / 1000);
      if (
        payload?.v !== 2 ||
        !OPAQUE_ID.test(payload.sub) ||
        !OPAQUE_ID.test(payload.sid) ||
        !OPAQUE_ID.test(payload.pid) ||
        !Number.isSafeInteger(payload.gen) ||
        payload.gen < 0 ||
        !Number.isSafeInteger(payload.iat) ||
        !Number.isSafeInteger(payload.exp)
      ) return null;
      if (payload.iat > current + 30 || payload.exp <= current || payload.exp - payload.iat !== MAX_AGE_SECONDS) return null;
      return {
        userId: payload.sub,
        sessionId: payload.sid,
        projectId: payload.pid,
        generation: payload.gen,
      };
    } catch {
      return null;
    }
  }

  return { issue, resolve, revoke };
}

function requiredSecret(value) {
  const secret = String(value || "");
  if (secret.length < 16) throw new Error("Design workbench signing secret is invalid.");
  return secret;
}

function requiredBinding(value) {
  const binding = {
    userId: String(value?.userId ?? ""),
    sessionId: String(value?.sessionId ?? ""),
    projectId: String(value?.projectId ?? ""),
    generation: Number(value?.generation),
  };
  if (
    !OPAQUE_ID.test(binding.userId) ||
    !OPAQUE_ID.test(binding.sessionId) ||
    !OPAQUE_ID.test(binding.projectId) ||
    !Number.isSafeInteger(binding.generation) ||
    binding.generation < 0
  ) throw new Error("Design workbench binding is invalid.");
  return binding;
}

function cookieName(sessionId) {
  return `${COOKIE_PREFIX}${sessionId}`;
}

function readCookies(header) {
  const cookies = new Map();
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name || cookies.has(name)) continue;
    cookies.set(name, part.slice(index + 1).trim());
  }
  return cookies;
}

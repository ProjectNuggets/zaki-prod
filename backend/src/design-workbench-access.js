import crypto from "node:crypto";

const COOKIE_NAME = "zaki_design_workbench";
const MAX_AGE_SECONDS = 8 * 60 * 60;

export function createDesignWorkbenchAccess({ secret, secure = process.env.NODE_ENV === "production", now = () => Date.now() }) {
  const key = crypto.createHmac("sha256", requiredSecret(secret)).update("zaki-design-workbench-access-v1").digest();

  function issue(userId) {
    const issuedAt = Math.floor(now() / 1000);
    const body = Buffer.from(JSON.stringify({ v: 1, sub: String(userId), iat: issuedAt, exp: issuedAt + MAX_AGE_SECONDS }))
      .toString("base64url");
    const signature = crypto.createHmac("sha256", key).update(body).digest("base64url");
    return `${COOKIE_NAME}=${body}.${signature}; Path=/api/design/workbench; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}${secure ? "; Secure" : ""}`;
  }

  function resolve(req) {
    const token = readCookie(req?.headers?.cookie, COOKIE_NAME);
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
      if (payload?.v !== 1 || !payload.sub || !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return null;
      if (payload.iat > current + 30 || payload.exp <= current || payload.exp - payload.iat !== MAX_AGE_SECONDS) return null;
      return { userId: String(payload.sub) };
    } catch {
      return null;
    }
  }

  return { issue, resolve };
}

function requiredSecret(value) {
  const secret = String(value || "");
  if (secret.length < 16) throw new Error("Design workbench signing secret is invalid.");
  return secret;
}

function readCookie(header, name) {
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    return part.slice(index + 1).trim();
  }
  return null;
}

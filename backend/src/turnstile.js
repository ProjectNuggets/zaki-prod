import { getCloudflareAwareClientIp } from "./security-rate-limit.js";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function readTurnstileToken(body = {}) {
  return String(
    body.turnstileToken ||
      body.cfTurnstileToken ||
      body["cf-turnstile-response"] ||
      body.captchaToken ||
      ""
  ).trim();
}

export function createTurnstileMiddleware({
  secretKey = process.env.ZAKI_TURNSTILE_SECRET_KEY,
  fetchImpl = globalThis.fetch,
  required = String(process.env.ZAKI_TURNSTILE_DISABLED || "").trim().toLowerCase() !== "true",
} = {}) {
  const normalizedSecret = String(secretKey || "").trim();
  return async function verifyTurnstile(req, res, next) {
    if (!required) {
      next();
      return;
    }
    if (!normalizedSecret) {
      if (process.env.NODE_ENV !== "production") {
        next();
        return;
      }
      res.status(503).json({
        success: false,
        error: "captcha_unconfigured",
        message: "Signup verification is temporarily unavailable.",
      });
      return;
    }

    const token = readTurnstileToken(req.body || {});
    if (!token) {
      res.status(400).json({
        success: false,
        error: "captcha_required",
        message: "Complete the verification challenge before signing up.",
      });
      return;
    }

    try {
      const body = new URLSearchParams();
      body.set("secret", normalizedSecret);
      body.set("response", token);
      const remoteIp = getCloudflareAwareClientIp(req);
      if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

      const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success !== true) {
        res.status(400).json({
          success: false,
          error: "captcha_failed",
          message: "Verification failed. Please try again.",
        });
        return;
      }
      next();
    } catch (error) {
      console.error("[Turnstile] Verification error:", error?.message || error);
      res.status(502).json({
        success: false,
        error: "captcha_unavailable",
        message: "Verification is temporarily unavailable. Please try again.",
      });
    }
  };
}

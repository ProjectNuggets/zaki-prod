function normalizeUrl(value) {
  return String(value || "").trim();
}

function normalizeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

export function createBillingAlertDispatcher({
  webhookUrl = "",
  webhookToken = "",
  timeoutMs = 4000,
  cooldownMs = 180_000,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  const url = normalizeUrl(webhookUrl);
  const token = normalizeText(webhookToken);
  const boundedTimeoutMs = Math.max(500, Number(timeoutMs) || 4000);
  const boundedCooldownMs = Math.max(1_000, Number(cooldownMs) || 180_000);
  const lastSentByKey = new Map();

  function isEnabled() {
    return Boolean(url && typeof fetchImpl === "function");
  }

  function getKey(alert = {}) {
    const provider = normalizeText(alert.provider, "unknown").toLowerCase();
    const id = normalizeText(alert.id, "generic").toLowerCase();
    const severity = normalizeText(alert.severity, "medium").toLowerCase();
    return `${provider}:${id}:${severity}`;
  }

  function shouldSend(alert = {}) {
    const key = getKey(alert);
    const ts = now();
    if (!lastSentByKey.has(key)) {
      return { send: true, key, skippedReason: null };
    }
    const last = Number(lastSentByKey.get(key) || 0);
    if (ts - last < boundedCooldownMs) {
      return { send: false, key, skippedReason: "cooldown" };
    }
    return { send: true, key, skippedReason: null };
  }

  async function dispatch(alert = {}) {
    if (!isEnabled()) {
      return { sent: false, skippedReason: "disabled", key: null };
    }

    const decision = shouldSend(alert);
    if (!decision.send) {
      return { sent: false, skippedReason: decision.skippedReason, key: decision.key };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), boundedTimeoutMs);
    try {
      const headers = new Headers({ "Content-Type": "application/json" });
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetchImpl(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          source: "zaki.billing.webhook",
          alert: {
            id: normalizeText(alert.id, "billing_webhook_error"),
            provider: normalizeText(alert.provider, "unknown"),
            severity: normalizeText(alert.severity, "high"),
            message: normalizeText(alert.message, "Billing webhook processing failed."),
            timestamp: new Date().toISOString(),
            details: alert.details && typeof alert.details === "object" ? alert.details : {},
          },
          env: process.env.NODE_ENV || "development",
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const raw = await response.text().catch(() => "");
        throw new Error(`Webhook returned ${response.status}${raw ? ` ${raw.slice(0, 280)}` : ""}`);
      }

      lastSentByKey.set(decision.key, now());
      return { sent: true, skippedReason: null, key: decision.key };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    dispatch,
    isEnabled,
  };
}

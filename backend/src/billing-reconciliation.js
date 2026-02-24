function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function shouldRetryBillingSyncError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  if ([408, 409, 425, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  const code = String(error?.code || "").toUpperCase();
  if (["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED"].includes(code)) {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("temporarily unavailable") ||
    message.includes("rate limit")
  );
}

export function resolveSyncMaxAttempts(retryCount, { fallback = 2, min = 1, max = 5 } = {}) {
  const parsed = Number.parseInt(String(retryCount ?? ""), 10);
  const normalizedRetries = Number.isFinite(parsed) ? parsed : fallback - 1;
  return Math.min(max, Math.max(min, normalizedRetries + 1));
}

export async function runBillingSyncWithRetries(
  syncFn,
  {
    maxAttempts = 2,
    baseDelayMs = 150,
    shouldRetry = shouldRetryBillingSyncError,
    sleepFn = sleep,
  } = {}
) {
  const attempts = Math.max(1, Number(maxAttempts) || 1);
  const delayMs = Math.max(0, Number(baseDelayMs) || 0);
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await syncFn();
      return { result, attemptsUsed: attempt, maxAttempts: attempts };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts && shouldRetry(error);
      if (!canRetry) break;
      const waitMs = delayMs * attempt;
      if (waitMs > 0) {
        await sleepFn(waitMs);
      }
    }
  }

  if (lastError && typeof lastError === "object") {
    lastError.attemptsUsed = attempts;
    lastError.maxAttempts = attempts;
  }
  throw lastError || new Error("Billing sync failed.");
}

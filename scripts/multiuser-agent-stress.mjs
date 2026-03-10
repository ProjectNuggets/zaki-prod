#!/usr/bin/env node

import {
  requireAtLeastTwoTokens,
  requireNonPlaceholderTokens,
  resolveBaseUrl,
  resolveMultiuserTokens,
} from "./multiuser-agent-env.mjs";

const baseUrl = resolveBaseUrl();
const tokens = resolveMultiuserTokens();
const rounds = Math.max(1, Number(process.env.ZAKI_MULTIUSER_ROUNDS || 3));
const p95TargetMs = Math.max(500, Number(process.env.ZAKI_MULTIUSER_P95_TARGET_MS || 3000));
const errorRateTarget = Math.max(0, Number(process.env.ZAKI_MULTIUSER_ERROR_RATE_TARGET || 0.005));
requireAtLeastTwoTokens(tokens);
requireNonPlaceholderTokens(tokens);

async function authRequest(token, path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
}

async function runStream(token, message) {
  const startedAt = Date.now();
  try {
    const response = await authRequest(token, "/api/agent/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, spaceId: "zaki-bot", threadId: "main" }),
    });
    if (!response.ok) {
      return { ok: false, status: response.status, latencyMs: Date.now() - startedAt };
    }
    if (!response.body) {
      return { ok: true, status: response.status, latencyMs: Date.now() - startedAt };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      buffer += chunk;

      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const lines = block.split("\n");
        const eventType = lines
          .find((line) => line.startsWith("event:"))
          ?.slice(6)
          .trim()
          .toLowerCase();
        if (eventType === "done") {
          try {
            await reader.cancel();
          } catch {
            // ignore cancel errors
          }
          return { ok: true, status: response.status, latencyMs: Date.now() - startedAt };
        }
        sep = buffer.indexOf("\n\n");
      }
    }

    return { ok: true, status: response.status, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

for (const token of tokens) {
  await authRequest(token, "/api/agent/provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spaceId: "zaki-bot", threadId: "main" }),
  });
}

const attempts = [];
for (let round = 0; round < rounds; round += 1) {
  const wave = await Promise.all(
    tokens.map((token, index) =>
      runStream(
        token,
        `Reply with exactly "OK". Stress round ${round + 1} for user ${index + 1} at ${Date.now()}.`
      )
    )
  );
  attempts.push(...wave);
}

const latencies = attempts.map((attempt) => attempt.latencyMs).sort((a, b) => a - b);
const errorCount = attempts.filter((attempt) => !attempt.ok).length;
const errorRate = attempts.length ? errorCount / attempts.length : 1;
const p95Index = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
const p95 = latencies.length ? latencies[p95Index] : Number.POSITIVE_INFINITY;

const summary = {
  ok: p95 <= p95TargetMs && errorRate <= errorRateTarget,
  rounds,
  users: tokens.length,
  attempts: attempts.length,
  errorCount,
  errorRate,
  p95Ms: p95,
  thresholds: { p95Ms: p95TargetMs, errorRate: errorRateTarget },
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exit(2);

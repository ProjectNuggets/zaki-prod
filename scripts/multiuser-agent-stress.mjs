#!/usr/bin/env node

const baseUrl = String(process.env.ZAKI_BASE_URL || "http://127.0.0.1:8787").replace(/\/+$/, "");
const tokens = String(process.env.ZAKI_MULTIUSER_TOKENS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const rounds = Math.max(1, Number(process.env.ZAKI_MULTIUSER_ROUNDS || 3));
const p95TargetMs = Math.max(500, Number(process.env.ZAKI_MULTIUSER_P95_TARGET_MS || 3000));
const errorRateTarget = Math.max(0, Number(process.env.ZAKI_MULTIUSER_ERROR_RATE_TARGET || 0.005));

if (tokens.length < 2) {
  console.error("Set ZAKI_MULTIUSER_TOKENS with at least 2 bearer tokens.");
  process.exit(1);
}

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
  const response = await authRequest(token, "/api/agent/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, spaceId: "zaki-bot", threadId: "main" }),
  });
  const latencyMs = Date.now() - startedAt;
  if (!response.ok) return { ok: false, status: response.status, latencyMs };
  await response.text();
  return { ok: true, status: response.status, latencyMs };
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
      runStream(token, `Stress round ${round + 1} for user ${index + 1} at ${Date.now()}`)
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


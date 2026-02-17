#!/usr/bin/env node

import process from "node:process";

const DEFAULT_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_POLICY_VERSION = "2026-02-17.v1";
const SAFE_DEFAULT_TARGET_RPS = 4;

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function sleep(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min, max) {
  const low = Number.isFinite(min) ? min : 0;
  const high = Number.isFinite(max) ? max : low;
  if (high <= low) return low;
  return low + Math.random() * (high - low);
}

function parseArgs(argv) {
  const args = {
    baseUrl: process.env.LOAD_BASE_URL || DEFAULT_BASE_URL,
    token: process.env.LOAD_TOKEN || "",
    email: process.env.LOAD_EMAIL || "",
    password: process.env.LOAD_PASSWORD || "",
    policyVersion: process.env.LOAD_POLICY_VERSION || DEFAULT_POLICY_VERSION,
    workspace: process.env.LOAD_WORKSPACE || "zaky",
    thread: process.env.LOAD_THREAD || "",
    durationSec: Number(process.env.LOAD_DURATION_SEC || 20),
    concurrency: Number(process.env.LOAD_CONCURRENCY || 16),
    timeoutMs: Number(process.env.LOAD_TIMEOUT_MS || 15000),
    targetRps: Number(process.env.LOAD_TARGET_RPS || SAFE_DEFAULT_TARGET_RPS),
    thinkMinMs: Number(process.env.LOAD_THINK_MIN_MS || 30),
    thinkMaxMs: Number(process.env.LOAD_THINK_MAX_MS || 120),
    rampSec: Number(process.env.LOAD_RAMP_SEC || 1),
    autoThread: parseBoolean(process.env.LOAD_AUTO_THREAD, true),
    includeStream: parseBoolean(process.env.LOAD_INCLUDE_STREAM, true),
    assertMinSuccessRate: process.env.LOAD_ASSERT_MIN_SUCCESS_RATE,
    assertMaxUnauthorized: process.env.LOAD_ASSERT_MAX_UNAUTHORIZED,
    assertMinTotal: process.env.LOAD_ASSERT_MIN_TOTAL,
  };

  for (const item of argv) {
    if (!item.startsWith("--")) continue;
    const [rawKey, rawValue] = item.slice(2).split("=");
    const key = String(rawKey || "").trim();
    const value = String(rawValue || "").trim();
    if (!key) continue;
    switch (key) {
      case "base-url":
        args.baseUrl = value || args.baseUrl;
        break;
      case "token":
        args.token = value || "";
        break;
      case "email":
        args.email = value || "";
        break;
      case "password":
        args.password = value || "";
        break;
      case "policy-version":
        args.policyVersion = value || args.policyVersion;
        break;
      case "workspace":
        args.workspace = value || args.workspace;
        break;
      case "thread":
        args.thread = value || args.thread;
        break;
      case "duration":
        args.durationSec = Number(value || args.durationSec);
        break;
      case "concurrency":
        args.concurrency = Number(value || args.concurrency);
        break;
      case "timeout":
        args.timeoutMs = Number(value || args.timeoutMs);
        break;
      case "target-rps":
        args.targetRps = Number(value || args.targetRps);
        break;
      case "think-min":
        args.thinkMinMs = Number(value || args.thinkMinMs);
        break;
      case "think-max":
        args.thinkMaxMs = Number(value || args.thinkMaxMs);
        break;
      case "ramp":
        args.rampSec = Number(value || args.rampSec);
        break;
      case "auto-thread":
        args.autoThread = parseBoolean(value, args.autoThread);
        break;
      case "include-stream":
        args.includeStream = parseBoolean(value, args.includeStream);
        break;
      case "assert-min-success-rate":
        args.assertMinSuccessRate = value;
        break;
      case "assert-max-unauthorized":
        args.assertMaxUnauthorized = value;
        break;
      case "assert-min-total":
        args.assertMinTotal = value;
        break;
      default:
        break;
    }
  }

  args.durationSec = Number.isFinite(args.durationSec)
    ? Math.max(3, Math.floor(args.durationSec))
    : 20;
  args.concurrency = Number.isFinite(args.concurrency)
    ? Math.max(1, Math.floor(args.concurrency))
    : 16;
  args.timeoutMs = Number.isFinite(args.timeoutMs)
    ? Math.max(1000, Math.floor(args.timeoutMs))
    : 15000;
  args.targetRps = Number.isFinite(args.targetRps)
    ? Math.max(0, args.targetRps)
    : SAFE_DEFAULT_TARGET_RPS;
  args.thinkMinMs = Number.isFinite(args.thinkMinMs)
    ? Math.max(0, Math.floor(args.thinkMinMs))
    : 30;
  args.thinkMaxMs = Number.isFinite(args.thinkMaxMs)
    ? Math.max(args.thinkMinMs, Math.floor(args.thinkMaxMs))
    : Math.max(args.thinkMinMs, 120);
  args.rampSec = Number.isFinite(args.rampSec)
    ? Math.max(0, args.rampSec)
    : 1;
  args.baseUrl = String(args.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
  args.workspace = String(args.workspace || "").trim() || "zaky";
  args.thread = String(args.thread || "").trim();
  args.assertMinSuccessRate =
    args.assertMinSuccessRate === undefined || args.assertMinSuccessRate === ""
      ? null
      : Number(args.assertMinSuccessRate);
  args.assertMaxUnauthorized =
    args.assertMaxUnauthorized === undefined || args.assertMaxUnauthorized === ""
      ? null
      : Number(args.assertMaxUnauthorized);
  args.assertMinTotal =
    args.assertMinTotal === undefined || args.assertMinTotal === ""
      ? null
      : Number(args.assertMinTotal);
  return args;
}

async function loginForToken({
  baseUrl,
  email,
  password,
  policyVersion,
  timeoutMs,
}) {
  if (!email || !password) return "";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: email,
        password,
        legalConsentAccepted: true,
        legalPolicyVersion: policyVersion,
      }),
      signal: ctrl.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.token) return "";
    return String(data.token);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function createThreadSlug({ baseUrl, workspace, token, timeoutMs }) {
  if (!token || !workspace) return "";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(
      `${baseUrl}/workspace/${encodeURIComponent(workspace)}/thread/new`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: ctrl.signal,
      }
    );
    if (!response.ok) return "";
    const data = await response.json().catch(() => ({}));
    return String(data?.thread?.slug || "").trim();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((p / 100) * sorted.length))
  );
  return sorted[index];
}

function pickWorkload(baseUrl, workspace, thread, { includeStream }) {
  const streamPath = `/workspace/${encodeURIComponent(
    workspace
  )}/thread/${encodeURIComponent(thread)}/stream-chat`;

  const workload = [
    {
      name: "memory.status",
      weight: 22,
      build: () => ({
        method: "GET",
        url: `${baseUrl}/api/memory/status`,
      }),
    },
    {
      name: "memory.confirmations",
      weight: 18,
      build: () => ({
        method: "GET",
        url: `${baseUrl}/api/memory/confirmations?limit=20`,
      }),
    },
    {
      name: "memory.context",
      weight: 18,
      build: () => ({
        method: "POST",
        url: `${baseUrl}/api/memory/context`,
        body: { query: "What do you remember about my preferences?", maxChars: 1200 },
      }),
    },
    {
      name: "memory.preview",
      weight: 14,
      build: () => ({
        method: "POST",
        url: `${baseUrl}/api/memory/preview`,
        body: { message: "I like hiking and coffee.", threadId: thread },
      }),
    },
    {
      name: "memory.autosave",
      weight: 14,
      build: () => ({
        method: "POST",
        url: `${baseUrl}/api/memory/autosave`,
        body: { message: "I enjoy swimming and jazz.", threadId: thread },
      }),
    },
  ];

  if (includeStream) {
    workload.push({
      name: "chat.stream",
      weight: 14,
      build: () => ({
        method: "POST",
        url: `${baseUrl}${streamPath}`,
        body: { message: "Summarize what you know about me in one line." },
      }),
    });
  }

  return workload;
}

function chooseWeighted(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No workload endpoints configured.");
  }
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

async function executeRequest(definition, token, timeoutMs) {
  const spec = definition.build();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const startedAt = performance.now();
  let status = 0;
  let ok = false;
  try {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (spec.body) headers.set("Content-Type", "application/json");
    const response = await fetch(spec.url, {
      method: spec.method,
      headers,
      body: spec.body ? JSON.stringify(spec.body) : undefined,
      signal: ctrl.signal,
    });
    status = response.status;
    ok = response.ok;
    await response.text().catch(() => "");
  } catch {
    status = -1;
    ok = false;
  } finally {
    clearTimeout(timer);
  }
  const durationMs = performance.now() - startedAt;
  return {
    name: definition.name,
    status,
    ok,
    durationMs,
  };
}

function createStats() {
  return {
    startedAt: Date.now(),
    finishedAt: Date.now(),
    total: 0,
    ok: 0,
    failed: 0,
    unauthorized: 0,
    timeouts: 0,
    byRoute: new Map(),
    durations: [],
  };
}

function recordResult(stats, result) {
  stats.total += 1;
  if (result.ok) {
    stats.ok += 1;
  } else {
    stats.failed += 1;
  }
  if (result.status === 401 || result.status === 403) {
    stats.unauthorized += 1;
  }
  if (result.status === -1) {
    stats.timeouts += 1;
  }
  stats.durations.push(result.durationMs);

  const key = result.name;
  const bucket =
    stats.byRoute.get(key) || {
      total: 0,
      ok: 0,
      failed: 0,
      durations: [],
      statuses: new Map(),
    };
  bucket.total += 1;
  if (result.ok) bucket.ok += 1;
  else bucket.failed += 1;
  bucket.durations.push(result.durationMs);
  bucket.statuses.set(result.status, Number(bucket.statuses.get(result.status) || 0) + 1);
  stats.byRoute.set(key, bucket);
}

function printReport(args, stats) {
  const elapsedSec = Math.max(1e-6, (stats.finishedAt - stats.startedAt) / 1000);
  const rps = stats.total / elapsedSec;
  const overallP50 = percentile(stats.durations, 50);
  const overallP95 = percentile(stats.durations, 95);

  console.log("\n=== Memory Load Test Report ===");
  console.log(`Target: ${args.baseUrl}`);
  console.log(`Duration: ${elapsedSec.toFixed(1)}s`);
  console.log(`Concurrency: ${args.concurrency}`);
  console.log(`Target RPS: ${args.targetRps.toFixed(2)}`);
  console.log(`Think time: ${args.thinkMinMs}-${args.thinkMaxMs}ms`);
  console.log(`Thread: ${args.thread || "(none)"}`);
  console.log(`Include stream: ${args.includeStream ? "yes" : "no"}`);
  console.log(`Total requests: ${stats.total}`);
  console.log(`Success: ${stats.ok}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Unauthorized (401/403): ${stats.unauthorized}`);
  console.log(`Timeout/errors: ${stats.timeouts}`);
  console.log(`RPS: ${rps.toFixed(1)}`);
  console.log(`Latency p50/p95: ${overallP50.toFixed(1)}ms / ${overallP95.toFixed(1)}ms`);
  console.log("\nPer-route:");

  for (const [route, bucket] of stats.byRoute.entries()) {
    const p50 = percentile(bucket.durations, 50);
    const p95 = percentile(bucket.durations, 95);
    const statusSummary = Array.from(bucket.statuses.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([status, count]) => `${status}:${count}`)
      .join(", ");
    console.log(
      `- ${route}: total=${bucket.total}, ok=${bucket.ok}, failed=${bucket.failed}, p50=${p50.toFixed(
        1
      )}ms, p95=${p95.toFixed(1)}ms, statuses=[${statusSummary}]`
    );
  }

  if (stats.ok === 0) {
    console.log(
      "\nNote: no successful requests were observed. Provide a valid token/email+password for authenticated memory + stream load testing."
    );
  }
}

function evaluateAssertions(args, stats) {
  const failures = [];
  const successRate = stats.total > 0 ? stats.ok / stats.total : 0;

  if (Number.isFinite(args.assertMinTotal)) {
    if (stats.total < args.assertMinTotal) {
      failures.push(
        `total requests ${stats.total} is below required minimum ${args.assertMinTotal}`
      );
    }
  }

  if (Number.isFinite(args.assertMinSuccessRate)) {
    if (successRate < args.assertMinSuccessRate) {
      failures.push(
        `success rate ${successRate.toFixed(3)} is below required minimum ${args.assertMinSuccessRate}`
      );
    }
  }

  if (Number.isFinite(args.assertMaxUnauthorized)) {
    if (stats.unauthorized > args.assertMaxUnauthorized) {
      failures.push(
        `unauthorized count ${stats.unauthorized} exceeds allowed maximum ${args.assertMaxUnauthorized}`
      );
    }
  }

  return failures;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let token = args.token;
  if (!token) {
    token = await loginForToken(args);
  }

  if (args.autoThread && token && args.workspace) {
    const autoThread = await createThreadSlug({
      baseUrl: args.baseUrl,
      workspace: args.workspace,
      token,
      timeoutMs: args.timeoutMs,
    });
    if (autoThread) {
      args.thread = autoThread;
    }
  }

  if (!args.thread) {
    args.includeStream = false;
  }

  const stats = createStats();
  const deadline = Date.now() + args.durationSec * 1000;
  const workload = pickWorkload(args.baseUrl, args.workspace, args.thread || "load-thread", {
    includeStream: args.includeStream,
  });

  const perWorkerRps =
    args.targetRps > 0 ? Math.max(0.001, args.targetRps / args.concurrency) : 0;
  const perWorkerIntervalMs = perWorkerRps > 0 ? 1000 / perWorkerRps : 0;

  const worker = async (workerIndex) => {
    if (args.rampSec > 0 && args.concurrency > 1) {
      const rampDelay =
        (workerIndex / (args.concurrency - 1)) * args.rampSec * 1000;
      await sleep(rampDelay);
    }

    while (Date.now() < deadline) {
      const loopStartedAt = performance.now();
      const definition = chooseWeighted(workload);
      const result = await executeRequest(definition, token, args.timeoutMs);
      recordResult(stats, result);

      const elapsedMs = performance.now() - loopStartedAt;
      const pacingDelayMs =
        perWorkerIntervalMs > 0
          ? Math.max(0, perWorkerIntervalMs - elapsedMs)
          : 0;
      const thinkDelayMs = randomBetween(args.thinkMinMs, args.thinkMaxMs);
      await sleep(pacingDelayMs + thinkDelayMs);
    }
  };

  await Promise.all(
    Array.from({ length: args.concurrency }, (_, workerIndex) => worker(workerIndex))
  );
  stats.finishedAt = Date.now();
  printReport(args, stats);
  const assertionFailures = evaluateAssertions(args, stats);
  if (assertionFailures.length > 0) {
    console.error("\nLoad assertions failed:");
    for (const failure of assertionFailures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Load test failed:", error);
  process.exitCode = 1;
});

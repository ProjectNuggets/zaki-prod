#!/usr/bin/env node

import crypto from "node:crypto";

const baseUrl = String(process.env.BILLING_STRESS_BASE_URL || "http://127.0.0.1:8787").replace(
  /\/+$/,
  ""
);
const webhookPath = String(process.env.BILLING_STRESS_PATH || "/api/billing/webhook").trim() || "/api/billing/webhook";
const webhookSecret = String(process.env.BILLING_STRESS_WEBHOOK_SECRET || "").trim();
const totalEvents = Math.max(1, Number.parseInt(process.env.BILLING_STRESS_EVENTS || "200", 10));
const concurrency = Math.max(1, Number.parseInt(process.env.BILLING_STRESS_CONCURRENCY || "20", 10));
const timeoutMs = Math.max(1000, Number.parseInt(process.env.BILLING_STRESS_TIMEOUT_MS || "10000", 10));
const duplicatesEvery = Math.max(0, Number.parseInt(process.env.BILLING_STRESS_DUPLICATES_EVERY || "0", 10));
const includeOutOfOrder =
  String(process.env.BILLING_STRESS_OUT_OF_ORDER || "true").toLowerCase().trim() !== "false";
const customerId = String(process.env.BILLING_STRESS_CUSTOMER_ID || "cus_stress_test").trim();
const subscriptionId = String(process.env.BILLING_STRESS_SUBSCRIPTION_ID || "sub_stress_test").trim();
const userEmail = String(process.env.BILLING_STRESS_USER_EMAIL || "staging-billing@example.com").trim();
const priceId = String(process.env.BILLING_STRESS_PRICE_ID || "price_student").trim();
const adminToken = String(process.env.BILLING_STRESS_ADMIN_TOKEN || "").trim();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function buildEvent(index) {
  const baseCreated = Math.floor(Date.now() / 1000);
  const created = includeOutOfOrder && index % 2 === 1 ? baseCreated - 300 : baseCreated + index;
  const eventId = `evt_stress_${index}`;
  return {
    id: eventId,
    object: "event",
    type: "customer.subscription.updated",
    created,
    data: {
      object: {
        id: subscriptionId,
        customer: customerId,
        status: "active",
        cancel_at_period_end: false,
        current_period_end: created + 30 * 24 * 60 * 60,
        items: {
          data: [
            {
              price: { id: priceId },
            },
          ],
        },
        metadata: {
          user_email: userEmail,
          plan_tier: "student",
        },
      },
    },
  };
}

async function fetchBillingTelemetry() {
  if (!adminToken) return null;
  const response = await fetch(`${baseUrl}/api/admin/telemetry/billing`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

async function sendSingleEvent(eventPayload) {
  const payload = JSON.stringify(eventPayload);
  const signature = createStripeSignature(payload, webhookSecret);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}${webhookPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": signature,
      },
      body: payload,
      signal: controller.signal,
    });
    const raw = await response.text().catch(() => "");
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      body: raw,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      body: error?.message || String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runWorker(indexes, results) {
  while (indexes.length > 0) {
    const index = indexes.shift();
    if (index === undefined) return;

    const event = buildEvent(index);
    const firstResult = await sendSingleEvent(event);
    results.push(firstResult);

    if (duplicatesEvery > 0 && index % duplicatesEvery === 0) {
      const duplicateResult = await sendSingleEvent(event);
      results.push(duplicateResult);
    }
  }
}

function summarize(results) {
  const byStatus = new Map();
  let failed = 0;
  let maxLatency = 0;
  let minLatency = Number.MAX_SAFE_INTEGER;
  let sumLatency = 0;

  for (const result of results) {
    const key = String(result.status);
    byStatus.set(key, (byStatus.get(key) || 0) + 1);
    if (!result.ok) failed += 1;
    maxLatency = Math.max(maxLatency, result.latencyMs);
    minLatency = Math.min(minLatency, result.latencyMs);
    sumLatency += result.latencyMs;
  }

  const sent = results.length;
  const avgLatency = sent > 0 ? Math.round(sumLatency / sent) : 0;
  return {
    sent,
    failed,
    successRate: sent > 0 ? Number((((sent - failed) / sent) * 100).toFixed(2)) : 0,
    minLatencyMs: Number.isFinite(minLatency) ? minLatency : 0,
    avgLatencyMs: avgLatency,
    maxLatencyMs: maxLatency,
    byStatus: Object.fromEntries(byStatus.entries()),
  };
}

async function main() {
  assert(webhookSecret, "BILLING_STRESS_WEBHOOK_SECRET is required.");

  process.stdout.write(
    `[BILLING-STRESS] base=${baseUrl} path=${webhookPath} events=${totalEvents} concurrency=${concurrency}\n`
  );

  const baselineTelemetry = await fetchBillingTelemetry();
  const indexes = Array.from({ length: totalEvents }, (_, idx) => idx + 1);
  const results = [];
  const workerCount = Math.min(concurrency, indexes.length);
  const workers = Array.from({ length: workerCount }, () => runWorker(indexes, results));
  await Promise.all(workers);

  const summary = summarize(results);
  process.stdout.write(`${JSON.stringify({ ok: summary.failed === 0, summary }, null, 2)}\n`);

  const afterTelemetry = await fetchBillingTelemetry();
  if (baselineTelemetry && afterTelemetry) {
    const beforeProcessed = Number(baselineTelemetry?.telemetry?.providers?.stripe?.processed || 0);
    const afterProcessed = Number(afterTelemetry?.telemetry?.providers?.stripe?.processed || 0);
    const beforeDuplicates = Number(baselineTelemetry?.telemetry?.providers?.stripe?.duplicates || 0);
    const afterDuplicates = Number(afterTelemetry?.telemetry?.providers?.stripe?.duplicates || 0);
    process.stdout.write(
      `${JSON.stringify(
        {
          telemetryDelta: {
            processed: afterProcessed - beforeProcessed,
            duplicates: afterDuplicates - beforeDuplicates,
          },
        },
        null,
        2
      )}\n`
    );
  }

  if (summary.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[BILLING-STRESS] FAILED");
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});

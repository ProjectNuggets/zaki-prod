const WINDOW_MS = 5 * 60 * 1000;
const ALERT_COOLDOWN_MS = 60 * 1000;
const MAX_ALERTS = 100;

const totals = new Map();
const recent = [];
const alerts = [];
const lastAlertAt = new Map();

let activeSseClients = 0;
let alertSink = null;

function increment(map, key, count = 1) {
  const next = Number(map.get(key) || 0) + Number(count || 0);
  map.set(key, next);
}

function pruneRecent(now = Date.now()) {
  const cutoff = now - WINDOW_MS;
  while (recent.length > 0 && recent[0].ts < cutoff) {
    recent.shift();
  }
}

function aggregateRecent() {
  const counters = new Map();
  for (const item of recent) {
    increment(counters, item.event, item.count);
  }
  return counters;
}

function toObject(map) {
  return Object.fromEntries(Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)));
}

function pushAlert(id, severity, message, details) {
  const now = Date.now();
  const last = Number(lastAlertAt.get(id) || 0);
  if (now - last < ALERT_COOLDOWN_MS) {
    return;
  }
  lastAlertAt.set(id, now);

  const alert = {
    id,
    severity,
    message,
    details: details || {},
    timestamp: new Date(now).toISOString(),
  };
  alerts.push(alert);
  if (alerts.length > MAX_ALERTS) {
    alerts.shift();
  }
  console.warn("[MemoryAlert]", JSON.stringify(alert));
  if (typeof alertSink === "function") {
    Promise.resolve()
      .then(() => alertSink(alert))
      .catch((error) => {
        const message = error?.message || String(error);
        console.error("[MemoryAlertDispatchFailed]", message);
      });
  }
}

function evaluateAlerts() {
  const recentCounters = aggregateRecent();
  const requests =
    Number(recentCounters.get("request.preview") || 0) +
    Number(recentCounters.get("request.autosave") || 0);
  const errors = Number(recentCounters.get("pipeline.error") || 0);
  if (requests >= 20) {
    const errorRate = errors / requests;
    if (errorRate >= 0.15) {
      pushAlert("high_error_rate", "high", "Memory pipeline error rate is elevated.", {
        windowMs: WINDOW_MS,
        requests,
        errors,
        errorRate,
      });
    }
  }

  const extracted = Number(recentCounters.get("extract.fact") || 0);
  const conflicts = Number(recentCounters.get("queue.conflict") || 0);
  if (extracted >= 20) {
    const conflictRate = conflicts / extracted;
    if (conflictRate >= 0.4) {
      pushAlert("high_conflict_rate", "medium", "Memory conflict rate is elevated.", {
        windowMs: WINDOW_MS,
        extracted,
        conflicts,
        conflictRate,
      });
    }
  }

  if (activeSseClients >= 500) {
    pushAlert("high_sse_connections", "medium", "High number of memory SSE connections.", {
      activeSseClients,
    });
  }
}

export function recordMemoryTelemetry(event, count = 1, meta = {}) {
  const name = String(event || "").trim();
  const amount = Number(count || 0);
  if (!name || !Number.isFinite(amount) || amount === 0) return;

  const now = Date.now();
  increment(totals, name, amount);
  recent.push({
    ts: now,
    event: name,
    count: amount,
    meta: meta && typeof meta === "object" ? meta : {},
  });
  pruneRecent(now);
  evaluateAlerts();
}

export function setMemoryTelemetrySseClients(count) {
  const next = Math.max(0, Number(count || 0));
  activeSseClients = next;
  evaluateAlerts();
}

export function configureMemoryTelemetryAlerts(options = {}) {
  const sink = options?.onAlert;
  alertSink = typeof sink === "function" ? sink : null;
}

export function getMemoryTelemetrySnapshot() {
  pruneRecent();
  const recentCounters = aggregateRecent();
  const requests =
    Number(recentCounters.get("request.preview") || 0) +
    Number(recentCounters.get("request.autosave") || 0);
  const errors = Number(recentCounters.get("pipeline.error") || 0);
  const extracted = Number(recentCounters.get("extract.fact") || 0);
  const conflicts = Number(recentCounters.get("queue.conflict") || 0);

  return {
    windowMs: WINDOW_MS,
    generatedAt: new Date().toISOString(),
    activeSseClients,
    totals: toObject(totals),
    recent: toObject(recentCounters),
    ratios: {
      errorRate: requests > 0 ? errors / requests : 0,
      conflictRate: extracted > 0 ? conflicts / extracted : 0,
    },
    alerts: alerts.slice(-20),
  };
}

export function resetMemoryTelemetryForTests() {
  totals.clear();
  recent.length = 0;
  alerts.length = 0;
  lastAlertAt.clear();
  activeSseClients = 0;
  alertSink = null;
}

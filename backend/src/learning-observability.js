const DEFAULT_MAX_EVENTS = 100;
const ALLOWED_SEVERITIES = new Set(["info", "warn", "error"]);

function safeText(value, fallback = "", maxLength = 180) {
  const text = String(value ?? fallback).trim();
  if (!text) return fallback;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function normalizeSeverity(value) {
  const severity = safeText(value, "info", 16).toLowerCase();
  return ALLOWED_SEVERITIES.has(severity) ? severity : "info";
}

function safeRoute(value) {
  const route = safeText(value, "", 180);
  return route.split(/[?#]/u)[0] || "";
}

function emptyCounters() {
  return {
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
    byEvent: {},
  };
}

export function createLearningObservabilityStore({
  maxEvents = DEFAULT_MAX_EVENTS,
  now = () => new Date(),
} = {}) {
  const limit = Math.max(1, Math.min(500, Number(maxEvents || DEFAULT_MAX_EVENTS)));
  const counters = emptyCounters();
  const events = [];

  function record(event = {}) {
    const severity = normalizeSeverity(event.severity);
    const name = safeText(event.event, "learning_event", 80);
    const entry = {
      ts: now().toISOString(),
      event: name,
      severity,
      requestId: safeText(event.requestId, "", 80) || undefined,
      route: safeRoute(event.route) || undefined,
      method: safeText(event.method, "", 16) || undefined,
      status: Number.isFinite(Number(event.status)) ? Number(event.status) : undefined,
      action: safeText(event.action, "", 80) || undefined,
      message: safeText(event.message, "", 240) || undefined,
    };

    counters.total += 1;
    counters[severity] += 1;
    counters.byEvent[name] = (counters.byEvent[name] || 0) + 1;
    events.push(Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined)));
    while (events.length > limit) events.shift();
    return entry;
  }

  function snapshot({ activeWebSockets = null, nowDate = now() } = {}) {
    const wsEntries = activeWebSockets instanceof Map ? [...activeWebSockets.values()] : [];
    return {
      generatedAt: (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString(),
      counters: {
        ...counters,
        byEvent: { ...counters.byEvent },
      },
      activeWebSockets: {
        total: wsEntries.reduce((total, value) => total + Math.max(0, Number(value) || 0), 0),
        usersWithSessions: wsEntries.filter((value) => Number(value) > 0).length,
        maxForAnyUser: wsEntries.reduce((max, value) => Math.max(max, Number(value) || 0), 0),
      },
      recentEvents: [...events].reverse(),
    };
  }

  return { record, snapshot };
}

export const learningObservabilityStore = createLearningObservabilityStore();

export function recordLearningObservabilityEvent(event) {
  return learningObservabilityStore.record(event);
}

export function getLearningObservabilitySnapshot(options) {
  return learningObservabilityStore.snapshot(options);
}

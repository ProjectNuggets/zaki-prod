function toIso(nowFactory) {
  return nowFactory().toISOString();
}

function normalizeProvider(provider) {
  return String(provider || "").trim().toLowerCase() || "unknown";
}

function createEmptyProviderState() {
  return {
    received: 0,
    processed: 0,
    duplicates: 0,
    failed: 0,
    lastReceivedAt: null,
    lastProcessedAt: null,
    lastDuplicateAt: null,
    lastFailedAt: null,
    lastEventId: null,
    lastEventType: null,
    lastError: null,
  };
}

function applyEventMetadata(state, details = {}) {
  const eventId = String(details.eventId || "").trim();
  const eventType = String(details.eventType || "").trim();
  if (eventId) state.lastEventId = eventId;
  if (eventType) state.lastEventType = eventType;
}

export function createBillingHealthTracker({ now = () => new Date() } = {}) {
  const providers = new Map();

  function ensureProvider(provider) {
    const key = normalizeProvider(provider);
    if (!providers.has(key)) {
      providers.set(key, createEmptyProviderState());
    }
    return { key, state: providers.get(key) };
  }

  function recordReceived(provider, details = {}) {
    const { state } = ensureProvider(provider);
    state.received += 1;
    state.lastReceivedAt = toIso(now);
    applyEventMetadata(state, details);
  }

  function recordProcessed(provider, details = {}) {
    const { state } = ensureProvider(provider);
    state.processed += 1;
    state.lastProcessedAt = toIso(now);
    state.lastError = null;
    applyEventMetadata(state, details);
  }

  function recordDuplicate(provider, details = {}) {
    const { state } = ensureProvider(provider);
    state.duplicates += 1;
    state.lastDuplicateAt = toIso(now);
    applyEventMetadata(state, details);
  }

  function recordFailure(provider, details = {}) {
    const { state } = ensureProvider(provider);
    state.failed += 1;
    state.lastFailedAt = toIso(now);
    state.lastError = details?.error ? String(details.error).slice(0, 500) : "unknown";
    applyEventMetadata(state, details);
  }

  function getSnapshot() {
    const snapshot = {};
    for (const [provider, state] of providers.entries()) {
      snapshot[provider] = { ...state };
    }
    return {
      timestamp: toIso(now),
      providers: snapshot,
    };
  }

  return {
    recordReceived,
    recordProcessed,
    recordDuplicate,
    recordFailure,
    getSnapshot,
  };
}

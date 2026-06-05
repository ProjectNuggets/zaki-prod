export type AgentContextCompaction = {
  nudgePercent?: number | null;
  passAPercent?: number | null;
  passCPercent?: number | null;
  recommended?: boolean | null;
};

export type AgentContextGauge = {
  tokenCount?: number;
  contextMax?: number;
  messageCount?: number;
  context_pressure_percent?: number | null;
  pressurePercent?: number | null;
  sampledAtMs?: number | null;
  status?: string | null;
  reason?: string | null;
  model?: string | null;
  modelProvider?: string | null;
  contextWindowSource?: string | null;
  remainingTokens?: number | null;
  compaction?: AgentContextCompaction | null;
};

type ContextPayload = Record<string, unknown>;

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function booleanValue(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

function objectValue(value: unknown): ContextPayload | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ContextPayload)
    : null;
}

function contextMetricPayload(data: ContextPayload | null | undefined) {
  if (!data) return null;
  const report = objectValue(data.report);
  // The nested report is canonical. Top-level aliases exist for older
  // clients, so report fields must override them when both are present.
  return report ? { ...data, ...report } : data;
}

function hasTrustedContextWindowSignal(payload: ContextPayload) {
  return (
    numericValue(payload.token_estimate) != null ||
    numericValue(payload.context_window_tokens) != null ||
    numericValue(payload.context_window_used) != null ||
    numericValue(payload.context_window_max) != null ||
    numericValue(payload.context_tokens) != null ||
    numericValue(payload.used_tokens) != null ||
    numericValue(payload.remaining_tokens) != null ||
    numericValue(payload.sampled_at_ms) != null ||
    objectValue(payload.estimator) != null ||
    objectValue(payload.compaction) != null ||
    objectValue(payload.provider_usage_last_turn) != null ||
    stringValue(payload.context_window_source) != null ||
    objectValue(payload.report) != null
  );
}

export function contextUnavailableCode(data: ContextPayload | null | undefined) {
  if (!data) return "";
  const payload = contextMetricPayload(data) ?? data;
  return (
    stringValue(payload.code) ||
    stringValue(payload.error) ||
    stringValue(payload.reason) ||
    ""
  );
}

export function isContextUnavailableCode(code: string | null | undefined) {
  const normalized = String(code || "").trim().toLowerCase();
  return (
    normalized === "no_session_manager" ||
    normalized === "session_manager_unavailable" ||
    normalized === "session_not_found" ||
    normalized === "context_unavailable" ||
    normalized === "no_active_session"
  );
}

function isUnavailablePayload(payload: ContextPayload) {
  if (isContextUnavailableCode(contextUnavailableCode(payload))) return true;
  if (booleanValue(payload.active) === false || booleanValue(payload.live) === false) return true;
  const status = stringValue(payload.status);
  return Boolean(status && status !== "live" && status !== "ok");
}

export function resolveRuntimeContextPressurePercent(
  data: ContextPayload | null | undefined
) {
  const payload = contextMetricPayload(data);
  if (!payload || isUnavailablePayload(payload)) return null;

  const explicitPressure =
    numericValue(payload.pressure_percent) ??
    numericValue(payload.context_pressure_percent);
  const looksLikeLegacyCumulativeContext =
    explicitPressure != null &&
    numericValue(payload.tokens_used) != null &&
    numericValue(payload.token_limit) != null &&
    !hasTrustedContextWindowSignal(payload);
  if (explicitPressure != null && !looksLikeLegacyCumulativeContext) {
    return clampPercent(explicitPressure);
  }
  return null;
}

function normalizeCompaction(payload: ContextPayload): AgentContextCompaction | null {
  const compaction = objectValue(payload.compaction) ?? {};
  const nudgePercent =
    numericValue(compaction.nudge_percent) ??
    numericValue(compaction.nudgePercent) ??
    numericValue(payload.compaction_nudge_percent);
  const passAPercent =
    numericValue(compaction.pass_a_percent) ??
    numericValue(compaction.passAPercent) ??
    numericValue(payload.compaction_pass_a_percent);
  const passCPercent =
    numericValue(compaction.pass_c_percent) ??
    numericValue(compaction.passCPercent) ??
    numericValue(payload.compaction_pass_c_percent);
  const recommended =
    booleanValue(compaction.recommended) ??
    booleanValue(payload.token_compaction_recommended) ??
    booleanValue(payload.token_compaction_triggered) ??
    booleanValue(payload.compaction_triggered);

  if (
    nudgePercent == null &&
    passAPercent == null &&
    passCPercent == null &&
    recommended == null
  ) {
    return null;
  }

  return {
    nudgePercent: nudgePercent != null ? clampPercent(nudgePercent) : null,
    passAPercent: passAPercent != null ? clampPercent(passAPercent) : null,
    passCPercent: passCPercent != null ? clampPercent(passCPercent) : null,
    recommended,
  };
}

export function buildAgentContextGauge(
  data: ContextPayload | null | undefined
): AgentContextGauge | null {
  const payload = contextMetricPayload(data);
  if (!payload || isUnavailablePayload(payload)) return null;

  const contextMax =
    numericValue(payload.context_window_max) ??
    numericValue(payload.context_max) ??
    numericValue(payload.context_window_tokens) ??
    (hasTrustedContextWindowSignal(payload) ? numericValue(payload.token_limit) : null);
  const pressurePct = resolveRuntimeContextPressurePercent(payload);
  if ((contextMax == null || contextMax <= 0) && pressurePct == null) return null;

  const tokenCount =
    numericValue(payload.token_estimate) ??
    numericValue(payload.context_window_used) ??
    numericValue(payload.context_tokens) ??
    numericValue(payload.used_tokens) ??
    (hasTrustedContextWindowSignal(payload) ? numericValue(payload.tokens_used) : null) ??
    null;
  const messageCount =
    numericValue(payload.message_count) ??
    numericValue(payload.history_len) ??
    numericValue(payload.history_messages) ??
    null;
  const compaction = normalizeCompaction(payload);

  return {
    tokenCount: tokenCount ?? undefined,
    contextMax: contextMax && contextMax > 0 ? contextMax : undefined,
    messageCount: messageCount ?? undefined,
    context_pressure_percent: pressurePct,
    pressurePercent: pressurePct,
    sampledAtMs: numericValue(payload.sampled_at_ms),
    status: stringValue(payload.status),
    reason: stringValue(payload.reason),
    model: stringValue(payload.model),
    modelProvider: stringValue(payload.model_provider),
    contextWindowSource: stringValue(payload.context_window_source),
    remainingTokens: numericValue(payload.remaining_tokens),
    compaction,
  };
}

export function resolveContextGaugePercent(
  data: AgentContextGauge | null | undefined
) {
  if (!data) return null;
  if (typeof data.pressurePercent === "number") {
    return clampPercent(data.pressurePercent);
  }
  if (typeof data.context_pressure_percent === "number") {
    return clampPercent(data.context_pressure_percent);
  }
  return null;
}

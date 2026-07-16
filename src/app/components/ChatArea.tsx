import { BackgroundPattern } from "./BackgroundPattern";
import { InputArea, type InputAreaHandle, type InputAreaSendOptions } from "./InputArea";
import { AgentSessionRail } from "@/app/components/agent/AgentSessionRail";
import {
  Share2,
  MoreVertical,
  Download,
  Brain,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  formatUsagePercentLabel,
  getRoundedUsagePercent,
  getUsagePercent,
} from "@/lib/usageDisplay";
import { useOnlineStatus } from "@/hooks";
import {
  AUTH_REQUIRED_EVENT,
  autoTitleThread,
  autoTitleAgentSession,
  apiRequest,
  buildApiUrl,
  captureMemory,
  fetchMemoryActivity,
  fetchAgentMe,
  fetchAgentSession,
  fetchAgentSessionContext,
  fetchAgentSessionHistory,
  compactAgentSession,
  cancelAgentSession,
  deleteAgentSession,
  renameAgentSession,
  fetchAgentArtifact,
  fetchBotRuntimeStatus,
  fetchAgentExtensionDiagnostics,
  fetchBotOnboarding,
  fetchBotSettings,
  listAgentArtifacts,
  listAgentCron,
  listAgentJobs,
  listAgentTasks,
  setAgentSessionMode,
  approveAgentSession,
  fetchUsageQuota,
  getApiBase,
  provisionAgent,
  updateBotOnboarding,
  uploadAgentAttachment,
  type AgentSessionMode,
  type MemoryActivity,
  type MemoryCaptureResponse,
  type UsageQuotaSurface,
  type AgentSession,
  type AgentArtifact,
  type AgentJob,
  type AgentTask,
  type AgentExtensionDiagnosticsResponse,
  type AgentSessionContext,
  type MeterAvailableNow,
  type MeterStatusResponse,
  type BotOnboardingState,
} from "@/lib/api";
import {
  assistantModeToReasoningEffort,
  type AgentDefaultAutonomy,
  type AgentDefaultReasoningEffort,
} from "@/lib/agentSettingsDefaults";
import {
  buildAgentContextGauge,
  contextUnavailableCode,
  isContextUnavailableCode,
  resolveContextGaugePercent,
} from "@/lib/agentContext";
import {
  DEFAULT_THREAD_LABEL,
  isDefaultThreadLabel,
  stripThreadDisplayName,
} from "@/lib/threadTitles";
import { ANONYMOUS_SPACES_WORKSPACE_ID, createAnonymousThreadId } from "@/lib/anonymousSpaces";
import {
  recoverAnonymousThreadTurnsAfterReload,
  upsertAnonymousWorkItem,
} from "@/lib/anonymousWork";
import {
  absorbMemoryImport,
  MemoryImportPartialError,
  settleMemoryUndosNewestFirst,
} from "@/lib/memoryImport";
import { clearPendingIntent, readPendingIntent, writePendingIntent } from "@/lib/pendingIntent";
import { openSpacesMemoryViewer, type MemoryViewerTab } from "@/lib/spacesMemory";
import { trackProductEvent } from "@/lib/productTelemetry";
import {
  readResponseFormattingConfig,
  RESPONSE_FORMATTING_EVENT,
  type ResponseFormattingConfig,
} from "@/lib/responseFormatting";
import {
  SpacesView,
  ZakiHomeView,
  ChatView,
  ReadyState,
  CreateSpaceModal,
  EditInstructionsModal,
  ApprovalRequiredCard,
  type ContextGaugeData,
} from "./chat";
import {
  buildAgentQuickReplyItems,
  QuickReplyChips,
  type QuickReplyItem,
} from "./chat/QuickReplyChips";
import {
  isInternalAgentReplyContent,
  normalizeAssistantDisplayText,
} from "./chat/rendering/agentReplyPresentation";
import { sanitizeAssistantScaffold } from "./chat/rendering/scaffoldSanitizer";
import { agentThoughtToStep } from "./chat/rendering/agentThoughtSteps";
import { getAgentArtifactShareUrl } from "@/app/components/agent/agentArtifactSurface";
import {
  AgentInspectorRail,
  type AgentInspectorArtifact,
  type AgentInspectorCronJob,
  type AgentInspectorJob,
  type AgentInspectorTab,
  type AgentInspectorTabRequest,
} from "./chat/AgentInspectorRail";
import type { AgentPlanPanelStep } from "./chat/AgentPlanPanelModel";
import { buildAgentPlanRetryPrompt } from "./chat/AgentPlanRetry";
import { BrowserViewFeedPanel } from "./chat/BrowserViewFeedPanel";
import { ZakiDashboard } from "./chat/views/ZakiDashboard";
import { V2StatusStrip } from "@/app/components/v2";
import type { BotToolCall } from "./chat/BotToolCallBlock";
import type {
  BotReasoningSummary,
  NullalisApprovalRequest,
  NullalisNarrationFrame,
  NullalisNarrationPhase,
  NullalisTaskItem,
  NullalisTaskStatus,
  NullalisTranscriptEntry,
  BotReplyStart,
  BotStatusEvent,
  ZakiUsageSummary,
  ZakiProcessSnapshot,
  ZakiTranscriptEntryKind,
} from "./chat/BotStatusRail";

import { useNavigationStore, useAuthStore, useZakiSessionUiStore } from "@/stores";
import { mapAgentSessionToZakiSessionUi } from "@/stores/zakiSessionUiStore";
import { ShareModal } from "./ShareModal";
import { toast } from "sonner";
import type {
  PinnedFile,
  Space,
  Message,
  AgentNarrationStep,
  GeneratedFileRef,
  DocSource,
} from "@/types";
import { useMessages } from "@/queries/useThreads";
import { useEntitlements, useMeterStatus } from "@/queries/useBilling";
import { spaceKeys } from "@/queries/useSpaces";
import { useZakiSessions, zakiSessionKeys } from "@/queries/useZakiSessions";
import { buildZakiSessionRepairTitle, prepareAutoTitleExchange } from "@/lib/sessionAutoTitle";
import { useMessageReactions } from "@/queries/useMessageReactions";
import { MemoryCaptureToast } from "./memory/MemoryCaptureToast";
import {
  PaywallCard,
  classifyBillingDenial,
  type PaywallIdentity,
  type PaywallState,
} from "./PaywallCard";
import {
  codeFromHttpStatus,
  looksLikeMachineCode,
  resolveErrorMessage,
} from "@/lib/userFacingErrors";
import { MemoryImportSheet } from "./onboarding/MemoryImportSheet";
import { FirstRunNameCard } from "./onboarding/FirstRunNameCard";
import {
  FIRST_RUN_ENGINE_PROMPT,
  buildBotIdentityDocument,
  shouldStartEngineFirstTurn,
  runFirstRunNameCompletion,
  type FirstRunCeremonyPhase,
} from "@/lib/firstRunCeremony";
import { AgentArtifactCanvas } from "./agent/AgentArtifactCanvas";
import {
  createZakiBotThread,
  isZakiBotSpaceId,
  ZAKI_BOT_LABEL,
  ZAKI_BOT_SPACE_ID,
  ZAKI_BOT_THREAD_ID,
} from "@/lib/zakiBot";
import {
  buildCanonicalZakiThreadSessionKey,
  extractThreadSlugFromSessionKey,
  isRepairableZakiSessionTitle,
  isThreadLaneZakiSessionKey,
  normalizeZakiSessionKey,
  parseZakiSessionKey,
  parseZakiSessionTimestampMs,
} from "@/lib/zakiSessions";
import {
  getActivationProgress,
  markFirstMemorySaved,
  markFirstMessageSent,
  type ActivationProgress,
} from "@/lib/retention";
import {
  SystemNoticesStack,
  emitSystemNotice,
  type SystemNoticeKind,
  type SystemNoticePayload,
} from "./ui/zaki/SystemNotice";

export const buildNullalisContextGauge = buildAgentContextGauge;
export { resolveContextGaugePercent };

const POWER_USER_PENDING_TAB_KEY = "zaki:pendingPowerUserTab";
const AGENT_INSPECTOR_OPEN_KEY = "zaki:agentInspectorOpen";
const AGENT_FOCUS_MODE_KEY = "zaki:agentFocusMode";
const AGENT_MOBILE_PANEL_QUERY = "(max-width: 1279px)";
const MOBILE_INSPECTOR_FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function normalizeAgentInspectorEventTab(value: unknown): AgentInspectorTab {
  if (value === "cron") return "cron";
  return "artifacts";
}

function takePendingInspectorTab(): AgentInspectorTab | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(POWER_USER_PENDING_TAB_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(POWER_USER_PENDING_TAB_KEY);
    return normalizeAgentInspectorEventTab(raw);
  } catch {
    return null;
  }
}

const SYSTEM_NOTICE_KINDS: readonly SystemNoticeKind[] = [
  "compaction",
  "provider_fallback",
  "connector_stale",
  "multimodal_failure",
  "generic",
];

function extractSystemNoticePayload(
  payload: Record<string, unknown>
): SystemNoticePayload | null {
  const rawKind =
    (typeof payload.kind === "string" && payload.kind.trim().toLowerCase()) ||
    "";
  const kind: SystemNoticeKind = (
    SYSTEM_NOTICE_KINDS as readonly string[]
  ).includes(rawKind)
    ? (rawKind as SystemNoticeKind)
    : "generic";
  const rawSeverity =
    (typeof payload.severity === "string" &&
      payload.severity.trim().toLowerCase()) ||
    "";
  const severity =
    rawSeverity === "info" || rawSeverity === "warning" || rawSeverity === "error"
      ? rawSeverity
      : undefined;
  const message =
    (typeof payload.message === "string" && payload.message.trim()) || null;
  const detail =
    (typeof payload.detail === "string" && payload.detail.trim()) || null;
  const runId =
    (typeof payload.run_id === "string" && payload.run_id.trim()) ||
    (typeof payload.runId === "string" && payload.runId.trim()) ||
    null;
  const idFromPayload =
    (typeof payload.id === "string" && payload.id.trim()) || null;
  const id =
    idFromPayload ||
    (runId ? `${kind}:${runId}` : null) ||
    `${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    kind,
    severity,
    message,
    detail,
    runId,
  };
}

type ChatDenialDetails = {
  constraint?: string | null;
  requiredUnits?: number | null;
  effectiveRemaining?: number | null;
  resetAt?: string | null;
  meter?: MeterStatusResponse | null;
  // WP-B2: the quota denial (daily_limit_reached / weekly_limit_reached) carries the
  // enforced allowance so the limit state can NAME the limit ("10 of 10 used today")
  // instead of gesturing vaguely at "usage".
  limit?: number | null;
  period?: "day" | "week" | null;
} | null;

export function isMeterAvailabilityBlocked(availability?: MeterAvailableNow | null) {
  if (!availability) return false;
  if (availability.available === false) return true;
  const remaining =
    typeof availability.effectiveRemaining === "number"
      ? availability.effectiveRemaining
      : null;
  const required =
    typeof availability.requiredReserveUnits === "number"
      ? availability.requiredReserveUnits
      : null;
  return remaining != null && required != null && remaining < required;
}

export function buildAgentComposerUsageState({
  isAgentActive,
  availability,
}: {
  isAgentActive: boolean;
  availability?: MeterAvailableNow | null;
}) {
  const locked = isAgentActive && isMeterAvailabilityBlocked(availability);
  return { locked };
}

// Spaces (non-agent) composer send-lock. Authenticated users are gated by the pooled unit wallet
// (weekly.remaining, else limit - used) — the single source of truth, since the server reserves and
// settles every Spaces turn against it. Anonymous users have no wallet, so they fall back to the
// legacy daily count. Unknown wallet remaining (meter still loading, or an unlimited tier whose
// weekly limit is null) fails open — the server denial path still catches a truly-empty wallet.
export function isSpacesSendLocked({
  isAuthenticated,
  weekly,
  legacyRemaining,
}: {
  isAuthenticated: boolean;
  weekly?: { used?: number | null; limit?: number | null; remaining?: number | null } | null;
  legacyRemaining?: number | null;
}): boolean {
  if (isAuthenticated) {
    const remaining =
      typeof weekly?.remaining === "number"
        ? weekly.remaining
        : typeof weekly?.limit === "number" && typeof weekly?.used === "number"
          ? Math.max(0, weekly.limit - weekly.used)
          : null;
    return remaining != null && remaining <= 0;
  }
  return typeof legacyRemaining === "number" && legacyRemaining <= 0;
}

export class ChatRequestError extends Error {
  status: number;
  code: string | null;
  // P1-12: set when the BFF signals the turn is safe to replay (a retryable:true
  // SSE error frame, or a retryable JSON status such as the readiness-gate 503).
  // The chat send loop honors this with a bounded auto-reconnect before
  // surfacing a hard error.
  retryable: boolean;
  denialDetails: ChatDenialDetails;

  constructor(
    message: string,
    status: number,
    code?: string | null,
    retryable = false,
    denialDetails: ChatDenialDetails = null
  ) {
    super(message);
    this.name = "ChatRequestError";
    this.status = status;
    this.code = code ?? null;
    this.retryable = retryable;
    this.denialDetails = denialDetails;
  }
}

export function buildBillingPaywallCardData({
  error,
  paywallState,
  planLabel,
  meterStatus,
  isAgentTarget,
  identity = "authed",
  promptPreserved = false,
}: {
  error: ChatRequestError;
  paywallState: PaywallState;
  planLabel?: string | null;
  meterStatus?: MeterStatusResponse | null;
  isAgentTarget?: boolean;
  /** WP-B2: anon hits a daily counter and can only sign in; authed can upgrade. */
  identity?: PaywallIdentity;
  /** WP-B2: true when the unsent prompt was restored into the composer. */
  promptPreserved?: boolean;
}) {
  // ── WP-B2: the quota limit state is a different animal from a wallet paywall. It is
  // gated by a COUNTER (N of M prompts), not by units, so it carries its own fields.
  if (paywallState === "limit_reached") {
    const limitTotal =
      typeof error.denialDetails?.limit === "number" ? error.denialDetails.limit : null;
    const period = error.denialDetails?.period ?? "day";
    return {
      state: paywallState as PaywallState,
      planLabel: planLabel ?? undefined,
      remaining: undefined,
      effectiveRemaining: undefined,
      requiredUnits: undefined,
      constraint: null,
      rollingWindowPercent: null,
      rollingWindowHours: undefined,
      resetAt: error.denialDetails?.resetAt ?? null,
      message: error.message,
      identity,
      limitPeriod: period,
      // The denial means the allowance is fully spent: used === limit.
      limitUsed: limitTotal,
      limitTotal,
      promptPreserved,
    };
  }
  const denialMeter = isAgentTarget ? error.denialDetails?.meter ?? null : null;
  const agentAvailability = isAgentTarget
    ? denialMeter?.availableNow?.agent ?? null
    : null;
  const effectiveRemaining =
    typeof error.denialDetails?.effectiveRemaining === "number"
      ? error.denialDetails.effectiveRemaining
      : typeof agentAvailability?.effectiveRemaining === "number"
        ? agentAvailability.effectiveRemaining
        : undefined;
  const requiredUnits =
    typeof error.denialDetails?.requiredUnits === "number"
      ? error.denialDetails.requiredUnits
      : typeof agentAvailability?.requiredReserveUnits === "number"
        ? agentAvailability.requiredReserveUnits
        : undefined;
  const constraint =
    error.denialDetails?.constraint ||
    agentAvailability?.constraint ||
    null;
  const remaining =
    effectiveRemaining ??
    (!isAgentTarget ? meterStatus?.weekly?.remaining : undefined) ??
    undefined;
  const resetAt =
    error.denialDetails?.resetAt ||
    agentAvailability?.resetAt ||
    (constraint === "rolling"
      ? denialMeter?.rolling?.resetAt
      : null) ||
    (!isAgentTarget ? meterStatus?.weekly?.resetAt : null) ||
    null;
  const rollingWindow =
    isAgentTarget
      ? denialMeter?.rolling ?? null
      : null;
  const rollingWindowPercent =
    typeof rollingWindow?.limit === "number" && typeof rollingWindow?.used === "number"
      ? getUsagePercent({ used: rollingWindow.used, limit: rollingWindow.limit })
      : null;

  return {
    state: paywallState,
    planLabel: denialMeter?.plan?.label ?? planLabel ?? undefined,
    remaining: typeof remaining === "number" ? remaining : undefined,
    effectiveRemaining,
    requiredUnits,
    constraint,
    rollingWindowPercent,
    rollingWindowHours:
      typeof rollingWindow?.windowHours === "number" ? rollingWindow.windowHours : undefined,
    resetAt,
    message: error.message,
    identity,
    limitPeriod: null,
    limitUsed: null,
    limitTotal: null,
    promptPreserved,
  };
}

// P1-12: codes the BFF emits for transient, replay-safe conditions
// (gateway_draining / ownership_lock_conflict via buildAgentRetrySsePayload;
// agent_unavailable from the readiness gate). Any of these — or an explicit
// payload.retryable===true — makes the same turn eligible for bounded replay.
export const CHAT_RETRYABLE_ERROR_CODES = new Set<string>([
  "gateway_draining",
  "ownership_lock_conflict",
  "agent_unavailable",
]);

// First send plus up to two replays (3 attempts total) before surfacing a hard
// error. Kept small so a genuinely-down agent fails fast rather than hanging.
export const CHAT_RETRYABLE_MAX_ATTEMPTS = 3;
export const CHAT_RETRYABLE_BACKOFF_MS = [600, 1500];

export function isRetryableChatError(error: unknown): boolean {
  if (error instanceof ChatRequestError) {
    if (error.retryable) return true;
    if (error.code && CHAT_RETRYABLE_ERROR_CODES.has(error.code)) return true;
  }
  return false;
}

// P1-12 follow-up (Wave A): the chat POST carries no idempotency/turn key, so the
// send loop auto-replays any retryable error frame. A retryable error is only
// SAFE to auto-replay when NO content has been received for this turn — once
// content has streamed, the engine may have partially executed the turn (tool
// calls + metering ran), so replaying would duplicate the turn + double-meter.
// This downgrades the BFF-supplied retryable flag to false once content arrived.
// Defense in depth: the BFF now also labels post-content drops non-retryable, but
// the FE stays safe even if some path mislabels.
export function resolveTurnRetryable(
  bffRetryable: boolean,
  contentReceived: boolean
): boolean {
  return bffRetryable === true && contentReceived !== true;
}

const MEMORY_STATUS_SYNC_THROTTLE_MS = 1200;
const NULLALIS_NARRATION_PHASES = new Set<NullalisNarrationPhase>([
  "thinking",
  "tool_start",
  "tool_done",
  "waiting",
  "plan_step",
  "error_recovery",
  "listening",
  "speaking",
  "turn_auto_compaction",
  "post_reply_compaction",
  "history_maintenance_after_tools",
  "durable_continuity_refresh",
  "durable_continuity_refreshed",
]);

function isNullalisNarrationPhase(value: unknown): value is NullalisNarrationPhase {
  return (
    typeof value === "string" &&
    NULLALIS_NARRATION_PHASES.has(value.trim().toLowerCase() as NullalisNarrationPhase)
  );
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Build a canonical nullalis session key from the agent user ID and thread slug.
 *
 * Must match the backend BFF's buildCanonicalThreadSessionKey in bot-bff.js,
 * which always uses the `:thread:<slug>` suffix (including for "main").
 * Earlier versions of this function special-cased "main" to `agent:zaki-bot:user:N:main`
 * (no `:thread:` segment) which caused a mismatch: messages were persisted
 * under `:thread:main` by the backend but we were fetching history for
 * `:main`, so the latest messages appeared to disappear on refresh.
 */
function buildAgentSessionKey(threadSlug: string, agentUserId: string | null) {
  const safeThread = String(threadSlug || "main").trim() || "main";
  const safeUser = String(agentUserId || "").trim();
  if (!safeUser) return null; // not yet resolved
  return buildCanonicalZakiThreadSessionKey(safeUser, safeThread);
}

function resolveAgentSessionUserId(agentUserId: string | null, sessionKey: string | null) {
  const safeAgentUserId = String(agentUserId || "").trim();
  if (safeAgentUserId) return safeAgentUserId;
  const parsed = parseZakiSessionKey(sessionKey || "");
  return parsed.userId;
}

function upsertAgentSession(
  previous: unknown,
  session: AgentSession,
): AgentSession[] {
  const normalizedSessionKey = normalizeZakiSessionKey(session.session_key);
  const existing = Array.isArray(previous) ? previous : [];
  const next = [
    { ...session, session_key: normalizedSessionKey },
    ...existing.filter(
      (item) => normalizeZakiSessionKey(String(item?.session_key || "")) !== normalizedSessionKey
    ),
  ];
  return next.sort((a, b) => {
    const aTime = parseZakiSessionTimestampMs(a.last_active ?? a.created_at);
    const bTime = parseZakiSessionTimestampMs(b.last_active ?? b.created_at);
    if (aTime !== bTime) return bTime - aTime;
    return normalizeZakiSessionKey(a.session_key).localeCompare(
      normalizeZakiSessionKey(b.session_key)
    );
  });
}

function removeAgentSession(previous: unknown, sessionKey: string): AgentSession[] | unknown {
  if (!Array.isArray(previous)) return previous;
  const normalizedSessionKey = normalizeZakiSessionKey(sessionKey);
  return previous.filter(
    (session) =>
      normalizeZakiSessionKey(String(session?.session_key || "")) !== normalizedSessionKey
  );
}

function formatAgentDraftThreadTitle(timestamp: string): string {
  const time = parseZakiSessionTimestampMs(timestamp);
  if (!time) return "New thread";
  const label = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(time));
  return `Started ${label}`;
}

function buildDraftAgentSession(
  sessionKey: string,
  timestamp: string,
  mode: AgentSessionMode | null | undefined,
): AgentSession {
  return {
    session_key: normalizeZakiSessionKey(sessionKey),
    title: formatAgentDraftThreadTitle(timestamp),
    created_at: timestamp,
    last_active: timestamp,
    message_count: 0,
    live: false,
    mode: mode ?? "execute",
    pending_approval_count: 0,
  };
}

const AGENT_DELETED_SESSION_KEYS_STORAGE_KEY = "zaki:agentDeletedSessionKeys";

function readDeletedAgentSessionKeys() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(AGENT_DELETED_SESSION_KEYS_STORAGE_KEY) || "[]"
    );
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(
      parsed
        .map((value) => normalizeZakiSessionKey(String(value || "")))
        .filter(Boolean)
    );
  } catch {
    return new Set<string>();
  }
}

function persistDeletedAgentSessionKeys(keys: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    const values = Array.from(keys).filter(Boolean).slice(-250);
    window.localStorage.setItem(
      AGENT_DELETED_SESSION_KEYS_STORAGE_KEY,
      JSON.stringify(values)
    );
  } catch {
    // Best-effort only. The in-memory tombstone still protects this session.
  }
}

function rememberDeletedAgentSessionKey(keys: Set<string>, sessionKey: string) {
  const normalized = normalizeZakiSessionKey(sessionKey);
  if (!normalized) return;
  keys.add(normalized);
  persistDeletedAgentSessionKeys(keys);
}

function forgetDeletedAgentSessionKey(keys: Set<string>, sessionKey: string) {
  const normalized = normalizeZakiSessionKey(sessionKey);
  if (!normalized) return;
  keys.delete(normalized);
  persistDeletedAgentSessionKeys(keys);
}

function normalizeMessageContentKey(content: string) {
  return String(content || "").replace(/\s+/g, " ").trim();
}

function agentMessageDedupeKey(message: Pick<Message, "role" | "content">) {
  return `${message.role}:${normalizeMessageContentKey(message.content)}`;
}

function mergeAgentThreadMessages(
  existing: Message[],
  incoming: Message[]
): { messages: Message[]; changed: boolean } {
  if (!incoming.length) return { messages: existing, changed: false };
  const seen = new Set(
    existing
      .filter((message) => normalizeMessageContentKey(message.content))
      .map(agentMessageDedupeKey)
  );
  const next = [...existing];
  let changed = false;
  for (const message of incoming) {
    if (!normalizeMessageContentKey(message.content)) continue;
    const key = agentMessageDedupeKey(message);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(message);
    changed = true;
  }
  return { messages: changed ? next : existing, changed };
}

function isAbortError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("aborted") || message.includes("abort");
  }
  return false;
}

function getFileExtension(name: string) {
  const normalized = String(name || "").trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
}

function formatAcceptedTypeHint(types: Record<string, string[]>) {
  return Array.from(
    new Set(
      Object.values(types || {})
        .flat()
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    )
  )
    .slice(0, 8)
    .join(", ");
}

function splitFilesByAcceptedTypes(
  files: File[],
  acceptedTypes: Record<string, string[]>
) {
  const mimeTypes = new Set(Object.keys(acceptedTypes || {}).map((value) => value.toLowerCase()));
  const extensions = new Set(
    Object.values(acceptedTypes || {})
      .flat()
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
  );

  if (mimeTypes.size === 0 && extensions.size === 0) {
    return { valid: files, invalid: [] as File[] };
  }

  const valid: File[] = [];
  const invalid: File[] = [];
  for (const file of files) {
    const mime = String(file.type || "").trim().toLowerCase();
    const extension = getFileExtension(file.name);
    if ((mime && mimeTypes.has(mime)) || (extension && extensions.has(extension))) {
      valid.push(file);
    } else {
      invalid.push(file);
    }
  }
  return { valid, invalid };
}

function getRequestedResponseFormat(prompt: string) {
  const text = String(prompt || "").trim();
  if (!text) return null;
  const tableFormatIntentPatterns = [
    /\b(?:as|into|in)\s+(?:a\s+)?(?:markdown\s+)?table\b/i,
    /\b(?:return|respond|reply|output|format|present|show|organize|summari[sz]e|compare)\b[\s\S]{0,80}\b(?:a\s+)?(?:markdown\s+)?table\b/i,
    /\b(?:table|tabular)\s+format\b/i,
    /(?:^|\s)(?:please|kindly)\s+use\s+(?:a\s+)?(?:markdown\s+)?table(?:\s|$)/i,
    /(?:^|\s)(?:حولها|حوّلها|رتبها|قدّمها|اعرضها|لخّصها|لخصها|قارنها)\s+(?:في|ب)?\s*جدول(?:\s|$)/i,
    /(?:^|\s)(?:على شكل جدول|بصيغة جدول|بتنسيق جدول|جدول مقارنة)(?:\s|$)/i,
  ];
  if (tableFormatIntentPatterns.some((pattern) => pattern.test(text))) return "table";
  if (
    /\b(?:bullet|bullets|bullet points)\b/i.test(text) ||
    /(?:^|\s)(نقاط|بنقاط|تعداد|bullet)(?:\s|$)/i.test(text)
  ) {
    return "bullets";
  }
  if (
    /\b(?:concise|brief|short|briefly)\b/i.test(text) ||
    /(?:^|\s)(باختصار|مختصر|بشكل مختصر)(?:\s|$)/i.test(text)
  ) {
    return "concise";
  }
  return null;
}

function getRequestedBulletCount(prompt: string) {
  const text = String(prompt || "").trim();
  if (!text) return null;
  const match = text.match(/\b(\d+)\s+bullets?\b/i);
  if (match) return Number(match[1]);
  const arabicNumberMatch = text.match(/(\d+)\s+(?:نقاط|بنقاط)/i);
  if (arabicNumberMatch) return Number(arabicNumberMatch[1]);
  return null;
}

const RESPONSE_FORMAT_ENVELOPE_OPEN = "[[ZAKI_RESPONSE_FORMAT_V1]]";
const RESPONSE_FORMAT_ENVELOPE_CLOSE = "[[/ZAKI_RESPONSE_FORMAT_V1]]";

function stripResponseFormatEnvelope(content: string) {
  const text = String(content || "");
  if (!text) return "";
  const openIndex = text.indexOf(RESPONSE_FORMAT_ENVELOPE_OPEN);
  const closeIndex = text.indexOf(RESPONSE_FORMAT_ENVELOPE_CLOSE);
  if (openIndex === -1 || closeIndex === -1 || closeIndex <= openIndex) {
    return text.trim();
  }
  const head = text.slice(0, openIndex);
  const tail = text.slice(closeIndex + RESPONSE_FORMAT_ENVELOPE_CLOSE.length);
  return `${head}${tail}`.trim();
}

function normalizeAssistantFormatting(prompt: string, content: string) {
  const format = getRequestedResponseFormat(prompt);
  const text = stripResponseFormatEnvelope(content);
  if (!format || !text) return text;

  if (format === "bullets") {
    if (/^\s*[-*•]\s+/m.test(text)) return text;
    const cleaned = text.replace(/^•\s*/, "").trim();
    let parts = cleaned
      .split(/\s*;\s+/)
      .map((part) => part.trim().replace(/[.,\s]+$/g, ""))
      .filter(Boolean);
    if (parts.length < 2) {
      parts = cleaned
        .split(/,\s+(?=(?:and\s+)?(?:they|you|it|this|that|these|those)\b)/i)
        .map((part) => part.trim().replace(/^(and|و)\s+/i, "").replace(/[.,\s]+$/g, ""))
        .filter(Boolean);
    }
    if (parts.length < 2) {
      parts = cleaned
        .split(/\s*,\s+/)
        .map((part) => part.trim().replace(/^(and|و)\s+/i, "").replace(/[.,\s]+$/g, ""))
        .filter(Boolean);
    }
    const requestedCount = getRequestedBulletCount(prompt);
    if (requestedCount && parts.length > requestedCount) {
      const head = parts.slice(0, requestedCount - 1);
      const tail = parts.slice(requestedCount - 1).join(", ");
      parts = [...head, tail];
    }
    if (parts.length >= 2) {
      return parts.map((part) => `- ${part}`).join("\n");
    }
  }

  return text;
}

function buildAgentInvocationUrl(invocationId: string, baseHint?: string | null) {
  const normalizedId = String(invocationId || "").trim();
  if (!normalizedId) return null;

  const candidateBase = String(baseHint || "").trim() || getApiBase();
  const httpUrl = buildApiUrl(`/api/agent-invocation/${encodeURIComponent(normalizedId)}`);
  const sourceUrl = candidateBase
    ? `${candidateBase.replace(/\/+$/, "")}/api/agent-invocation/${encodeURIComponent(normalizedId)}`
    : httpUrl;

  if (!sourceUrl) return null;
  return sourceUrl.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
}

function normalizeAgentSocketUrl(rawUrl: string | null | undefined) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    normalized.startsWith("ws://")
  ) {
    normalized = normalized.replace(/^ws:/i, "wss:");
  }

  try {
    const parsed = new URL(normalized);
    if (
      /^\/agent-invocation\/[^/]+$/i.test(parsed.pathname) &&
      !parsed.pathname.startsWith("/api/")
    ) {
      parsed.pathname = `/api${parsed.pathname}`;
      normalized = parsed.toString();
    }
  } catch {
    // Keep best-effort normalized string.
  }

  return normalized;
}

function extractVisibleAgentChunk(payload: Record<string, unknown>) {
  const content = payload.content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed || null;
  }
  if (content && typeof content === "object") {
    const typedContent = content as Record<string, unknown>;
    const nested =
      typedContent.message ||
      typedContent.content ||
      typedContent.status ||
      typedContent.toolName ||
      typedContent.tool ||
      typedContent.name;
    return typeof nested === "string" && nested.trim() ? nested.trim() : null;
  }
  const direct =
    payload.message ||
    payload.content ||
    payload.status ||
    payload.toolName ||
    payload.tool;
  return typeof direct === "string" && direct.trim() ? direct.trim() : null;
}

export function inferStreamingModeFromContext(rawValue: string): "thinking" | "researching" | "writing" {
  const normalized = String(rawValue || "").trim().toLowerCase();
  if (!normalized) return "thinking";
  if (runtimeMaintenanceLabel(normalized)) return "thinking";
  if (
    normalized.includes("preparing final reply") ||
    normalized.includes("finalizing reply") ||
    normalized.includes("using cached response") ||
    normalized.includes("cached response") ||
    normalized.includes("cached answer")
  ) {
    return "writing";
  }
  if (
    normalized.includes("gathering context") ||
    normalized.includes("retrieving memory") ||
    normalized.includes("trimming context") ||
    normalized.includes("auto-compacting context") ||
    normalized.includes("compacting context") ||
    normalized.includes("refreshing continuity") ||
    normalized.includes("updating history") ||
    normalized.includes("preparing model request") ||
    normalized.includes("reflecting on tool results")
  ) {
    return "thinking";
  }
  if (normalized.includes("running tools")) {
    return "researching";
  }
  if (
    normalized.includes("search") ||
    normalized.includes("web") ||
    normalized.includes("retrieval") ||
    normalized.includes("browse") ||
    normalized.includes("lookup") ||
    normalized.includes("tool") ||
    normalized.includes("fetch") ||
    normalized.includes("crawl") ||
    normalized.includes("exa") ||
    normalized.includes("brave") ||
    normalized.includes("looking up") ||
    normalized.includes("query")
  ) {
    return "researching";
  }
  if (
    normalized.includes("compose") ||
    normalized.includes("final") ||
    normalized.includes("respond") ||
    normalized.includes("draft") ||
    normalized.includes("summarize") ||
    normalized.includes("summary") ||
    normalized.includes("write")
  ) {
    return "writing";
  }
  return "thinking";
}

function normalizeProgressText(rawValue: string | null | undefined) {
  return String(rawValue || "")
    .replace(/\s+/g, " ")
    .trim();
}

function runtimeMaintenanceLabel(rawValue: string | null | undefined) {
  const normalized = normalizeProgressText(rawValue).toLowerCase();
  const tokenKey = normalized.replace(/[-\s]+/g, "_");
  if (
    tokenKey.includes("turn_auto_compaction") ||
    tokenKey.includes("auto_compacting_context") ||
    normalized.includes("auto-compacting context")
  ) {
    return "Auto-compacting context";
  }
  if (
    tokenKey.includes("post_reply_compaction") ||
    normalized.includes("compacted context after reply") ||
    normalized.includes("compacting context")
  ) {
    return "Compacted context after reply";
  }
  if (
    tokenKey.includes("history_maintenance_after_tools") ||
    normalized.includes("updating history")
  ) {
    return "Updating history";
  }
  if (
    tokenKey.includes("durable_continuity_refreshed") ||
    tokenKey.includes("durable_continuity_refresh") ||
    normalized.includes("refreshing continuity")
  ) {
    return "Refreshing continuity memory";
  }
  return null;
}

function normalizeReasoningSummaryText(rawValue: string | null | undefined) {
  return String(rawValue || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").replace(/\s+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


function isCacheLikeText(rawValue: string | null | undefined) {
  const normalized = normalizeProgressText(rawValue).toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("cached response") ||
    normalized.includes("cache hit") ||
    normalized.includes("using cached") ||
    normalized.includes("cached answer")
  );
}

function humanizeProcessToken(rawValue: string | null | undefined) {
  const normalized = normalizeProgressText(rawValue)
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatProcessDuration(durationMs?: number | null) {
  if (typeof durationMs !== "number") return null;
  if (durationMs >= 1000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${durationMs}ms`;
}

type TaskProgressContext = {
  isTaskProgress: boolean;
  taskId: string | null;
  taskState: string | null;
};

function extractTaskProgressContext(progress: {
  phase?: string | null;
  state?: string | null;
  label?: string | null;
  text?: string | null;
}): TaskProgressContext {
  const phase = normalizeProgressText(progress.phase).toLowerCase();
  const label = normalizeProgressText(progress.label || progress.text);
  const directMatch = label.match(/^task\s+([a-z0-9_-]+)\s*:\s*(.+)$/i);
  const fallbackIdMatch = label.match(/\b(task_[a-z0-9_-]+)\b/i);
  const isTaskProgress = phase === "task" || Boolean(directMatch || fallbackIdMatch);
  if (!isTaskProgress) {
    return {
      isTaskProgress: false,
      taskId: null,
      taskState: null,
    };
  }
  const taskId = (directMatch?.[1] || fallbackIdMatch?.[1] || "").trim() || null;
  const taskState = normalizeProgressText(directMatch?.[2] || progress.state) || null;
  return {
    isTaskProgress: true,
    taskId,
    taskState,
  };
}

function buildProcessMetaParts(event: {
  phase?: string | null;
  tool?: string | null;
  taskId?: string | null;
  durationMs?: number | null;
}) {
  const taskContext = extractTaskProgressContext(event);
  return [
    taskContext.isTaskProgress ? "Task" : humanizeProcessToken(event.phase),
    taskContext.taskId || normalizeProgressText(event.taskId) || "",
    event.tool ? `Tool: ${event.tool}` : "",
    formatProcessDuration(event.durationMs),
  ].filter(Boolean);
}

export function buildLatestStatusMeta(event: BotStatusEvent | null | undefined) {
  if (!event) return null;
  const parts = buildProcessMetaParts(event);
  return parts.length > 0 ? parts.join(" • ") : null;
}

function isTaskProgressEvent(event: {
  phase?: string | null;
  taskId?: string | null;
  text?: string | null;
  label?: string | null;
}) {
  return extractTaskProgressContext(event).isTaskProgress || Boolean(normalizeProgressText(event.taskId));
}

function buildProgressEventText(progress: {
  text?: string | null;
  phase?: string | null;
  state?: string | null;
}) {
  const explicit = normalizeProgressText(progress.text);
  if (explicit) return explicit;
  return normalizeProgressText([progress.phase, progress.state].filter(Boolean).join(" • ")) || "Processing update";
}

function buildProgressFingerprint(progress: {
  text?: string | null;
  phase?: string | null;
  state?: string | null;
  tool?: string | null;
}) {
  return [
    normalizeProgressText(progress.text).toLowerCase(),
    normalizeProgressText(progress.phase).toLowerCase(),
    normalizeProgressText(progress.state).toLowerCase(),
    normalizeProgressText(progress.tool).toLowerCase(),
  ].join("|");
}

function classifyProgressTerminal(progress: {
  state?: string | null;
  text?: string | null;
}) {
  const combined = normalizeProgressText([progress.state, progress.text].filter(Boolean).join(" ")).toLowerCase();
  if (!combined) return null;
  if (
    combined.includes("error") ||
    combined.includes("failed") ||
    combined.includes("failure")
  ) {
    return "error" as const;
  }
  if (
    combined.includes("done") ||
    combined.includes("complete") ||
    combined.includes("completed") ||
    combined.includes("finished") ||
    combined.includes("finalizing reply")
  ) {
    return "done" as const;
  }
  return null;
}

function extractReasoningSummaryPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const summaryRaw =
    (typeof source.summary === "string" && source.summary) ||
    (typeof payload.summary === "string" && payload.summary) ||
    (typeof source.text === "string" && source.text) ||
    (typeof payload.text === "string" && payload.text) ||
    (typeof source.label === "string" && source.label) ||
    (typeof payload.label === "string" && payload.label) ||
    (typeof source.message === "string" && source.message) ||
    (typeof payload.message === "string" && payload.message) ||
    "";
  const phaseRaw =
    (typeof source.phase === "string" && source.phase) ||
    (typeof payload.phase === "string" && payload.phase) ||
    "";
  const toolRaw =
    (typeof source.tool === "string" && source.tool) ||
    (typeof source.toolName === "string" && source.toolName) ||
    (typeof payload.tool === "string" && payload.tool) ||
    "";
  const iterationRaw =
    typeof source.iteration === "number"
      ? source.iteration
      : typeof payload.iteration === "number"
        ? payload.iteration
        : undefined;

  const text = normalizeReasoningSummaryText(summaryRaw);
  if (!text) return null;
  return {
    text,
    phase: normalizeProgressText(phaseRaw) || null,
    tool: normalizeProgressText(toolRaw) || null,
    iteration:
      typeof iterationRaw === "number" && Number.isFinite(iterationRaw)
        ? Math.max(0, Math.trunc(iterationRaw))
        : null,
  };
}

function extractReplyStartPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const streamKindRaw =
    (typeof source.stream_kind === "string" && source.stream_kind) ||
    (typeof source.streamKind === "string" && source.streamKind) ||
    (typeof payload.stream_kind === "string" && payload.stream_kind) ||
    (typeof payload.streamKind === "string" && payload.streamKind) ||
    "";
  const deliveryModeRaw =
    (typeof source.delivery_mode === "string" && source.delivery_mode) ||
    (typeof source.deliveryMode === "string" && source.deliveryMode) ||
    (typeof payload.delivery_mode === "string" && payload.delivery_mode) ||
    (typeof payload.deliveryMode === "string" && payload.deliveryMode) ||
    "";
  const liveRaw =
    typeof source.live === "boolean"
      ? source.live
      : typeof payload.live === "boolean"
        ? payload.live
        : null;

  const streamKind = normalizeProgressText(streamKindRaw) || null;
  const deliveryMode = normalizeProgressText(deliveryModeRaw) || null;
  if (!streamKind && !deliveryMode && liveRaw == null) return null;
  return {
    streamKind,
    deliveryMode,
    live: typeof liveRaw === "boolean" ? liveRaw : null,
  };
}

export function extractProgressPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const phaseRaw =
    (typeof source.phase === "string" && source.phase) ||
    (typeof payload.phase === "string" && payload.phase) ||
    "";
  const stateRaw =
    (typeof source.state === "string" && source.state) ||
    (typeof payload.state === "string" && payload.state) ||
    "";
  const labelRaw =
    (typeof source.label === "string" && source.label) ||
    (typeof source.status === "string" && source.status) ||
    (typeof payload.label === "string" && payload.label) ||
    "";
  const toolRaw =
    (typeof source.tool === "string" && source.tool) ||
    (typeof source.toolName === "string" && source.toolName) ||
    (typeof payload.tool === "string" && payload.tool) ||
    undefined;
  const toolUseIdRaw =
    (typeof source.tool_use_id === "string" && source.tool_use_id) ||
    (typeof source.toolUseId === "string" && source.toolUseId) ||
    (typeof payload.tool_use_id === "string" && payload.tool_use_id) ||
    (typeof payload.toolUseId === "string" && payload.toolUseId) ||
    undefined;
  const groupIdRaw =
    (typeof source.group_id === "string" && source.group_id) ||
    (typeof source.groupId === "string" && source.groupId) ||
    (typeof payload.group_id === "string" && payload.group_id) ||
    (typeof payload.groupId === "string" && payload.groupId) ||
    undefined;
  const iterationRaw =
    typeof source.iteration === "number"
      ? source.iteration
      : typeof payload.iteration === "number"
        ? payload.iteration
        : undefined;
  const durationMsRaw =
    typeof source.duration_ms === "number"
      ? source.duration_ms
      : typeof source.durationMs === "number"
        ? source.durationMs
        : typeof payload.duration_ms === "number"
          ? payload.duration_ms
          : typeof payload.durationMs === "number"
            ? payload.durationMs
            : undefined;

  const phase = String(phaseRaw || "").trim() || null;
  const state = String(stateRaw || "").trim() || null;
  const label = String(labelRaw || "").trim() || null;
  const tool = String(toolRaw || "").trim() || null;
  const iteration =
    typeof iterationRaw === "number" && Number.isFinite(iterationRaw)
      ? Math.max(0, Math.trunc(iterationRaw))
      : null;
  const durationMs =
    typeof durationMsRaw === "number" && Number.isFinite(durationMsRaw)
      ? Math.max(0, Math.trunc(durationMsRaw))
      : null;

  const fallbackText = extractVisibleAgentChunk(source);
  const text = label || fallbackText;
  const taskContext = extractTaskProgressContext({ phase, state, label, text });
  if (!text && !phase && !state && !tool) return null;
  return {
    phase,
    state,
    label,
    tool,
    toolUseId: String(toolUseIdRaw || "").trim() || null,
    groupId: String(groupIdRaw || "").trim() || null,
    heartbeat: source.heartbeat === true || payload.heartbeat === true,
    command: extractNullalisCommand(source),
    files: extractNullalisFiles(source),
    taskId: taskContext.taskId,
    iteration,
    durationMs,
    text: text || null,
  };
}

export function inferStreamingModeFromProgress(progress: {
  text?: string | null;
  phase?: string | null;
  state?: string | null;
  label?: string | null;
  tool?: string | null;
}) {
  const taskContext = extractTaskProgressContext(progress);
  if (taskContext.isTaskProgress) {
    return "researching" as const;
  }
  return inferStreamingModeFromContext(
    [progress.phase, progress.state, progress.text, progress.tool]
      .filter(Boolean)
      .join(" ")
  );
}

type ZakiProgressTerminalReason = "done" | "error" | "abort" | "stream_end" | null;

type ZakiTranscriptSeed = {
  id: string;
  kind: ZakiTranscriptEntryKind;
  text: string;
  timestamp: number;
  meta?: string | null;
  state?: "active" | "done" | "error" | null;
};

type BuildZakiProcessSnapshotInput = {
  statusEvents: BotStatusEvent[];
  reasoningSummary: BotReasoningSummary | null;
  replyStart: BotReplyStart | null;
  toolCalls: BotToolCall[];
  latestAssistantMessageContent: string;
  progressTerminalReason: ZakiProgressTerminalReason;
};

function normalizeNarrativeKey(rawValue: string | null | undefined) {
  return normalizeProgressText(rawValue)
    .toLowerCase()
    .replace(/\biteration\s+\d+\b/g, "")
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toSentenceCase(rawValue: string | null | undefined) {
  const text = normalizeProgressText(rawValue);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTranscriptDuration(durationMs?: number | null) {
  return formatProcessDuration(durationMs) || null;
}

function buildTranscriptMeta(options: {
  durationMs?: number | null;
  phase?: string | null;
  state?: "active" | "done" | "error" | null;
}) {
  const parts = [
    options.state === "done"
      ? "Completed"
      : options.state === "error"
        ? "Failed"
        : options.phase
          ? humanizeProcessToken(options.phase)
          : "",
    formatTranscriptDuration(options.durationMs),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : null;
}

function deriveNarrativeText(event: {
  text?: string | null;
  phase?: string | null;
  state?: string | null;
  source?: BotStatusEvent["source"];
  tool?: string | null;
  taskId?: string | null;
  terminal?: BotStatusEvent["terminal"];
}) {
  const normalizedText = normalizeProgressText(event.text);
  const normalized = normalizedText.toLowerCase();
  const taskContext = extractTaskProgressContext(event);
  const toolName = normalizeProgressText(event.tool) || null;
  const maintenanceLabel = runtimeMaintenanceLabel(
    [normalizedText, event.phase, event.state].filter(Boolean).join(" ")
  );

  if (event.source === "summary" && normalizedText) {
    return toSentenceCase(normalizedText);
  }
  if (maintenanceLabel) {
    return maintenanceLabel;
  }
  if (event.terminal === "error") {
    if (taskContext.taskId) return `Task ${taskContext.taskId} failed`;
    if (toolName) return `${toolName} failed`;
    return toSentenceCase(normalizedText || "Something interrupted the reply");
  }
  if (event.terminal === "done") {
    if (taskContext.taskId) return `Completed task ${taskContext.taskId}`;
    if (toolName) return `Finished ${toolName}`;
  }
  if (taskContext.isTaskProgress) {
    return taskContext.taskId ? `Running task ${taskContext.taskId}` : "Running task";
  }
  if (
    normalized.includes("cached response") ||
    normalized.includes("cache hit") ||
    normalized.includes("cached answer")
  ) {
    return "Reusing a cached answer";
  }
  if (
    normalized.includes("preparing final reply") ||
    normalized.includes("finalizing reply") ||
    normalized.includes("final reply")
  ) {
    return "Preparing the final reply";
  }
  if (toolName && (!normalized || normalized === toolName.toLowerCase() || normalized === "running tools")) {
    return `Using ${toolName}`;
  }

  switch (normalized) {
    case "":
      return null;
    case "processing request":
      return "Getting started";
    case "preparing model request":
      return "Checking context and shaping the answer";
    case "trimming context":
      return "Trimming context to keep the request focused";
    case "auto-compacting context":
      return "Auto-compacting context";
    case "compacting context":
      return "Compacted context after reply";
    case "refreshing continuity":
      return "Refreshing continuity memory";
    case "updating history":
      return "Updating history";
    case "thinking":
      return "Thinking through the request";
    case "checking context and memory":
      return "Checking context and memory";
    case "thinking through the request":
      return "Thinking through the request";
    case "gathering context":
      return "Checking context and shaping the answer";
    case "retrieving memory":
      return "Checking memory and recent context";
    case "running tools":
      return toolName ? `Using ${toolName}` : "Using tools to gather what I need";
    case "reflecting on tool results":
      return "Reviewing tool results";
    case "compose":
    case "draft":
    case "writing":
      return "Drafting the answer";
    default:
      if (normalized.startsWith("using ") && toolName) {
        return `Using ${toolName}`;
      }
      return toSentenceCase(normalizedText);
  }
}

function buildTranscriptEntryFromStatusEvent(event: BotStatusEvent): ZakiTranscriptSeed | null {
  const text = deriveNarrativeText(event);
  if (!text) return null;
  const taskContext = extractTaskProgressContext(event);
  const kind: ZakiTranscriptEntryKind =
    event.source === "summary"
      ? "narration"
      : taskContext.isTaskProgress
        ? "task"
        : event.tool
          ? "tool"
          : event.source === "fallback"
            ? "transition"
            : "status";
  return {
    id: event.id,
    kind,
    text,
    timestamp: event.timestamp,
    meta: buildTranscriptMeta({
      durationMs: event.durationMs,
      phase:
        kind === "tool"
          ? "tool"
          : taskContext.isTaskProgress
            ? "task"
            : event.phase,
      state:
        event.terminal === "error"
          ? "error"
          : event.terminal === "done"
            ? "done"
            : "active",
    }),
    state:
      event.terminal === "error"
        ? "error"
        : event.terminal === "done"
          ? "done"
          : "active",
  };
}

function buildTranscriptEntriesFromToolCall(toolCall: BotToolCall): ZakiTranscriptSeed[] {
  const status = toolCall.status || (toolCall.result ? (toolCall.result.ok ? "ok" : "fail") : "pending");
  const transcriptState = status === "ok" ? "done" : status === "fail" ? "error" : "active";
  const activeState: ZakiTranscriptSeed = {
    id: `${toolCall.id}:start`,
    kind: "tool",
    text: `Using ${toolCall.name}`,
    timestamp: toolCall.startedAt || toolCall.timestamp,
    meta: buildTranscriptMeta({
      phase: "tool",
      state: transcriptState,
      durationMs: toolCall.durationMs,
    }),
    state: transcriptState,
  };

  if (!toolCall.result) return [activeState];

  const resultState = status === "ok" ? "done" : status === "fail" ? "error" : "active";
  const resultText =
    status === "blocked"
      ? `Approval required for ${toolCall.name}`
      : status === "ok"
        ? `Finished ${toolCall.name}`
        : `${toolCall.name} failed`;
  return [
    activeState,
    {
      id: `${toolCall.id}:result`,
      kind: "tool",
      text: resultText,
      timestamp: toolCall.finishedAt || toolCall.timestamp,
      meta: buildTranscriptMeta({
        phase: "tool",
        state: resultState,
        durationMs:
          toolCall.durationMs ??
          (typeof toolCall.finishedAt === "number"
            ? Math.max(0, toolCall.finishedAt - toolCall.startedAt)
            : null),
      }),
      state: resultState,
    },
  ];
}

function dedupeTranscriptEntries(entries: ZakiTranscriptSeed[]) {
  const sorted = [...entries].sort((left, right) => {
    if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp;
    return left.id.localeCompare(right.id);
  });

  return sorted.reduce<ZakiTranscriptSeed[]>((acc, entry) => {
    const key = [
      entry.kind,
      normalizeNarrativeKey(entry.text),
      normalizeNarrativeKey(entry.meta),
    ].join("|");
    const last = acc[acc.length - 1];
    if (
      last &&
      [
        last.kind,
        normalizeNarrativeKey(last.text),
        normalizeNarrativeKey(last.meta),
      ].join("|") === key
    ) {
      acc[acc.length - 1] = entry;
      return acc;
    }
    acc.push(entry);
    return acc;
  }, []);
}

function buildZakiTranscriptEntries(input: {
  statusEvents: BotStatusEvent[];
  replyStart: BotReplyStart | null;
  toolCalls: BotToolCall[];
}) {
  const seeds: ZakiTranscriptSeed[] = [];
  input.statusEvents.forEach((event) => {
    const next = buildTranscriptEntryFromStatusEvent(event);
    if (next) seeds.push(next);
  });
  input.toolCalls.forEach((toolCall) => {
    seeds.push(...buildTranscriptEntriesFromToolCall(toolCall));
  });
  if (input.replyStart) {
    seeds.push({
      id: `${input.replyStart.id}:reply`,
      kind: "transition",
      text: "Preparing the final reply",
      timestamp: input.replyStart.timestamp,
      meta: "Transition",
      state: "active",
    });
  }

  return dedupeTranscriptEntries(seeds).slice(-8);
}

function buildCurrentAction(input: {
  phase: ZakiProcessSnapshot["phase"];
  reasoningSummary: BotReasoningSummary | null;
  replyStart: BotReplyStart | null;
  latestTaskEvent: BotStatusEvent | null;
  activeToolCall: BotToolCall | null;
  latestStatusEvent: BotStatusEvent | null;
  isCacheHit: boolean;
}) {
  if (input.phase === "error") {
    const latestError =
      [input.latestStatusEvent, input.latestTaskEvent]
        .filter(Boolean)
        .find((event) => event?.terminal === "error") ?? null;
    return {
      kind: "status" as const,
      text: deriveNarrativeText(latestError || { text: "Something interrupted the reply." }) || "Something interrupted the reply.",
      meta: latestError ? buildLatestStatusMeta(latestError) : null,
    };
  }
  if (input.isCacheHit) {
    return {
      kind: "transition" as const,
      text: "Reusing a cached answer",
      meta: null,
    };
  }
  if (input.replyStart || input.phase === "reply_ready" || input.phase === "revealing" || input.phase === "complete") {
    return {
      kind: "transition" as const,
      text: "Preparing the final reply",
      meta: null,
    };
  }
  if (input.reasoningSummary) {
    return {
      kind: "narration" as const,
      text: toSentenceCase(input.reasoningSummary.text),
      meta: input.reasoningSummary.phase ? humanizeProcessToken(input.reasoningSummary.phase) : null,
    };
  }
  if (input.latestTaskEvent) {
    return {
      kind: "task" as const,
      text: deriveNarrativeText(input.latestTaskEvent) || "Running task",
      meta: buildLatestStatusMeta(input.latestTaskEvent),
    };
  }
  if (input.activeToolCall) {
    return {
      kind: "tool" as const,
      text: `Using ${input.activeToolCall.name}`,
      meta: buildTranscriptMeta({
        phase: "tool",
        state: "active",
      }),
    };
  }
  if (input.latestStatusEvent) {
    return {
      kind: "status" as const,
      text: deriveNarrativeText(input.latestStatusEvent) || "Getting started",
      meta: buildLatestStatusMeta(input.latestStatusEvent),
    };
  }
  return {
    kind: "transition" as const,
    text: "Getting started",
    meta: null,
  };
}

export function buildZakiProcessSnapshot(input: BuildZakiProcessSnapshotInput): ZakiProcessSnapshot {
  const latestStatusEvent = input.statusEvents[input.statusEvents.length - 1] ?? null;
  const latestStatusText = latestStatusEvent?.text || null;
  const latestStatusMeta = buildLatestStatusMeta(latestStatusEvent);
  const latestRunningTool = [...input.toolCalls]
    .reverse()
    .find((toolCall) => !toolCall.result && toolCall.status !== "blocked") ?? null;
  const latestResolvedTool = input.toolCalls[input.toolCalls.length - 1] ?? null;
  const latestToolName =
    latestRunningTool?.name ||
    latestResolvedTool?.name ||
    input.reasoningSummary?.tool ||
    latestStatusEvent?.tool ||
    latestStatusEvent?.taskId ||
    null;
  const hasTools = input.toolCalls.length > 0;
  const hasTaskProgress = input.statusEvents.some((event) => isTaskProgressEvent(event));
  const isCacheHit =
    isCacheLikeText(input.reasoningSummary?.text) ||
    isCacheLikeText(latestStatusText);
  const isReplyReplay =
    input.replyStart?.streamKind === "final_reply" &&
    input.replyStart?.deliveryMode === "buffered_replay" &&
    input.replyStart?.live === false;
  const replyRevealStarted =
    Boolean(isReplyReplay) && input.latestAssistantMessageContent.trim().length > 0;

  let phase: ZakiProcessSnapshot["phase"] = "ack";
  if (input.progressTerminalReason === "error") {
    phase = "error";
  } else if (isReplyReplay && replyRevealStarted) {
    phase = "revealing";
  } else if (isReplyReplay) {
    phase = "reply_ready";
  } else if (input.progressTerminalReason === "done" || input.progressTerminalReason === "stream_end") {
    phase = "complete";
  } else if (
    hasTaskProgress ||
    (hasTools && (latestRunningTool || input.reasoningSummary?.tool || latestStatusEvent?.tool))
  ) {
    phase = "tooling";
  } else if (input.reasoningSummary?.text || latestStatusText) {
    phase =
      latestStatusText === "Processing request" &&
      !input.reasoningSummary?.text &&
      input.statusEvents.length === 1
        ? "ack"
        : "working";
  }

  const transcriptEntries = buildZakiTranscriptEntries({
    statusEvents: input.statusEvents,
    replyStart: isReplyReplay ? input.replyStart : null,
    toolCalls: input.toolCalls,
  });
  const latestTaskEvent =
    [...input.statusEvents]
      .reverse()
      .find((event) => isTaskProgressEvent(event) && event.terminal !== "done" && event.terminal !== "error") ?? null;
  const currentAction = buildCurrentAction({
    phase,
    reasoningSummary: input.reasoningSummary,
    replyStart: isReplyReplay ? input.replyStart : null,
    latestTaskEvent,
    activeToolCall: latestRunningTool,
    latestStatusEvent,
    isCacheHit,
  });
  const filteredTranscriptEntries = transcriptEntries.filter(
    (entry) => normalizeNarrativeKey(entry.text) !== normalizeNarrativeKey(currentAction.text)
  );

  const workStartedAtCandidates = [
    ...input.statusEvents.map((event) => event.timestamp),
    ...input.toolCalls.map((toolCall) => toolCall.startedAt || toolCall.timestamp),
    input.reasoningSummary?.timestamp,
    input.replyStart?.timestamp,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const workStartedAt =
    workStartedAtCandidates.length > 0 ? Math.min(...workStartedAtCandidates) : null;

  return {
    phase,
    summaryText: input.reasoningSummary?.text || null,
    latestStatusText,
    latestStatusMeta,
    latestToolName,
    currentActionText: currentAction.text,
    currentActionMeta: currentAction.meta,
    currentActionKind: currentAction.kind,
    transcriptEntries: filteredTranscriptEntries,
    workStartedAt,
    hasTools,
    isCacheHit,
    isReplyReplay: Boolean(isReplyReplay),
    replyRevealStarted,
  };
}

function extractToolCallPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const requestId =
    (typeof source.requestId === "string" && source.requestId) ||
    (typeof source.request_id === "string" && source.request_id) ||
    (typeof payload.requestId === "string" && payload.requestId) ||
    (typeof payload.request_id === "string" && payload.request_id) ||
    undefined;
  const name =
    (typeof source.name === "string" && source.name) ||
    (typeof source.toolName === "string" && source.toolName) ||
    (typeof source.tool === "string" && source.tool) ||
    "unknown_tool";
  const args =
    source.arguments && typeof source.arguments === "object"
      ? (source.arguments as Record<string, unknown>)
      : {};
  return { requestId, name, arguments: args };
}

function extractToolResultPayload(payload: Record<string, unknown>) {
  const source =
    (payload.content && typeof payload.content === "object"
      ? (payload.content as Record<string, unknown>)
      : payload) || payload;
  const requestId =
    (typeof source.requestId === "string" && source.requestId) ||
    (typeof source.request_id === "string" && source.request_id) ||
    (typeof payload.requestId === "string" && payload.requestId) ||
    (typeof payload.request_id === "string" && payload.request_id) ||
    undefined;
  const name =
    (typeof source.name === "string" && source.name) ||
    (typeof source.toolName === "string" && source.toolName) ||
    (typeof source.tool === "string" && source.tool) ||
    undefined;
  const okRaw = source.ok ?? source.success;
  const ok =
    okRaw === true ||
    (okRaw !== false && typeof source.error !== "string");
  const error = typeof source.error === "string" ? source.error : undefined;
  const result =
    source.result ??
    source.output_preview ??
    source.outputPreview ??
    source.output ??
    undefined;
  const durationMs = numericValue(source.duration_ms ?? source.durationMs);
  const approvalRequired = isApprovalCheckpointToolResult(source, ok, error, result);
  return { requestId, name, ok, error, result, durationMs, approvalRequired };
}

function textContainsApprovalCheckpoint(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("approval required") ||
    normalized.includes("allow-once|deny") ||
    normalized.includes("supervised_mutating_requires_approval") ||
    normalized.includes("approval_already_pending") ||
    normalized.includes("pending tool approval")
  );
}

function isApprovalCheckpointToolResult(
  source: Record<string, unknown>,
  ok: boolean,
  error: string | undefined,
  result: unknown
) {
  if (ok) return false;
  if (source.approval_required === true || source.approvalRequired === true) return true;
  const sourceText =
    typeof source.source === "string" ? source.source.trim().toLowerCase() : "";
  if (sourceText === "approval_required") return true;
  return [
    error,
    result,
    source.reason,
    source.result_summary,
    source.resultSummary,
    source.output_preview,
    source.outputPreview,
    source.output,
    source.message,
  ].some(textContainsApprovalCheckpoint);
}

export function extractNullalisNarrationFrame(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisNarrationFrame | null {
  if (!isNullalisNarrationPhase(payload.phase)) return null;
  const phase = payload.phase.trim().toLowerCase() as NullalisNarrationPhase;
  const stepIndex =
    numericValue(payload.step_index ?? payload.stepIndex) ??
    numericValue(payload.index);
  const stepTotal =
    numericValue(payload.step_total ?? payload.stepTotal ?? payload.total);
  const durationMs = numericValue(payload.duration_ms ?? payload.durationMs);
  return {
    id: `zaki-runtime-narration-${now}-${Math.random().toString(36).slice(2, 8)}`,
    phase,
    label:
      (typeof payload.label === "string" && payload.label.trim()) ||
      (typeof payload.status === "string" && payload.status.trim()) ||
      (typeof payload.message === "string" && payload.message.trim()) ||
      (phase === "thinking" ? "Thinking..." : phase.replace(/_/g, " ")),
    tool:
      typeof payload.tool === "string"
        ? payload.tool
        : typeof payload.tool_name === "string"
          ? payload.tool_name
          : typeof payload.toolName === "string"
            ? payload.toolName
            : null,
    iteration: numericValue(payload.iteration),
    durationMs,
    stepIndex,
    stepTotal,
    timestamp: now,
  };
}

export function extractNullalisTaskItem(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisTaskItem | null {
  const taskId =
    (typeof payload.task_id === "string" && payload.task_id.trim()) ||
    (typeof payload.taskId === "string" && payload.taskId.trim()) ||
    "";
  if (!taskId) return null;
  const rawStatus = String(payload.status || payload.state || "queued")
    .trim()
    .toLowerCase();
  const status: NullalisTaskStatus =
    rawStatus === "succeeded"
      ? "succeeded"
      : rawStatus === "done" ||
          rawStatus === "running" ||
          rawStatus === "queued" ||
          rawStatus === "failed" ||
          rawStatus === "cancelled" ||
          rawStatus === "blocked" ||
          rawStatus === "deferred"
        ? rawStatus
        : "queued";
  return {
    taskId,
    status,
    description:
      (typeof payload.description === "string" && payload.description.trim()) ||
      (typeof payload.label === "string" && payload.label.trim()) ||
      taskId,
    progressPct: numericValue(payload.progress_pct ?? payload.progressPct),
    updatedAt: now,
  };
}

function timestampMillis(value: unknown, fallback: number | null = null): number | null {
  const numeric = numericValue(value);
  if (numeric != null && numeric > 0) {
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function messageRecordCreatedAtIso(record: Record<string, unknown>): string | null {
  const createdAtMs = timestampMillis(
    record.createdAt ??
      record.created_at ??
      record.createdAtMs ??
      record.created_at_ms ??
      record.timestamp ??
      record.ts,
    null
  );
  if (createdAtMs == null) return null;
  const parsed = new Date(createdAtMs);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function recordStringValue(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function recordObjectValue(data: Record<string, unknown>, ...keys: string[]): Record<string, unknown> | null {
  for (const key of keys) {
    const value = data[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return null;
}

function normalizeAgentTaskStatus(status: unknown): NullalisTaskStatus {
  const raw = String(status || "queued").trim().toLowerCase();
  if (raw === "completed" || raw === "complete" || raw === "success") return "done";
  if (raw === "succeeded") return "succeeded";
  if (raw === "in_progress" || raw === "started" || raw === "active") return "running";
  if (raw === "timed_out" || raw === "timeout" || raw === "lost" || raw === "error") {
    return "failed";
  }
  if (
    raw === "done" ||
    raw === "running" ||
    raw === "queued" ||
    raw === "failed" ||
    raw === "cancelled" ||
    raw === "blocked" ||
    raw === "deferred"
  ) {
    return raw;
  }
  return "queued";
}

function normalizeTodoTaskStatus(status: unknown): NullalisTaskStatus {
  const raw = String(status || "pending").trim().toLowerCase();
  if (raw === "pending") return "queued";
  return normalizeAgentTaskStatus(raw);
}

function toolPayloadSource(payload: Record<string, unknown>): Record<string, unknown> {
  return payload.content && typeof payload.content === "object" && !Array.isArray(payload.content)
    ? (payload.content as Record<string, unknown>)
    : payload;
}

function toolPayloadName(payload: Record<string, unknown>): string | null {
  const source = toolPayloadSource(payload);
  return (
    recordStringValue(source, "name", "toolName", "tool") ||
    recordStringValue(payload, "name", "toolName", "tool")
  );
}

function toolPayloadArguments(payload: Record<string, unknown>): Record<string, unknown> | null {
  const source = toolPayloadSource(payload);
  return (
    recordObjectValue(source, "arguments", "args", "input") ||
    recordObjectValue(payload, "arguments", "args", "input")
  );
}

function todoListFromResult(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function todoResultValue(payload: Record<string, unknown>): unknown {
  const source = toolPayloadSource(payload);
  return (
    source.result ??
    source.output ??
    source.output_preview ??
    source.outputPreview ??
    payload.result ??
    payload.output ??
    payload.output_preview ??
    payload.outputPreview
  );
}

function todoItemDescription(item: Record<string, unknown>, fallback: string): string {
  return (
    recordStringValue(item, "title", "description", "label", "summary", "note") ||
    fallback
  );
}

function todoTaskId(listKey: string, itemId: number | string): string {
  return `todo:${listKey}:item:${itemId}`;
}

function todoListItemsToTasks(
  list: Record<string, unknown>,
  now: number,
  fallbackListKey: string
): NullalisTaskItem[] {
  const listId = recordStringValue(list, "list_id", "listId", "id") || fallbackListKey;
  const items = Array.isArray(list.items) ? list.items : [];
  return items
    .map((item, index): NullalisTaskItem | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const idValue = numericValue(record.id ?? record.item_id ?? record.itemId) ?? index + 1;
      const description = todoItemDescription(record, `Todo item ${idValue}`);
      return {
        taskId: todoTaskId(listId, idValue),
        status: normalizeTodoTaskStatus(record.status ?? record.state),
        description,
        progressPct:
          normalizeTodoTaskStatus(record.status ?? record.state) === "done" ? 100 : null,
        updatedAt: now,
      };
    })
    .filter((task): task is NullalisTaskItem => Boolean(task));
}

export function extractNullalisTodoTaskItemsFromToolPayload(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisTaskItem[] {
  const toolName = toolPayloadName(payload);
  if (String(toolName || "").trim().toLowerCase() !== "todo") return [];

  const args = toolPayloadArguments(payload);
  const requestKey =
    recordStringValue(payload, "requestId", "request_id", "tool_call_id", "toolCallId", "tool_use_id", "toolUseId", "run_id", "runId") ||
    "active";
  const action = args ? String(args.action || "").trim().toLowerCase() : "";

  if (args && action === "create") {
    const listKey = recordStringValue(args, "list_id", "listId", "id") || `draft:${requestKey}`;
    const items = Array.isArray(args.items) ? args.items : [];
    return items
      .map((item, index): NullalisTaskItem | null => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const record = item as Record<string, unknown>;
        const idValue = numericValue(record.id ?? record.item_id ?? record.itemId) ?? index + 1;
        return {
          taskId: todoTaskId(listKey, idValue),
          status: "queued",
          description: todoItemDescription(record, `Todo item ${idValue}`),
          progressPct: null,
          updatedAt: now,
        };
      })
      .filter((task): task is NullalisTaskItem => Boolean(task));
  }

  if (args && action === "update") {
    const itemId = numericValue(args.item_id ?? args.itemId ?? args.id);
    if (itemId == null) return [];
    const listKey = recordStringValue(args, "list_id", "listId") || "active";
    const status = normalizeTodoTaskStatus(args.status ?? args.state);
    return [
      {
        taskId: todoTaskId(listKey, itemId),
        status,
        description: recordStringValue(args, "title", "description", "note") || `Todo item ${itemId}`,
        progressPct: status === "done" ? 100 : status === "running" ? 50 : null,
        updatedAt: now,
      },
    ];
  }

  const list = todoListFromResult(todoResultValue(payload));
  return list ? todoListItemsToTasks(list, now, requestKey) : [];
}

function todoItemIndexFromTaskId(taskId: string): string | null {
  const match = taskId.match(/(?:^|:)item:(\d+)$/);
  return match?.[1] ?? null;
}

function mergeTodoTaskItems(
  current: NullalisTaskItem[],
  incoming: NullalisTaskItem[]
): NullalisTaskItem[] {
  if (!incoming.length) return current;
  const next = [...current];
  for (const task of incoming) {
    let index = next.findIndex((item) => item.taskId === task.taskId);
    if (index < 0) {
      const itemIndex = todoItemIndexFromTaskId(task.taskId);
      if (itemIndex) {
        const matching = next
          .map((item, i) => ({ item, i }))
          .filter(({ item }) => item.taskId.startsWith("todo:") && todoItemIndexFromTaskId(item.taskId) === itemIndex);
        if (matching.length === 1 && matching[0]) index = matching[0].i;
      }
    }
    if (index < 0) {
      next.push(task);
      continue;
    }
    const existing = next[index];
    if (!existing) continue;
    const genericDescription = /^Todo item \d+$/i.test(task.description);
    next[index] = {
      ...existing,
      ...task,
      taskId: existing.taskId,
      description: genericDescription ? existing.description : task.description,
      updatedAt: Math.max(existing.updatedAt, task.updatedAt),
    };
  }
  return next.sort((a, b) => a.updatedAt - b.updatedAt).slice(-12);
}

function isTerminalAgentTaskStatus(status: NullalisTaskStatus) {
  return status === "done" || status === "succeeded" || status === "failed" || status === "cancelled";
}

function activeAgentTaskItems(tasks: NullalisTaskItem[]): NullalisTaskItem[] {
  return tasks.filter((task) => !isTerminalAgentTaskStatus(task.status));
}

function agentTaskToNullalisTaskItem(task: AgentTask): NullalisTaskItem | null {
  const record = task as Record<string, unknown>;
  const taskId =
    recordStringValue(record, "task_id", "taskId", "id") ||
    recordStringValue(record, "job_id", "jobId");
  if (!taskId) return null;
  const updatedAt =
    timestampMillis(
      record.updated_at ??
        record.updatedAt ??
        record.completed_at ??
        record.completedAt ??
        record.started_at ??
        record.startedAt ??
        record.created_at ??
        record.createdAt,
      Date.now()
    ) ?? Date.now();
  const description =
    recordStringValue(record, "title", "label", "description", "summary", "prompt", "command") ||
    (typeof record.error === "string" && record.error.trim()) ||
    taskId;
  return {
    taskId,
    status: normalizeAgentTaskStatus(record.status ?? record.state),
    description,
    progressPct: numericValue(
      record.progress_pct ??
        record.progressPct ??
        record.percent_complete ??
        record.percentComplete
    ),
    updatedAt,
  };
}

function mergeNullalisTaskItems(
  backendTasks: NullalisTaskItem[],
  liveTasks: NullalisTaskItem[]
): NullalisTaskItem[] {
  const byId = new Map<string, NullalisTaskItem>();
  for (const task of backendTasks) {
    byId.set(task.taskId, task);
  }
  for (const task of liveTasks) {
    const existing = byId.get(task.taskId);
    if (!existing) {
      byId.set(task.taskId, task);
      continue;
    }
    const liveIsNewer = task.updatedAt >= existing.updatedAt;
    byId.set(task.taskId, {
      ...(liveIsNewer ? existing : task),
      ...(liveIsNewer ? task : existing),
      description: task.description || existing.description,
    });
  }
  return Array.from(byId.values())
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(-12);
}

function normalizeAgentCronJobsPayload(data: unknown): AgentInspectorCronJob[] {
  const container = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const rawJobs = Array.isArray(data)
    ? data
    : Array.isArray(container.jobs)
      ? container.jobs
      : Array.isArray(container.items)
        ? container.items
        : [];
  return rawJobs
    .map((item, index) => normalizeAgentCronJob(item, index))
    .filter((job): job is AgentInspectorCronJob => Boolean(job));
}

function normalizeAgentCronJob(item: unknown, index: number): AgentInspectorCronJob | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const id =
    recordStringValue(record, "id", "job_id", "jobId", "key") ||
    `cron-${index}`;
  const prompt = recordStringValue(record, "prompt", "description", "summary", "command");
  const schedule = recordStringValue(record, "expression", "cron", "schedule", "rrule");
  const name = recordStringValue(record, "name", "title", "label") || "";
  const paused = record.paused === true || record.enabled === false;
  const enabled = typeof record.enabled === "boolean" ? record.enabled : !paused;
  return {
    id,
    name,
    schedule,
    prompt,
    status: recordStringValue(record, "status", "state"),
    enabled,
    paused,
    nextRunAt: timestampMillis(
      record.next_run_at ?? record.nextRunAt ?? record.next_run_secs ?? record.nextRunSecs
    ),
    lastRunAt: timestampMillis(
      record.last_run_at ?? record.lastRunAt ?? record.last_run_secs ?? record.lastRunSecs
    ),
    lastStatus: recordStringValue(record, "last_status", "lastStatus"),
    failureCount:
      numericValue(record.consecutive_failures ?? record.consecutiveFailures ?? record.failures) ?? 0,
    oneShot: record.one_shot === true || record.oneShot === true,
    error: recordStringValue(record, "error", "last_error", "lastError"),
  };
}

function normalizeAgentJobsPayload(data: unknown): AgentInspectorJob[] {
  const container = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const rawJobs = Array.isArray(data)
    ? data
    : Array.isArray(container.jobs)
      ? container.jobs
      : Array.isArray(container.items)
        ? container.items
        : [];
  return rawJobs
    .map((item, index) => normalizeAgentJob(item, index))
    .filter((job): job is AgentInspectorJob => Boolean(job));
}

function normalizeAgentJob(item: unknown, index: number): AgentInspectorJob | null {
  if (!item || typeof item !== "object") return null;
  const record = item as AgentJob & Record<string, unknown>;
  const id =
    recordStringValue(record, "id", "job_id", "jobId", "run_id", "runId") ||
    `job-${index}`;
  const title =
    recordStringValue(record, "title", "label", "name") ||
    recordStringValue(record, "status", "state") ||
    id;
  const paused = record.paused === true || record.enabled === false;
  return {
    id,
    title,
    prompt: recordStringValue(record, "prompt", "description", "summary", "command"),
    status: recordStringValue(record, "status", "state"),
    schedule: recordStringValue(record, "schedule", "expression", "cron", "rrule"),
    nextRunAt: timestampMillis(record.next_run_at ?? record.nextRunAt ?? record.next_run_secs ?? record.nextRunSecs),
    lastRunAt: timestampMillis(record.last_run_at ?? record.lastRunAt ?? record.completed_at ?? record.completedAt),
    createdAt: timestampMillis(record.created_at ?? record.createdAt),
    error: recordStringValue(record, "error", "last_error", "lastError"),
    enabled: typeof record.enabled === "boolean" ? record.enabled : !paused,
    paused,
    lastStatus: recordStringValue(record, "last_status", "lastStatus"),
    failureCount:
      numericValue(record.consecutive_failures ?? record.consecutiveFailures ?? record.failures) ?? 0,
    oneShot: record.one_shot === true || record.oneShot === true,
  };
}

function normalizeAgentArtifactsPayload(data: unknown): AgentInspectorArtifact[] {
  const container = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const rawArtifacts = Array.isArray(data)
    ? data
    : Array.isArray(container.artifacts)
      ? container.artifacts
      : Array.isArray(container.items)
        ? container.items
        : [];
  return rawArtifacts
    .map((item) => normalizeAgentArtifact(item))
    .filter((artifact): artifact is AgentInspectorArtifact => Boolean(artifact));
}

function normalizeAgentArtifact(item: unknown): AgentInspectorArtifact | null {
  if (!item || typeof item !== "object") return null;
  const record = item as AgentArtifact & Record<string, unknown>;
  const id = recordStringValue(record, "id", "artifact_id", "artifactId");
  if (!id) return null;
  const title =
    recordStringValue(record, "title", "name", "label") ||
    recordStringValue(record, "type", "kind", "mime_type", "mimeType") ||
    id;
  return {
    id,
    title,
    type: recordStringValue(record, "type", "kind", "mime_type", "mimeType"),
    version:
      typeof record.version === "string" || typeof record.version === "number"
        ? record.version
        : typeof record.latest_version === "string" || typeof record.latest_version === "number"
          ? record.latest_version
          : typeof record.latestVersion === "string" || typeof record.latestVersion === "number"
            ? record.latestVersion
        : null,
    sessionKey: recordStringValue(record, "session_key", "sessionKey", "session_id", "sessionId"),
    shareUrl:
      getAgentArtifactShareUrl(record) ||
      recordStringValue(record, "public_url", "publicUrl", "share_url", "shareUrl"),
    createdAt: timestampMillis(record.created_at ?? record.createdAt ?? record.created_at_ms ?? record.createdAtMs),
    updatedAt: timestampMillis(
      record.updated_at ??
        record.updatedAt ??
        record.updated_at_ms ??
        record.updatedAtMs ??
        record.created_at ??
        record.createdAt ??
        record.created_at_ms ??
        record.createdAtMs
    ),
  };
}

function extractArtifactEventId(payload: Record<string, unknown>) {
  return (
    recordStringValue(payload, "artifact_id", "artifactId", "id") ||
    null
  );
}

function stringPayloadField(payload: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstPayloadValue(payload: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const value = payload[key];
      if (value !== null && value !== undefined) return value;
    }
  }
  return undefined;
}

function booleanPayloadField(payload: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.some((key) => payload[key] === true);
}

export function extractNullalisApprovalRequest(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisApprovalRequest {
  const tool =
    stringPayloadField(payload, "tool", "tool_name", "toolName") ||
    "tool";
  const approvalId = stringPayloadField(
    payload,
    "approval_id",
    "approvalId"
  );
  const numericId =
    typeof payload.id === "number" || typeof payload.id === "string"
      ? payload.id
      : null;
  const toolCallId = stringPayloadField(payload, "tool_call_id", "toolCallId", "tool_use_id", "toolUseId");
  const runId = stringPayloadField(payload, "run_id", "runId");
  const intent = stringPayloadField(
    payload,
    "intent",
    "human_intent",
    "humanIntent",
    "activity_label",
    "activityLabel",
    "intent_summary",
    "intentSummary"
  );
  const params = firstPayloadValue(payload, "params", "arguments", "args", "tool_params", "toolParams");
  const id =
    approvalId ||
    (numericId != null ? `legacy:${String(numericId)}` : null) ||
    (runId ? `legacy-run:${runId}:tool:${tool}` : null);
  const inputPreview =
    (typeof payload.input_preview === "string" && payload.input_preview.trim()) ||
    (typeof payload.inputPreview === "string" && payload.inputPreview.trim()) ||
    (typeof payload.args_preview === "string" && payload.args_preview.trim()) ||
    (typeof payload.argsPreview === "string" && payload.argsPreview.trim()) ||
    null;
  const effectPreview =
    (typeof payload.effect_preview === "string" && payload.effect_preview.trim()) ||
    (typeof payload.effectPreview === "string" && payload.effectPreview.trim()) ||
    (typeof payload.preview === "string" && payload.preview.trim()) ||
    (typeof payload.summary === "string" && payload.summary.trim()) ||
    null;
  const expiresAt =
    (typeof payload.expires_at === "string" && payload.expires_at.trim()) ||
    (typeof payload.expiresAt === "string" && payload.expiresAt.trim()) ||
    (typeof payload.expires_at === "number" && Number.isFinite(payload.expires_at)
      ? new Date(payload.expires_at * 1000).toISOString()
      : null) ||
    (typeof payload.expiresAt === "number" && Number.isFinite(payload.expiresAt)
      ? new Date(payload.expiresAt * 1000).toISOString()
      : null) ||
    null;
  return {
    id: id || `approval-${now}-${Math.random().toString(36).slice(2, 8)}`,
    approvalId,
    numericId,
    toolCallId,
    tool,
    reason:
      (typeof payload.reason === "string" && payload.reason.trim()) ||
      "Mutating operation requires approval.",
    riskLevel:
      (typeof payload.risk_level === "string" && payload.risk_level.trim()) ||
      (typeof payload.riskLevel === "string" && payload.riskLevel.trim()) ||
      "unknown",
    timestamp: now,
    intent,
    params,
    allowForSessionSafe: booleanPayloadField(
      payload,
      "allow_for_session",
      "allowForSession",
      "session_allow_safe",
      "sessionAllowSafe",
      "safe_to_allow_for_session",
      "safeToAllowForSession"
    ),
    inputPreview,
    effectPreview,
    command: extractNullalisCommand(payload),
    files: extractNullalisFiles(payload),
    expiresAt,
  };
}

export function extractNullalisUsageSummary(
  payload: Record<string, unknown>
): ZakiUsageSummary | null {
  const usageTokens = numericValue(payload.usage_tokens ?? payload.usageTokens);
  const costUsd = numericValue(payload.cost_usd ?? payload.costUsd);
  const turnWeight = numericValue(
    payload.turn_weight ?? payload.turnWeight ?? payload.weighted_debit ?? payload.weightedDebit
  );
  const sessionWeight = numericValue(payload.session_weight ?? payload.sessionWeight);
  if (usageTokens == null && costUsd == null && turnWeight == null && sessionWeight == null) {
    return null;
  }
  return { usageTokens, costUsd, turnWeight, sessionWeight };
}

export function extractNullalisReasoningNarrationFrame(
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisNarrationFrame | null {
  const summary = extractReasoningSummaryPayload(payload);
  if (!summary) return null;
  const phase = isNullalisNarrationPhase(summary.phase)
    ? (summary.phase.trim().toLowerCase() as NullalisNarrationPhase)
    : "thinking";
  return {
    id: `zaki-runtime-summary-${now}-${Math.random().toString(36).slice(2, 8)}`,
    phase,
    label: summary.text,
    tool: summary.tool,
    iteration: summary.iteration,
    durationMs: null,
    stepIndex: null,
    stepTotal: null,
    timestamp: now,
  };
}

function normalizeNullalisTranscriptLabel(label: string | null | undefined, phase?: string | null) {
  const raw = normalizeProgressText(label).replace(/\.+$/, "");
  const key = raw.toLowerCase();
  const maintenanceLabel = runtimeMaintenanceLabel([raw, phase].filter(Boolean).join(" "));
  if (maintenanceLabel) return maintenanceLabel;
  const mapped: Record<string, string> = {
    "analyzing request": "Analyzing the request",
    "gathering context": "Checking context and memory",
    "checking context and memory": "Checking context and memory",
    "retrieving memory": "Searching saved memory",
    "trimming context": "Trimming context to keep the request focused",
    "auto-compacting context": "Auto-compacting context",
    "compacting context": "Compacted context after reply",
    "refreshing continuity": "Refreshing continuity memory",
    "updating history": "Updating history",
    "thinking": "Thinking through the request",
    "thinking through the request": "Thinking through the request",
    "preparing model request": "Preparing the model request",
    "model response received": "Reading the model response",
    "processing model response": "Processing the model response",
    "preparing final reply": "Preparing the final reply",
    "preparing the final answer": "Preparing the final answer",
    "finalizing reply": "Finalizing the response",
    "finishing the response": "Finishing the response",
    "response ready": "Response ready",
  };
  if (mapped[key]) return mapped[key];
  if (raw) return raw;
  if (phase === "waiting") return "Waiting for provider";
  if (phase === "error_recovery") return "Retrying after a transient issue";
  if (phase === "speaking") return "Preparing the spoken response";
  if (phase === "listening") return "Listening for input";
  return "Processing request";
}

function extractNullalisFiles(payload: Record<string, unknown>) {
  const candidates: string[] = [];
  const appendArray = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        candidates.push(item.trim());
      }
    }
  };
  appendArray(payload.files);
  appendArray(payload.file_paths);
  appendArray(payload.filePaths);
  appendArray(payload.paths);

  const preview =
    (typeof payload.output_preview === "string" && payload.output_preview) ||
    (typeof payload.outputPreview === "string" && payload.outputPreview) ||
    (typeof payload.result === "string" && payload.result) ||
    (typeof payload.output === "string" && payload.output) ||
    "";
  const filePattern =
    /(?:^|[\s"'`])((?:\.{1,2}\/|\/|[A-Za-z0-9_.-]+\/)[A-Za-z0-9_./-]+\.[A-Za-z0-9]{1,8})(?=$|[\s"'`,:;)])/g;
  for (const match of preview.matchAll(filePattern)) {
    const filePath = String(match[1] || "").trim();
    if (filePath && !filePath.includes("://")) {
      candidates.push(filePath);
    }
  }

  return Array.from(new Set(candidates)).slice(0, 4);
}

function extractNullalisCommand(payload: Record<string, unknown>) {
  const command =
    (typeof payload.command === "string" && payload.command.trim()) ||
    (typeof payload.cmd === "string" && payload.cmd.trim()) ||
    "";
  if (command) return command;
  const preview =
    (typeof payload.output_preview === "string" && payload.output_preview) ||
    (typeof payload.outputPreview === "string" && payload.outputPreview) ||
    "";
  const firstLine = preview.split(/\r?\n/).find((line) => line.trim());
  if (!firstLine) return null;
  const trimmed = firstLine.trim();
  if (trimmed.startsWith("$ ")) return trimmed.slice(2).trim() || null;
  return null;
}

function inferNullalisIntent(input: {
  text?: string | null;
  phase?: string | null;
  tool?: string | null;
  files?: string[];
  command?: string | null;
}): NullalisTranscriptEntry["intent"] {
  const haystack = [input.text, input.phase, input.tool, input.command, ...(input.files ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes("memory")) return "memory";
  if (haystack.includes("context") || haystack.includes("prompt")) return "context";
  if (haystack.includes("plan") || haystack.includes("step")) return "planning";
  if (haystack.includes("approval")) return "approval";
  if (haystack.includes("final") || haystack.includes("response ready")) return "final";
  if (haystack.includes("model")) return "model";
  if (haystack.includes("test") || haystack.includes("jest") || haystack.includes("vitest")) {
    return "test";
  }
  if (haystack.includes("git ") || haystack.includes("commit") || haystack.includes("push")) {
    return "git";
  }
  if (input.files?.length) return "file";
  if (input.tool) return "tool";
  if (haystack.includes("thinking")) return "thinking";
  return "status";
}

function nullalisImportance(input: {
  source?: NullalisTranscriptEntry["source"];
  kind: NullalisTranscriptEntry["kind"];
  text?: string | null;
  intent?: NullalisTranscriptEntry["intent"];
  files?: string[];
  command?: string | null;
  durationMs?: number | null;
}) {
  const text = normalizeProgressText(input.text).toLowerCase();
  if (input.source === "reasoning_summary") return 90;
  if (input.kind === "approval") return 95;
  if (input.kind === "tool") return input.files?.length || input.command ? 88 : 78;
  if (input.kind === "task") return 76;
  if (input.kind === "transition") return 65;
  if (input.intent === "memory" || input.intent === "context") return 70;
  if (
    text === "processing request" ||
    text === "preparing the model request" ||
    text === "reading the model response"
  ) {
    return 25;
  }
  if (input.intent === "model") return 35;
  return 55;
}

function nullalisEntryId(prefix: string, now: number) {
  return `zaki-runtime-${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

export function extractNullalisTranscriptEntry(
  eventType: string | null | undefined,
  payload: Record<string, unknown>,
  now = Date.now()
): NullalisTranscriptEntry | null {
  const payloadType = typeof payload.type === "string" ? payload.type : null;
  const type = (eventType || payloadType || "").trim().toLowerCase();

  if (type === "reasoning_summary") {
    const summary = extractReasoningSummaryPayload(payload);
    if (!summary) return null;
    const intent = inferNullalisIntent({
      text: summary.text,
      phase: summary.phase,
      tool: summary.tool,
    });
    return {
      id: nullalisEntryId("summary", now),
      kind: "narration",
      intent,
      text: summary.text,
      timestamp: now,
      importance: 90,
      phase: summary.phase,
      tool: summary.tool,
      groupKey: `summary:${normalizeProgressText(summary.text).toLowerCase()}`,
      source: "reasoning_summary",
    };
  }

  if (type === "progress") {
    const frame = extractNullalisNarrationFrame(payload, now);
    if (!frame) return null;
    const tool = String(frame.tool || "").trim();
    const label = normalizeNullalisTranscriptLabel(frame.label, frame.phase);
    let text = label;
    if (frame.phase === "tool_start") {
      text = tool ? `Using ${tool}` : label || "Using a tool";
    } else if (frame.phase === "tool_done") {
      const duration = frame.durationMs != null ? ` · ${Math.round(frame.durationMs)}ms` : "";
      text = tool ? `${tool} completed${duration}` : label || `Tool completed${duration}`;
    } else if (frame.phase === "plan_step" && frame.stepIndex != null && frame.stepTotal != null) {
      text = `Step ${frame.stepIndex + 1}/${frame.stepTotal}: ${label}`;
    }
    const files = extractNullalisFiles(payload);
    const command = extractNullalisCommand(payload);
    const toolUseId =
      (typeof payload.tool_use_id === "string" && payload.tool_use_id.trim()) ||
      (typeof payload.toolUseId === "string" && payload.toolUseId.trim()) ||
      null;
    const taskId =
      (typeof payload.task_id === "string" && payload.task_id.trim()) ||
      (typeof payload.taskId === "string" && payload.taskId.trim()) ||
      null;
    const groupId =
      (typeof payload.group_id === "string" && payload.group_id.trim()) ||
      (typeof payload.groupId === "string" && payload.groupId.trim()) ||
      null;
    const heartbeat = payload.heartbeat === true;
    const intent = inferNullalisIntent({
      text,
      phase: frame.phase,
      tool: frame.tool,
      files,
      command,
    });
    const kind =
      frame.phase === "tool_start" || frame.phase === "tool_done"
        ? "tool"
        : frame.phase === "plan_step"
          ? "task"
          : frame.phase === "error_recovery"
            ? "status"
            : "narration";
    return {
      id: frame.id.replace("zaki-runtime-narration", "zaki-runtime-transcript"),
      kind,
      intent,
      text,
      timestamp: frame.timestamp,
      importance: nullalisImportance({
        source: "progress",
        kind,
        text,
        intent,
        files,
        command,
        durationMs: frame.durationMs,
      }),
      phase: frame.phase,
      tool: frame.tool,
      toolUseId,
      taskId,
      stepIndex: frame.stepIndex,
      stepTotal: frame.stepTotal,
      durationMs: frame.durationMs,
      files,
      command,
      heartbeat,
      resultState:
        frame.phase === "tool_done"
          ? "done"
          : frame.phase === "tool_start" || frame.phase === "plan_step"
            ? "running"
            : frame.phase === "error_recovery"
              ? "failed"
              : null,
      groupKey:
        toolUseId
          ? `tool-use:${toolUseId}`
          : taskId
            ? `task:${taskId}`
            : groupId
              ? `group:${groupId}`
              : frame.tool && (frame.phase === "tool_start" || frame.phase === "tool_done")
                ? `tool:${frame.tool}`
                : `${intent}:${normalizeProgressText(text).toLowerCase()}`,
      source: "progress",
    };
  }

  if (type === "status" || type === "statusresponse") {
    const progress = extractProgressPayload(payload);
    const text =
      progress?.text ||
      (typeof payload.label === "string" && payload.label.trim()) ||
      (typeof payload.message === "string" && payload.message.trim()) ||
      (typeof payload.status === "string" && payload.status.trim()) ||
      "";
    if (!text) return null;
    const intent = inferNullalisIntent({
      text,
      phase: progress?.phase,
      tool: progress?.tool,
    });
    const normalizedText = normalizeNullalisTranscriptLabel(text, progress?.phase);
    return {
      id: nullalisEntryId("status", now),
      kind: "status",
      intent,
      text: normalizedText,
      timestamp: now,
      importance: nullalisImportance({
        source: "progress",
        kind: "status",
        text: normalizedText,
        intent,
        durationMs: progress?.durationMs,
      }),
      phase: progress?.phase ?? null,
      tool: progress?.tool ?? null,
      toolUseId: progress?.toolUseId ?? null,
      taskId: progress?.taskId ?? null,
      durationMs: progress?.durationMs ?? null,
      status: progress?.state ?? null,
      files: progress?.files ?? [],
      command: progress?.command ?? null,
      heartbeat: progress?.heartbeat === true,
      resultState: progress?.state === "done" ? "done" : progress?.state === "error" ? "failed" : null,
      groupKey: progress?.toolUseId
        ? `tool-use:${progress.toolUseId}`
        : progress?.taskId
          ? `task:${progress.taskId}`
          : progress?.groupId
            ? `group:${progress.groupId}`
            : `${intent}:${normalizeProgressText(normalizedText).toLowerCase()}`,
      source: "progress",
    };
  }

  if (type === "tool_start") {
    const tool =
      (typeof payload.tool === "string" && payload.tool.trim()) ||
      (typeof payload.name === "string" && payload.name.trim()) ||
      "tool";
    const files = extractNullalisFiles(payload);
    const command = extractNullalisCommand(payload);
    const toolUseId =
      (typeof payload.tool_use_id === "string" && payload.tool_use_id.trim()) ||
      (typeof payload.toolUseId === "string" && payload.toolUseId.trim()) ||
      null;
    const inputPreview =
      (typeof payload.input_preview === "string" && payload.input_preview.trim()) ||
      (typeof payload.inputPreview === "string" && payload.inputPreview.trim()) ||
      null;
    const activityLabel =
      (typeof payload.activity_label === "string" && payload.activity_label.trim()) ||
      (typeof payload.activityLabel === "string" && payload.activityLabel.trim()) ||
      null;
    const intent = inferNullalisIntent({ text: `Using ${tool}`, tool, files, command });
    return {
      id: nullalisEntryId("tool-start", now),
      kind: "tool",
      intent,
      text: activityLabel || `Using ${tool}`,
      timestamp: now,
      importance: nullalisImportance({
        source: "tool",
        kind: "tool",
        text: activityLabel || `Using ${tool}`,
        intent,
        files,
        command,
      }),
      phase: "tool_start",
      tool,
      toolUseId,
      files,
      command,
      inputPreview,
      activityLabel,
      resultState: "running",
      groupKey: toolUseId ? `tool-use:${toolUseId}` : `tool:${tool}`,
      source: "tool",
    };
  }

  if (type === "tool_result") {
    const toolResult = extractToolResultPayload(payload);
    const tool = toolResult.name || "tool";
    const duration = toolResult.durationMs != null ? ` · ${Math.round(toolResult.durationMs)}ms` : "";
    const files = extractNullalisFiles(payload);
    const command = extractNullalisCommand(payload);
    const toolUseId =
      (typeof payload.tool_use_id === "string" && payload.tool_use_id.trim()) ||
      (typeof payload.toolUseId === "string" && payload.toolUseId.trim()) ||
      null;
    const outputPreview =
      (typeof payload.output_preview === "string" && payload.output_preview.trim()) ||
      (typeof payload.outputPreview === "string" && payload.outputPreview.trim()) ||
      (typeof toolResult.result === "string" && toolResult.result.trim()) ||
      null;
    const resultSummary =
      (typeof payload.result_summary === "string" && payload.result_summary.trim()) ||
      (typeof payload.resultSummary === "string" && payload.resultSummary.trim()) ||
      null;
    const outputTruncated =
      payload.output_truncated === true || payload.outputTruncated === true;
    const exitCode = numericValue(payload.exit_code ?? payload.exitCode);
    const isApprovalRequired = toolResult.approvalRequired;
    const text = isApprovalRequired
      ? `Approval required for ${tool}`
      : toolResult.ok
        ? `${tool} completed${duration}`
        : `${tool} failed`;
    const intent = inferNullalisIntent({ text, tool, files, command });
    return {
      id: nullalisEntryId("tool-result", now),
      kind: "tool",
      intent,
      text,
      timestamp: now,
      importance: nullalisImportance({
        source: "tool",
        kind: "tool",
        text,
        intent,
        files,
        command,
        durationMs: toolResult.durationMs,
      }),
      phase: "tool_done",
      tool,
      toolUseId,
      durationMs: toolResult.durationMs,
      status: isApprovalRequired ? "blocked" : toolResult.ok ? "done" : "failed",
      files,
      command,
      outputPreview,
      outputTruncated,
      resultSummary,
      exitCode,
      resultState: isApprovalRequired ? "blocked" : toolResult.ok ? "done" : "failed",
      groupKey: toolUseId ? `tool-use:${toolUseId}` : `tool:${tool}`,
      source: isApprovalRequired ? "approval" : "tool",
    };
  }

  if (type === "task_update") {
    const task = extractNullalisTaskItem(payload, now);
    if (!task) return null;
    const taskName = task.description || task.taskId;
    const statusCopy =
      task.status === "running"
        ? "Running"
        : task.status === "done" || task.status === "succeeded"
          ? "Completed"
          : task.status === "queued"
            ? "Queued"
            : task.status.charAt(0).toUpperCase() + task.status.slice(1);
    const text = `${statusCopy} task: ${taskName}`;
    const intent = inferNullalisIntent({ text, phase: "task_update" });
    return {
      id: nullalisEntryId(`task-${task.taskId}`, now),
      kind: "task",
      intent,
      text,
      timestamp: task.updatedAt,
      importance: nullalisImportance({
        source: "task",
        kind: "task",
        text,
        intent,
      }),
      phase: "task_update",
      taskId: task.taskId,
      status: task.status,
      resultState:
        task.status === "done" || task.status === "succeeded"
          ? "done"
          : task.status === "failed"
            ? "failed"
            : task.status === "blocked"
              ? "blocked"
              : task.status === "queued"
                ? "queued"
                : task.status === "running"
                  ? "running"
                  : null,
      groupKey: `task:${task.taskId}`,
      source: "task",
    };
  }

  if (type === "tool_only_turn" || type === "tool_only_summary") {
    const toolCount = numericValue(payload.tool_calls_executed ?? payload.toolCallsExecuted) ?? 0;
    const taskIds = Array.isArray(payload.spawned_task_ids)
      ? payload.spawned_task_ids.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : Array.isArray(payload.spawnedTaskIds)
        ? payload.spawnedTaskIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
    const iterations = numericValue(payload.iterations_used ?? payload.iterationsUsed);
    const textParts = [
      `${toolCount} tool${toolCount === 1 ? "" : "s"} ran`,
      taskIds.length
        ? `${taskIds.length} background task${taskIds.length === 1 ? "" : "s"} spawned`
        : "",
      iterations != null ? `${iterations} iteration${iterations === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    return {
      id: nullalisEntryId("tool-only-turn", now),
      kind: "task",
      intent: "planning",
      text: textParts.join(" · ") || "Background agent work dispatched",
      timestamp: now,
      importance: 84,
      phase: type,
      status: taskIds.length ? "background" : "done",
      resultSummary: taskIds.length ? taskIds.join(", ") : null,
      resultState: taskIds.length ? "running" : "done",
      groupKey: "tool-only-turn",
      source: "task",
    };
  }

  if (type === "approval_required") {
    const approval = extractNullalisApprovalRequest(payload, now);
    return {
      id: nullalisEntryId("approval", now),
      kind: "approval",
      intent: "approval",
      text: `Approval required for ${approval.tool}`,
      timestamp: approval.timestamp,
      importance: 95,
      phase: "approval_required",
      tool: approval.tool,
      status: approval.riskLevel,
      files: approval.files,
      command: approval.command,
      inputPreview: approval.inputPreview,
      resultSummary: approval.effectPreview || approval.reason,
      resultState: "blocked",
      groupKey: `approval:${approval.tool}`,
      source: "approval",
    };
  }

  if (type === "artifact_event") {
    const artifactId =
      (typeof payload.artifact_id === "string" && payload.artifact_id.trim()) ||
      (typeof payload.artifactId === "string" && payload.artifactId.trim()) ||
      null;
    const artifactTitle =
      (typeof payload.title === "string" && payload.title.trim()) ||
      (typeof payload.name === "string" && payload.name.trim()) ||
      artifactId ||
      "artifact";
    const eventName =
      (typeof payload.op === "string" && payload.op.trim()) ||
      (typeof payload.event === "string" && payload.event.trim()) ||
      (typeof payload.action === "string" && payload.action.trim()) ||
      (typeof payload.status === "string" && payload.status.trim()) ||
      "updated";
    const artifactType =
      (typeof payload.kind === "string" && payload.kind.trim()) ||
      (typeof payload.artifact_type === "string" && payload.artifact_type.trim()) ||
      (typeof payload.artifactType === "string" && payload.artifactType.trim()) ||
      (typeof payload.type_name === "string" && payload.type_name.trim()) ||
      null;
    const version =
      (typeof payload.version === "string" && payload.version.trim()) ||
      (typeof payload.version === "number" && Number.isFinite(payload.version)
        ? `v${payload.version}`
        : null);
    const changeSummary =
      (typeof payload.change_summary === "string" && payload.change_summary.trim()) ||
      (typeof payload.changeSummary === "string" && payload.changeSummary.trim()) ||
      (typeof payload.summary === "string" && payload.summary.trim()) ||
      null;
    const artifactUrl =
      (typeof payload.url === "string" && payload.url.trim()) ||
      (typeof payload.href === "string" && payload.href.trim()) ||
      null;
    const files = Array.from(
      new Set(
        [
          ...extractNullalisFiles(payload),
          artifactUrl,
          artifactId && !artifactId.includes("/") ? null : artifactId,
        ].filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      )
    );
    const text = `Artifact ${eventName}: ${artifactTitle}`;
    const eventNameLower = eventName.toLowerCase();
    return {
      id: nullalisEntryId("artifact", now),
      kind: "tool",
      intent: "file",
      text,
      timestamp: now,
      importance: 82,
      phase: "artifact_event",
      tool: "artifact",
      status: eventName,
      files,
      activityLabel: artifactTitle,
      inputPreview: version,
      outputPreview: changeSummary,
      resultSummary: changeSummary || artifactType || version,
      resultState: eventNameLower.includes("fail") || eventNameLower.includes("error") ? "failed" : eventNameLower.includes("stream") || eventNameLower.includes("draft") ? "running" : "done",
      groupKey: artifactId ? `artifact:${artifactId}` : `artifact:${artifactTitle}`,
      source: "tool",
    };
  }

  if (type === "done") {
    return {
      id: nullalisEntryId("done", now),
      kind: "transition",
      intent: "final",
      text: "Finalized the response",
      timestamp: now,
      importance: 65,
      phase: "done",
      status: "done",
      resultState: "done",
      groupKey: "done",
      source: "done",
    };
  }

  if (type === "subagent_completion") {
    const taskId =
      (typeof payload.task_id === "string" && payload.task_id.trim()) ||
      (typeof payload.taskId === "string" && payload.taskId.trim()) ||
      (typeof payload.id === "string" && payload.id.trim()) ||
      "subagent";
    const failed =
      payload.success === false ||
      String(payload.status || payload.state || "").trim().toLowerCase() === "failed";
    const summary =
      (typeof payload.summary === "string" && payload.summary.trim()) ||
      (typeof payload.result_summary === "string" && payload.result_summary.trim()) ||
      (typeof payload.resultSummary === "string" && payload.resultSummary.trim()) ||
      (typeof payload.output_preview === "string" && payload.output_preview.trim()) ||
      (typeof payload.outputPreview === "string" && payload.outputPreview.trim()) ||
      "Background work completed";
    return {
      id: nullalisEntryId(`subagent-${taskId}`, now),
      kind: "task",
      intent: "planning",
      text: `${failed ? "Failed" : "Completed"} subagent: ${summary}`,
      timestamp: now,
      importance: failed ? 92 : 84,
      phase: "subagent_completion",
      taskId,
      status: failed ? "failed" : "done",
      resultSummary: summary,
      resultState: failed ? "failed" : "done",
      groupKey: `task:${taskId}`,
      source: "task",
    };
  }

  if (type === "audio_reply") {
    return {
      id: nullalisEntryId("audio-reply", now),
      kind: "status",
      intent: "final",
      text: "Audio reply generated",
      timestamp: now,
      importance: 58,
      phase: "audio_reply",
      status: "done",
      resultState: "done",
      groupKey: "audio-reply",
      source: "progress",
    };
  }

  return null;
}

function buildNullalisTranscriptFingerprint(entry: NullalisTranscriptEntry) {
  return [entry.kind, normalizeNarrativeKey(entry.text)].join("|");
}

type AgentInspectorMessage = {
  id: string;
  role: string;
  turnEvents?: Array<{ eventType: string; payload: Record<string, unknown>; ts?: number }>;
};

export function selectAgentInspectorTranscriptEntries({
  liveEntries,
  localTurnSnapshots,
  messages,
}: {
  liveEntries: NullalisTranscriptEntry[];
  localTurnSnapshots: Record<string, NullalisTranscriptEntry[]>;
  messages: AgentInspectorMessage[];
}): NullalisTranscriptEntry[] {
  if (liveEntries.length) return liveEntries;
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  if (!latestAssistant) return [];
  const snapshot = localTurnSnapshots[latestAssistant.id];
  if (snapshot?.length) return snapshot;
  if (!Array.isArray(latestAssistant.turnEvents) || !latestAssistant.turnEvents.length) return [];
  return latestAssistant.turnEvents
    .map((event) =>
      extractNullalisTranscriptEntry(
        event.eventType,
        event.payload ?? {},
        typeof event.ts === "number" ? event.ts : Date.now()
      )
    )
    .filter((entry): entry is NullalisTranscriptEntry => Boolean(entry));
}

export function ChatArea() {
  const queryClient = useQueryClient();
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const chatCopy = {
    spaceFallback: isRtl ? "مساحة" : "Space",
    newChat: isRtl ? "محادثة جديدة" : "New chat",
    copied: isRtl ? "تم النسخ إلى الحافظة" : "Copied to clipboard",
    copyFailed: isRtl ? "تعذر نسخ الرسالة" : "Unable to copy message",
    exported: isRtl ? "تم تصدير المحادثة" : "Chat exported",
    exportFailed: isRtl ? "تعذر تصدير هذه المحادثة" : "Unable to export this chat",
    dragPrompt: isRtl ? "أسقط الملفات داخل المساحة ليتم استخدامها" : "Drop files into a workspace to ground them",
    botUploadUnavailable: isRtl
      ? "رفع الملفات غير متاح داخل بوت زكي بعد."
      : "File uploads are not available inside ZAKI Bot yet.",
    shareConversationAria: isRtl ? "مشاركة المحادثة" : "Share conversation",
    shareConversation: isRtl ? "مشاركة" : "Share",
    moreOptionsAria: isRtl ? "خيارات إضافية" : "More options",
    reviewMemoriesAria: isRtl ? "مراجعة الذكريات" : "Review memories",
    reviewMemories: isRtl ? "مراجعة الذكريات" : "Review Memories",
    exportJsonAria: isRtl ? "تصدير المحادثة بصيغة JSON" : "Export conversation as JSON",
    exportJson: isRtl ? "تصدير JSON" : "Export JSON",
    scrollToBottomAria: isRtl ? "الانتقال إلى آخر المحادثة" : "Scroll to bottom",
    unsupportedType: (hint?: string) =>
      hint
        ? isRtl
          ? `نوع الملف غير مدعوم. استخدم أحد الأنواع التالية: ${hint}.`
          : `Unsupported type. Use one of: ${hint}.`
        : isRtl
          ? "نوع الملف غير مدعوم."
          : "Unsupported file type.",
    unsupportedUploadToast: (hint?: string) =>
      hint
        ? isRtl
          ? `نوع الملف غير مدعوم. ارفع أحد الأنواع التالية: ${hint}.`
          : `Unsupported file type. Upload one of: ${hint}.`
        : isRtl
          ? "نوع الملف غير مدعوم لرفع ملفات المساحة."
          : "Unsupported file type for workspace upload.",
    addedFile: (name: string) =>
      isRtl ? `تمت إضافة ${name} إلى ملفات المساحة.` : `Added ${name} to workspace files.`,
    addedFiles: (count: number) =>
      isRtl ? `تمت إضافة ${count} ملفات إلى ملفات المساحة.` : `Added ${count} files to workspace files.`,
    uploadFailed: isRtl ? "فشل الرفع." : "Upload failed.",
    unableToUpload: isRtl ? "تعذر رفع الملفات." : "Unable to upload files.",
    experimentalLimitReached: (resetLabel: string) =>
      isRtl
        ? `وصلت إلى حد استخدام Agent المجاني لهذا الأسبوع. تتم إعادة التعيين أسبوعيًا. جرّب مرة أخرى بعد ${resetLabel}.`
        : `You reached this week's free Agent usage limit. Usage resets weekly. Try again after ${resetLabel}.`,
    appFreeLimitReached: (resetLabel: string) =>
      isRtl
        ? `وصلت إلى حد الاستخدام المجاني اليوم. يتم إعادة التعيين يوميًا. جرّب مرة أخرى بعد ${resetLabel}.`
        : `You reached today's free limit. Free usage resets daily. Try again after ${resetLabel}.`,
    quotaBadgeNeutral: isRtl ? "الاستخدام اليومي" : "Daily usage",
    quotaBadgeWarning: isRtl ? "الاستخدام اليومي يقترب من الاكتمال" : "Daily usage is getting full",
    quotaBadgeDanger: isRtl ? "الاستخدام اليومي ممتلئ" : "Daily usage is full",
  };
  useAuthStore(); // For auth context, values used elsewhere
  const {
    view,
    threadId: activeThreadId,
    spaceId: activeWorkspaceSlug,
    zakiSessionKey,
    goHome,
    goToSpaces,
    goToThread,
    clearThread,
    setZakiSessionKey,
  } = useNavigationStore();
  const { sidebarMode } = useNavigationStore();

  // View states
  const showZakiHome = view === "home";
  const showAbout = view === "about";
  const showSpacesView = view === "spaces";
  const showSpaceDetail = false;

  // Message state
  const [messagesByThread, setMessagesByThread] = useState<Record<string, Message[]>>({});
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [composerQuickReplyTriggerId, setComposerQuickReplyTriggerId] = useState<string | null>(null);
  const [composerQuickReplyVisible, setComposerQuickReplyVisible] = useState(false);
  const [turnStartedAt, setTurnStartedAt] = useState<number | null>(null);
  const [turnDurationMs, setTurnDurationMs] = useState<number | null>(null);
  const [streamingIndicatorMode, setStreamingIndicatorMode] = useState<"thinking" | "researching" | "writing">("thinking");
  const [zakiBotToolCalls, setZakiBotToolCalls] = useState<BotToolCall[]>([]);
  const [zakiBotStatusEvents, setZakiBotStatusEvents] = useState<BotStatusEvent[]>([]);
  const [zakiBotReplyStart, setZakiBotReplyStart] = useState<BotReplyStart | null>(
    null
  );
  const [zakiBotProgressTerminalReason, setZakiBotProgressTerminalReason] = useState<
    "done" | "error" | "abort" | "stream_end" | null
  >(null);
  const [nullalisNarrationFrame, setNullalisNarrationFrame] =
    useState<NullalisNarrationFrame | null>(null);
  const [nullalisTranscriptEntries, setNullalisTranscriptEntries] = useState<
    NullalisTranscriptEntry[]
  >([]);
  const [nullalisTaskItems, setNullalisTaskItems] = useState<NullalisTaskItem[]>([]);
  const [agentTaskSnapshots, setAgentTaskSnapshots] = useState<NullalisTaskItem[]>([]);
  const [, setAgentTasksLoading] = useState(false);
  const [, setAgentTasksError] = useState<string | null>(null);
  const [agentCronJobs, setAgentCronJobs] = useState<AgentInspectorCronJob[]>([]);
  const [agentCronLoading, setAgentCronLoading] = useState(false);
  const [agentCronError, setAgentCronError] = useState<string | null>(null);
  const [agentJobs, setAgentJobs] = useState<AgentInspectorJob[]>([]);
  const [agentJobsLoading, setAgentJobsLoading] = useState(false);
  const [agentJobsError, setAgentJobsError] = useState<string | null>(null);
  const [agentArtifactSnapshots, setAgentArtifactSnapshots] = useState<AgentInspectorArtifact[]>([]);
  const [agentArtifactScope, setAgentArtifactScope] = useState<"session" | "recent">("session");
  const [agentArtifactsLoading, setAgentArtifactsLoading] = useState(false);
  const [agentArtifactsError, setAgentArtifactsError] = useState<string | null>(null);
  const [, setAgentExtensionDiagnostics] =
    useState<AgentExtensionDiagnosticsResponse | null>(null);
  const [, setAgentExtensionDiagnosticsLoading] = useState(false);
  const [, setAgentExtensionDiagnosticsError] = useState<string | null>(null);
  const [nullalisApprovalRequest, setNullalisApprovalRequest] =
    useState<NullalisApprovalRequest | null>(null);
  // Paywall card: shown when a billing denial fires (insufficient_units /
  // entitlement_inactive / access_expired). Mirrors the approval-card pattern.
  const [paywallCardData, setPaywallCardData] = useState<{
    state: PaywallState;
    planLabel?: string;
    remaining?: number;
    effectiveRemaining?: number;
    requiredUnits?: number;
    constraint?: string | null;
    rollingWindowPercent?: number | null;
    rollingWindowHours?: number | null;
    resetAt?: string | null;
    message: string;
    // WP-B2 limit-state fields.
    identity?: PaywallIdentity;
    limitPeriod?: "day" | "week" | null;
    limitUsed?: number | null;
    limitTotal?: number | null;
    promptPreserved?: boolean;
  } | null>(null);
  const [, setApprovalContinuationPendingId] = useState<string | null>(null);
  const [agentArtifactEventCount, setAgentArtifactEventCount] = useState(0);
  const [nullalisContextGauge, setNullalisContextGauge] =
    useState<ContextGaugeData | null>(null);
  const [, setNullalisContextReport] =
    useState<AgentSessionContext | null>(null);
  const [zakiUsageSummary, setZakiUsageSummary] = useState<ZakiUsageSummary | null>(null);
  const [freeDailyQuota, setFreeDailyQuota] = useState<{
    unlimited: boolean;
    limit: number | null;
    used: number;
    remaining: number | null;
    resetAt: string | null;
    surface: UsageQuotaSurface;
    bucket: string | null;
    period?: "day" | "week" | string | null;
  } | null>(null);
  const [responseFormattingConfig, setResponseFormattingConfig] =
    useState<ResponseFormattingConfig>(() => readResponseFormattingConfig());
  const historyLoadedRef = useRef<Record<string, boolean>>({});
  const [isBotHistoryLoading, setIsBotHistoryLoading] = useState(false);
  const [agentHistoryHydratedThreadId, setAgentHistoryHydratedThreadId] =
    useState<string | null>(null);
  const currentTurnAssistantIdRef = useRef<string | null>(null);
  const prevIsStreamingRef = useRef(false);
  const [localTurnSnapshots, setLocalTurnSnapshots] = useState<
    Record<string, NullalisTranscriptEntry[]>
  >({});
  const [firstMessageTransition, setFirstMessageTransition] = useState(false);
  // Query mode is a Spaces-only feature.
  //   - InputArea hides the toggle button in zakiBotMode (only renders
  //     in the non-zakiBotMode branch of the plus menu).
  //   - InputArea hides the active pill via `!zakiBotMode && queryModeEnabled`.
  //   - The agent stream body never includes the `mode` field — see the
  //     `isZakiAgentSpace ? agentBody : spacesBody` branch in handleSend.
  // The state stays at the ChatArea level so toggling in Spaces is
  // remembered across route switches; it's intentional that the value
  // can persist while invisible. Wire path is gated, so a ghost true
  // never reaches the agent.
  const [queryModeEnabled, setQueryModeEnabled] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const agentCancelInFlightRef = useRef(false);
  const zakiBotProcessClearTimerRef = useRef<number | null>(null);
  const zakiBotProvisionedRef = useRef(false);
  const zakiBotProvisionPromiseRef = useRef<Promise<boolean> | null>(null);
  const zakiBotProvisionGenerationRef = useRef(0);
  const lastAgentHistoryReconcileThreadRef = useRef<string | null>(null);
  const [zakiBotProvisionReady, setZakiBotProvisionReady] = useState(false);
  const [zakiBotProvisionState, setZakiBotProvisionState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [zakiBotProvisionError, setZakiBotProvisionError] = useState<string | null>(null);
  const [sessionModePending, setSessionModePending] = useState(false);
  const [agentDefaultAutonomy, setAgentDefaultAutonomy] =
    useState<AgentDefaultAutonomy>("supervised");
  const [agentDefaultReasoningEffort, setAgentDefaultReasoningEffort] =
    useState<AgentDefaultReasoningEffort>("high");
  const [selectedAgentArtifact, setSelectedAgentArtifact] =
    useState<AgentInspectorArtifact | null>(null);
  const [agentInspectorOpen, setAgentInspectorOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(AGENT_INSPECTOR_OPEN_KEY) !== "false";
  });
  const [agentInspectorTabRequest, setAgentInspectorTabRequest] =
    useState<AgentInspectorTabRequest | null>(null);
  const [agentMobileInspectorOpen, setAgentMobileInspectorOpen] = useState(false);
  const [agentMobileViewport, setAgentMobileViewport] = useState(false);
  const agentMobileInspectorRef = useRef<HTMLDivElement | null>(null);
  const agentMobileInspectorCloseRef = useRef<HTMLButtonElement | null>(null);
  const agentMobileInspectorReturnFocusRef = useRef<HTMLElement | null>(null);
  const [agentFocusMode, setAgentFocusMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(AGENT_FOCUS_MODE_KEY) === "true";
  });
  const approvalSeenBySessionRef = useRef<Record<string, Set<string>>>({});

  // Canonical user ID for agent/nullalis routing (resolved from BFF).
  // Seed from sessionStorage so context gauge / approval work on fast re-mount.
  const [agentUserId, setAgentUserId] = useState<string | null>(
    () => sessionStorage.getItem("zaki:agentUserId")
  );
  const isZakiBotRouteActive = isZakiBotSpaceId(activeWorkspaceSlug);
  const activeZakiSessionKey = useMemo(() => {
    const stored = String(zakiSessionKey || "").trim();
    if (stored) return normalizeZakiSessionKey(stored);
    if (!isZakiBotSpaceId(activeWorkspaceSlug) || !activeThreadId) return null;
    return buildAgentSessionKey(activeThreadId, agentUserId);
  }, [activeThreadId, activeWorkspaceSlug, agentUserId, zakiSessionKey]);
  const normalizedActiveZakiSessionKey = activeZakiSessionKey
    ? normalizeZakiSessionKey(activeZakiSessionKey)
    : null;
  const {
    data: zakiSessions = [],
    isLoading: zakiSessionsLoading,
    isError: zakiSessionsError,
    refetch: refetchZakiSessions,
  } =
    useZakiSessions(isZakiBotRouteActive);
  const activeSessionRecord = useMemo(
    () =>
      normalizedActiveZakiSessionKey
        ? zakiSessions.find(
            (session) =>
              normalizeZakiSessionKey(session.session_key) === normalizedActiveZakiSessionKey
          ) ?? null
        : null,
    [normalizedActiveZakiSessionKey, zakiSessions]
  );
  const activeSessionUi = useZakiSessionUiStore(
    useCallback(
      (state) =>
        normalizedActiveZakiSessionKey ? state.sessions[normalizedActiveZakiSessionKey] : undefined,
      [normalizedActiveZakiSessionKey]
    )
  );
  const activeContextSessionKeyRef = useRef<string | null>(
    isZakiBotRouteActive ? normalizedActiveZakiSessionKey : null
  );
  const activeContextGenerationRef = useRef(0);
  useEffect(() => {
    const nextKey = isZakiBotRouteActive ? normalizedActiveZakiSessionKey : null;
    const previousKey = activeContextSessionKeyRef.current;
    activeContextSessionKeyRef.current = nextKey;
    activeContextGenerationRef.current += 1;
    if (previousKey && previousKey !== nextKey) {
      setNullalisContextGauge(null);
      setNullalisContextReport(null);
    }
  }, [isZakiBotRouteActive, normalizedActiveZakiSessionKey]);
  const ensureZakiSessionUi = useZakiSessionUiStore((state) => state.ensureSession);
  const hydrateSessionUi = useZakiSessionUiStore((state) => state.hydrateSession);
  const setZakiSessionModeUi = useZakiSessionUiStore((state) => state.setMode);
  const incrementSessionApprovalCount = useZakiSessionUiStore(
    (state) => state.incrementApprovalCount
  );
  const decrementSessionApprovalCount = useZakiSessionUiStore(
    (state) => state.decrementApprovalCount
  );
  const setSessionContextPressure = useZakiSessionUiStore((state) => state.setContextPressure);
  const setSessionBrowserFrame = useZakiSessionUiStore((state) => state.setBrowserFrame);
  const setZakiSandboxState = useZakiSessionUiStore((state) => state.setSandbox);
  const sandboxState = useZakiSessionUiStore((s) => s.sandbox);
  const liveBrowserFrame = activeSessionUi?.browserFrame ?? null;
  const hasLiveBrowserFrame = Boolean(liveBrowserFrame?.frame?.trim());
  const closeLiveBrowserFrame = useCallback(() => {
    const sessionKey =
      activeZakiSessionKey ||
      buildAgentSessionKey(activeThreadId || "main", agentUserId);
    if (sessionKey) {
      setSessionBrowserFrame(sessionKey, null);
    }
  }, [activeThreadId, activeZakiSessionKey, agentUserId, setSessionBrowserFrame]);
  const closeAgentMobilePanel = useCallback(() => {
    if (hasLiveBrowserFrame && !agentMobileInspectorOpen) {
      closeLiveBrowserFrame();
      return;
    }
    setAgentMobileInspectorOpen(false);
  }, [agentMobileInspectorOpen, closeLiveBrowserFrame, hasLiveBrowserFrame]);
  const activeSessionMode =
    activeSessionUi?.mode ??
    (activeSessionRecord?.mode === "plan" ||
    activeSessionRecord?.mode === "execute" ||
    activeSessionRecord?.mode === "review"
      ? activeSessionRecord.mode
      : null);
  const isActiveZakiSessionLive = Boolean(
    isStreaming || activeSessionUi?.live || activeSessionRecord?.live
  );
  const powerUserPendingApprovals = useMemo(() => {
    const pending = activeSessionUi?.pendingApprovals ?? [];
    if (!nullalisApprovalRequest?.id) return pending;
    return pending.some((approval) => approval.id === nullalisApprovalRequest.id)
      ? pending
      : [nullalisApprovalRequest, ...pending];
  }, [activeSessionUi?.pendingApprovals, nullalisApprovalRequest]);
  const deletedAgentSessionKeysRef = useRef<Set<string>>(readDeletedAgentSessionKeys());
  const [agentDraftSessions, setAgentDraftSessions] = useState<AgentSession[]>([]);
  const zakiThreadSessions = useMemo(
    () => {
      const byKey = new Map<string, AgentSession>();
      for (const session of [...agentDraftSessions, ...zakiSessions]) {
        const normalizedSessionKey = normalizeZakiSessionKey(session.session_key);
        if (!isThreadLaneZakiSessionKey(normalizedSessionKey)) continue;
        if (deletedAgentSessionKeysRef.current.has(normalizedSessionKey)) continue;
        const parsedSessionKey = parseZakiSessionKey(normalizedSessionKey);
        const isEmptyDefaultThread =
          parsedSessionKey.threadId === ZAKI_BOT_THREAD_ID &&
          session.message_count === 0 &&
          session.live !== true &&
          !session.pending_approval_count;
        if (isEmptyDefaultThread) continue;
        const existing = byKey.get(normalizedSessionKey);
        const nextSession = { ...session, session_key: normalizedSessionKey };
        if (
          existing?.title &&
          isRepairableZakiSessionTitle({
            sessionKey: normalizedSessionKey,
            title: nextSession.title,
            createdAt: nextSession.created_at ?? nextSession.last_active ?? null,
          })
        ) {
          nextSession.title = existing.title;
        }
        byKey.set(normalizedSessionKey, nextSession);
      }
      return Array.from(byKey.values()).sort((a, b) => {
        const aTime = parseZakiSessionTimestampMs(a.last_active ?? a.created_at);
        const bTime = parseZakiSessionTimestampMs(b.last_active ?? b.created_at);
        if (aTime !== bTime) return bTime - aTime;
        return normalizeZakiSessionKey(a.session_key).localeCompare(
          normalizeZakiSessionKey(b.session_key)
        );
      });
    },
    [agentDraftSessions, zakiSessions]
  );

  // Memory state for the simplified normal-chat capture flow
  const [recentSavedMemories, setRecentSavedMemories] = useState<
    MemoryCaptureResponse["saved"]
  >([]);
  const [recentSupersededCount, setRecentSupersededCount] = useState(0);
  const [recentDuplicateCount, setRecentDuplicateCount] = useState(0);
  const [memoryToastSource, setMemoryToastSource] = useState<"chat" | "import">("chat");
  const [showMemoryToast, setShowMemoryToast] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memoryToastUndoError, setMemoryToastUndoError] = useState<string | null>(null);
  const [memoryToastPartialUndoCount, setMemoryToastPartialUndoCount] = useState(0);
  const lastMemoryRequestRef = useRef<{ message: string; threadId?: string } | null>(null);
  const autoDismissTimerRef = useRef<number | null>(null);
  const [isUndoingMemoryToast, setIsUndoingMemoryToast] = useState(false);
  const memoryInFlightRef = useRef(false);
  const queuedMemoryCheckRef = useRef<{ message: string; threadId?: string } | null>(null);
  const memoryStatusHydratedRef = useRef(false);
  const lastMemoryStatusSyncAtRef = useRef(0);
  const pendingSessionSummaryRef = useRef<{
    threadId: string;
    queuedAt: number;
  } | null>(null);
  const sessionSummaryCueKeyRef = useRef<string | null>(null);
  const authLoading = useAuthStore((s) => s.isLoading);
  const authUser = useAuthStore((s) => s.user);
  const authUserId = useMemo(() => {
    const fallbackEmail =
      typeof authUser === "object" && authUser !== null
        ? String((authUser as { email?: string }).email || "")
        : "";
    return String(authUser?.username || fallbackEmail).trim().toLowerCase();
  }, [authUser]);
  const isAuthReady = !authLoading && Boolean(authUserId);
  // Billing state — read here so the paywall card can surface plan/usage data
  // without an extra fetch when the error handler fires.
  const { data: entitlementsResult } = useEntitlements();
  const { data: meterResult } = useMeterStatus();
  const [memoryImportOpen, setMemoryImportOpen] = useState(false);
  const [botOnboarding, setBotOnboarding] = useState<BotOnboardingState | null>(null);
  const [firstRunPhase, setFirstRunPhase] = useState<FirstRunCeremonyPhase>("idle");
  const [firstRunError, setFirstRunError] = useState<string | null>(null);
  const firstRunStartedRef = useRef<string | null>(null);
  const firstRunNamingCheckpointRef = useRef<{ key: string; name: string } | null>(null);
  const [activationProgress, setActivationProgress] = useState<ActivationProgress>({
    firstMessageSent: false,
    firstMemorySaved: false,
    completed: false,
  });
  
  useEffect(() => {
    if (!authUserId) {
      setActivationProgress({
        firstMessageSent: false,
        firstMemorySaved: false,
        completed: false,
      });
      return;
    }
    setActivationProgress(getActivationProgress(authUserId));
  }, [authUserId]);

  useEffect(() => {
    const syncResponseFormattingConfig = () => {
      setResponseFormattingConfig(readResponseFormattingConfig());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "zaki.responseFormattingConfig") return;
      syncResponseFormattingConfig();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(RESPONSE_FORMATTING_EVENT, syncResponseFormattingConfig);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(RESPONSE_FORMATTING_EVENT, syncResponseFormattingConfig);
    };
  }, [queryClient]);

  // UI state
  const [dragActive, setDragActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [createSpaceInitialValues, setCreateSpaceInitialValues] = useState<
    { name?: string; description?: string; instructions?: string } | null
  >(null);
  const [editInstructionsOpen, setEditInstructionsOpen] = useState(false);
  const [editInstructionsValue, setEditInstructionsValue] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputOffset, setInputOffset] = useState(0);
  const [inputHeight, setInputHeight] = useState(0);
  const [inputLeft, setInputLeft] = useState(0);
  const [inputWidth, setInputWidth] = useState(0);
  const [inputTop, setInputTop] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  // Spaces state
  const [spacesList, setSpacesList] = useState<Space[]>([]);
  const [editSpaceId, setEditSpaceId] = useState<string | null>(null);
  const [fileUploadSpaceId, setFileUploadSpaceId] = useState<string | null>(null);
  const [acceptedWorkspaceTypes, setAcceptedWorkspaceTypes] = useState<Record<string, string[]>>(
    {}
  );
  const [acceptedWorkspaceHint, setAcceptedWorkspaceHint] = useState("");

  const toastPosition = useMemo(() => {
    const left = inputWidth ? inputLeft : 16;
    const width =
      inputWidth ||
      Math.min(Math.max(viewportWidth - 32, 280), 896);
    const hasInputMetrics = inputWidth > 0 && inputTop > 0;
    const gap = 8;
    const bottom = hasInputMetrics
      ? Math.max(24, viewportHeight - inputTop + gap)
      : 24;
    return { left, width, bottom };
  }, [inputLeft, inputTop, inputWidth, viewportHeight, viewportWidth]);

  useEffect(() => {
    if (showZakiHome && sidebarMode === "zaki") return;
    let cancelled = false;
    void apiRequest("/api/documents/accepted-file-types")
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json().catch(() => ({}))) as {
          types?: Record<string, string[]>;
        };
        if (cancelled) return;
        const nextTypes = data.types && typeof data.types === "object" ? data.types : {};
        setAcceptedWorkspaceTypes(nextTypes);
        setAcceptedWorkspaceHint(formatAcceptedTypeHint(nextTypes));
      })
      .catch(() => {
        // Best-effort only.
      });
    return () => {
      cancelled = true;
    };
  }, [showZakiHome, sidebarMode]);


  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  // 2026-05-08 — Imperative handle for InputArea so quick-reply chips
  // (rendered up in ChatView) can route through the same submitMessage
  // pipeline that InputArea owns. Without this, quick-reply skipped the
  // per-turn toggle reset and could send privately when the user had
  // armed privacy for a different turn.
  const composerHandleRef = useRef<InputAreaHandle | null>(null);
  const replayedPendingIntentKeyRef = useRef<string | null>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dragCounter = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const prevMessageCount = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const botAttachmentPickRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const composerQuickReplyRevealTimerRef = useRef<number | null>(null);
  const composerQuickReplyHideTimerRef = useRef<number | null>(null);
  const spacesListRef = useRef<Space[]>([]);
  const autoTitleAttemptsRef = useRef<Record<string, number>>({});
  const autoTitleFinalizedRef = useRef<Record<string, boolean>>({});
  const autoTitleInFlightRef = useRef<Record<string, boolean>>({});
  // Same pattern, scoped per ZAKI sessionKey instead of (spaceId, threadId).
  const autoTitleSessionAttemptsRef = useRef<Record<string, number>>({});
  const autoTitleSessionFinalizedRef = useRef<Record<string, boolean>>({});
  const autoTitleSessionInFlightRef = useRef<Record<string, boolean>>({});
  const sessionTitleRepairInFlightRef = useRef<Record<string, boolean>>({});
  const sessionTitleRepairFinalizedRef = useRef<Record<string, boolean>>({});

  const measureInputMetrics = useCallback(() => {
    if (typeof window !== "undefined") {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      setViewportWidth((prev) => (prev === nextWidth ? prev : nextWidth));
      setViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    }

    const inputEl = inputWrapRef.current;
    if (!inputEl) return;
    const target = inputEl.querySelector<HTMLElement>(".zaki-input-form") ?? inputEl;
    const rect = target.getBoundingClientRect();
    setInputHeight(rect.height);
    setInputLeft(rect.left);
    setInputWidth(rect.width);
    setInputTop(rect.top);
  }, []);

  // Computed values
  const messages = activeThreadId ? messagesByThread[activeThreadId] ?? [] : [];
  const primarySpace = spacesList[0] ?? null;
  const isZakiBotActiveSpace = isZakiBotSpaceId(activeWorkspaceSlug);
  const zakiApprovalCount = isZakiBotActiveSpace
    ? Math.max(
        activeSessionUi?.approvalCount ?? activeSessionRecord?.pending_approval_count ?? 0,
        powerUserPendingApprovals.length
      )
    : 0;
  const isAgentSurface =
    isZakiBotActiveSpace && !showZakiHome && !showAbout && !showSpacesView && !showSpaceDetail;
  const isAgentMobilePanelOpen = Boolean(
    isAgentSurface &&
      agentMobileViewport &&
      (agentMobileInspectorOpen || hasLiveBrowserFrame) &&
      !agentFocusMode
  );
  const isAnonymousSpacesActive =
    !authUserId &&
    !isZakiBotActiveSpace &&
    (!activeWorkspaceSlug || activeWorkspaceSlug === ANONYMOUS_SPACES_WORKSPACE_ID);
  const quotaSurface: UsageQuotaSurface = isZakiBotActiveSpace ? "zaki_bot" : "app_chat";
  const activeSpace =
    spacesList.find((space) => space.id === activeWorkspaceSlug) ??
    (isZakiBotActiveSpace
      ? {
          id: ZAKI_BOT_SPACE_ID,
          title: ZAKI_BOT_LABEL,
          description: "",
          icon: "sparkles",
          threads: [createZakiBotThread()],
        }
      : null);
  const activeThread =
    activeSpace?.threads?.find((thread) => thread.id === activeThreadId) ??
    (isZakiBotActiveSpace && activeThreadId === ZAKI_BOT_THREAD_ID
      ? createZakiBotThread()
      : null);
  const isMemoryPipelineEnabled = !isZakiBotActiveSpace;
  const showReady = (!activeThreadId || messages.length === 0) && !isZakiBotActiveSpace;

  // Resolve the canonical agent user ID from the BFF on first load
  useEffect(() => {
    if (!isAuthReady || !isZakiBotActiveSpace) return;
    let cancelled = false;
    void fetchAgentMe({ redirectOnAuthFailure: false })
      .then(({ data }) => {
        if (!cancelled && data?.userId) {
          setAgentUserId(data.userId);
          try { sessionStorage.setItem("zaki:agentUserId", data.userId); } catch {}
        }
      })
      .catch(() => {
        // non-critical — session key just won't resolve until next attempt
      });
    return () => { cancelled = true; };
  }, [isAuthReady, isZakiBotActiveSpace]);

  useEffect(() => {
    if (!isAuthReady || !isZakiBotActiveSpace) return;
    let cancelled = false;
    void fetchBotSettings()
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok || data?.error) {
          setAgentDefaultAutonomy("supervised");
          setAgentDefaultReasoningEffort("high");
          return;
        }
        const autonomy = data?.autonomy;
        setAgentDefaultAutonomy(
          autonomy === "read_only" || autonomy === "supervised" || autonomy === "full"
            ? autonomy
            : "supervised"
        );
        setAgentDefaultReasoningEffort(
          assistantModeToReasoningEffort(data?.assistant_mode)
        );
      })
      .catch(() => {
        if (cancelled) return;
        setAgentDefaultAutonomy("supervised");
        setAgentDefaultReasoningEffort("high");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, isZakiBotActiveSpace]);

  useEffect(() => {
    if (!isZakiBotActiveSpace || !activeThreadId || !agentUserId) return;
    const canonicalKey = buildAgentSessionKey(activeThreadId, agentUserId);
    if (!canonicalKey) return;
    const normalizedCanonicalKey = normalizeZakiSessionKey(canonicalKey);
    const hasExistingSession = zakiSessions.some(
      (session) => normalizeZakiSessionKey(session.session_key) === normalizedCanonicalKey
    );
    const hasDraftSession = agentDraftSessions.some(
      (session) => normalizeZakiSessionKey(session.session_key) === normalizedCanonicalKey
    );
    const isDefaultEmptyThread =
      activeThreadId === ZAKI_BOT_THREAD_ID &&
      !hasExistingSession &&
      !hasDraftSession &&
      !messagesByThread[activeThreadId]?.length;
    if (deletedAgentSessionKeysRef.current.has(normalizedCanonicalKey)) {
      return;
    }
    ensureZakiSessionUi(normalizedCanonicalKey);
    if (!hasExistingSession && !hasDraftSession && !isDefaultEmptyThread) {
      setAgentDraftSessions((previous) =>
        upsertAgentSession(
          previous,
          buildDraftAgentSession(
            normalizedCanonicalKey,
            new Date().toISOString(),
            activeSessionMode
          )
        )
      );
    }
    if (normalizeZakiSessionKey(zakiSessionKey || "") === normalizedCanonicalKey) return;
    setZakiSessionKey(normalizedCanonicalKey);
  }, [
    activeSessionMode,
    activeThreadId,
    agentDraftSessions,
    agentUserId,
    ensureZakiSessionUi,
    isZakiBotActiveSpace,
    messagesByThread,
    setZakiSessionKey,
    zakiSessions,
    zakiSessionKey,
  ]);

  useEffect(() => {
    if (!normalizedActiveZakiSessionKey) return;
    ensureZakiSessionUi(normalizedActiveZakiSessionKey);
  }, [ensureZakiSessionUi, normalizedActiveZakiSessionKey]);

  useEffect(() => {
    if (!normalizedActiveZakiSessionKey || !activeSessionRecord) return;
    hydrateSessionUi(
      normalizedActiveZakiSessionKey,
      mapAgentSessionToZakiSessionUi(activeSessionRecord)
    );
  }, [activeSessionRecord, hydrateSessionUi, normalizedActiveZakiSessionKey]);

  const hydrateActiveSessionDetail = useCallback(
    async (sessionKey: string) => {
      try {
        const { response, data } = await fetchAgentSession(sessionKey);
        if (!response.ok) return;
        const nextUi = mapAgentSessionToZakiSessionUi(data);
        hydrateSessionUi(sessionKey, nextUi);
        const nextApproval = nextUi.pendingApprovals?.[0] ?? null;
        setNullalisApprovalRequest(nextApproval ?? null);
      } catch {
        // best effort only
      }
    },
    [hydrateSessionUi]
  );

  useEffect(() => {
    if (!isZakiBotActiveSpace || !normalizedActiveZakiSessionKey || !zakiBotProvisionReady) return;
    if (zakiSessionsLoading) return;
    void hydrateActiveSessionDetail(normalizedActiveZakiSessionKey);
  }, [
    hydrateActiveSessionDetail,
    isZakiBotActiveSpace,
    normalizedActiveZakiSessionKey,
    zakiBotProvisionReady,
    zakiSessionsLoading,
  ]);

  useEffect(() => {
    if (!isZakiBotActiveSpace) return;
    let cancelled = false;
    void (async () => {
      try {
        const { response, data } = await fetchBotRuntimeStatus();
        if (cancelled) return;
        if (!response.ok) {
          setZakiSandboxState(null);
          return;
        }
        setZakiSandboxState({
          enabled: Boolean(data?.sandbox?.enabled),
          backend: data?.sandbox?.backend ?? null,
        });
      } catch {
        if (!cancelled) {
          setZakiSandboxState(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isZakiBotActiveSpace, setZakiSandboxState]);
  const headerThreadName = activeThread?.label || chatCopy.newChat;

  // The legacy daily count is anonymous-only now: authenticated users are metered by the pooled
  // unit wallet (single source of truth), so the daily bucket must not drive their send-lock or
  // the "Daily usage" badge. Anonymous users have no wallet, so they keep it.
  const legacyQuotaInfo =
    !authUserId &&
    !isZakiBotActiveSpace &&
    freeDailyQuota &&
    !freeDailyQuota.unlimited &&
    typeof freeDailyQuota.limit === "number"
      ? {
          limit: freeDailyQuota.limit,
          remaining: Math.max(
            0,
            Number(freeDailyQuota.remaining ?? freeDailyQuota.limit)
          ),
        }
      : null;
  const agentContextPercent = isZakiBotActiveSpace
    ? resolveContextGaugePercent(nullalisContextGauge) ?? null
    : null;
  const agentCompactionNudgePercent = isZakiBotActiveSpace
    ? nullalisContextGauge?.compaction?.nudgePercent ?? null
    : null;
  const agentTaskItems = useMemo(
    () => mergeNullalisTaskItems(agentTaskSnapshots, nullalisTaskItems),
    [agentTaskSnapshots, nullalisTaskItems]
  );
  const agentCurrentTaskItems = useMemo(
    () => activeAgentTaskItems(agentTaskItems),
    [agentTaskItems]
  );
  const agentInspectorTranscriptEntries = useMemo(() => {
    return selectAgentInspectorTranscriptEntries({
      liveEntries: nullalisTranscriptEntries,
      localTurnSnapshots,
      messages,
    });
  }, [localTurnSnapshots, messages, nullalisTranscriptEntries]);
  const weeklyUsagePercent = getUsagePercent({
    used: meterResult?.data?.weekly?.used,
    limit: meterResult?.data?.weekly?.limit,
  });
  const weeklyUsagePercentRounded = getRoundedUsagePercent(weeklyUsagePercent);
  const agentAvailability = isZakiBotActiveSpace
    ? meterResult?.data?.availableNow?.agent ?? null
    : null;
  const agentComposerUsageState = buildAgentComposerUsageState({
    isAgentActive: isZakiBotActiveSpace,
    availability: agentAvailability,
  });
  const agentCapacityBlocked = agentComposerUsageState.locked;
  const isExistingSignedInAgentThread =
    isZakiBotActiveSpace && Boolean(authUserId) && Boolean(activeThreadId);
  const isActiveAgentHistoryHydrated =
    !isExistingSignedInAgentThread ||
    Boolean(
      activeThreadId &&
        (historyLoadedRef.current[activeThreadId] ||
          agentHistoryHydratedThreadId === activeThreadId)
    );
  const isAgentComposerBootstrapping =
    isExistingSignedInAgentThread &&
    (!isAuthReady ||
      zakiSessionsLoading ||
      !agentUserId ||
      isBotHistoryLoading ||
      !isActiveAgentHistoryHydrated);
  const agentWeeklyLabel =
    typeof meterResult?.data?.weekly?.limit === "number"
      ? t("agent.status.weeklyUsageValue", {
          percent: weeklyUsagePercentRounded,
          defaultValue: formatUsagePercentLabel(weeklyUsagePercent),
        })
      : freeDailyQuota?.unlimited
        ? t("agent.status.weeklyIncluded", { defaultValue: "Included" })
        : t("agent.status.weeklySyncing", { defaultValue: "Syncing" });
  const spacesSendLocked = isSpacesSendLocked({
    isAuthenticated: Boolean(authUserId),
    weekly: meterResult?.data?.weekly ?? null,
    legacyRemaining: legacyQuotaInfo?.remaining ?? null,
  });
  const isZakiBotSendLocked = isZakiBotActiveSpace
    ? agentCapacityBlocked ||
      isAgentComposerBootstrapping ||
      (Boolean(authUserId) && zakiBotProvisionState !== "ready")
    : spacesSendLocked;
  const isComposerSendLocked = !isOnline || isZakiBotSendLocked;
  const latestAssistantMessageContent = useMemo(() => {
    const latestAssistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");
    return String(latestAssistant?.content || "");
  }, [messages]);
  const latestReplyMessage = messages[messages.length - 1];
  const latestAssistantForQuickReply =
    latestReplyMessage?.role === "assistant" &&
    String(latestReplyMessage.content || "").trim()
      ? latestReplyMessage
      : null;
  const composerQuickReplyItems = useMemo<QuickReplyItem[] | undefined>(() => {
    if (!isZakiBotActiveSpace || !latestAssistantForQuickReply) return undefined;

    const snapshot = localTurnSnapshots[latestAssistantForQuickReply.id];
    const turnEvents = (latestAssistantForQuickReply as {
      turnEvents?: Array<{ eventType: string; payload: Record<string, unknown>; ts?: number }>;
    }).turnEvents;
    const entries = snapshot?.length
      ? snapshot
      : Array.isArray(turnEvents)
        ? turnEvents
          .map((event) =>
            extractNullalisTranscriptEntry(
              event.eventType,
              event.payload ?? {},
              typeof event.ts === "number" ? event.ts : Date.now()
            )
          )
          .filter((entry): entry is NullalisTranscriptEntry => Boolean(entry))
        : nullalisTranscriptEntries;

    return buildAgentQuickReplyItems({
      message: latestAssistantForQuickReply,
      entries,
    });
  }, [
    isZakiBotActiveSpace,
    latestAssistantForQuickReply,
    localTurnSnapshots,
    nullalisTranscriptEntries,
  ]);
  const showComposerQuickReplies =
    isZakiBotActiveSpace &&
    Boolean(latestAssistantForQuickReply) &&
    !isStreaming &&
    composerQuickReplyTriggerId === latestAssistantForQuickReply?.id &&
    Boolean(composerQuickReplyItems?.length);
  const handleQuickReply = useCallback(
    (prefill: string) => {
      if (isComposerSendLocked) return;
      composerHandleRef.current?.submitWith(prefill);
    },
    [isComposerSendLocked]
  );
  useEffect(() => {
    if (composerQuickReplyRevealTimerRef.current) {
      window.clearTimeout(composerQuickReplyRevealTimerRef.current);
      composerQuickReplyRevealTimerRef.current = null;
    }
    if (composerQuickReplyHideTimerRef.current) {
      window.clearTimeout(composerQuickReplyHideTimerRef.current);
      composerQuickReplyHideTimerRef.current = null;
    }
    setComposerQuickReplyVisible(false);
    if (!composerQuickReplyTriggerId) return;

    composerQuickReplyRevealTimerRef.current = window.setTimeout(() => {
      setComposerQuickReplyVisible(true);
    }, 1000);
    composerQuickReplyHideTimerRef.current = window.setTimeout(() => {
      setComposerQuickReplyVisible(false);
    }, 6000);

    return () => {
      if (composerQuickReplyRevealTimerRef.current) {
        window.clearTimeout(composerQuickReplyRevealTimerRef.current);
        composerQuickReplyRevealTimerRef.current = null;
      }
      if (composerQuickReplyHideTimerRef.current) {
        window.clearTimeout(composerQuickReplyHideTimerRef.current);
        composerQuickReplyHideTimerRef.current = null;
      }
    };
  }, [composerQuickReplyTriggerId]);
  const zakiBotProcessSnapshot = useMemo<ZakiProcessSnapshot>(() => {
    return buildZakiProcessSnapshot({
      statusEvents: zakiBotStatusEvents,
      reasoningSummary: null,
      replyStart: zakiBotReplyStart,
      toolCalls: zakiBotToolCalls,
      latestAssistantMessageContent,
      progressTerminalReason: zakiBotProgressTerminalReason,
    });
  }, [
    latestAssistantMessageContent,
    zakiBotProgressTerminalReason,
    zakiBotReplyStart,
    zakiBotStatusEvents,
    zakiBotToolCalls,
  ]);

  const handleCopyMessage = useCallback(async (message: Message) => {
    const content =
      message.role === "assistant"
        ? normalizeAssistantDisplayText(message.content, {
            agentReply: isZakiBotActiveSpace,
          })
        : String(message.content || "");
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      toast.success(chatCopy.copied);
    } catch {
      toast.error(chatCopy.copyFailed);
    }
  }, [chatCopy.copied, chatCopy.copyFailed, isZakiBotActiveSpace]);

  const updateScrollIndicator = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isScrollable = scrollHeight - clientHeight > 120;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 24;
    autoScrollRef.current = atBottom;
    setShowScrollToBottom(isScrollable && !atBottom);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateScrollIndicator);
    return () => window.cancelAnimationFrame(frame);
  }, [messages.length, showZakiHome, showSpacesView, showSpaceDetail, updateScrollIndicator]);

  // Serialize chat for export
  const serializeChat = useCallback(() => {
    return {
      exportedAt: new Date().toISOString(),
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments,
      })),
    };
  }, [messages]);

  // Handle share
  const handleShare = useCallback(() => {
    setShareOpen(true);
  }, []);

  // Handle export
  const handleExport = useCallback(() => {
    try {
      const data = serializeChat();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${headerThreadName.replace(/\s+/g, "_")}_export.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(chatCopy.exported);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : chatCopy.exportFailed);
    } finally {
      setMenuOpen(false);
    }
  }, [chatCopy.exportFailed, chatCopy.exported, headerThreadName, serializeChat]);

  const selectAgentSession = useCallback(
    (sessionKey: string) => {
      const normalized = normalizeZakiSessionKey(sessionKey);
      const threadSlug = extractThreadSlugFromSessionKey(normalized);
      if (!threadSlug) return;
      goToThread(ZAKI_BOT_SPACE_ID, threadSlug, { zakiSessionKey: normalized });
      const agentPath =
        threadSlug === ZAKI_BOT_THREAD_ID
          ? "/agent"
          : `/agent?thread=${encodeURIComponent(threadSlug)}`;
      navigate(agentPath);
    },
    [goToThread, navigate]
  );

  const handleCreateAgentSession = useCallback(
    (options: { showToast?: boolean } = {}) => {
      const nextThreadId = createAnonymousThreadId();
      const sessionUserId = resolveAgentSessionUserId(
        agentUserId,
        normalizedActiveZakiSessionKey
      );
      const nextSessionKey = sessionUserId
        ? buildAgentSessionKey(nextThreadId, sessionUserId)
        : null;
      const timestamp = new Date().toISOString();

      if (nextSessionKey) {
        const normalizedNextSessionKey = normalizeZakiSessionKey(nextSessionKey);
        const draftSession = buildDraftAgentSession(
          normalizedNextSessionKey,
          timestamp,
          activeSessionMode
        );
        forgetDeletedAgentSessionKey(deletedAgentSessionKeysRef.current, normalizedNextSessionKey);
        ensureZakiSessionUi(normalizedNextSessionKey);
        setAgentDraftSessions((previous) => upsertAgentSession(previous, draftSession));
        queryClient.setQueryData(zakiSessionKeys.all, (previous: unknown) =>
          upsertAgentSession(previous, draftSession)
        );
      }

      setMessagesByThread((previous) =>
        previous[nextThreadId] ? previous : { ...previous, [nextThreadId]: [] }
      );
      goToThread(ZAKI_BOT_SPACE_ID, nextThreadId, { zakiSessionKey: nextSessionKey });
      setAttachments([]);
      setNullalisApprovalRequest(null);
      navigate(`/agent?thread=${encodeURIComponent(nextThreadId)}`);
      if (options.showToast !== false) {
        toast.success(
          t("zakiControls.sessionList.newSessionCreated", {
            defaultValue: "New session started",
          })
        );
      }
      return { threadId: nextThreadId, sessionKey: nextSessionKey };
    },
    [
      activeSessionMode,
      agentUserId,
      ensureZakiSessionUi,
      goToThread,
      navigate,
      normalizedActiveZakiSessionKey,
      queryClient,
      t,
    ]
  );

  useEffect(() => {
    if (!isAgentSurface || !normalizedActiveZakiSessionKey) return;
    if (!deletedAgentSessionKeysRef.current.has(normalizedActiveZakiSessionKey)) return;
    const deletedThreadId = extractThreadSlugFromSessionKey(normalizedActiveZakiSessionKey);
    if (deletedThreadId && activeThreadId !== deletedThreadId) return;
    goToThread(ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID, { zakiSessionKey: null });
    setZakiSessionKey(null);
    navigate("/agent", { replace: true });
  }, [
    activeThreadId,
    goToThread,
    isAgentSurface,
    navigate,
    normalizedActiveZakiSessionKey,
    setZakiSessionKey,
  ]);

  const handleDeleteAgentSession = useCallback(
    async (sessionKey: string, label: string) => {
      const normalized = normalizeZakiSessionKey(sessionKey);
      const deletingActiveSession = normalizedActiveZakiSessionKey === normalized;
      try {
        const { response } = await deleteAgentSession(normalized);
        if (!response.ok && response.status !== 404) throw new Error(`delete ${response.status}`);
        rememberDeletedAgentSessionKey(deletedAgentSessionKeysRef.current, normalized);
        setAgentDraftSessions((previous) =>
          removeAgentSession(previous, normalized) as AgentSession[]
        );
        queryClient.setQueryData(zakiSessionKeys.all, (previous: unknown) =>
          removeAgentSession(previous, normalized)
        );
        if (response.ok) {
          void queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
        }
        if (deletingActiveSession) {
          goToThread(ZAKI_BOT_SPACE_ID, ZAKI_BOT_THREAD_ID, { zakiSessionKey: null });
          setZakiSessionKey(null);
          const deletedThreadId = extractThreadSlugFromSessionKey(normalized);
          setMessagesByThread((previous) => {
            const next = { ...previous };
            if (deletedThreadId) {
              delete next[deletedThreadId];
            }
            delete next[ZAKI_BOT_THREAD_ID];
            return next;
          });
          setAttachments([]);
          setNullalisApprovalRequest(null);
          navigate("/agent", { replace: true });
        }
        toast.success(
          t("zakiControls.sessionList.deleteSuccess", {
            defaultValue: "Session deleted.",
            label,
          }),
        );
      } catch {
        toast.error(
          t("zakiControls.sessionList.deleteError", {
            defaultValue: "Couldn't delete the session. Try again.",
          }),
        );
      }
    },
    [goToThread, navigate, normalizedActiveZakiSessionKey, queryClient, setZakiSessionKey, t]
  );

  const handleRenameAgentSession = useCallback(
    async (sessionKey: string, label: string) => {
      const normalized = normalizeZakiSessionKey(sessionKey);
      try {
        const { response } = await renameAgentSession(normalized, label);
        if (!response.ok) throw new Error(`rename ${response.status}`);
        await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
        toast.success(
          t("zakiControls.sessionList.renameSuccess", {
            defaultValue: "Session renamed.",
          }),
        );
      } catch {
        toast.error(
          t("zakiControls.sessionList.renameError", {
            defaultValue: "Couldn't rename the session. Try again.",
          }),
        );
        throw new Error("session_rename_failed");
      }
    },
    [queryClient, t]
  );

  const repairAgentSessionTitles = useCallback(
    async (sessionsToRepair: AgentSession[]) => {
      let changed = false;
      for (const session of sessionsToRepair) {
        const normalized = normalizeZakiSessionKey(session.session_key);
        if (sessionTitleRepairFinalizedRef.current[normalized]) continue;
        if (sessionTitleRepairInFlightRef.current[normalized]) continue;

        sessionTitleRepairInFlightRef.current[normalized] = true;
        try {
          const { response, data } = await fetchAgentSessionHistory(normalized);
          if (!response.ok || !data) {
            sessionTitleRepairFinalizedRef.current[normalized] = true;
            continue;
          }

          const historyPayload = data as {
            messages?: Array<{ role?: string | null; content?: string | null }>;
            history?: Array<{ role?: string | null; content?: string | null }>;
          };
          const historyMessages = Array.isArray(historyPayload.messages)
            ? historyPayload.messages
            : Array.isArray(historyPayload.history)
              ? historyPayload.history
              : [];
          const title = buildZakiSessionRepairTitle(historyMessages);
          if (!title) {
            sessionTitleRepairFinalizedRef.current[normalized] = true;
            continue;
          }

          const { response: renameResponse } = await renameAgentSession(normalized, title);
          if (renameResponse.ok) {
            changed = true;
            sessionTitleRepairFinalizedRef.current[normalized] = true;
          }
        } catch {
          // Best-effort only. The rail still shows the safe neutral label.
        } finally {
          sessionTitleRepairInFlightRef.current[normalized] = false;
        }
      }

      if (changed) {
        await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
      }
    },
    [queryClient]
  );

  const uploadFilesToWorkspace = useCallback(
    async (workspaceSlug: string, files: File[]) => {
      const uploaded: PinnedFile[] = [];
      for (const file of files) {
        const createFormData = () => {
          const formData = new FormData();
          formData.append("file", file);
          return formData;
        };

        let response = await apiRequest(`/workspace/${workspaceSlug}/upload-and-embed`, {
          method: "POST",
          body: createFormData(),
        });

        if (!response.ok) {
          response = await apiRequest(`/workspace/${workspaceSlug}/upload`, {
            method: "POST",
            body: createFormData(),
          });
        }

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            errorData.error || errorData.message || `Failed to upload ${file.name}.`
          );
        }

        const responseData = (await response.json().catch(() => ({}))) as {
          files?: Array<{ name?: string; type?: string; size?: number; status?: "embedded" | "processing" | "failed"; location?: string | null; source?: string | null; title?: string | null }>;
        };
        const normalizedFile = responseData.files?.[0];
        uploaded.push({
          name: normalizedFile?.name || file.name,
          type: normalizedFile?.type || file.type || "document",
          size: Number(normalizedFile?.size || file.size || 0),
          status: normalizedFile?.status || "embedded",
          location: normalizedFile?.location ?? null,
          source: normalizedFile?.source ?? null,
          title: normalizedFile?.title ?? null,
        });
      }
      return uploaded;
    },
    []
  );

  const beginWorkspaceUpload = useCallback(
    (spaceId?: string | null) => {
      const resolvedSpaceId = spaceId ?? activeWorkspaceSlug ?? primarySpace?.id ?? null;
      if (!resolvedSpaceId) {
        toast.error(isRtl ? "اختر مساحة أولًا لإضافة الملفات." : "Select a space before adding files.");
        return;
      }
      if (resolvedSpaceId === ZAKI_BOT_SPACE_ID) {
        // Route to InputArea attachments (chat-level) instead of workspace grounding
        botAttachmentPickRef.current = true;
        fileInputRef.current?.click();
        return;
      }
      setFileUploadSpaceId(resolvedSpaceId);
      fileInputRef.current?.click();
    },
    [activeWorkspaceSlug, isRtl, primarySpace?.id]
  );

  const handleWorkspaceFilesSelected = useCallback(
    (targetSpaceId: string, files: File[]) => {
      if (!targetSpaceId || files.length === 0) return;

      const { valid, invalid } = splitFilesByAcceptedTypes(files, acceptedWorkspaceTypes);
      const existingPinned =
        spacesList.find((space) => space.id === targetSpaceId)?.pinnedFiles ?? [];

      if (invalid.length > 0) {
        const invalidMap = new Map(
          existingPinned.map((file) => [`${file.name}:${file.size}:${file.type}`, file])
        );
        for (const file of invalid) {
          invalidMap.set(`${file.name}:${file.size}:${file.type}`, {
            name: file.name,
            type: file.type || "document",
            size: Number(file.size || 0),
            status: "failed",
            error: chatCopy.unsupportedType(acceptedWorkspaceHint),
          });
        }
        window.dispatchEvent(
          new CustomEvent("zaki:update-space", {
            detail: {
              id: targetSpaceId,
              pinnedFiles: Array.from(invalidMap.values()),
            },
          })
        );
        toast.error(chatCopy.unsupportedUploadToast(acceptedWorkspaceHint));
      }
      if (valid.length === 0) return;

      const processingFiles: PinnedFile[] = valid.map((file) => ({
        name: file.name,
        type: file.type || "document",
        size: Number(file.size || 0),
        status: "processing",
      }));
      const processingMap = new Map(
        existingPinned.map((file) => [`${file.name}:${file.size}:${file.type}`, file])
      );
      for (const file of processingFiles) {
        processingMap.set(`${file.name}:${file.size}:${file.type}`, file);
      }
      window.dispatchEvent(
        new CustomEvent("zaki:update-space", {
          detail: {
            id: targetSpaceId,
            pinnedFiles: Array.from(processingMap.values()),
          },
        })
      );

      void uploadFilesToWorkspace(targetSpaceId, valid)
        .then((uploadedFiles) => {
          const fileMap = new Map(
            existingPinned.map((file) => [`${file.name}:${file.size}:${file.type}`, file])
          );
          for (const file of uploadedFiles) {
            fileMap.set(`${file.name}:${file.size}:${file.type}`, file);
          }
          window.dispatchEvent(
            new CustomEvent("zaki:update-space", {
              detail: {
                id: targetSpaceId,
                pinnedFiles: Array.from(fileMap.values()),
              },
            })
          );
          toast.success(
            uploadedFiles.length === 1
              ? chatCopy.addedFile(uploadedFiles[0]?.name || (isRtl ? "الملف" : "file"))
              : chatCopy.addedFiles(uploadedFiles.length)
          );
        })
        .catch((error) => {
          const failedMap = new Map(
            existingPinned.map((file) => [`${file.name}:${file.size}:${file.type}`, file])
          );
          for (const file of valid) {
            failedMap.set(`${file.name}:${file.size}:${file.type}`, {
              name: file.name,
              type: file.type || "document",
              size: Number(file.size || 0),
              status: "failed",
              error: error instanceof Error ? error.message : chatCopy.uploadFailed,
            });
          }
          window.dispatchEvent(
            new CustomEvent("zaki:update-space", {
              detail: {
                id: targetSpaceId,
                pinnedFiles: Array.from(failedMap.values()),
              },
            })
          );
          toast.error(error instanceof Error ? error.message : chatCopy.unableToUpload);
        });
    },
    [
      acceptedWorkspaceHint,
      acceptedWorkspaceTypes,
      chatCopy,
      isRtl,
      spacesList,
      uploadFilesToWorkspace,
    ]
  );

  // Strip internal context prefixes from user messages (injected by the backend for AI context).
  // The enriched message the engine persists is ordered leading blocks:
  //   [[ZAKI_MEMORY_CONTEXT_V2]]…[[/…]]  then  [[ZAKI_DOC_CONTEXT_V1]]…[[/…]]  then {user message}
  // On history reload the engine returns that enriched content, so strip EACH leading envelope (else the
  // doc block of XML leaks into the user's bubble). Chunk content is sentinel-scrubbed at injection
  // (backend doc-grounding.js), so indexOf(close) lands on the real close, not a forged one in doc text.
  const stripMemoryContext = (content: string): string => {
    const stripLeadingEnvelope = (text: string, open: string, close: string): string => {
      const start = text.indexOf(open);
      const end = text.indexOf(close);
      if (start !== -1 && end !== -1 && end > start) return text.slice(end + close.length);
      return text;
    };
    const afterEnvelopes = stripLeadingEnvelope(
      stripLeadingEnvelope(content, "[[ZAKI_MEMORY_CONTEXT_V2]]", "[[/ZAKI_MEMORY_CONTEXT_V2]]"),
      "[[ZAKI_DOC_CONTEXT_V1]]",
      "[[/ZAKI_DOC_CONTEXT_V1]]"
    );
    if (afterEnvelopes !== content) {
      return afterEnvelopes.trim();
    }

    // Old format: [MEMORY CONTEXT - ...]...[USER MESSAGE]\n{actual message}
    const userMessageMarker = "[USER MESSAGE]\n";
    const memoryContextMarker = "[MEMORY CONTEXT";

    if (content.includes(memoryContextMarker) && content.includes(userMessageMarker)) {
      const userMessageIndex = content.indexOf(userMessageMarker);
      if (userMessageIndex !== -1) {
        return content.slice(userMessageIndex + userMessageMarker.length).trim();
      }
    }

    // New buddy format: [About this person...]...\n---\n\n{actual message}
    const buddyMarker = "[About this person";
    const separator = "\n---\n\n";

    if (content.includes(buddyMarker) && content.includes(separator)) {
      const sepIndex = content.indexOf(separator);
      if (sepIndex !== -1) {
        return content.slice(sepIndex + separator.length).trim();
      }
    }

    return content;
  };

  const normalizeAgentHistoryRole = (
    role: unknown
  ): "user" | "assistant" | null => {
    const normalized = String(role || "").trim().toLowerCase();
    if (normalized === "user" || normalized === "assistant") return normalized;
    return null;
  };

  const sanitizeAgentHistoryContent = (
    role: "user" | "assistant",
    content: string
  ): string => {
    if (role === "assistant") {
      return normalizeAssistantDisplayText(content, { agentReply: true });
    }
    return sanitizeAssistantScaffold(stripMemoryContext(content));
  };

  const mapAgentHistoryEntries = useCallback(
    (entries: Array<Record<string, unknown>> | undefined): Message[] =>
      (entries || [])
        .map((entry, index): Message | null => {
          const role = normalizeAgentHistoryRole(entry.role);
          if (!role) return null;
          const content = String(entry.content || "");
          const turnEvents = Array.isArray((entry as { events?: unknown }).events)
            ? ((entry as { events?: unknown }).events as Array<{
                eventType?: string;
                payload?: Record<string, unknown>;
                ts?: number;
              }>)
                .filter((event) => typeof event?.eventType === "string")
                .map((event) => ({
                  eventType: String(event.eventType),
                  payload: (event.payload ?? {}) as Record<string, unknown>,
                  ts: typeof event.ts === "number" ? event.ts : undefined,
                }))
            : undefined;
          return {
            id: String(entry.id || `bot-history-${index}`),
            role,
            content: sanitizeAgentHistoryContent(role, content),
            createdAt: messageRecordCreatedAtIso(entry),
            turnEvents,
          };
        })
        .filter((message): message is Message => Boolean(message))
        .filter((message) => normalizeMessageContentKey(message.content)),
    []
  );

  const resolveAgentSessionKeyForThread = useCallback(
    (threadId: string) => {
      const safeThreadId = String(threadId || "").trim();
      if (!safeThreadId) return null;
      if (
        normalizedActiveZakiSessionKey &&
        extractThreadSlugFromSessionKey(normalizedActiveZakiSessionKey) === safeThreadId
      ) {
        return normalizedActiveZakiSessionKey;
      }
      return buildAgentSessionKey(safeThreadId, agentUserId);
    },
    [agentUserId, normalizedActiveZakiSessionKey]
  );

  const reconcileAgentThreadHistory = useCallback(
    async (threadId: string, _mode: "merged" | "app" = "merged") => {
      if (!threadId) return false;
      const sessionKey = resolveAgentSessionKeyForThread(threadId);
      if (!sessionKey) return false;
      lastAgentHistoryReconcileThreadRef.current = threadId;
      const { response, data } = await fetchAgentSessionHistory(sessionKey);
      if (!response.ok) return false;
      const rawHistory = Array.isArray(data.messages)
        ? data.messages
        : Array.isArray((data as { history?: unknown }).history)
          ? ((data as { history?: Array<Record<string, unknown>> }).history ?? [])
          : [];
      const history = mapAgentHistoryEntries(
        rawHistory as Array<Record<string, unknown>>
      );
      let changed = false;
      setMessagesByThread((prev) => {
        const merged = mergeAgentThreadMessages(prev[threadId] ?? [], history);
        changed = merged.changed;
        return changed ? { ...prev, [threadId]: merged.messages } : prev;
      });
      historyLoadedRef.current[threadId] = true;
      setAgentHistoryHydratedThreadId(threadId);
      return changed;
    },
    [mapAgentHistoryEntries, resolveAgentSessionKeyForThread]
  );

  const appendAgentAssistantContinuation = useCallback(
    async (threadId: string, content: string) => {
      const trimmed = content.trim();
      if (!threadId || !trimmed) return false;
      const optimisticMessage: Message = {
        id: `approval-continuation-${Date.now()}`,
        role: "assistant",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      let changed = false;
      setMessagesByThread((prev) => {
        const merged = mergeAgentThreadMessages(prev[threadId] ?? [], [optimisticMessage]);
        changed = merged.changed;
        return changed ? { ...prev, [threadId]: merged.messages } : prev;
      });
      historyLoadedRef.current[threadId] = true;
      setAgentHistoryHydratedThreadId(threadId);
      try {
        await reconcileAgentThreadHistory(threadId, "merged");
      } catch {
        // The approval route already returned the continuation. A failed
        // history refresh should not turn a resolved approval back into a
        // retryable card.
      }
      return changed;
    },
    [reconcileAgentThreadHistory]
  );

  const { data: historyData, isLoading: isHistoryLoading } = useMessages(
    isZakiBotActiveSpace || isAnonymousSpacesActive ? null : activeWorkspaceSlug,
    isZakiBotActiveSpace || isAnonymousSpacesActive ? null : activeThreadId
  );

  useEffect(() => {
    if (!isAnonymousSpacesActive || !activeThreadId) return;
    const turns = recoverAnonymousThreadTurnsAfterReload(activeThreadId);
    if (!turns.length) return;
    const hydrated = turns.flatMap<Message>((turn) => [
      {
        id: `anonymous-${turn.id}-user`,
        role: "user",
        content: turn.prompt,
        createdAt: turn.createdAt,
      },
      ...(turn.reply
        ? [
            {
              id: `anonymous-${turn.id}-assistant`,
              role: "assistant" as const,
              content: turn.reply,
              createdAt: turn.updatedAt,
              error: turn.status === "interrupted" || turn.status === "failed",
              errorCode: turn.status === "interrupted" ? "aborted" : null,
            },
          ]
        : []),
    ]);
    setMessagesByThread((previous) =>
      previous[activeThreadId]?.length
        ? previous
        : { ...previous, [activeThreadId]: hydrated }
    );
  }, [activeThreadId, isAnonymousSpacesActive]);

  useEffect(() => {
    spacesListRef.current = spacesList;
  }, [spacesList]);

  // Helper to update assistant message content
  const updateAssistantContent = useCallback((threadSlug: string, assistantId: string, newContent: string) => {
    setMessagesByThread((prev) => {
      const threadMessages = prev[threadSlug] ?? [];
      const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
      if (assistantIndex === -1) return prev;
      const updated = [...threadMessages];
      const existingMsg = updated[assistantIndex];
      if (!existingMsg) return prev;
      updated[assistantIndex] = {
        ...existingMsg,
        content: newContent,
        createdAt: existingMsg.createdAt || new Date().toISOString(),
        error: false,
        errorCode: null,
      };
      return { ...prev, [threadSlug]: updated };
    });
  }, []);

  // Normal Spaces always-agent narration. These mutate per-turn state stored
  // directly on the assistant message object (same pattern as `memorySources`
  // / `turnEvents`). They are NOT used by the nullALIS agent space, which has
  // its own transcript rail.
  const appendAssistantAgentStep = useCallback(
    (threadSlug: string, assistantId: string, step: AgentNarrationStep) => {
      setMessagesByThread((prev) => {
        const threadMessages = prev[threadSlug] ?? [];
        const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
        if (assistantIndex === -1) return prev;
        const existingMsg = threadMessages[assistantIndex];
        if (!existingMsg) return prev;
        const updated = [...threadMessages];
        updated[assistantIndex] = {
          ...existingMsg,
          agentSteps: [...(existingMsg.agentSteps ?? []), step],
          // First step of the turn flips the running flag on.
          agentRunning: true,
        };
        return { ...prev, [threadSlug]: updated };
      });
    },
    []
  );

  const appendAssistantGeneratedFile = useCallback(
    (threadSlug: string, assistantId: string, file: GeneratedFileRef) => {
      setMessagesByThread((prev) => {
        const threadMessages = prev[threadSlug] ?? [];
        const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
        if (assistantIndex === -1) return prev;
        const existingMsg = threadMessages[assistantIndex];
        if (!existingMsg) return prev;
        // De-dupe by storageFilename in case the event repeats.
        const existingFiles = existingMsg.agentFiles ?? [];
        if (existingFiles.some((f) => f.storageFilename === file.storageFilename)) {
          return prev;
        }
        const updated = [...threadMessages];
        updated[assistantIndex] = {
          ...existingMsg,
          agentFiles: [...existingFiles, file],
        };
        return { ...prev, [threadSlug]: updated };
      });
    },
    []
  );

  const setAssistantAgentRunning = useCallback(
    (threadSlug: string, assistantId: string, running: boolean) => {
      setMessagesByThread((prev) => {
        const threadMessages = prev[threadSlug] ?? [];
        const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
        if (assistantIndex === -1) return prev;
        const existingMsg = threadMessages[assistantIndex];
        if (!existingMsg) return prev;
        if ((existingMsg.agentRunning ?? false) === running) return prev;
        const updated = [...threadMessages];
        updated[assistantIndex] = {
          ...existingMsg,
          agentRunning: running,
        };
        return { ...prev, [threadSlug]: updated };
      });
    },
    []
  );

  const updateAssistantError = useCallback(
    (threadSlug: string, assistantId: string, newContent: string, errorCode?: string | null) => {
      setMessagesByThread((prev) => {
        const threadMessages = prev[threadSlug] ?? [];
        const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
        if (assistantIndex === -1) return prev;
        const updated = [...threadMessages];
        const existingMsg = updated[assistantIndex];
        if (!existingMsg) return prev;
        updated[assistantIndex] = {
          ...existingMsg,
          content: existingMsg.content?.trim()
            ? `${existingMsg.content.trim()}\n\n${newContent}`
            : newContent,
          createdAt: existingMsg.createdAt || new Date().toISOString(),
          error: true,
          errorCode: errorCode ?? null,
        };
        return { ...prev, [threadSlug]: updated };
      });
    },
    []
  );

  const getThreadLabel = useCallback((spaceId: string, threadId: string) => {
    const space = spacesListRef.current.find((entry) => entry.id === spaceId);
    const thread = space?.threads?.find((entry) => entry.id === threadId);
    return String(thread?.label || "").trim();
  }, []);

  const getAutoTitleKey = useCallback((spaceId: string, threadId: string) => {
    return `${spaceId}::${threadId}`;
  }, []);

  const applyThreadLabelUpdate = useCallback((spaceId: string, threadId: string, label: string) => {
    queryClient.setQueryData<Space[] | undefined>(spaceKeys.all, (previous) =>
      Array.isArray(previous)
        ? previous.map((space) =>
            space.id === spaceId
              ? {
                  ...space,
                  threads: (space.threads ?? []).map((thread) =>
                    thread.id === threadId ? { ...thread, label } : thread
                  ),
                }
              : space
          )
        : previous
    );
    setSpacesList((prev) =>
      prev.map((space) =>
        space.id === spaceId
          ? {
              ...space,
              threads: (space.threads ?? []).map((thread) =>
                thread.id === threadId ? { ...thread, label } : thread
              ),
            }
          : space
      )
    );
    window.dispatchEvent(
      new CustomEvent("zaki:rename-thread", {
        detail: { id: threadId, spaceId, label },
      })
    );
  }, []);

  const maybeAutoTitleThread = useCallback(
    async (
      spaceId: string,
      threadId: string,
      exchange?: { userMessage: string; assistantMessage: string }
    ) => {
      if (!authUserId) return;
      if (!spaceId || !threadId || isZakiBotSpaceId(spaceId)) return;
      const autoTitleKey = getAutoTitleKey(spaceId, threadId);
      if (autoTitleFinalizedRef.current[autoTitleKey]) return;
      if (autoTitleInFlightRef.current[autoTitleKey]) return;

      const currentLabel = getThreadLabel(spaceId, threadId);
      if (!isDefaultThreadLabel(currentLabel)) {
        autoTitleFinalizedRef.current[autoTitleKey] = true;
        return;
      }

      if (!exchange?.userMessage?.trim() || !exchange?.assistantMessage?.trim()) {
        return;
      }

      const attempts = autoTitleAttemptsRef.current[autoTitleKey] ?? 0;
      if (attempts >= 2) {
        autoTitleFinalizedRef.current[autoTitleKey] = true;
        return;
      }

      autoTitleAttemptsRef.current[autoTitleKey] = attempts + 1;
      autoTitleInFlightRef.current[autoTitleKey] = true;

      try {
        const { response, data } = await autoTitleThread(spaceId, threadId, {
          userMessage: exchange.userMessage.trim(),
          assistantMessage: exchange.assistantMessage.trim(),
          currentLabel,
        });

        if (!response.ok || !data) {
          return;
        }

        if (data.status === "updated" && data.thread?.name) {
          const latestLabel = getThreadLabel(spaceId, threadId);
          if (!isDefaultThreadLabel(latestLabel)) {
            autoTitleFinalizedRef.current[autoTitleKey] = true;
            await queryClient.invalidateQueries({ queryKey: spaceKeys.all });
            return;
          }
          autoTitleFinalizedRef.current[autoTitleKey] = true;
          // The engine can title a thread from the enriched (envelope-wrapped)
          // first message, so sanitize before applying — never leak the marker.
          const cleanedName = stripThreadDisplayName(data.thread.name);
          applyThreadLabelUpdate(
            spaceId,
            threadId,
            isDefaultThreadLabel(cleanedName) ? DEFAULT_THREAD_LABEL : cleanedName
          );
          await queryClient.invalidateQueries({ queryKey: spaceKeys.all });
          return;
        }

        if (data.reason === "not_default_label") {
          autoTitleFinalizedRef.current[autoTitleKey] = true;
          await queryClient.invalidateQueries({ queryKey: spaceKeys.all });
          return;
        }

        if (data.reason !== "generation_failed") {
          autoTitleFinalizedRef.current[autoTitleKey] = true;
        }
      } catch {
        // Best-effort only.
      } finally {
        autoTitleInFlightRef.current[autoTitleKey] = false;
      }
    },
    [applyThreadLabelUpdate, authUserId, getAutoTitleKey, getThreadLabel, queryClient]
  );

  /**
   * ZAKI session auto-title — mirror of maybeAutoTitleThread but scoped
   * by sessionKey. Strips any pinned-context wrapper from the user
   * message before sending so the BE sees the actual question, not the
   * fenced reference block.
   */
  const maybeAutoTitleSession = useCallback(
    async (
      sessionKey: string,
      exchange?: { userMessage: string; assistantMessage: string },
    ) => {
      const normalizedSessionKey = normalizeZakiSessionKey(sessionKey);
      if (!normalizedSessionKey) return;
      if (autoTitleSessionFinalizedRef.current[normalizedSessionKey]) return;
      if (autoTitleSessionInFlightRef.current[normalizedSessionKey]) return;

      const assistantMessage = normalizeAssistantDisplayText(
        exchange?.assistantMessage ?? "",
        { agentReply: true }
      );
      const cleaned = prepareAutoTitleExchange([
        { role: "user", content: exchange?.userMessage ?? "" },
        { role: "assistant", content: assistantMessage },
      ]);
      if (!cleaned) return;

      const attempts = autoTitleSessionAttemptsRef.current[normalizedSessionKey] ?? 0;
      if (attempts >= 2) {
        autoTitleSessionFinalizedRef.current[normalizedSessionKey] = true;
        return;
      }

      autoTitleSessionAttemptsRef.current[normalizedSessionKey] = attempts + 1;
      autoTitleSessionInFlightRef.current[normalizedSessionKey] = true;

      try {
        const { response, data } = await autoTitleAgentSession(normalizedSessionKey, {
          userMessage: cleaned.userMessage,
          assistantMessage: cleaned.assistantMessage,
          currentLabel: "",
        });

        if (!response.ok || !data) return;

        if (data.status === "updated" && data.session?.title) {
          autoTitleSessionFinalizedRef.current[normalizedSessionKey] = true;
          const title = String(data.session.title || "").trim();
          if (title) {
            const applyTitle = (session: AgentSession): AgentSession =>
              normalizeZakiSessionKey(session.session_key) === normalizedSessionKey
                ? { ...session, title }
                : session;
            setAgentDraftSessions((previous) => previous.map(applyTitle));
            queryClient.setQueryData(zakiSessionKeys.all, (previous: unknown) =>
              Array.isArray(previous) ? previous.map(applyTitle) : previous
            );
          }
          await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
          return;
        }

        // BE says "already has a title" — stop retrying.
        if (data.reason === "not_default_label") {
          autoTitleSessionFinalizedRef.current[normalizedSessionKey] = true;
          await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
          return;
        }

        // Don't finalize on a transient generation_failed — the BE
        // pattern lets us retry up to 2x for those.
        if (data.reason !== "generation_failed") {
          autoTitleSessionFinalizedRef.current[normalizedSessionKey] = true;
        }
      } catch {
        // Best-effort only.
      } finally {
        autoTitleSessionInFlightRef.current[normalizedSessionKey] = false;
      }
    },
    [queryClient],
  );

  const updateAssistantSources = useCallback(
    (threadSlug: string, assistantId: string, sources: Array<{ id: string; content: string; type: string }>) => {
      setMessagesByThread((prev) => {
        const threadMessages = prev[threadSlug] ?? [];
        const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
        if (assistantIndex === -1) return prev;
        const updated = [...threadMessages];
        const existingMsg = updated[assistantIndex];
        if (!existingMsg) return prev;
        updated[assistantIndex] = {
          ...existingMsg,
          memorySources: sources,
        };
        return { ...prev, [threadSlug]: updated };
      });
    },
    []
  );

  const updateAssistantDocSources = useCallback(
    (threadSlug: string, assistantId: string, docSources: DocSource[]) => {
      setMessagesByThread((prev) => {
        const threadMessages = prev[threadSlug] ?? [];
        const assistantIndex = threadMessages.findIndex((msg) => msg.id === assistantId);
        if (assistantIndex === -1) return prev;
        const updated = [...threadMessages];
        const existingMsg = updated[assistantIndex];
        if (!existingMsg) return prev;
        updated[assistantIndex] = {
          ...existingMsg,
          docSources,
        };
        return { ...prev, [threadSlug]: updated };
      });
    },
    []
  );

  const clearZakiBotProgressVisuals = useCallback((options?: { preserveNullalisArtifacts?: boolean }) => {
    if (zakiBotProcessClearTimerRef.current) {
      window.clearTimeout(zakiBotProcessClearTimerRef.current);
      zakiBotProcessClearTimerRef.current = null;
    }
    setZakiBotToolCalls([]);
    setZakiBotStatusEvents([]);
    setZakiBotReplyStart(null);
    setZakiBotProgressTerminalReason(null);
    setNullalisNarrationFrame(null);
    if (!options?.preserveNullalisArtifacts) {
      setNullalisTranscriptEntries([]);
      setNullalisTaskItems([]);
      setNullalisApprovalRequest(null);
      setApprovalContinuationPendingId(null);
      setAgentArtifactEventCount(0);
      setZakiUsageSummary(null);
    }
  }, []);

  const refreshContextGauge = useCallback(async () => {
    let requestedSessionKey: string | null = null;
    try {
      if (!isZakiBotRouteActive) return;
      if (!zakiBotProvisionReady) return;
      const sessionKey = activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
      if (!sessionKey) return; // agent user ID not yet resolved
      requestedSessionKey = normalizeZakiSessionKey(sessionKey);
      const refreshGeneration = activeContextGenerationRef.current;
      const { response, data } = await fetchAgentSessionContext(sessionKey);
      if (activeContextGenerationRef.current !== refreshGeneration) {
        return;
      }
      if (
        activeContextSessionKeyRef.current &&
        activeContextSessionKeyRef.current !== requestedSessionKey
      ) {
        return;
      }
      const unavailableCode = contextUnavailableCode(data as Record<string, unknown> | null);
      if (isContextUnavailableCode(unavailableCode)) {
        setSessionContextPressure(sessionKey, null);
        setNullalisContextGauge(null);
        setNullalisContextReport(null);
        return;
      }
      // `/context` is the only trustworthy source for the composer meter.
      // If the backend says no live session manager/session exists, clear
      // any prior value so stale pressure cannot look current.
      if (!response.ok) {
        if (!isActiveZakiSessionLive) {
          setSessionContextPressure(sessionKey, null);
          setNullalisContextGauge(null);
          setNullalisContextReport(null);
        }
        return;
      }
      const gauge = buildNullalisContextGauge(data as Record<string, unknown>);
      const pressurePct = resolveContextGaugePercent(gauge);
      setNullalisContextReport(data as AgentSessionContext);
      if (gauge) {
        setNullalisContextGauge(gauge);
      } else if (!isActiveZakiSessionLive) {
        setNullalisContextGauge(null);
        setNullalisContextReport(null);
      }
      if (typeof pressurePct === "number") {
        setSessionContextPressure(sessionKey, pressurePct);
      } else {
        setSessionContextPressure(sessionKey, null);
      }
    } catch {
      if (requestedSessionKey && !isActiveZakiSessionLive) {
        setSessionContextPressure(requestedSessionKey, null);
        setNullalisContextGauge(null);
        setNullalisContextReport(null);
      }
    }
  }, [
    activeThreadId,
    activeZakiSessionKey,
    agentUserId,
    isActiveZakiSessionLive,
    isZakiBotRouteActive,
    setSessionContextPressure,
    zakiBotProvisionReady,
  ]);

  const refreshAgentRuntimePanelData = useCallback(async () => {
    if (!isAgentSurface || !zakiBotProvisionReady) return;

    setAgentTasksLoading(true);
    setAgentTasksError(null);
    setAgentCronLoading(true);
    setAgentCronError(null);
    setAgentJobsLoading(true);
    setAgentJobsError(null);
    setAgentArtifactsLoading(true);
    setAgentArtifactsError(null);
    setAgentExtensionDiagnosticsLoading(true);
    setAgentExtensionDiagnosticsError(null);

    const [taskResult, cronResult, jobResult, artifactResult, extensionResult] = await Promise.allSettled([
      listAgentTasks({ limit: 24, redirectOnAuthFailure: false }),
      listAgentCron({ redirectOnAuthFailure: false }),
      listAgentJobs({ limit: 12, redirectOnAuthFailure: false }),
      listAgentArtifacts({
        limit: 12,
        session_key: normalizedActiveZakiSessionKey || undefined,
        redirectOnAuthFailure: false,
      }),
      fetchAgentExtensionDiagnostics({ redirectOnAuthFailure: false }),
    ]);

    if (taskResult.status === "fulfilled") {
      const { response, data } = taskResult.value;
      if (!response.ok) {
        const error =
          (data as { error?: string | null; reason?: string | null })?.error ||
          (data as { error?: string | null; reason?: string | null })?.reason ||
          "unavailable";
        setAgentTaskSnapshots([]);
        setAgentTasksError(error);
      } else {
        const rawTasks = Array.isArray(data.tasks)
          ? data.tasks
          : Array.isArray(data.items)
            ? data.items
            : [];
        const activeSession = normalizedActiveZakiSessionKey;
        const mapped = rawTasks
          .filter((task) => {
            if (!activeSession) return true;
            const sessionKey = recordStringValue(
              task as Record<string, unknown>,
              "session_key",
              "sessionKey"
            );
            return !sessionKey || normalizeZakiSessionKey(sessionKey) === activeSession;
          })
          .map(agentTaskToNullalisTaskItem)
          .filter((task): task is NullalisTaskItem => Boolean(task))
          .slice(-12);
        setAgentTaskSnapshots(mapped);
      }
    } else {
      setAgentTaskSnapshots([]);
      setAgentTasksError("network_error");
    }
    setAgentTasksLoading(false);

    if (cronResult.status === "fulfilled") {
      const { response, data } = cronResult.value;
      if (!response.ok) {
        const error =
          (data as { error?: string | null; reason?: string | null })?.error ||
          (data as { error?: string | null; reason?: string | null })?.reason ||
          "unavailable";
        setAgentCronJobs([]);
        setAgentCronError(error);
      } else {
        setAgentCronJobs(normalizeAgentCronJobsPayload(data));
      }
    } else {
      setAgentCronJobs([]);
      setAgentCronError("network_error");
    }
    setAgentCronLoading(false);

    if (jobResult.status === "fulfilled") {
      const { response, data } = jobResult.value;
      if (!response.ok) {
        const error =
          (data as { error?: string | null; reason?: string | null })?.error ||
          (data as { error?: string | null; reason?: string | null })?.reason ||
          "unavailable";
        setAgentJobs([]);
        setAgentJobsError(error);
      } else {
        setAgentJobs(normalizeAgentJobsPayload(data));
      }
    } else {
      setAgentJobs([]);
      setAgentJobsError("network_error");
    }
    setAgentJobsLoading(false);

    if (artifactResult.status === "fulfilled") {
      const { response, data } = artifactResult.value;
      if (!response.ok) {
        const error =
          (data as { error?: string | null; reason?: string | null })?.error ||
          (data as { error?: string | null; reason?: string | null })?.reason ||
          "unavailable";
        setAgentArtifactSnapshots([]);
        setAgentArtifactScope("session");
        setAgentArtifactsError(error);
      } else {
        const sessionArtifacts = normalizeAgentArtifactsPayload(data);
        setAgentArtifactSnapshots(sessionArtifacts);
        setAgentArtifactScope("session");
      }
    } else {
      setAgentArtifactSnapshots([]);
      setAgentArtifactsError("network_error");
      setAgentArtifactScope("session");
    }
    setAgentArtifactsLoading(false);

    if (extensionResult.status === "fulfilled") {
      const { response, data } = extensionResult.value;
      if (!response.ok) {
        const error =
          (data as { error?: string | null; reason?: string | null })?.error ||
          (data as { error?: string | null; reason?: string | null })?.reason ||
          "unavailable";
        setAgentExtensionDiagnostics(null);
        setAgentExtensionDiagnosticsError(error);
      } else {
        setAgentExtensionDiagnostics(data);
      }
    } else {
      setAgentExtensionDiagnostics(null);
      setAgentExtensionDiagnosticsError("network_error");
    }
    setAgentExtensionDiagnosticsLoading(false);
  }, [isAgentSurface, normalizedActiveZakiSessionKey, zakiBotProvisionReady]);

  const handleAgentArtifactEvent = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!isAgentSurface || !zakiBotProvisionReady) return;
      setAgentArtifactEventCount((count) => count + 1);
      void refreshAgentRuntimePanelData();

      const artifactId = extractArtifactEventId(payload);
      if (!artifactId) return;

      try {
        const { response, data } = await fetchAgentArtifact(artifactId, {
          redirectOnAuthFailure: false,
        });
        if (!response.ok) return;
        const artifact =
          normalizeAgentArtifact(data) ||
          normalizeAgentArtifact((data as { artifact?: unknown })?.artifact) ||
          normalizeAgentArtifactsPayload(data)[0] ||
          null;
        if (!artifact) return;
        setAgentArtifactSnapshots((prev) => [
          artifact,
          ...prev.filter((item) => item.id !== artifact.id),
        ]);
        setAgentArtifactScope("session");
        if (isZakiBotActiveSpace) {
          setSelectedAgentArtifact(artifact);
          setAgentFocusMode(false);
          setAgentMobileInspectorOpen(false);
        }
      } catch {
        // Best-effort UI hydration; the list refresh above still runs.
      }
    },
    [isAgentSurface, isZakiBotActiveSpace, refreshAgentRuntimePanelData, zakiBotProvisionReady]
  );

  useEffect(() => {
    if (!isAgentSurface) {
      setAgentTaskSnapshots([]);
      setAgentTasksError(null);
      setAgentTasksLoading(false);
      setAgentCronJobs([]);
      setAgentCronError(null);
      setAgentCronLoading(false);
      setAgentJobs([]);
      setAgentJobsError(null);
      setAgentJobsLoading(false);
      setAgentArtifactSnapshots([]);
      setAgentArtifactsError(null);
      setAgentArtifactsLoading(false);
      setAgentExtensionDiagnostics(null);
      setAgentExtensionDiagnosticsError(null);
      setAgentExtensionDiagnosticsLoading(false);
      return;
    }
    void refreshAgentRuntimePanelData();
  }, [isAgentSurface, refreshAgentRuntimePanelData]);

  // 2026-05-08 — Programmatic compact. Replaces the old "/compact" text
  // hack the pre-flight banner used to send. Direct API call against
  // /api/agent/sessions/:key/compact — no chat noise. After success we
  // refresh the gauge so the meter immediately reflects the freed
  // context. Toast surfaces tokens-saved when nullalis returns it.
  const [isCompacting, setIsCompacting] = useState(false);
  const compactingRef = useRef(false);
  const handleCompactSession = useCallback(async () => {
    const sessionKey = activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
    if (!sessionKey) {
      toast.error(t("zakiControls.compact.notReady", { defaultValue: "Session not ready yet." }));
      return;
    }
    if (compactingRef.current) return;
    compactingRef.current = true;
    setIsCompacting(true);
    try {
      const { response, data } = await compactAgentSession(sessionKey);
      if (!response.ok) throw new Error(`compact ${response.status}`);
      void refreshContextGauge();
      const before = data?.tokens_before;
      const after = data?.tokens_after;
      if (typeof before === "number" && typeof after === "number" && before > after) {
        toast.success(
          t("zakiControls.compact.successWithFreed", {
            defaultValue: "Context compacted. {{freed}} tokens freed.",
            freed: (before - after).toLocaleString(),
          }),
        );
      } else {
        toast.success(
          t("zakiControls.compact.success", { defaultValue: "Context compacted." }),
        );
      }
    } catch {
      toast.error(
        t("zakiControls.compact.error", { defaultValue: "Couldn't compact. Try again." }),
      );
    } finally {
      compactingRef.current = false;
      setIsCompacting(false);
    }
  }, [activeZakiSessionKey, activeThreadId, agentUserId, refreshContextGauge, t]);

  const finalizeZakiBotProgress = useCallback(
    (reason: "done" | "error" | "abort" | "stream_end") => {
      if (!isZakiBotActiveSpace) return;
      if (reason === "abort") {
        clearZakiBotProgressVisuals();
        return;
      }
      setZakiBotProgressTerminalReason(reason);
      if (reason === "done") {
        setStreamingIndicatorMode("writing");
        setNullalisNarrationFrame(null);
        // NOTE: Do NOT clear nullalisApprovalRequest here — the approval card
        // must persist until the user explicitly approves or denies. The card
        // manages its own decided state internally. Clearing here would race
        // with pending approvals since "done" fires when the SSE stream ends,
        // which can happen while an approval is still waiting for user action.
        refreshContextGauge();
        // Auto-title the session from the first complete user/assistant
        // exchange. Best-effort, non-blocking — bailouts inside the
        // helper handle "already titled" / generation failure / etc.
        const sessionKey = activeZakiSessionKey;
        const threadMessages = activeThreadId ? messagesByThread[activeThreadId] : undefined;
        if (sessionKey && threadMessages && threadMessages.length >= 2) {
          let firstUser: string | null = null;
          let firstAssistant: string | null = null;
          for (const m of threadMessages) {
            if (!firstUser && m.role === "user" && m.content?.trim()) {
              firstUser = m.content;
              continue;
            }
            if (firstUser && !firstAssistant && m.role === "assistant" && m.content?.trim()) {
              firstAssistant = m.content;
              break;
            }
          }
          if (firstUser && firstAssistant) {
            void maybeAutoTitleSession(sessionKey, {
              userMessage: firstUser,
              assistantMessage: firstAssistant,
            });
          }
        }
      }
    },
    [
      clearZakiBotProgressVisuals,
      isZakiBotActiveSpace,
      refreshContextGauge,
      activeZakiSessionKey,
      activeThreadId,
      messagesByThread,
      maybeAutoTitleSession,
    ]
  );

  useEffect(() => {
    if (!isZakiBotActiveSpace || !normalizedActiveZakiSessionKey) return;
    if (zakiSessionsLoading) return;
    // Initial fetch on mount + recurring polling while the user is in
    // ZAKI bot mode. Without periodic refresh, out-of-band pressure
    // changes (another channel posting into the same session, background
    // compaction landing) wouldn't reach the UI until the next user turn.
    //
    // P2-01: setTimeout chaining (not setInterval) — the next poll only
    // fires after the previous one resolves, so a slow response can't be
    // overrun by a faster-stale one. P2-02: skip the tick entirely while
    // document.hidden so backgrounded tabs do not hammer the agent.
    let cancelled = false;
    let timer: number | null = null;
    const POLL_MS = 15_000;
    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && !document.hidden) {
        await refreshContextGauge();
      }
      if (cancelled) return;
      timer = window.setTimeout(tick, POLL_MS);
    };
    void tick();
    // Resume immediately on visibility change so a tab that was hidden
    // during a tick doesn't have to wait POLL_MS for fresh data.
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void refreshContextGauge();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isZakiBotActiveSpace, normalizedActiveZakiSessionKey, refreshContextGauge, zakiSessionsLoading]);

  const upsertZakiBotToolCall = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const { requestId, name, arguments: args } = extractToolCallPayload(payload);
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode("researching");
      setZakiBotToolCalls((prev) => {
        if (requestId) {
          const existingIndex = prev.findIndex((call) => call.requestId === requestId);
          if (existingIndex >= 0) {
            const next = [...prev];
            const existingCall = next[existingIndex];
            if (!existingCall) return prev;
            next[existingIndex] = {
              ...existingCall,
              name,
              arguments: args,
              status: "pending",
              result: undefined,
              finishedAt: undefined,
              durationMs: undefined,
            };
            return next;
          }
        }
        const now = Date.now();
        return [
          ...prev,
          {
            id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            requestId,
            name,
            arguments: args,
            timestamp: now,
            startedAt: now,
            status: "pending",
          },
        ];
      });
    },
    [isZakiBotActiveSpace]
  );

  const applyZakiBotToolResult = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const { requestId, name, ok, error, result, durationMs: explicitDurationMs, approvalRequired } =
        extractToolResultPayload(payload);
      const status = approvalRequired ? "blocked" : ok ? "ok" : "fail";
      setZakiBotProgressTerminalReason(null);
      setZakiBotToolCalls((prev) => {
        if (!prev.length) {
          const now = Date.now();
          const startedAt =
            explicitDurationMs != null ? Math.max(0, now - explicitDurationMs) : now;
          return [
            {
              id: `tool-${now}-${Math.random().toString(36).slice(2, 8)}`,
              requestId,
              name: name || "unknown_tool",
              arguments: {},
              timestamp: startedAt,
              startedAt,
              finishedAt: now,
              durationMs: explicitDurationMs ?? 0,
              status,
              result: { ok, error, result },
            },
          ];
        }
        const next = [...prev];
        let targetIndex = -1;
        if (requestId) {
          targetIndex = next.findIndex((call) => call.requestId === requestId);
        }
        if (targetIndex < 0 && name) {
          const normalizedName = name.trim().toLowerCase();
          targetIndex = [...next]
            .reverse()
            .findIndex((call) => String(call.name || "").trim().toLowerCase() === normalizedName);
          if (targetIndex >= 0) {
            targetIndex = next.length - 1 - targetIndex;
          }
        }
        if (targetIndex < 0) {
          targetIndex = [...next]
            .reverse()
            .findIndex((call) => !call.result);
          if (targetIndex >= 0) {
            targetIndex = next.length - 1 - targetIndex;
          }
        }
        if (targetIndex < 0) return prev;
        const existingCall = next[targetIndex];
        if (!existingCall) return prev;
        const finishedAt =
          typeof existingCall.finishedAt === "number" ? existingCall.finishedAt : Date.now();
        const durationMs = explicitDurationMs ?? Math.max(0, finishedAt - existingCall.startedAt);
        next[targetIndex] = {
          ...existingCall,
          ...(name ? { name } : {}),
          finishedAt,
          durationMs,
          status,
          result: { ok, error, result },
        };
        return next;
      });
    },
    [isZakiBotActiveSpace]
  );

  const markZakiBotToolApprovalRequired = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const approval = extractNullalisApprovalRequest(payload);
      const now = Date.now();
      const requestId =
        approval.toolCallId ||
        (typeof payload.tool_use_id === "string" && payload.tool_use_id) ||
        (typeof payload.toolUseId === "string" && payload.toolUseId) ||
        null;
      const reason = approval.effectPreview || approval.reason || "Approval required";
      setZakiBotToolCalls((prev) => {
        const next = [...prev];
        let targetIndex = -1;
        if (requestId) {
          targetIndex = next.findIndex(
            (call) => call.requestId === requestId || call.id === requestId
          );
        }
        if (targetIndex < 0 && approval.tool) {
          const normalizedName = approval.tool.trim().toLowerCase();
          targetIndex = [...next]
            .reverse()
            .findIndex((call) => String(call.name || "").trim().toLowerCase() === normalizedName);
          if (targetIndex >= 0) targetIndex = next.length - 1 - targetIndex;
        }
        if (targetIndex < 0) {
          const startedAt = now;
          return [
            ...next,
            {
              id: requestId || `tool-${now}-${Math.random().toString(36).slice(2, 8)}`,
              requestId: requestId || undefined,
              name: approval.tool || "tool",
              arguments: {},
              timestamp: startedAt,
              startedAt,
              finishedAt: now,
              durationMs: 0,
              status: "blocked",
              result: { ok: false, error: reason, result: reason },
            },
          ];
        }
        const existingCall = next[targetIndex];
        if (!existingCall) return prev;
        next[targetIndex] = {
          ...existingCall,
          requestId: existingCall.requestId || requestId || undefined,
          finishedAt: now,
          durationMs: Math.max(0, now - existingCall.startedAt),
          status: "blocked",
          result: { ok: false, error: reason, result: reason },
        };
        return next;
      });
    },
    [isZakiBotActiveSpace]
  );

  const upsertZakiBotProgressTool = useCallback(
    (toolName: string, state: string | null, label: string | null, durationMs: number | null) => {
      if (!isZakiBotActiveSpace) return;
      const normalizedTool = toolName.trim().toLowerCase();
      if (!normalizedTool) return;
      const normalizedState = String(state || "").trim().toLowerCase();
      const isTerminal =
        normalizedState.includes("done") ||
        normalizedState.includes("complete") ||
        normalizedState.includes("success") ||
        normalizedState.includes("ok") ||
        normalizedState.includes("fail") ||
        normalizedState.includes("error") ||
        normalizedState.includes("abort") ||
        normalizedState.includes("cancel");
      const isFailure =
        normalizedState.includes("fail") ||
        normalizedState.includes("error") ||
        normalizedState.includes("abort") ||
        normalizedState.includes("cancel");
      const now = Date.now();

      setZakiBotToolCalls((prev) => {
        const next = [...prev];
        const targetIndex = [...next]
          .reverse()
          .findIndex((call) => {
            const callName = String(call.name || "").trim().toLowerCase();
            if (!callName) return false;
            return callName === normalizedTool || callName.includes(normalizedTool) || normalizedTool.includes(callName);
          });
        const resolvedIndex =
          targetIndex >= 0 ? next.length - 1 - targetIndex : next.findIndex((call) => !call.result);

        if (resolvedIndex >= 0) {
          const existing = next[resolvedIndex];
          if (!existing) return prev;
          const startedAt =
            typeof existing.startedAt === "number"
              ? existing.startedAt
              : durationMs != null
                ? Math.max(0, now - durationMs)
                : now;
          const finishedAt =
            isTerminal && durationMs != null
              ? startedAt + durationMs
              : isTerminal
                ? now
                : existing.finishedAt;
          const computedDurationMs =
            durationMs != null
              ? durationMs
              : typeof finishedAt === "number"
                ? Math.max(0, finishedAt - startedAt)
                : existing.durationMs;
          next[resolvedIndex] = {
            ...existing,
            name: existing.name || toolName,
            startedAt,
            ...(typeof finishedAt === "number" ? { finishedAt } : {}),
            ...(typeof computedDurationMs === "number" ? { durationMs: computedDurationMs } : {}),
            status: isTerminal ? (isFailure ? "fail" : "ok") : existing.status || "pending",
            ...(isTerminal
              ? {
                  result: {
                    ok: !isFailure,
                    error: isFailure ? label || "Tool failed." : undefined,
                    result: existing.result?.result,
                  },
                }
              : {}),
          };
          return next;
        }

        const startedAt = durationMs != null ? Math.max(0, now - durationMs) : now;
        const finishedAt = isTerminal ? startedAt + (durationMs ?? 0) : undefined;
        return [
          ...next,
          {
            id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: toolName,
            arguments: {},
            timestamp: now,
            startedAt,
            ...(typeof finishedAt === "number" ? { finishedAt } : {}),
            ...(durationMs != null ? { durationMs } : {}),
            status: isTerminal ? (isFailure ? "fail" : "ok") : "pending",
            ...(isTerminal
              ? {
                  result: {
                    ok: !isFailure,
                    error: isFailure ? label || "Tool failed." : undefined,
                    result: undefined,
                  },
                }
              : {}),
          },
        ];
      });
    },
    [isZakiBotActiveSpace]
  );

  const pushZakiBotProgressEvent = useCallback(
    (
      payload: Record<string, unknown>,
      source: "progress" | "status" = "progress"
    ) => {
      if (!isZakiBotActiveSpace) return;
      const progress = extractProgressPayload(payload);
      if (!progress) return;
      const mode = inferStreamingModeFromProgress(progress);
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode(mode);
      if (progress.tool) {
        upsertZakiBotProgressTool(progress.tool, progress.state, progress.text, progress.durationMs);
      }
      const text = buildProgressEventText(progress);
      const fingerprint = buildProgressFingerprint({
        text,
        phase: progress.phase,
        state: progress.state,
        tool: progress.tool,
      });
      const terminal = classifyProgressTerminal({ state: progress.state, text });
      setZakiBotStatusEvents((prev) => {
        const last = prev[prev.length - 1];
        if (last?.fingerprint === fingerprint) {
          if (
            last.iteration === progress.iteration &&
            last.durationMs === progress.durationMs &&
            last.terminal === terminal
          ) {
            return prev;
          }
          const next = [...prev];
          const currentLast = next[next.length - 1];
          if (!currentLast) return prev;
          next[next.length - 1] = {
            ...currentLast,
            text,
            timestamp: Date.now(),
            taskId: progress.taskId,
            durationMs: progress.durationMs,
            iteration: progress.iteration,
            terminal,
          };
          return next;
        }
        if (!fingerprint) {
          return prev;
        }
        const next = [
          ...prev,
          {
            id: `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text,
            timestamp: Date.now(),
            fingerprint,
            source,
            phase: progress.phase,
            state: progress.state,
            label: progress.label,
            tool: progress.tool,
            taskId: progress.taskId,
            iteration: progress.iteration,
            durationMs: progress.durationMs,
            terminal,
          } satisfies BotStatusEvent,
        ];
        return next.slice(-16);
      });
    },
    [isZakiBotActiveSpace, upsertZakiBotProgressTool]
  );

  const pushNullalisTranscriptEntry = useCallback(
    (entry: NullalisTranscriptEntry | null) => {
      if (!isZakiBotActiveSpace || !entry) return;
      const fingerprint = buildNullalisTranscriptFingerprint(entry);
      setNullalisTranscriptEntries((prev) => {
        const last = prev[prev.length - 1];
        if (last && buildNullalisTranscriptFingerprint(last) === fingerprint) {
          return prev;
        }
        const recentDuplicate = [...prev]
          .slice(-4)
          .some(
            (candidate) =>
              buildNullalisTranscriptFingerprint(candidate) === fingerprint &&
              Math.abs(entry.timestamp - candidate.timestamp) < 5000
          );
        if (recentDuplicate) return prev;
        return [...prev, entry].slice(-40);
      });
    },
    [isZakiBotActiveSpace]
  );

  const handleNullalisApprovalRequired = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const approvalRequest = extractNullalisApprovalRequest(payload);
      setNullalisApprovalRequest(approvalRequest);
      markZakiBotToolApprovalRequired(payload);
      if (approvalRequest?.id) {
        const sessionKey =
          activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
        if (sessionKey) {
          const seenSet =
            approvalSeenBySessionRef.current[sessionKey] ||
            (approvalSeenBySessionRef.current[sessionKey] = new Set<string>());
          if (!seenSet.has(approvalRequest.id)) {
            seenSet.add(approvalRequest.id);
            incrementSessionApprovalCount(sessionKey, approvalRequest);
          }
          if (!approvalRequest.approvalId) {
            void hydrateActiveSessionDetail(sessionKey);
          }
        }
      }
      pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("approval_required", payload));
      setNullalisNarrationFrame({
        id: `zaki-runtime-approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        phase: "waiting",
        label: "Waiting for tool approval...",
        tool: typeof payload.tool === "string" ? payload.tool : null,
        iteration: null,
        durationMs: null,
        stepIndex: null,
        stepTotal: null,
        timestamp: Date.now(),
      });
    },
    [
      activeThreadId,
      activeZakiSessionKey,
      agentUserId,
      hydrateActiveSessionDetail,
      incrementSessionApprovalCount,
      isZakiBotActiveSpace,
      markZakiBotToolApprovalRequired,
      pushNullalisTranscriptEntry,
    ]
  );

  const pushNullalisNarrationFrame = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const frame = extractNullalisNarrationFrame(payload);
      if (!frame) return;
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode(
        frame.phase === "tool_start" || frame.phase === "tool_done"
          ? "researching"
          : frame.phase === "speaking"
            ? "writing"
            : "thinking"
      );
      setNullalisNarrationFrame(frame);
      pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("progress", payload, frame.timestamp));
      if (frame.tool && frame.phase === "tool_start") {
        upsertZakiBotToolCall({
          type: "toolCallInvocation",
          tool: frame.tool,
          name: frame.tool,
        });
      }
      if (frame.tool && frame.phase === "tool_done") {
        upsertZakiBotProgressTool(frame.tool, "done", frame.label, frame.durationMs ?? null);
      }
    },
    [
      isZakiBotActiveSpace,
      pushNullalisTranscriptEntry,
      upsertZakiBotProgressTool,
      upsertZakiBotToolCall,
    ]
  );

  const upsertNullalisTaskItem = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const taskItem = extractNullalisTaskItem(payload);
      if (!taskItem) return;
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode(taskItem.status === "running" ? "researching" : "thinking");
      setNullalisTaskItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.taskId === taskItem.taskId);
        if (existingIndex < 0) return [...prev, taskItem].slice(-8);
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], ...taskItem };
        return next.slice(-8);
      });
      pushNullalisTranscriptEntry(
        extractNullalisTranscriptEntry("task_update", payload, taskItem.updatedAt)
      );
      setNullalisNarrationFrame({
        id: `zaki-runtime-task-${taskItem.taskId}-${taskItem.updatedAt}`,
        phase: "plan_step",
        label:
          taskItem.status === "running"
            ? `Running ${taskItem.description || taskItem.taskId}`
            : `${taskItem.description || taskItem.taskId} ${taskItem.status}`,
        tool: null,
        iteration: null,
        durationMs: null,
        stepIndex: null,
        stepTotal: null,
        timestamp: taskItem.updatedAt,
      });
    },
    [isZakiBotActiveSpace, pushNullalisTranscriptEntry]
  );

  const upsertNullalisTodoTaskItems = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const todoTasks = extractNullalisTodoTaskItemsFromToolPayload(payload);
      if (!todoTasks.length) return;
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode("thinking");
      setNullalisTaskItems((prev) => mergeTodoTaskItems(prev, todoTasks));
      const activeTodo =
        todoTasks.find((task) => task.status === "running") ||
        todoTasks.find((task) => task.status === "queued") ||
        todoTasks[todoTasks.length - 1];
      if (!activeTodo) return;
      setNullalisNarrationFrame({
        id: `zaki-runtime-todo-${activeTodo.taskId}-${activeTodo.updatedAt}`,
        phase: "plan_step",
        label:
          activeTodo.status === "running"
            ? `Working on ${activeTodo.description}`
            : `Todo updated: ${activeTodo.description}`,
        tool: "todo",
        iteration: null,
        durationMs: null,
        stepIndex: null,
        stepTotal: null,
        timestamp: activeTodo.updatedAt,
      });
    },
    [isZakiBotActiveSpace]
  );

  const updateNullalisReasoningSummary = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const summary = extractReasoningSummaryPayload(payload);
      if (summary) {
        setZakiBotProgressTerminalReason(null);
        setStreamingIndicatorMode(
          inferStreamingModeFromContext(
            [summary.phase, summary.tool, summary.text].filter(Boolean).join(" ")
          )
        );
      }
      const frame = extractNullalisReasoningNarrationFrame(payload);
      if (!frame) return;
      setNullalisNarrationFrame(frame);
      pushNullalisTranscriptEntry(
        extractNullalisTranscriptEntry("reasoning_summary", payload, frame.timestamp)
      );
    },
    [isZakiBotActiveSpace, pushNullalisTranscriptEntry]
  );

  const markZakiBotReplyStart = useCallback(
    (payload: Record<string, unknown>) => {
      if (!isZakiBotActiveSpace) return;
      const replyStart = extractReplyStartPayload(payload);
      if (!replyStart) return;
      setZakiBotProgressTerminalReason(null);
      setStreamingIndicatorMode("writing");
      setZakiBotReplyStart({
        id: `reply-start-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        streamKind: replyStart.streamKind,
        deliveryMode: replyStart.deliveryMode,
        live: replyStart.live,
      });
    },
    [isZakiBotActiveSpace]
  );

  const applyQuotaHeaders = useCallback((headers: Headers, fallbackSurface: UsageQuotaSurface) => {
    const limitRaw = String(headers.get("x-zaki-quota-limit") || "").trim().toLowerCase();
    if (!limitRaw) return;
    const remainingRaw = String(headers.get("x-zaki-quota-remaining") || "").trim().toLowerCase();
    const resetAtRaw = String(headers.get("x-zaki-quota-reset-at") || "").trim();
    const headerSurface = String(headers.get("x-zaki-quota-surface") || "").trim().toLowerCase();
    const headerBucket = String(headers.get("x-zaki-quota-bucket") || "").trim();
    const headerPeriod = String(headers.get("x-zaki-quota-period") || "").trim().toLowerCase();
    const normalizedSurface: UsageQuotaSurface =
      headerSurface === "zaki_bot"
        ? "zaki_bot"
        : headerSurface === "learning"
          ? "learning"
          : fallbackSurface;
    const unlimited = limitRaw === "unlimited";
    const parsedLimit = Number(limitRaw);
    const parsedRemaining = Number(remainingRaw);
    setFreeDailyQuota({
      unlimited,
      limit: unlimited || !Number.isFinite(parsedLimit) ? null : parsedLimit,
      used:
        unlimited || !Number.isFinite(parsedLimit) || !Number.isFinite(parsedRemaining)
          ? 0
          : Math.max(0, parsedLimit - parsedRemaining),
      remaining:
        unlimited || !Number.isFinite(parsedRemaining)
          ? null
          : Math.max(0, Math.floor(parsedRemaining)),
      resetAt: resetAtRaw || null,
      surface: normalizedSurface,
      bucket: headerBucket || null,
      period: headerPeriod || null,
    });
  }, []);

  const refreshUsageQuota = useCallback(async () => {
    if (isZakiBotActiveSpace) {
      setFreeDailyQuota(null);
      return;
    }
    if (!authUserId) {
      setFreeDailyQuota({
        unlimited: false,
        limit: 10,
        used: 0,
        remaining: 10,
        resetAt: null,
        surface: "app_chat",
        bucket: "anonymous_spaces",
        period: "day",
      });
      return;
    }
    try {
      const { response, data } = await fetchUsageQuota(quotaSurface);
      if (!response.ok) return;
      const normalizedSurface: UsageQuotaSurface =
        data.surface === "zaki_bot"
          ? "zaki_bot"
          : data.surface === "learning"
            ? "learning"
            : quotaSurface;
      setFreeDailyQuota({
        unlimited: data.unlimited === true,
        limit: typeof data.limit === "number" ? data.limit : null,
        used: Math.max(0, Number(data.used || 0)),
        remaining: typeof data.remaining === "number" ? Math.max(0, Number(data.remaining)) : null,
        resetAt: typeof data.resetAt === "string" ? data.resetAt : null,
        surface: normalizedSurface,
        bucket: typeof data.bucket === "string" && data.bucket.trim() ? data.bucket.trim() : null,
        period: typeof data.period === "string" ? data.period : null,
      });
    } catch {
      // Best-effort status sync.
    }
  }, [authUserId, isZakiBotActiveSpace, quotaSurface]);

  useEffect(() => {
    void refreshUsageQuota();
  }, [refreshUsageQuota]);

  // Stream via WebSocket for agent invocation URLs
  const streamAgentInvocation = useCallback(async (
    agentUrl: string,
    threadSlug: string,
    assistantId: string,
    signal?: AbortSignal
  ) => {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        resolve();
        return;
      }
      const ws = new WebSocket(agentUrl);
      let accumulated = "";
      let supportsAgentStreaming = false;
      let hasAnswer = false;
      let autoReplySent = false;
      let settled = false;
      let sawTerminalEvent = false;

      const cleanup = () => {
        signal?.removeEventListener("abort", handleAbort);
      };

      const resolveOnce = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };

      const rejectOnce = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const handleAbort = () => {
        finalizeZakiBotProgress("abort");
        try {
          ws.close(1000, "aborted");
        } catch {
          // Ignore close errors on aborted stream.
        }
        resolveOnce();
      };

      signal?.addEventListener("abort", handleAbort, { once: true });

      const isInternalStreamText = (text: string, streaming = true) =>
        isInternalAgentReplyContent(text, { streaming });

      ws.onmessage = (event) => {
        if (signal?.aborted) {
          return;
        }
        try {
          const payload = JSON.parse(event.data);
          if (!payload?.type && supportsAgentStreaming) {
            return;
          }

          if (payload?.type === "WAITING_ON_INPUT") {
            if (hasAnswer) {
              ws.send(
                JSON.stringify({
                  type: "awaitingFeedback",
                  feedback: "/exit",
                })
              );
              return;
            }
            if (!autoReplySent) {
              ws.send(
                JSON.stringify({
                  type: "awaitingFeedback",
                  feedback: "",
                })
              );
              autoReplySent = true;
            }
            return;
          }

          if (payload?.type === "reportStreamEvent" && payload?.content) {
            supportsAgentStreaming = true;
            const report = payload.content as { type?: string; content?: unknown };
            const reportPayload =
              report?.content && typeof report.content === "object"
                ? ({ ...(report.content as Record<string, unknown>), type: report.type } as Record<string, unknown>)
                : ({ type: report?.type, content: report?.content } as Record<string, unknown>);
            if (report?.type === "removeStatusResponse") return;
            if (isZakiBotActiveSpace && report?.type === "progress") {
              pushZakiBotProgressEvent(reportPayload, "progress");
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "statusResponse") {
              pushZakiBotProgressEvent(reportPayload, "status");
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "reasoning_summary") {
              updateNullalisReasoningSummary(reportPayload);
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "reply_start") {
              markZakiBotReplyStart(reportPayload);
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "approval_required") {
              handleNullalisApprovalRequired(reportPayload);
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "artifact_event") {
              pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("artifact_event", reportPayload));
              void handleAgentArtifactEvent(reportPayload);
              return;
            }
            if (isZakiBotActiveSpace && report?.type === "toolCallInvocation") {
              upsertZakiBotToolCall({ content: report.content, type: "toolCallInvocation" });
              upsertNullalisTodoTaskItems({ content: report.content, type: "toolCallInvocation" });
              return;
            }
            if (
              isZakiBotActiveSpace &&
              (report?.type === "toolCallResult" || report?.type === "tool_result")
            ) {
              pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("tool_result", reportPayload));
              applyZakiBotToolResult({ content: report.content, type: report?.type });
              upsertNullalisTodoTaskItems({ content: report.content, type: report?.type });
              return;
            }
            if (report?.type === "fullTextResponse") {
              const text = String(report.content || "");
              if (isInternalStreamText(text, false)) return;
              accumulated = text;
              updateAssistantContent(threadSlug, assistantId, accumulated);
              if (accumulated) hasAnswer = true;
              return;
            }
            if (report?.type === "textResponseChunk") {
              const text = String(report.content || "");
              if (isInternalStreamText(text, true)) return;
              accumulated += text;
              updateAssistantContent(threadSlug, assistantId, accumulated);
              if (accumulated) hasAnswer = true;
              return;
            }
            if (report?.type === "toolCallInvocation") return;
            if (report?.type === "statusResponse") return;
          }

          if (payload?.type === "progress") {
            if (isZakiBotActiveSpace) {
              pushZakiBotProgressEvent(payload, "progress");
            }
            return;
          }

          if (payload?.type === "statusResponse") {
            if (isZakiBotActiveSpace) {
              pushZakiBotProgressEvent(payload, "status");
            }
            return;
          }
          if (payload?.type === "reasoning_summary") {
            if (isZakiBotActiveSpace) {
              updateNullalisReasoningSummary(payload);
            }
            return;
          }
          if (payload?.type === "reply_start") {
            if (isZakiBotActiveSpace) {
              markZakiBotReplyStart(payload);
            }
            return;
          }
          if (payload?.type === "approval_required") {
            if (isZakiBotActiveSpace) {
              handleNullalisApprovalRequired(payload);
            }
            return;
          }
          if (payload?.type === "artifact_event") {
            if (isZakiBotActiveSpace) {
              pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("artifact_event", payload));
              void handleAgentArtifactEvent(payload);
            }
            return;
          }

          if (payload?.type === "toolCallInvocation") {
            if (isZakiBotActiveSpace) {
              upsertZakiBotToolCall(payload);
              upsertNullalisTodoTaskItems(payload);
            }
            return;
          }
          if (payload?.type === "toolCallResult" || payload?.type === "tool_result") {
            if (isZakiBotActiveSpace) {
              pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("tool_result", payload));
              applyZakiBotToolResult(payload);
              upsertNullalisTodoTaskItems(payload);
            }
            return;
          }

          if (payload?.type === "wssFailure") {
            sawTerminalEvent = true;
            finalizeZakiBotProgress("error");
            const errorText =
              (typeof payload.content === "string" && payload.content) ||
              "Agent connection failed.";
            updateAssistantError(threadSlug, assistantId, errorText, "agent_error");
            ws.close();
            return;
          }

          if (payload?.type === "error" || payload?.error === true) {
            sawTerminalEvent = true;
            finalizeZakiBotProgress("error");
            const errorText =
              (typeof payload.message === "string" && payload.message) ||
              (typeof payload.error === "string" && payload.error) ||
              "Agent connection failed.";
            updateAssistantError(threadSlug, assistantId, errorText, "agent_error");
            ws.close();
            return;
          }

          if (payload?.type === "done") {
            sawTerminalEvent = true;
            finalizeZakiBotProgress("done");
            ws.close();
            return;
          }

          const rawChunk =
            (typeof payload.textResponse === "string" && payload.textResponse) ||
            (typeof payload.content === "string" && payload.content) ||
            (typeof payload.message === "string" && payload.message) ||
            (typeof payload.error === "string" && payload.error) ||
            "";
          if (rawChunk) {
            if (isInternalStreamText(rawChunk, payload.type !== "fullTextResponse")) return;
            if (
              payload.type === "textResponse" ||
              payload.type === "fullTextResponse"
            ) {
              accumulated = rawChunk;
            } else {
              accumulated += rawChunk;
            }
            updateAssistantContent(threadSlug, assistantId, accumulated);
            if (accumulated) hasAnswer = true;
          }

          if (payload.close || payload.type === "finalizeResponseStream") {
            sawTerminalEvent = true;
            finalizeZakiBotProgress("done");
            ws.close();
            return;
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        if (signal?.aborted) {
          resolveOnce();
          return;
        }
        finalizeZakiBotProgress("error");
        rejectOnce(new Error("Connection failed."));
      };
      ws.onclose = () => {
        if (!signal?.aborted && !sawTerminalEvent) {
          finalizeZakiBotProgress("stream_end");
        }
        resolveOnce();
      };
    });
  }, [
    applyZakiBotToolResult,
    finalizeZakiBotProgress,
    handleAgentArtifactEvent,
    handleNullalisApprovalRequired,
    isZakiBotActiveSpace,
    pushZakiBotProgressEvent,
    pushNullalisTranscriptEntry,
    markZakiBotReplyStart,
    updateNullalisReasoningSummary,
    updateAssistantContent,
    updateAssistantError,
    upsertNullalisTodoTaskItems,
    upsertZakiBotToolCall,
  ]);

  // Stream chat message via fetch (POST)
  const streamChatMessage = useCallback(async ({
    workspaceSlug,
    threadSlug,
    message,
    assistantId,
    signal,
    disableResponseEnvelope = false,
    turnOptions = null,
    onContent,
    turnKind = null,
  }: {
    workspaceSlug: string;
    threadSlug: string;
    message: string;
    assistantId: string;
    signal?: AbortSignal;
    disableResponseEnvelope?: boolean;
    turnOptions?: InputAreaSendOptions["zaki"] | null;
    onContent?: (content: string) => void;
    turnKind?: "onboarding_first_turn" | null;
  }) => {
    const activeSpace = spacesList.find((s) => s.id === workspaceSlug);
    const instructions = activeSpace?.instructions ?? "";
    const shouldDisableResponseEnvelope =
      responseFormattingConfig.disableResponseEnvelope || disableResponseEnvelope;
    const isZakiAgentSpace =
      String(workspaceSlug || "").trim().toLowerCase() === ZAKI_BOT_SPACE_ID;
    const isAnonymousSpaces = !authUserId && !isZakiAgentSpace;
    const requestPath = isZakiAgentSpace
      ? "/api/agent/chat/stream"
      : isAnonymousSpaces
        ? `/api/anonymous/workspace/${workspaceSlug}/thread/${threadSlug}/stream-chat`
        : `/workspace/${workspaceSlug}/thread/${threadSlug}/stream-chat`;
    const requestBody = isZakiAgentSpace
      ? {
          message,
          threadId: threadSlug,
          spaceId: workspaceSlug,
          ...(turnKind ? { turnKind } : {}),
          ...(turnOptions?.autonomy ? { autonomy: turnOptions.autonomy } : {}),
          ...(turnOptions?.reasoning_effort
            ? { reasoning_effort: turnOptions.reasoning_effort }
            : {}),
        }
      : {
          message,
          mode: queryModeEnabled ? "query" : "chat",
          ...(shouldDisableResponseEnvelope ? { disableResponseEnvelope: true } : {}),
          ...(instructions ? { promptPrefix: `${instructions}\n\n` } : {}),
        };

    const response = await apiRequest(requestPath, {
      method: "POST",
      body: JSON.stringify(requestBody),
      signal,
      skipAuth: isAnonymousSpaces,
    });

    const agentBaseHeader = response.headers.get("x-zaki-agent-base");
    const spacesRouteHeader = response.headers.get("x-zaki-spaces-route") || "";
    const buildStreamResult = (content: string) => ({
      content,
      ...(spacesRouteHeader ? { spacesRoute: spacesRouteHeader } : {}),
    });

    if (!response.ok) {
      console.error(`[Chat] Stream failed: ${response.status}`);
      const genericStatusFallback = `Chat request failed (${response.status}).`;
      let message = genericStatusFallback;
      let errorCode: string | null = null;
      let errorRetryable = false;
      let quotaResetAt: string | null = null;
      let quotaSurfaceCode: UsageQuotaSurface | null = null;
      let denialDetails: ChatDenialDetails = null;
      const requestId = response.headers.get("x-request-id");
      const errorContentType = response.headers.get("content-type") || "";
      try {
        if (errorContentType.includes("application/json")) {
          const data = (await response.json()) as {
            error?: string;
            message?: string;
            code?: string;
            retryable?: boolean;
            limit?: number;
            constraint?: string | null;
            requiredUnits?: number | null;
            effectiveRemaining?: number | null;
            resetAt?: string;
            surface?: string;
            period?: string;
            meter?: NonNullable<ChatDenialDetails>["meter"];
          };
          denialDetails = {
            constraint: typeof data.constraint === "string" ? data.constraint : null,
            requiredUnits:
              typeof data.requiredUnits === "number" ? data.requiredUnits : null,
            effectiveRemaining:
              typeof data.effectiveRemaining === "number"
                ? data.effectiveRemaining
                : null,
            resetAt: typeof data.resetAt === "string" ? data.resetAt : null,
            meter: data.meter || null,
            limit: typeof data.limit === "number" ? data.limit : null,
            period:
              data.period === "week" ? "week" : data.period === "day" ? "day" : null,
          };
          // WP-C: the machine code comes from `code` — and, for legacy routes that only
          // send `error`, from `error` ONLY when it is code-shaped. It is never copy.
          if (typeof data.code === "string" && data.code.trim()) {
            errorCode = data.code.trim();
          } else if (
            typeof data.error === "string" &&
            looksLikeMachineCode(data.error.trim())
          ) {
            errorCode = data.error.trim();
          }
          if (data.retryable === true) {
            errorRetryable = true;
          }
          if (typeof data.resetAt === "string" && data.resetAt.trim()) {
            quotaResetAt = data.resetAt.trim();
          }
          if (typeof data.surface === "string" && data.surface.trim().toLowerCase() === "zaki_bot") {
            quotaSurfaceCode = "zaki_bot";
          } else if (typeof data.surface === "string" && data.surface.trim().toLowerCase() === "app_chat") {
            quotaSurfaceCode = "app_chat";
          }
          // WP-C — PRECEDENCE INVERTED.
          //
          // This used to fall back to `data.error` (the MACHINE code) whenever `message`
          // was absent, so a bare `{ error: "invalid_session_key" }` rendered the literal
          // code in a banner and a toast. Now: a real `message` wins; otherwise the code
          // is resolved through the ONE taxonomy into tailored human copy. `data.error`
          // is never copy.
          if (errorCode === "daily_limit_reached" || errorCode === "weekly_limit_reached") {
            // The limit state owns this copy (it names the limit + exact reset). Keep the
            // server sentence if it sent one, else a taxonomy-safe default.
            const resetLabel = quotaResetAt
              ? new Date(quotaResetAt).toLocaleString()
              : errorCode === "weekly_limit_reached"
                ? "next week"
                : "tomorrow";
            const isBotQuota = quotaSurfaceCode === "zaki_bot" || isZakiAgentSpace;
            const serverMessage =
              typeof data.message === "string" &&
              data.message.trim() &&
              !looksLikeMachineCode(data.message.trim())
                ? data.message.trim()
                : null;
            message =
              serverMessage ??
              (isBotQuota
                ? chatCopy.experimentalLimitReached(resetLabel)
                : chatCopy.appFreeLimitReached(resetLabel));
          } else if (errorCode === "access_expired") {
            message = "Access code required. Redeem a fresh code to keep chatting.";
          } else {
            message = resolveErrorMessage(
              { code: errorCode, message: data.message, error: data.error },
              t
            );
          }
        }
        // WP-C: the raw response-body dump that used to live here is GONE. Echoing an
        // arbitrary upstream body (HTML error pages, stack traces, machine codes) into a
        // user-facing string is exactly what the spec bans. A non-JSON error body tells
        // us nothing a user can act on, so we keep the taxonomy fallback instead.
      } catch {
        // Keep fallback message.
      }
      // Final guard: nothing code-shaped ever reaches the DOM, and a failure with no code
      // at all still gets tailored copy (derived from the HTTP status) rather than the
      // generic "Chat request failed (500)." placeholder.
      if (!message || looksLikeMachineCode(message) || message === genericStatusFallback) {
        message = resolveErrorMessage(
          { code: errorCode || codeFromHttpStatus(response.status), message: null },
          t
        );
      }
      if (requestId) {
        message = `${message} (Ref: ${requestId})`;
      }
      throw new ChatRequestError(
        message,
        response.status,
        errorCode,
        errorRetryable,
        denialDetails
      );
    }

    const resolveAgentUrl = (payload: Record<string, unknown>): string | null => {
      const direct =
        (payload.agentInvocationUrl as string | undefined) ||
        (payload.invocationUrl as string | undefined) ||
        (payload.websocketUrl as string | undefined) ||
        (payload.wsUrl as string | undefined) ||
        (payload.url as string | undefined);
      if (direct) return normalizeAgentSocketUrl(direct);
      const socketId =
        (payload.websocketUUID as string | undefined) ||
        (payload.websocketUuid as string | undefined);
      if (socketId) return buildAgentInvocationUrl(socketId, agentBaseHeader);
      return null;
    };

    // P1-12 follow-up (Wave A): track whether ANY content chunk has been received
    // for THIS turn. The chat POST carries no idempotency/turn key, so the replay
    // loop auto-resends on a retryable error frame. If content already streamed,
    // the engine may have partially executed the turn (side-effecting tool calls +
    // metering), so auto-replaying would duplicate the turn + double-meter. We only
    // treat a retryable error as replay-safe when zero content was received; a
    // retryable error AFTER content is downgraded to non-retryable (hard) below.
    // This is defense in depth — the BFF now also labels post-content drops
    // non-retryable, but the FE must stay safe even if some path mislabels.
    const turnContent = { received: false };

    const readPayloadChunk = (
      payload: Record<string, unknown>,
      eventType?: string
    ): { done?: boolean; chunk?: string; agentUrl?: string } => {
      const payloadType = typeof payload.type === "string" ? payload.type : "";
      const payloadHasText =
        (typeof payload.delta === "string" && payload.delta.length > 0) ||
        (typeof payload.token === "string" && payload.token.length > 0) ||
        (typeof payload.text === "string" && payload.text.length > 0) ||
        (typeof payload.textResponse === "string" && payload.textResponse.length > 0) ||
        (typeof payload.chunk === "string" && payload.chunk.length > 0) ||
        (typeof payload.content === "string" && payload.content.length > 0) ||
        (typeof payload.message === "string" && payload.message.length > 0);
      if (eventType === "token" || payloadType === "token") {
        if (payloadHasText) turnContent.received = true;
      }
      const trackChunk = (chunk: string): { chunk: string } => {
        if (chunk) turnContent.received = true;
        return { chunk };
      };
      if (isZakiAgentSpace && (eventType === "ready" || eventType === "reply_start")) {
        if (eventType === "reply_start") {
          markZakiBotReplyStart({ ...payload, type: "reply_start" });
        }
        return {};
      }
      if (isZakiAgentSpace && eventType === "token") {
        const tokenChunk =
          (typeof payload.delta === "string" && payload.delta) ||
          (typeof payload.token === "string" && payload.token) ||
          (typeof payload.text === "string" && payload.text) ||
          (typeof payload.chunk === "string" && payload.chunk) ||
          (typeof payload.content === "string" && payload.content) ||
          "";
        return tokenChunk ? trackChunk(tokenChunk) : {};
      }
      if (isZakiAgentSpace && payloadType === "token") {
        const tokenChunk =
          (typeof payload.delta === "string" && payload.delta) ||
          (typeof payload.token === "string" && payload.token) ||
          (typeof payload.text === "string" && payload.text) ||
          (typeof payload.chunk === "string" && payload.chunk) ||
          (typeof payload.content === "string" && payload.content) ||
          "";
        return tokenChunk ? trackChunk(tokenChunk) : {};
      }
      if (
        eventType === "done" ||
        payloadType === "done" ||
        payload.close === true ||
        payloadType === "finalizeResponseStream"
      ) {
        if (isZakiAgentSpace) {
          if (payload.tool_only_turn === true || payload.toolOnlyTurn === true) {
            pushNullalisTranscriptEntry(
              extractNullalisTranscriptEntry("tool_only_summary", payload)
            );
          }
          const usageSummary = extractNullalisUsageSummary(payload);
          if (usageSummary) {
            setZakiUsageSummary(usageSummary);
          }
          if (typeof payload.duration_ms === "number") {
            setTurnDurationMs(payload.duration_ms);
          }
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("done", payload));
          setNullalisNarrationFrame(null);
        }
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("done");
        }
        // Tear down the browser view-feed when the turn ends (contract §4).
        // Bounds per-session frame retention: at most the in-flight turn's
        // latest frame is held; the close button remains a manual early-clear.
        {
          const sessionKey =
            activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
          if (sessionKey) {
            setSessionBrowserFrame(sessionKey, null);
          }
        }
        const finalChunk =
          isZakiAgentSpace
            ? (typeof payload.message === "string" && payload.message) ||
              (typeof payload.text === "string" && payload.text) ||
              (typeof payload.content === "string" && payload.content) ||
              ""
            : "";
        if (finalChunk) {
          turnContent.received = true;
          return { done: true, chunk: finalChunk };
        }
        return { done: true };
      }
      if (eventType === "error") {
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("error");
        }
        const msg =
          (typeof payload.message === "string" && payload.message) ||
          (typeof payload.error === "string" && payload.error) ||
          "Agent stream failed.";
        // P1-12 follow-up (Wave A): only honor retryable when NO content has been
        // received for this turn. A retryable error AFTER content means the turn may
        // have partially executed (tool calls + metering), so auto-replaying would
        // duplicate the turn + double-meter — treat it as a hard error instead.
        const retryable = resolveTurnRetryable(payload.retryable === true, turnContent.received);
        throw new ChatRequestError(
          msg,
          502,
          typeof payload.code === "string" ? payload.code : "chat_error",
          retryable
        );
      }

      if (isMemoryPipelineEnabled && eventType === "memory_used" && Array.isArray(payload.sources)) {
        updateAssistantSources(
          threadSlug,
          assistantId,
          payload.sources as Array<{ id: string; content: string; type: string }>
        );
        return {};
      }
      if (isMemoryPipelineEnabled && payload?.type === "memoryUsed" && Array.isArray(payload.sources)) {
        updateAssistantSources(
          threadSlug,
          assistantId,
          payload.sources as Array<{ id: string; content: string; type: string }>
        );
        return {};
      }
      // Doc-grounding citations (independent of the memory pipeline flag) — the BFF emits these from the
      // workspace vector chunks it pre-injected into the agent turn.
      if (payload?.type === "docSources" && Array.isArray(payload.sources)) {
        updateAssistantDocSources(
          threadSlug,
          assistantId,
          payload.sources as DocSource[]
        );
        return {};
      }

      if (payload?.type === "agentInitWebsocketConnection") {
        const agentUrl = resolveAgentUrl(payload);
        if (agentUrl) {
          return { agentUrl };
        }
      }
      // **D1.5** — nullalis tool_only_turn event (D1.4 emit). Fires
      // when the model produced tool/spawn calls but no post-tool
      // assistant text. Without this handler, the gateway falls back
      // to emitting EMPTY_TURN_PLACEHOLDER text ("[tools ran, no
      // direct reply this turn — results may arrive on a follow-up.]")
      // which the user reads as the final reply and closes the
      // window before the async subagent result arrives. With this
      // handler, the frontend can render structured chrome instead.
      //
      // Minimum-viable implementation: log + push as a transcript
      // entry so the chrome rail shows "[N tools ran, M subagents
      // dispatched]". Full UX (replacing the placeholder text bubble
      // with a structured "awaiting subagent" tile + deep-link to
      // task status) is a follow-up after the design is locked.
      if (
        isZakiAgentSpace &&
        (eventType === "tool_only_turn" ||
          payloadType === "tool_only_turn" ||
          eventType === "tool_only_summary" ||
          payloadType === "tool_only_summary")
      ) {
        const toolCount =
          typeof payload.tool_calls_executed === "number"
            ? (payload.tool_calls_executed as number)
            : typeof payload.toolCallsExecuted === "number"
              ? (payload.toolCallsExecuted as number)
              : 0;
        const taskIds = Array.isArray(payload.spawned_task_ids)
          ? (payload.spawned_task_ids as string[])
          : Array.isArray(payload.spawnedTaskIds)
            ? (payload.spawnedTaskIds as string[])
          : [];
        const iters =
          typeof payload.iterations_used === "number"
            ? (payload.iterations_used as number)
            : typeof payload.iterationsUsed === "number"
              ? (payload.iterationsUsed as number)
              : 0;
        // eslint-disable-next-line no-console
        console.info("[zaki-runtime] tool_only_summary", {
          tool_calls_executed: toolCount,
          spawned_task_ids: taskIds,
          iterations_used: iters,
        });
        pushNullalisTranscriptEntry(
          extractNullalisTranscriptEntry(eventType || payloadType || "tool_only_summary", payload)
        );
        // Don't return done — the gateway will still emit a final
        // chunk (placeholder or real) plus the close frame.
        return {};
      }
      if (eventType === "system_notice" || payloadType === "system_notice") {
        const notice = extractSystemNoticePayload(payload);
        if (notice) emitSystemNotice(notice);
        return {};
      }
      if (isZakiAgentSpace) {
        if (eventType === "progress" || payloadType === "progress") {
          const frame = extractNullalisNarrationFrame(payload);
          if (frame) {
            pushNullalisNarrationFrame(payload);
            return {};
          }
          pushZakiBotProgressEvent(payload, "progress");
          return {};
        }
        if (eventType === "tool_start" || payloadType === "tool_start") {
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("tool_start", payload));
          upsertZakiBotToolCall({
            ...payload,
            type: "toolCallInvocation",
            name: payload.name ?? payload.tool,
            tool: payload.tool ?? payload.name,
          });
          upsertNullalisTodoTaskItems(payload);
          return {};
        }
        if (eventType === "tool_result" || payloadType === "tool_result") {
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("tool_result", payload));
          applyZakiBotToolResult({ ...payload, type: "tool_result" });
          upsertNullalisTodoTaskItems(payload);
          return {};
        }
        if (eventType === "task_update" || payloadType === "task_update") {
          upsertNullalisTaskItem(payload);
          return {};
        }
        if (eventType === "subagent_completion" || payloadType === "subagent_completion") {
          const taskId =
            (typeof payload.task_id === "string" && payload.task_id.trim()) ||
            (typeof payload.taskId === "string" && payload.taskId.trim()) ||
            (typeof payload.id === "string" && payload.id.trim()) ||
            "";
          if (taskId) {
            upsertNullalisTaskItem({
              ...payload,
              task_id: taskId,
              status: payload.status ?? payload.state ?? (payload.success === false ? "failed" : "done"),
              description:
                payload.description ??
                payload.summary ??
                payload.result_summary ??
                payload.resultSummary ??
                "Subagent completed",
            });
          }
          pushNullalisTranscriptEntry(
            extractNullalisTranscriptEntry("subagent_completion", payload)
          );
          return {};
        }
        if (eventType === "artifact_event" || payloadType === "artifact_event") {
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("artifact_event", payload));
          void handleAgentArtifactEvent(payload);
          return {};
        }
        if (eventType === "audio_reply" || payloadType === "audio_reply") {
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("audio_reply", payload));
          return {};
        }
        if (eventType === "approval_required" || payloadType === "approval_required") {
          handleNullalisApprovalRequired(payload);
          return {};
        }
        if (eventType === "reasoning_summary" || payloadType === "reasoning_summary") {
          updateNullalisReasoningSummary(payload);
          return {};
        }
        if (eventType === "browser_frame" || payloadType === "browser_frame") {
          const sessionKey =
            activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
          if (sessionKey && typeof payload.frame === "string" && (payload.frame as string).length > 0) {
            setSessionBrowserFrame(sessionKey, {
              sessionId: String(payload.session_id ?? ""),
              frame: String(payload.frame ?? ""),
              url: String(payload.url ?? ""),
              title: String(payload.title ?? ""),
              runId: typeof payload.run_id === "string" ? payload.run_id : undefined,
              timestamp: Date.now(),
            });
          }
          return {};
        }
        if (
          eventType === "status" ||
          payloadType === "statusResponse" ||
          payloadType === "status"
        ) {
          pushNullalisTranscriptEntry(
            extractNullalisTranscriptEntry(eventType || payloadType, payload)
          );
          pushZakiBotProgressEvent(payload, "status");
          return {};
        }
      }
      // Fallback handlers — use isZakiAgentSpace (frozen at call time) rather
      // than isZakiBotActiveSpace (reactive) so a mid-stream space switch can't
      // route events to the wrong state.
      if (eventType === "progress" || payload?.type === "progress") {
        if (isZakiAgentSpace) {
          pushZakiBotProgressEvent(payload, "progress");
        }
        return {};
      }
      if (
        eventType === "status" ||
        payload?.type === "statusResponse" ||
        payload?.type === "toolCallInvocation"
      ) {
        if (isZakiAgentSpace) {
          if (payload?.type === "toolCallInvocation") {
            upsertZakiBotToolCall(payload);
            return {};
          }
          pushZakiBotProgressEvent(payload, "status");
          return {};
        }
        return {};
      }
      if (eventType === "reasoning_summary" || payload?.type === "reasoning_summary") {
        if (isZakiAgentSpace) {
          updateNullalisReasoningSummary(payload);
        }
        return {};
      }
      if (eventType === "reply_start" || payload?.type === "reply_start") {
        if (isZakiAgentSpace) {
          markZakiBotReplyStart(payload);
        }
        return {};
      }
      if (payload?.type === "toolCallResult" || payload?.type === "tool_result") {
        if (isZakiAgentSpace) {
          pushNullalisTranscriptEntry(extractNullalisTranscriptEntry("tool_result", payload));
          applyZakiBotToolResult(payload);
        }
        return {};
      }
      if (payload?.type === "abort" && typeof payload.error === "string" && payload.error.trim()) {
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("error");
        }
        throw new Error(payload.error.trim());
      }

      if (payload?.type === "error" || payload?.error === true) {
        if (isZakiAgentSpace) {
          finalizeZakiBotProgress("error");
        }
        const errorMessage =
          (typeof payload.message === "string" && payload.message.trim()) ||
          (typeof payload.error === "string" && payload.error.trim()) ||
          "ZAKI couldn't finish that reply. Please try again.";
        // P1-12 follow-up (Wave A): a retryable error after content was received is
        // unsafe to auto-replay (partial turn → duplicate + double-meter). Downgrade.
        const retryable = resolveTurnRetryable(payload.retryable === true, turnContent.received);
        throw new ChatRequestError(
          errorMessage,
          502,
          typeof payload.code === "string" ? payload.code : "chat_error",
          retryable
        );
      }

      // C3: system notice events — handle before the isZakiAgentSpace text filter
      // so that these events surface on all views (not just agent mode).
      if (
        eventType === "system_notice" || payloadType === "system_notice" ||
        eventType === "compaction" || eventType === "provider_fallback" ||
        eventType === "connector_stale" || eventType === "multimodal_failure"
      ) {
        const notice: SystemNoticePayload | null =
          eventType === "system_notice" || payloadType === "system_notice"
            ? (() => {
                const kind = (
                  typeof payload.kind === "string" ? payload.kind : "system_notice"
                ) as SystemNoticeKind;
                const message =
                  typeof payload.message === "string" ? payload.message : null;
                return { kind, message };
              })()
            : ({
                kind: eventType as SystemNoticeKind,
                message: (payload as { message?: string }).message ?? null,
              } as SystemNoticePayload);
        if (notice) emitSystemNotice(notice);
        return {};
      }

      // Normal Spaces always-agent narration. The engine streams `agentThought`
      // status lines and `fileDownload` events on the per-turn SSE; the nullALIS
      // agent space surfaces these through its own rail, so we ONLY handle them
      // here for the normal Spaces path (!isZakiAgentSpace). They never become
      // answer text — agentThought maps to a step, fileDownload to a chip.
      if (!isZakiAgentSpace) {
        if (eventType === "agentThought" || payloadType === "agentThought") {
          const thought = typeof payload.thought === "string" ? payload.thought : "";
          const step = agentThoughtToStep(thought);
          if (step) {
            appendAssistantAgentStep(threadSlug, assistantId, step);
          }
          return {};
        }
        if (eventType === "fileDownload" || payloadType === "fileDownload") {
          const fd = (payload.fileDownload ?? null) as
            | { filename?: unknown; storageFilename?: unknown; fileSize?: unknown }
            | null;
          const filename = typeof fd?.filename === "string" ? fd.filename : "";
          const storageFilename =
            typeof fd?.storageFilename === "string" ? fd.storageFilename : "";
          if (filename && storageFilename) {
            appendAssistantGeneratedFile(threadSlug, assistantId, {
              filename,
              storageFilename,
              fileSize: typeof fd?.fileSize === "number" ? fd.fileSize : null,
            });
          }
          return {};
        }
      }

      if (isZakiAgentSpace) {
        const explicitTextPayload =
          payloadType === "textResponse" ||
          payloadType === "textResponseChunk" ||
          payloadType === "fullTextResponse" ||
          payloadType === "text";
        if (!explicitTextPayload) {
          return {};
        }
      }

      const chunk =
        (typeof payload.delta === "string" && payload.delta) ||
        (typeof payload.textResponse === "string" && payload.textResponse) ||
        (typeof payload.content === "string" && payload.content) ||
        (typeof payload.message === "string" && payload.message) ||
        "";

      if (!chunk && eventType && process.env.NODE_ENV === "development") {
        console.warn("[zaki:sse] unhandled event type:", eventType, payload);
      }

      return chunk ? trackChunk(chunk) : {};
    };

    const contentType = response.headers.get("content-type") || "";
    applyQuotaHeaders(response.headers, isZakiAgentSpace ? "zaki_bot" : "app_chat");
    let sawTerminalEvent = false;
    
    // If JSON response, check for agent invocation URL
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as Record<string, unknown>;
      const agentUrl = resolveAgentUrl(data);
      if (agentUrl) {
        await streamAgentInvocation(agentUrl, threadSlug, assistantId, signal);
        return buildStreamResult("");
      }

      const result = readPayloadChunk(data);
      if (result.agentUrl) {
        await streamAgentInvocation(result.agentUrl, threadSlug, assistantId, signal);
        return buildStreamResult("");
      }
      if (result.chunk) {
        if (isZakiAgentSpace && isInternalAgentReplyContent(result.chunk, { streaming: false })) {
          return buildStreamResult("");
        }
        const normalized = normalizeAssistantFormatting(message, result.chunk);
        updateAssistantContent(
          threadSlug,
          assistantId,
          normalized
        );
        onContent?.(normalized);
        return buildStreamResult(normalized);
      }
      if (result.done) {
        sawTerminalEvent = true;
      }
      if (isZakiAgentSpace && !sawTerminalEvent && !signal?.aborted) {
        finalizeZakiBotProgress("stream_end");
      }
      return buildStreamResult("");
    }

    if (!response.body) {
      throw new Error("Chat stream returned no data.");
    }

    // Stream SSE/text response
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let accumulated = "";
    let buffer = "";
    let streamClosed = false;
    let renderedLength = 0;
    let renderRaf: number | null = null;

    const flushRenderedContent = () => {
      if (renderRaf != null) {
        window.cancelAnimationFrame(renderRaf);
        renderRaf = null;
      }
      if (renderedLength === accumulated.length) return;
      renderedLength = accumulated.length;
      updateAssistantContent(threadSlug, assistantId, accumulated);
    };

    const appendChunk = (chunk: string) => {
      if (!chunk) return;
      turnContent.received = true;
      accumulated += chunk;
      onContent?.(accumulated);
      if (renderRaf != null) return;
      renderRaf = window.requestAnimationFrame(() => {
        renderRaf = null;
        if (renderedLength === accumulated.length) return;
        renderedLength = accumulated.length;
        updateAssistantContent(threadSlug, assistantId, accumulated);
      });
    };

    const appendAgentDisplayChunk = (chunk: string) => {
      if (!chunk) return;
      if (isZakiAgentSpace && isInternalAgentReplyContent(chunk, { streaming: true })) {
        return;
      }
      appendChunk(chunk);
    };

    const processRawData = async (raw: string) => {
      const value = raw.trim();
      if (!value || value === "[DONE]") {
        if (value === "[DONE]") {
          streamClosed = true;
          sawTerminalEvent = true;
          if (isZakiAgentSpace) {
            finalizeZakiBotProgress("done");
          }
        }
        return;
      }
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(value) as Record<string, unknown>;
      } catch {
        appendAgentDisplayChunk(raw);
        return;
      }

      const result = readPayloadChunk(payload);
        if (result.agentUrl) {
          streamClosed = true;
          await streamAgentInvocation(result.agentUrl, threadSlug, assistantId, signal);
          accumulated = "";
          return;
        }
      if (result.chunk) {
        appendAgentDisplayChunk(result.chunk);
      }
      if (result.done) {
        sawTerminalEvent = true;
        flushRenderedContent();
        streamClosed = true;
        return;
      }
    };

    const processSseBlock = async (block: string) => {
      const normalized = block.replace(/\r/g, "");
      const lines = normalized.split("\n");
      const dataLines: string[] = [];
      let eventType = "";

      for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line || line.startsWith(":")) continue;
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
          continue;
        }
        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
          continue;
        }
        // Fallback: non-SSE chunked line
        await processRawData(line);
      }

      if (dataLines.length > 0) {
        const payloadText = dataLines.join("\n");
        // Only JSON.parse is allowed to fall back to processRawData. readPayloadChunk
        // is INTENTIONAL about throwing a ChatRequestError on an `event: error` frame
        // (P1-12 replay relies on that throw propagating to the send loop); keep it
        // OUTSIDE the parse-fallback catch so the error is never swallowed + lost.
        let payload: Record<string, unknown> | null = null;
        try {
          payload = JSON.parse(payloadText) as Record<string, unknown>;
        } catch {
          await processRawData(payloadText);
          return;
        }
        const result = readPayloadChunk(payload, eventType);
        if (result.chunk) {
          appendAgentDisplayChunk(result.chunk);
        }
        if (result.done) {
          sawTerminalEvent = true;
          flushRenderedContent();
          streamClosed = true;
          return;
        }
        if (result.agentUrl) {
          flushRenderedContent();
          await streamAgentInvocation(result.agentUrl, threadSlug, assistantId, signal);
          try {
            await reader.cancel();
          } catch {
            // ignore cancel errors
          }
          streamClosed = true;
          return;
        }
        return;
      }
    };

    while (!streamClosed) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });

      // Handle SSE event boundaries when present
      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        await processSseBlock(block);
        if (streamClosed) break;
        separatorIndex = buffer.indexOf("\n\n");
      }
    }

    const trailing = buffer.trim();
    if (!streamClosed && trailing) {
      await processSseBlock(trailing);
    }

    if (isZakiAgentSpace && !sawTerminalEvent && !signal?.aborted) {
      finalizeZakiBotProgress("stream_end");
    }

    // Normal Spaces: the turn is finished — stop the narration spinner. Any
    // collected steps/file chips stay rendered. No-op for the agent space.
    if (!isZakiAgentSpace) {
      setAssistantAgentRunning(threadSlug, assistantId, false);
    }

    flushRenderedContent();
    const finalized = normalizeAssistantFormatting(message, accumulated);
    if (finalized && finalized !== accumulated) {
      updateAssistantContent(threadSlug, assistantId, finalized);
    }
    onContent?.(finalized || accumulated);
    return buildStreamResult(finalized || accumulated);
  }, [
    appendAssistantAgentStep,
    appendAssistantGeneratedFile,
    applyQuotaHeaders,
    applyZakiBotToolResult,
    authUserId,
    finalizeZakiBotProgress,
    handleAgentArtifactEvent,
    handleNullalisApprovalRequired,
    isRtl,
    isZakiBotActiveSpace,
    isMemoryPipelineEnabled,
    markZakiBotReplyStart,
    setAssistantAgentRunning,
    pushNullalisNarrationFrame,
    pushNullalisTranscriptEntry,
    pushZakiBotProgressEvent,
    queryModeEnabled,
    responseFormattingConfig.disableResponseEnvelope,
    spacesList,
    streamAgentInvocation,
    // WP-C: the error path resolves copy through the i18n taxonomy. `t` is referentially
    // stable in react-i18next except across a language change — which re-renders anyway.
    t,
    updateAssistantContent,
    updateAssistantSources,
    updateAssistantDocSources,
    updateNullalisReasoningSummary,
    upsertNullalisTaskItem,
    upsertNullalisTodoTaskItems,
    upsertZakiBotToolCall,
  ]);

  const clearMemoryToastDismiss = useCallback(() => {
    if (autoDismissTimerRef.current) {
      window.clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
  }, []);

  const dismissMemoryToast = useCallback(() => {
    setShowMemoryToast(false);
    setRecentSavedMemories([]);
    setRecentSupersededCount(0);
    setRecentDuplicateCount(0);
    setMemoryToastSource("chat");
    setMemoryToastUndoError(null);
    setMemoryToastPartialUndoCount(0);
    clearMemoryToastDismiss();
  }, [clearMemoryToastDismiss]);

  const scheduleMemoryToastDismiss = useCallback(() => {
    clearMemoryToastDismiss();
    autoDismissTimerRef.current = window.setTimeout(() => {
      dismissMemoryToast();
    }, 5000);
  }, [clearMemoryToastDismiss, dismissMemoryToast]);

  const presentMemoryToast = useCallback(
    ({
      saved,
      supersededCount = 0,
      duplicateCount = 0,
      source = "chat",
    }: {
      saved: MemoryCaptureResponse["saved"];
      supersededCount?: number;
      duplicateCount?: number;
      source?: "chat" | "import";
    }) => {
      const shouldShow = saved.length > 0 || supersededCount > 0 || duplicateCount > 0;
      setRecentSavedMemories(saved);
      setRecentSupersededCount(supersededCount);
      setRecentDuplicateCount(duplicateCount);
      setMemoryToastSource(source);
      setShowMemoryToast(shouldShow);

      if (!shouldShow) {
        clearMemoryToastDismiss();
        return;
      }

      scheduleMemoryToastDismiss();
    },
    [clearMemoryToastDismiss, scheduleMemoryToastDismiss]
  );

  const openMemoryViewer = useCallback((query?: string, tab?: MemoryViewerTab) => {
    openSpacesMemoryViewer({ enabled: isMemoryPipelineEnabled, query, tab });
  }, [isMemoryPipelineEnabled]);

  const openAgentInspectorTab = useCallback((tab: AgentInspectorTab) => {
    const mobile =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(AGENT_MOBILE_PANEL_QUERY).matches;
    setAgentFocusMode(false);
    if (mobile) {
      setAgentMobileInspectorOpen(true);
    } else {
      setAgentMobileInspectorOpen(false);
      setAgentInspectorOpen(true);
    }
    setAgentInspectorTabRequest((previous) => ({
      tab,
      id: (previous?.id ?? 0) + 1,
    }));
  }, []);

  const openAgentArtifactCanvas = useCallback((artifact: AgentInspectorArtifact) => {
    setSelectedAgentArtifact(artifact);
    setAgentFocusMode(false);
    setAgentMobileInspectorOpen(false);
  }, []);

  const handleAgentArtifactRevisionRequest = useCallback((draft: string) => {
    composerHandleRef.current?.setDraft(draft);
    toast.info(
      t("agent.artifactCanvas.revisionDrafted", {
        defaultValue: "Revision request drafted in the composer.",
      })
    );
  }, [t]);

  const openAgentMemorySurface = useCallback(() => {
    setAgentMobileInspectorOpen(false);
    navigate("/brain");
  }, [navigate]);

  useEffect(() => {
    if (!isAgentSurface) return;
    const handleAgentShare = () => handleShare();
    const handleAgentReviewMemories = () => openAgentMemorySurface();
    const handleAgentExport = () => handleExport();
    window.addEventListener("zaki:agent-share", handleAgentShare);
    window.addEventListener("zaki:agent-review-memories", handleAgentReviewMemories);
    window.addEventListener("zaki:agent-export", handleAgentExport);
    return () => {
      window.removeEventListener("zaki:agent-share", handleAgentShare);
      window.removeEventListener("zaki:agent-review-memories", handleAgentReviewMemories);
      window.removeEventListener("zaki:agent-export", handleAgentExport);
    };
  }, [handleExport, handleShare, isAgentSurface, openAgentMemorySurface]);

  const maybeShowSessionSummaryCue = useCallback(
    async (threadId?: string | null) => {
      if (!authUserId || !isMemoryPipelineEnabled) return;
      const pendingSummary = pendingSessionSummaryRef.current;
      const scopedThreadId = String(threadId || pendingSummary?.threadId || "").trim();
      if (!pendingSummary || !scopedThreadId || pendingSummary.threadId !== scopedThreadId) {
        return;
      }

      try {
        const { response, data } = await fetchMemoryActivity(8);
        if (!response.ok) return;
        const activities = Array.isArray(data?.activities) ? data.activities : [];
        const matchingActivity = activities.find((activity: MemoryActivity) => {
          const activityThreadId = String(activity?.threadId || "").trim();
          const occurredAt = Date.parse(String(activity?.occurredAt || ""));
          if (!activityThreadId || activityThreadId !== scopedThreadId) return false;
          if (!Number.isFinite(occurredAt) || occurredAt < pendingSummary.queuedAt - 1000) {
            return false;
          }
          return ["saved", "superseded", "edited"].includes(String(activity?.kind || ""));
        });

        if (!matchingActivity) return;
        const cueKey = `${matchingActivity.kind}:${matchingActivity.id}:${matchingActivity.occurredAt}`;
        if (sessionSummaryCueKeyRef.current === cueKey) return;
        sessionSummaryCueKeyRef.current = cueKey;
        pendingSessionSummaryRef.current = null;

        toast.info(t("memory.sessionSummaryUpdated"), {
          action: {
            label: t("memory.open"),
            onClick: () => openMemoryViewer(undefined, "memories"),
          },
        });
      } catch {
        // Best-effort cue only.
      }
    },
    [authUserId, isMemoryPipelineEnabled, openMemoryViewer, t]
  );

  const syncMemoryStatus = useCallback(async () => {
    if (!authUserId || !isMemoryPipelineEnabled) return;
    try {
      const statusResponse = await apiRequest("/api/memory/status");
      if (!statusResponse.ok) return;
      // Contradictions are auto-resolved server-side now; /api/memory/status
      // is only used to drive the session-summary cue.
      memoryStatusHydratedRef.current = true;
      void maybeShowSessionSummaryCue();
    } catch {
      // Sync is best-effort and should never block chat.
    }
  }, [authUserId, isMemoryPipelineEnabled, maybeShowSessionSummaryCue]);

  const requestMemoryStatusSync = useCallback(
    (force = false) => {
      if (!authUserId || !isMemoryPipelineEnabled) return;
      const now = Date.now();
      const elapsed = now - lastMemoryStatusSyncAtRef.current;
      if (!force && elapsed < MEMORY_STATUS_SYNC_THROTTLE_MS) {
        return;
      }
      lastMemoryStatusSyncAtRef.current = now;
      void syncMemoryStatus();
    },
    [authUserId, isMemoryPipelineEnabled, syncMemoryStatus]
  );

  const checkForSavedMemories = useCallback(async (message: string, threadId?: string) => {
    if (!authUserId || !isMemoryPipelineEnabled) return;
    if (memoryInFlightRef.current) {
      queuedMemoryCheckRef.current = { message, threadId };
      return;
    }

    lastMemoryRequestRef.current = { message, threadId };
    memoryInFlightRef.current = true;

    try {
      const { response, data } = await captureMemory({
        message,
        threadId: threadId ?? activeThreadId,
      });

      if (!response.ok || !data) {
        setMemoryError("Memory save failed. Retry?");
        return;
      }

      setMemoryError(null);
      setMemoryToastUndoError(null);
      setMemoryToastPartialUndoCount(0);
      const saved = Array.isArray(data.saved) ? data.saved : [];
      const superseded = Array.isArray(data.superseded) ? data.superseded : [];
      const duplicates = Array.isArray(data.duplicates) ? data.duplicates : [];

      if (saved.length === 0 && superseded.length === 0 && duplicates.length > 0) {
        const firstDuplicate = String(duplicates[0]?.content || "").trim();
        toast.info(
          duplicates.length === 1 && firstDuplicate
            ? t("memory.duplicateSingle", { content: firstDuplicate })
            : t("memory.duplicateMultiple", { count: duplicates.length })
        );
        return;
      }

      if (saved.length > 0) {
        if (authUserId && !activationProgress.firstMemorySaved) {
          const nextProgress = markFirstMemorySaved(authUserId);
          setActivationProgress(nextProgress);
          void trackProductEvent({
            event: "first_memory_saved",
            source: "chat_input",
            language: isRtl ? "ar" : "en",
            plan: null,
            interval: null,
          }).catch(() => {
            // Best-effort telemetry only.
          });
          if (nextProgress.completed) {
            void trackProductEvent({
              event: "activation_completed",
              source: "chat_input",
              language: isRtl ? "ar" : "en",
              plan: null,
              interval: null,
            }).catch(() => {
              // Best-effort telemetry only.
            });
          }
        }
      }
      presentMemoryToast({
        saved,
        supersededCount: superseded.length,
      });
    } catch (err) {
      // Silent fail - not critical for chat
      setMemoryError("Memory save failed. Retry?");
    } finally {
      memoryInFlightRef.current = false;
      requestMemoryStatusSync();
      if (queuedMemoryCheckRef.current) {
        const next = queuedMemoryCheckRef.current;
        queuedMemoryCheckRef.current = null;
        checkForSavedMemories(next.message, next.threadId);
      }
    }
  }, [
    authUserId,
    activationProgress.firstMemorySaved,
    activeThreadId,
    isMemoryPipelineEnabled,
    isRtl,
    presentMemoryToast,
    requestMemoryStatusSync,
    t,
  ]);

  useEffect(() => {
    if (!isMemoryPipelineEnabled) {
      memoryStatusHydratedRef.current = false;
      lastMemoryStatusSyncAtRef.current = 0;
      pendingSessionSummaryRef.current = null;
      sessionSummaryCueKeyRef.current = null;
      queuedMemoryCheckRef.current = null;
      memoryInFlightRef.current = false;
      if (
        memoryToastSource !== "import" &&
        (showMemoryToast ||
          recentSavedMemories.length > 0 ||
          recentSupersededCount > 0 ||
          memoryToastUndoError ||
          memoryToastPartialUndoCount > 0)
      ) {
        dismissMemoryToast();
      }
      if (memoryError !== null) setMemoryError(null);
      return;
    }
    if (!authUserId) {
      memoryStatusHydratedRef.current = false;
      lastMemoryStatusSyncAtRef.current = 0;
      pendingSessionSummaryRef.current = null;
      sessionSummaryCueKeyRef.current = null;
      return;
    }
    requestMemoryStatusSync(true);
  }, [
    authUserId,
    dismissMemoryToast,
    isMemoryPipelineEnabled,
    memoryError,
    memoryToastSource,
    memoryToastPartialUndoCount,
    memoryToastUndoError,
    recentSavedMemories.length,
    recentSupersededCount,
    requestMemoryStatusSync,
    showMemoryToast,
  ]);

  useEffect(() => {
    if (!authUserId || !isMemoryPipelineEnabled) return;
    let cancelled = false;
    let reconnectTimer: number | null = null;
    let controller: AbortController | null = null;

    const connect = async () => {
      while (!cancelled) {
        controller = new AbortController();
        try {
          const response = await apiRequest("/api/memory/events", {
            method: "GET",
            headers: { Accept: "text/event-stream" },
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error(`SSE connection failed (${response.status})`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!cancelled) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let boundary = buffer.indexOf("\n\n");
            while (boundary !== -1) {
              const block = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);

              let eventName = "message";
              const dataLines = [];
              for (const rawLine of block.split("\n")) {
                const line = rawLine.trimEnd();
                if (!line || line.startsWith(":")) continue;
                if (line.startsWith("event:")) {
                  eventName = line.slice(6).trim();
                  continue;
                }
                if (line.startsWith("data:")) {
                  dataLines.push(line.slice(5).trim());
                }
              }

              if (eventName === "status") {
                // Contradictions are auto-resolved server-side; the status event
                // now only signals the open memory panel to refetch its dossier.
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("zaki:memory-changed"));
                }
              }

              boundary = buffer.indexOf("\n\n");
            }
          }
        } catch {
          // Push updates are best-effort; focus/visibility refresh remains fallback.
        } finally {
          controller = null;
        }

        if (cancelled) break;
        await new Promise<void>((resolve) => {
          reconnectTimer = window.setTimeout(resolve, 1500);
        });
      }
    };

    void connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      controller?.abort();
    };
  }, [authUserId, isMemoryPipelineEnabled]);

  useEffect(() => {
    if (!authUserId || !isMemoryPipelineEnabled) return;

    const handleFocus = () => {
      requestMemoryStatusSync(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestMemoryStatusSync(true);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authUserId, isMemoryPipelineEnabled, requestMemoryStatusSync]);

  const ensureZakiBotProvisioned = useCallback(
    async () => {
      if (!isZakiBotActiveSpace) return true;
      if (!authUserId || !isAuthReady) return false;
      if (zakiBotProvisionedRef.current) {
        setZakiBotProvisionReady(true);
        setZakiBotProvisionState("ready");
        setZakiBotProvisionError(null);
        return true;
      }
      if (zakiBotProvisionPromiseRef.current) {
        return zakiBotProvisionPromiseRef.current;
      }

      const generation = zakiBotProvisionGenerationRef.current;
      const pending = (async () => {
        setZakiBotProvisionReady(false);
        setZakiBotProvisionState("loading");
        setZakiBotProvisionError(null);
        const { response, data } = await provisionAgent({
          spaceId: ZAKI_BOT_SPACE_ID,
          threadId: activeThreadId || ZAKI_BOT_THREAD_ID,
        });
        if (!response.ok) {
          // WP-C — this is THE line that put "invalid_session_key" on a brand-new
          // account's first screen: it preferred `error` (the machine code) over
          // `message` (the human sentence), then rendered it in the banner AND a toast.
          // Precedence is now message → taxonomy(code) → generic. Never the raw code.
          const payload = data as
            | { error?: string; message?: string; code?: string }
            | null;
          const code =
            payload?.code ||
            (looksLikeMachineCode(payload?.error) ? payload?.error : null) ||
            codeFromHttpStatus(response.status);
          // `error` is still read as COPY — but only when it is demonstrably human.
          // A code-shaped `error` is discarded and resolved through the taxonomy instead.
          const message = resolveErrorMessage(
            { code, message: payload?.message, error: payload?.error },
            t
          );
          if (generation !== zakiBotProvisionGenerationRef.current) return false;
          setZakiBotProvisionState("error");
          setZakiBotProvisionError(message);
          toast.error(message);
          return false;
        }
        if (generation !== zakiBotProvisionGenerationRef.current) return false;
        zakiBotProvisionedRef.current = true;
        setZakiBotProvisionReady(true);
        setZakiBotProvisionState("ready");
        setZakiBotProvisionError(null);
        return true;
      })()
        .catch((error) => {
          if (generation !== zakiBotProvisionGenerationRef.current) return false;
          const isTimeout =
            error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
          const message = isTimeout
            ? "ZAKI took too long to initialize. Check your connection and retry."
            : error instanceof Error
              ? error.message
              : "Unable to initialize ZAKI.";
          setZakiBotProvisionState("error");
          setZakiBotProvisionError(message);
          toast.error(message);
          return false;
        })
        .finally(() => {
          if (generation === zakiBotProvisionGenerationRef.current) {
            zakiBotProvisionPromiseRef.current = null;
          }
        });

      zakiBotProvisionPromiseRef.current = pending;
      return pending;
    },
    [activeThreadId, authUserId, isAuthReady, isZakiBotActiveSpace]
  );

  useEffect(() => {
    zakiBotProvisionGenerationRef.current += 1;
    zakiBotProvisionedRef.current = false;
    zakiBotProvisionPromiseRef.current = null;
    setZakiBotProvisionReady(false);
    setZakiBotProvisionState("idle");
    setZakiBotProvisionError(null);
  }, [authUserId]);

  useEffect(() => {
    if (!authUserId || !isZakiBotActiveSpace || !isAuthReady) return;
    void ensureZakiBotProvisioned();
  }, [authUserId, ensureZakiBotProvisioned, isAuthReady, isZakiBotActiveSpace]);

  useEffect(() => {
    if (!isAuthReady || !authUserId || !isZakiBotActiveSpace || !zakiBotProvisionReady) {
      setBotOnboarding(null);
      setFirstRunPhase("idle");
      setFirstRunError(null);
      firstRunStartedRef.current = null;
      return;
    }

    let cancelled = false;
    setFirstRunPhase("checking");
    setFirstRunError(null);
    void fetchBotOnboarding()
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok || data?.error) {
          setFirstRunPhase("unavailable");
          return;
        }
        setBotOnboarding(data);
        setFirstRunPhase(data?.completed ? "complete" : "checking");
      })
      .catch(() => {
        if (cancelled) return;
        setFirstRunPhase("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [authUserId, isAuthReady, isZakiBotActiveSpace, zakiBotProvisionReady]);

  useEffect(() => {
    if (isZakiBotActiveSpace) return;
    clearZakiBotProgressVisuals();
  }, [clearZakiBotProgressVisuals, isZakiBotActiveSpace]);

  useEffect(() => {
    if (!isZakiBotActiveSpace) return;
    if (isStreaming) {
      if (zakiBotProcessClearTimerRef.current) {
        window.clearTimeout(zakiBotProcessClearTimerRef.current);
        zakiBotProcessClearTimerRef.current = null;
      }
      setZakiBotProgressTerminalReason(null);
      return;
    }
    if (
      zakiBotToolCalls.length === 0 &&
      zakiBotStatusEvents.length === 0 &&
      !zakiBotReplyStart
    ) {
      return;
    }
    if (zakiBotProcessClearTimerRef.current) {
      window.clearTimeout(zakiBotProcessClearTimerRef.current);
    }
    const latestStatusEvent = zakiBotStatusEvents[zakiBotStatusEvents.length - 1];
    const latestStatusText = String(latestStatusEvent?.text || "").toLowerCase();
    const latestLooksCached =
      latestStatusText.includes("cached response") ||
      latestStatusText.includes("cache hit") ||
      latestStatusText.includes("using cached");

    const clearDelayMs =
      zakiBotProgressTerminalReason === "error"
        ? 2400
        : zakiBotProgressTerminalReason === "abort"
          ? 0
          : latestLooksCached
            ? 1800
            : zakiBotToolCalls.length > 0
              ? 1500
              : 1200;

    if (clearDelayMs <= 0) {
      clearZakiBotProgressVisuals({ preserveNullalisArtifacts: true });
      return;
    }

    zakiBotProcessClearTimerRef.current = window.setTimeout(() => {
      clearZakiBotProgressVisuals({ preserveNullalisArtifacts: true });
    }, clearDelayMs);

    return () => {
      if (zakiBotProcessClearTimerRef.current) {
        window.clearTimeout(zakiBotProcessClearTimerRef.current);
        zakiBotProcessClearTimerRef.current = null;
      }
    };
  }, [
    clearZakiBotProgressVisuals,
    isStreaming,
    isZakiBotActiveSpace,
    zakiBotProgressTerminalReason,
    zakiBotReplyStart,
    zakiBotStatusEvents,
    zakiBotToolCalls,
  ]);

  useEffect(() => {
    setSelectedAgentArtifact(null);
  }, [normalizedActiveZakiSessionKey]);

  // Snapshot the current turn's transcript entries into localTurnSnapshots
  // when the stream ends, so past-turn timelines persist after
  // nullalisTranscriptEntries is cleared on the next turn.
  useEffect(() => {
    const wasStreaming = prevIsStreamingRef.current;
    prevIsStreamingRef.current = isStreaming;
    if (!wasStreaming || isStreaming) return;
    if (!isZakiBotActiveSpace) return;
    const msgId = currentTurnAssistantIdRef.current;
    if (!msgId) return;
    if (!nullalisTranscriptEntries.length) return;
    const snapshot = nullalisTranscriptEntries.slice();
    setLocalTurnSnapshots((prev) => ({ ...prev, [msgId]: snapshot }));
    currentTurnAssistantIdRef.current = null;
    void refreshAgentRuntimePanelData();
  }, [isStreaming, isZakiBotActiveSpace, nullalisTranscriptEntries, refreshAgentRuntimePanelData]);

  // Multi-session: allow any threadId in the agent space (no longer force "main")

  // Handle send message
  const handleSend = useCallback(async (
    text: string,
    files: File[],
    turnOptions?: InputAreaSendOptions,
    preferredWorkspaceSlug?: string | null,
    presentation?: { hideUserMessage?: boolean; firstRun?: boolean }
  ): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Message is empty");
      return false;
    }
    if (!isOnline) {
      toast.error(t("input.offlineToast", {
        defaultValue: "You are offline. Your draft will stay here until the connection returns.",
      }));
      return false;
    }
    if (isStreaming) return false;
    setComposerQuickReplyTriggerId(null);
    setComposerQuickReplyVisible(false);
    if (!authUserId && files.length > 0) {
      toast.error("Sign in to upload files to Spaces.");
      return false;
    }
    // Anonymous visitors always have an implicit default workspace (the
    // "Free daily workspace chat" anon space). A fresh anon session — e.g. the
    // dashboard "Start chat" — may fire before the Sidebar has broadcast its
    // `zaki:spaces-data`, so `spacesList`/`primarySpace` can still be empty and
    // nothing is manually selected. Rather than blocking the core "chat now, no
    // setup" promise with a "select a workspace" error, fall back to the default
    // anonymous space so the send proceeds down the existing `/api/anonymous/...`
    // path (thread creation + daily quota metering + save-this-work all keyed on
    // this slug). Authenticated users still require a real, resolved workspace.
    const resolvedWorkspaceSlug =
      preferredWorkspaceSlug ??
      activeWorkspaceSlug ??
      primarySpace?.id ??
      (!authUserId ? ANONYMOUS_SPACES_WORKSPACE_ID : null);
    if (!resolvedWorkspaceSlug) {
      toast.error("Select a workspace before sending a message");
      return false;
    }

    // A new turn is starting — clear any prior billing-denial card so a stale
    // "out of usage" notice doesn't linger after the user resolves billing.
    // It re-appears automatically if this turn also hits the paywall.
    setPaywallCardData(null);

    const isZakiBotTarget = isZakiBotSpaceId(resolvedWorkspaceSlug);
    const anonymousTurnId = !authUserId
      ? `anonymous-turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      : null;
    const anonymousWork =
      !authUserId
        ? upsertAnonymousWorkItem({
            productId: isZakiBotTarget ? "agent" : "spaces",
            taskKind: isZakiBotTarget ? "plan" : "chat",
            prompt: trimmed,
            route: isZakiBotTarget
              ? "/agent"
              : activeThreadId
                ? `/spaces/${encodeURIComponent(resolvedWorkspaceSlug)}/threads/${encodeURIComponent(activeThreadId)}`
                : `/spaces/${encodeURIComponent(resolvedWorkspaceSlug)}`,
            threadId: activeThreadId,
            turnId: anonymousTurnId ?? undefined,
            meterRemaining: null,
            status: "draft",
          })
        : null;
    if (isZakiBotTarget) {
      const provisioned = await ensureZakiBotProvisioned();
      if (!provisioned) return false;
    }
    // For ZAKI bot without an activeThreadId, generate a new thread slug.
    // The nullalis backend creates the session on first message.
    const generatedZakiThread = isZakiBotTarget && !activeThreadId;
    let createdSpacesThread = false;
    let threadId = activeThreadId || (isZakiBotTarget ? `thread-${Date.now()}` : null);
    if (!threadId) {
      try {
        const response = await apiRequest(
          authUserId
            ? `/workspace/${resolvedWorkspaceSlug}/thread/new`
            : `/api/anonymous/workspace/${resolvedWorkspaceSlug}/thread/new`,
          {
            method: "POST",
            skipAuth: !authUserId,
            body: !authUserId
              ? JSON.stringify({ slug: `anon-${Date.now()}`, name: DEFAULT_THREAD_LABEL })
              : undefined,
          }
        );
        if (!response.ok) {
          throw new Error("Unable to create thread.");
        }
        const data = (await response.json()) as {
          thread?: { slug?: string; id?: string; name?: string; label?: string };
        };
        threadId = data.thread?.slug ?? data.thread?.id ?? `thread-${Date.now()}`;
        createdSpacesThread = true;
        const threadName = stripThreadDisplayName(data.thread?.name ?? data.thread?.label);
        const label = isDefaultThreadLabel(threadName)
          ? DEFAULT_THREAD_LABEL
          : threadName || DEFAULT_THREAD_LABEL;
        window.dispatchEvent(
          new CustomEvent("zaki:thread-created", {
            detail: { id: threadId, label, spaceId: resolvedWorkspaceSlug },
          })
        );
      } catch (error) {
        toast.error("Unable to start a new chat");
        return false;
      }
    }

    if (!threadId) return false;
    if (createdSpacesThread && !isZakiBotTarget) {
      goToThread(resolvedWorkspaceSlug, threadId);
      navigate(
        `/spaces/${encodeURIComponent(resolvedWorkspaceSlug)}/threads/${encodeURIComponent(threadId)}`
      );
    }
    if (anonymousWork && !isZakiBotTarget) {
      upsertAnonymousWorkItem({
        id: anonymousWork.id,
        productId: "spaces",
        taskKind: "chat",
        prompt: trimmed,
        route: `/spaces/${encodeURIComponent(resolvedWorkspaceSlug)}/threads/${encodeURIComponent(threadId)}`,
        threadId,
        turnId: anonymousTurnId ?? undefined,
        meterRemaining: null,
        status: "draft",
      });
    }

    const turnAgentUserId = isZakiBotTarget
      ? agentUserId ||
        resolveAgentSessionUserId(agentUserId, activeZakiSessionKey || zakiSessionKey || null) ||
        (typeof window !== "undefined"
          ? window.sessionStorage.getItem("zaki:agentUserId")
          : null)
      : null;
    const turnSessionKey =
      isZakiBotTarget && turnAgentUserId ? buildAgentSessionKey(threadId, turnAgentUserId) : null;
    if (generatedZakiThread) {
      goToThread(ZAKI_BOT_SPACE_ID, threadId, { zakiSessionKey: turnSessionKey });
      navigate(`/agent?thread=${encodeURIComponent(threadId)}`);
    }
    if (turnSessionKey) {
      const normalizedTurnSessionKey = normalizeZakiSessionKey(turnSessionKey);
      forgetDeletedAgentSessionKey(deletedAgentSessionKeysRef.current, normalizedTurnSessionKey);
      ensureZakiSessionUi(normalizedTurnSessionKey);
      if (activeContextSessionKeyRef.current !== normalizedTurnSessionKey) {
        setSessionContextPressure(turnSessionKey, null);
        setNullalisContextGauge(null);
      }
    }

    if (authUserId && !activationProgress.firstMessageSent && !presentation?.firstRun) {
      const nextProgress = markFirstMessageSent(authUserId);
      setActivationProgress(nextProgress);
      void trackProductEvent({
        event: "first_message_sent",
        source: "chat_input",
        language: isRtl ? "ar" : "en",
        plan: null,
        interval: null,
      }).catch(() => {
        // Best-effort telemetry only.
      });
      if (nextProgress.completed) {
        void trackProductEvent({
          event: "activation_completed",
          source: "chat_input",
          language: isRtl ? "ar" : "en",
          plan: null,
          interval: null,
        }).catch(() => {
          // Best-effort telemetry only.
        });
      }
    }

    // Show all attachments (images AND documents) in the user's message so
    // they can see what they sent. MessageBubble renders images as thumbnails
    // and non-images as file pills.
    const attachmentsForMessage = files.map((file) => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
    }));
    const userCreatedAt = new Date().toISOString();
    const assistantCreatedAt = new Date().toISOString();
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;
    currentTurnAssistantIdRef.current = assistantMessageId;

    setMessagesByThread((prev) => ({
        ...prev,
        [threadId]: [
          ...(prev[threadId] ?? []),
          ...(presentation?.hideUserMessage
            ? []
            : [{
                id: userMessageId,
                role: "user" as const,
                content: trimmed,
                createdAt: userCreatedAt,
                attachments: attachmentsForMessage,
              }]),
          {
            id: assistantMessageId,
            role: "assistant" as const,
            content: "",
            createdAt: assistantCreatedAt,
          },
        ],
      }));

    setAttachments([]);
    if (isZakiBotTarget) {
      clearZakiBotProgressVisuals();
      {
        const now = Date.now();
        const frame: NullalisNarrationFrame = {
          id: `zaki-runtime-start-${now}`,
          phase: "thinking",
          label: "Thinking...",
          tool: null,
          iteration: null,
          durationMs: null,
          stepIndex: null,
          stepTotal: null,
          timestamp: now,
        };
        setNullalisNarrationFrame(frame);
        setNullalisTranscriptEntries([
          {
            id: `zaki-runtime-start-entry-${now}`,
            kind: "narration",
            intent: "thinking",
            text: "Starting the request",
            timestamp: now,
            importance: 20,
            phase: "thinking",
            resultState: "running",
            groupKey: "fallback:start",
            source: "fallback",
          },
        ]);
      }
      setZakiBotStatusEvents([
        {
          id: `progress-${Date.now()}-ack`,
          text: "Processing request",
          timestamp: Date.now(),
          fingerprint: "processing request|||",
          source: "fallback",
        },
      ]);
    }
    setStreamingIndicatorMode("thinking");
    setTurnStartedAt(Date.now());
    setTurnDurationMs(null);
    setIsStreaming(true);
    const streamController = new AbortController();
    streamAbortRef.current = streamController;
    // Unified file delivery (matches SOTA agents like Claude Code):
    //   All files (images + documents) are uploaded to the user's agent
    //   workspace at attachments/<safe_name>. The message only carries a
    //   short marker with the path — NOT inlined bytes. This keeps payload
    //   size bounded (tens of bytes per file) and avoids the BFF 8000-char
    //   message cap. Server-side:
    //     - Images     → multimodal pipeline reads the file, base64-encodes
    //                    for the provider. Triggered by [IMAGE:<path>] marker.
    //     - Documents  → agent calls file_read, which runs pdftotext /
    //                    pandoc / libreoffice extraction as needed.
    const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB — matches nullalis cap
    let attachmentMarkers = "";
    if (files.length > 0) {
      const parts: string[] = [];
      for (const file of files) {
        try {
          if (file.size > MAX_UPLOAD_BYTES) {
            toast.error(`${file.name} is too large (max 20 MB)`);
            continue;
          }
          // Upload to agent workspace (images and documents — same endpoint).
          let uploadedPath: string;
          try {
            const { data } = await uploadAgentAttachment(file);
            uploadedPath = data?.path ?? `attachments/${file.name}`;
          } catch (uploadErr) {
            const msg = uploadErr instanceof Error ? uploadErr.message : "upload failed";
            toast.error(`Failed to upload ${file.name}: ${msg}`);
            parts.push(`[Attachment failed to upload: ${file.name}]`);
            continue;
          }

          if (file.type.startsWith("image/")) {
            // Multimodal marker — nullalis reads the file, encodes, and
            // passes to the vision-capable provider.
            parts.push(`[IMAGE:${uploadedPath}]`);
          } else {
            // Agent-readable document — instruct the agent to read via tool.
            parts.push(
              `[User uploaded file: ${uploadedPath}]\n` +
              `Use the file_read tool with path="${uploadedPath}" to read its contents. ` +
              `Server will auto-extract text from PDF/DOCX/XLSX/PPTX/ODT/RTF/EPUB and plain-text formats.`
            );
          }
        } catch {
          parts.push(`[Attachment: ${file.name} (read error)]`);
        }
      }
      attachmentMarkers = parts.join("\n\n");
    }
    const sendText = attachmentMarkers
      ? `${attachmentMarkers}\n\n${trimmed}`
      : trimmed;
    let anonymousPartialReply = "";
    let lastAnonymousPersistAt = 0;
    const persistAnonymousPartial = (content: string) => {
      anonymousPartialReply = content;
      if (!anonymousWork || isZakiBotTarget || !anonymousTurnId) return;
      const now = Date.now();
      if (now - lastAnonymousPersistAt < 250) return;
      lastAnonymousPersistAt = now;
      upsertAnonymousWorkItem({
        id: anonymousWork.id,
        productId: "spaces",
        taskKind: "chat",
        prompt: trimmed,
        replyPreview: content,
        reply: content,
        route: `/spaces/${encodeURIComponent(resolvedWorkspaceSlug)}/threads/${encodeURIComponent(threadId)}`,
        threadId,
        turnId: anonymousTurnId,
        meterRemaining: null,
        status: "streaming",
      });
    };

    try {
      // P1-12: bounded auto-reconnect/replay of the SAME turn when the BFF
      // signals a transient, replay-safe condition (a retryable:true SSE error
      // frame, or a retryable JSON 5xx such as the readiness-gate 503 / a
      // gateway_draining / ownership_lock_conflict frame). Up to
      // CHAT_RETRYABLE_MAX_ATTEMPTS sends total; between attempts we clear any
      // partial assistant output and show "Reconnecting to the agent...". A
      // non-retryable error (or an aborted turn) breaks out immediately to the
      // existing hard-error handling below.
      let streamResult: Awaited<ReturnType<typeof streamChatMessage>> | undefined;
      for (let attempt = 1; attempt <= CHAT_RETRYABLE_MAX_ATTEMPTS; attempt++) {
        try {
          streamResult = await streamChatMessage({
            workspaceSlug: resolvedWorkspaceSlug,
            threadSlug: threadId,
            message: sendText,
            assistantId: assistantMessageId,
            signal: streamController.signal,
            turnOptions: isZakiBotTarget ? turnOptions?.zaki ?? null : null,
            onContent: !authUserId && !isZakiBotTarget ? persistAnonymousPartial : undefined,
            turnKind: presentation?.firstRun ? "onboarding_first_turn" : null,
          });
          break;
        } catch (streamError) {
          const isLastAttempt = attempt >= CHAT_RETRYABLE_MAX_ATTEMPTS;
          if (
            isAbortError(streamError) ||
            isLastAttempt ||
            !isRetryableChatError(streamError)
          ) {
            throw streamError;
          }
          // Transient + replay-safe: reset partial output, tell the user we're
          // reconnecting, back off, then replay the same turn.
          updateAssistantContent(threadId, assistantMessageId, "");
          if (isZakiBotTarget) {
            setStreamingIndicatorMode("thinking");
          }
          toast.info("Reconnecting to the agent...");
          const backoff =
            CHAT_RETRYABLE_BACKOFF_MS[attempt - 1] ??
            CHAT_RETRYABLE_BACKOFF_MS[CHAT_RETRYABLE_BACKOFF_MS.length - 1];
          await new Promise((resolve) => window.setTimeout(resolve, backoff));
          if (streamController.signal.aborted) {
            throw streamError;
          }
        }
      }
      const assistantReply = String(streamResult?.content || "").trim();
      if (isZakiBotTarget && assistantReply) {
        setComposerQuickReplyTriggerId(assistantMessageId);
      }
      if (isZakiBotTarget && turnSessionKey && !presentation?.firstRun) {
        void maybeAutoTitleSession(turnSessionKey, {
          userMessage: trimmed,
          assistantMessage: assistantReply,
        });
      }
      if (isZakiBotTarget && turnAgentUserId) {
        const sessionKey = buildAgentSessionKey(threadId, turnAgentUserId);
        if (sessionKey) {
          await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
          await hydrateActiveSessionDetail(sessionKey);
        }
      }
      const remappedSpacesRoute =
        typeof streamResult?.spacesRoute === "string" && streamResult.spacesRoute.startsWith("/spaces/")
          ? streamResult.spacesRoute
          : "";
      const remappedTarget = remappedSpacesRoute.match(
        /^\/spaces\/([^/?#]+)(?:\/threads\/([^/?#]+))?/
      );
      if (remappedSpacesRoute) {
        navigate(remappedSpacesRoute, { replace: true });
      }
      if (!isZakiBotTarget) {
        void maybeAutoTitleThread(
          remappedTarget?.[1] ? decodeURIComponent(remappedTarget[1]) : resolvedWorkspaceSlug,
          remappedTarget?.[2] ? decodeURIComponent(remappedTarget[2]) : threadId,
          {
            userMessage: trimmed,
            assistantMessage: assistantReply,
          }
        );
      }
      if (anonymousWork) {
        const productId = isZakiBotTarget ? "agent" : "spaces";
        upsertAnonymousWorkItem({
          id: anonymousWork.id,
          productId,
          taskKind: isZakiBotTarget ? "plan" : "chat",
          prompt: trimmed,
          replyPreview: String(streamResult?.content || "").trim(),
          // The FULL answer, formatting intact. An anonymous turn is never
          // persisted server-side, so this is the only copy that exists — and
          // it is what signing up imports into the real thread. Keeping only
          // the 800-char preview would mean "we kept your work" carried over a
          // truncated stub of it.
          reply: String(streamResult?.content || "").trim(),
          route: isZakiBotTarget
            ? "/agent"
            : `/spaces/${encodeURIComponent(resolvedWorkspaceSlug)}/threads/${encodeURIComponent(threadId)}`,
          threadId,
          turnId: anonymousTurnId ?? undefined,
          meterRemaining: null,
          status: "succeeded",
        });
      }
      // Keep chat UX responsive: memory save runs in background.
      if (!presentation?.firstRun) {
        void checkForSavedMemories(trimmed, threadId);
      }
      return true;
    } catch (error) {
      if (anonymousWork) {
        const productId = isZakiBotTarget ? "agent" : "spaces";
        upsertAnonymousWorkItem({
          id: anonymousWork.id,
          productId,
          taskKind: isZakiBotTarget ? "plan" : "chat",
          prompt: trimmed,
          replyPreview: anonymousPartialReply,
          reply: anonymousPartialReply,
          route: isZakiBotTarget
            ? "/agent"
            : `/spaces/${encodeURIComponent(resolvedWorkspaceSlug)}/threads/${encodeURIComponent(threadId)}`,
          threadId,
          turnId: anonymousTurnId ?? undefined,
          meterRemaining: null,
          status:
            isAbortError(error) || anonymousPartialReply.trim()
              ? "interrupted"
              : "failed",
        });
      }
      if (isAbortError(error)) {
        if (isZakiBotTarget) {
          finalizeZakiBotProgress("abort");
        }
        updateAssistantError(threadId, assistantMessageId, "Generation stopped.", "aborted");
        return false;
      }
      if (error instanceof ChatRequestError) {
        const { isPaywall, state: paywallState } = classifyBillingDenial(error.code);
        if (isPaywall && paywallState) {
          if (isZakiBotTarget) {
            finalizeZakiBotProgress("error");
          }
          // WP-B2 — a quota denial is a LIMIT STATE, not a toast. `daily_limit_reached`
          // used to fall through classifyBillingDenial into a bare toast.error(); it now
          // lands here and renders the card that names the limit, shows the exact reset
          // time, and offers ONE way forward (sign in for anon, upgrade for authed).
          const isLimitState = paywallState === "limit_reached";
          // Preserve the unsent prompt. The composer cleared itself on submit, so put the
          // text back — the user must not have to retype the thing that got refused.
          if (isLimitState && trimmed) {
            composerHandleRef.current?.setDraft(trimmed);
          }
          // Show the inline paywall card — subsumes the old access_expired redirect.
          const planLabel =
            entitlementsResult?.data?.effective?.tier ??
            entitlementsResult?.data?.plan?.tier;
          setPaywallCardData(
            buildBillingPaywallCardData({
              error,
              paywallState,
              planLabel,
              meterStatus: meterResult?.data ?? null,
              isAgentTarget: isZakiBotTarget,
              // An anonymous visitor has no wallet and nothing to upgrade — the door is
              // an account. `authUserId` is the same anon signal the work-ledger uses.
              identity: authUserId ? "authed" : "anon",
              promptPreserved: isLimitState && Boolean(trimmed),
            })
          );
          return false;
        }
      }
      if (isZakiBotTarget) {
        finalizeZakiBotProgress("error");
      }
      const errorMessage =
        error instanceof Error ? error.message : "ZAKI couldn't finish that reply. Please try again.";
      updateAssistantError(
        threadId,
        assistantMessageId,
        errorMessage,
        error instanceof ChatRequestError ? error.code : "chat_error"
      );
      toast.error(errorMessage);
      return false;
    } finally {
      if (streamAbortRef.current === streamController) {
        streamAbortRef.current = null;
      }
      if (!isZakiBotTarget) {
        setStreamingIndicatorMode("thinking");
      }
      setIsStreaming(false);
    }
  }, [
    activeThreadId,
    activeZakiSessionKey,
    activeWorkspaceSlug,
    activationProgress.firstMessageSent,
    agentUserId,
    authUserId,
    checkForSavedMemories,
    clearZakiBotProgressVisuals,
    ensureZakiSessionUi,
    ensureZakiBotProvisioned,
    finalizeZakiBotProgress,
    goToThread,
    hydrateActiveSessionDetail,
    isRtl,
    isOnline,
    isStreaming,
    navigate,
    primarySpace?.id,
    queryClient,
    setSessionContextPressure,
    streamChatMessage,
    t,
    maybeAutoTitleSession,
    maybeAutoTitleThread,
    updateAssistantError,
    zakiSessionKey,
  ]);

  const handleRetryAgentPlanStep = useCallback(
    async (step: AgentPlanPanelStep) => {
      const retryPrompt = buildAgentPlanRetryPrompt(t, step);
      const sent = await handleSend(retryPrompt, []);
      if (!sent) throw new Error("agent_plan_retry_failed");
    },
    [handleSend, t]
  );

  useEffect(() => {
    const snapshotDraftForReauthentication = () => {
      const prompt = composerHandleRef.current?.getDraft().trim() || "";
      if (!prompt) return;
      const productId = isZakiBotActiveSpace ? "agent" : "spaces";
      writePendingIntent({
        productId,
        taskKind: productId === "agent" ? "plan" : "chat",
        prompt,
        source: "session_expired",
        returnTo: productId === "agent" ? "/agent" : "/spaces",
        replayMode: "draft",
      });
    };
    window.addEventListener(AUTH_REQUIRED_EVENT, snapshotDraftForReauthentication);
    return () => {
      window.removeEventListener(AUTH_REQUIRED_EVENT, snapshotDraftForReauthentication);
    };
  }, [isZakiBotActiveSpace]);

  useEffect(() => {
    if (
      !isAuthReady ||
      !authUserId ||
      !isZakiBotActiveSpace ||
      !zakiBotProvisionReady ||
      !activeThreadId ||
      agentHistoryHydratedThreadId !== activeThreadId ||
      !botOnboarding ||
      botOnboarding.completed ||
      isStreaming
    ) {
      return;
    }

    if (messages.length > 0) {
      setFirstRunPhase((current) =>
        current === "saving_name" ? current : "awaiting_name"
      );
      return;
    }

    if (!shouldStartEngineFirstTurn({ onboarding: botOnboarding, messageCount: messages.length })) {
      setFirstRunPhase("unavailable");
      return;
    }

    const ceremonyKey = `${authUserId}:${activeThreadId}`;
    if (firstRunStartedRef.current === ceremonyKey) return;
    firstRunStartedRef.current = ceremonyKey;
    setFirstRunPhase("starting");
    void handleSend(
      FIRST_RUN_ENGINE_PROMPT,
      [],
      undefined,
      ZAKI_BOT_SPACE_ID,
      { hideUserMessage: true, firstRun: true }
    ).then((succeeded) => {
      setFirstRunPhase(succeeded ? "awaiting_name" : "unavailable");
      if (!succeeded) {
        firstRunStartedRef.current = null;
      }
    });
  }, [
    activeThreadId,
    agentHistoryHydratedThreadId,
    authUserId,
    botOnboarding,
    handleSend,
    isAuthReady,
    isStreaming,
    isZakiBotActiveSpace,
    messages.length,
    zakiBotProvisionReady,
  ]);

  const completeFirstRunName = useCallback(
    async (name: string) => {
      if (firstRunPhase === "saving_name") return;
      setFirstRunPhase("saving_name");
      setFirstRunError(null);
      try {
        const checkpointKey = `zaki:firstRunName:${authUserId}:${activeThreadId || "main"}`;
        let completedOnboarding: BotOnboardingState | null = null;
        await runFirstRunNameCompletion({
          name,
          readNamingCheckpoint: () => {
            try {
              return window.sessionStorage.getItem(checkpointKey);
            } catch {
              const checkpoint = firstRunNamingCheckpointRef.current;
              return checkpoint?.key === checkpointKey ? checkpoint.name : null;
            }
          },
          writeNamingCheckpoint: (checkpointName) => {
            firstRunNamingCheckpointRef.current = { key: checkpointKey, name: checkpointName };
            try {
              window.sessionStorage.setItem(checkpointKey, checkpointName);
            } catch {
              // The in-memory checkpoint still prevents a duplicate turn in this tab.
            }
          },
          clearNamingCheckpoint: () => {
            firstRunNamingCheckpointRef.current = null;
            try {
              window.sessionStorage.removeItem(checkpointKey);
            } catch {
              // Best-effort cleanup only.
            }
          },
          persistIdentity: async () => {
            const identityUpdate = await updateBotOnboarding({
              completed: false,
              identity: buildBotIdentityDocument(name),
            });
            if (
              !identityUpdate.response.ok ||
              identityUpdate.data?.error ||
              identityUpdate.data?.completed !== false
            ) {
              throw new Error(
                identityUpdate.data?.message ||
                  t("firstRun.name.error", {
                    defaultValue: "Your agent could not save that name. Try again.",
                  })
              );
            }
          },
          sendNamingTurn: async () => {
            const namingTurnSucceeded = await handleSend(`I'll call you ${name}.`, []);
            if (!namingTurnSucceeded) {
              throw new Error(
                t("firstRun.name.turnError", {
                  defaultValue: "Your agent saved that name, but could not continue the conversation. Try again.",
                })
              );
            }
          },
          persistCompletion: async () => {
            const completionUpdate = await updateBotOnboarding({ completed: true });
            if (
              !completionUpdate.response.ok ||
              completionUpdate.data?.error ||
              completionUpdate.data?.completed !== true
            ) {
              throw new Error(
                completionUpdate.data?.message ||
                  t("firstRun.name.error", {
                    defaultValue: "Your agent could not save that name. Try again.",
                  })
              );
            }
            completedOnboarding = completionUpdate.data;
          },
        });
        setBotOnboarding(completedOnboarding);
        setFirstRunPhase("complete");
      } catch (error) {
        setFirstRunError(
          error instanceof Error
            ? error.message
            : t("firstRun.name.error", {
                defaultValue: "Your agent could not save that name. Try again.",
              })
        );
        setFirstRunPhase("awaiting_name");
      }
    },
    [activeThreadId, authUserId, firstRunPhase, handleSend, t]
  );

  useEffect(() => {
    if (!isAuthReady || !authUserId || isStreaming) return;
    const pendingIntent = readPendingIntent();
    if (!pendingIntent?.prompt) return;
    const replayKey = `${pendingIntent.productId}:${pendingIntent.createdAt}:${pendingIntent.prompt}`;
    if (replayedPendingIntentKeyRef.current === replayKey) return;

    if (pendingIntent.productId === "agent") {
      if (!isZakiBotActiveSpace) return;
      replayedPendingIntentKeyRef.current = replayKey;
      composerHandleRef.current?.setDraft(pendingIntent.prompt);
      window.dispatchEvent(new Event("zaki:focus-composer"));
      clearPendingIntent();
      return;
    }

    if (pendingIntent.productId === "spaces") {
      if (!activeWorkspaceSlug || isZakiBotActiveSpace) return;
      replayedPendingIntentKeyRef.current = replayKey;
      clearPendingIntent();
      if (pendingIntent.replayMode === "submit") {
        composerHandleRef.current?.submitWith(pendingIntent.prompt);
      } else {
        composerHandleRef.current?.setDraft(pendingIntent.prompt);
        window.dispatchEvent(new Event("zaki:focus-composer"));
      }
    }
  }, [
    activeWorkspaceSlug,
    authUserId,
    handleSend,
    isAuthReady,
    isStreaming,
    isZakiBotActiveSpace,
  ]);

  const handleStopStreaming = useCallback(() => {
    const sessionKey =
      activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
    if (isZakiBotActiveSpace && sessionKey && !agentCancelInFlightRef.current) {
      agentCancelInFlightRef.current = true;
      void cancelAgentSession(sessionKey)
        .then(({ response, data }) => {
          if (!response.ok) {
            throw new Error(
              data?.message ||
                data?.error ||
                "Agent cancel request failed."
            );
          }
          if (data?.was_active === false) {
            toast.info("No active Agent turn was running on the server.");
          }
        })
        .catch((error) => {
          console.error("[agent-cancel]", error);
          toast.error("Unable to cancel the Agent run on the server. The local stream was closed.");
        })
        .finally(() => {
          agentCancelInFlightRef.current = false;
          void refreshAgentRuntimePanelData();
        });
    }
    streamAbortRef.current?.abort();
  }, [
    activeThreadId,
    activeZakiSessionKey,
    agentUserId,
    isZakiBotActiveSpace,
    refreshAgentRuntimePanelData,
  ]);

  const handleRegenerateMessage = useCallback(
    (message: Message) => {
      if (isStreaming) return;
      const idx = messages.findIndex((msg) => msg.id === message.id);
      if (idx <= 0) {
        toast.error("No previous user message to regenerate");
        return;
      }
      let userMessage: Message | null = null;
      for (let i = idx - 1; i >= 0; i -= 1) {
        const candidate = messages[i];
        if (candidate && candidate.role === "user") {
          userMessage = candidate;
          break;
        }
      }
      if (!userMessage?.content?.trim()) {
        toast.error("No previous user message to regenerate");
        return;
      }
      handleSend(userMessage.content, []);
    },
    [handleSend, isStreaming, messages]
  );

  // Message reactions live in localStorage scoped to the active thread.
  // Thumbs-up = persistent green highlight ("good answer", personal
  // annotation). Thumbs-down = red highlight + immediate regenerate
  // with a rejection-context wrapper, so the agent gets another swing.
  const reactionsThreadKey = activeThreadId
    ? `${activeWorkspaceSlug || "_"}::${activeThreadId}`
    : null;
  const { getReaction, setReaction } = useMessageReactions(reactionsThreadKey);

  const handleThumbsUpMessage = useCallback(
    (message: Message) => {
      const current = getReaction(message.id);
      // Toggle: clicking again clears the reaction.
      setReaction(message.id, current === "up" ? null : "up");
    },
    [getReaction, setReaction],
  );

  const handleThumbsDownMessage = useCallback(
    (message: Message) => {
      if (isStreaming) {
        toast.error(t("messageActions.thumbsDownStreaming", {
          defaultValue: "Wait for the reply to finish before rating.",
        }));
        return;
      }
      // Find the previous user turn so we can re-issue it with a
      // rejection-context wrapper.
      const idx = messages.findIndex((m) => m.id === message.id);
      let userMessage: Message | null = null;
      for (let i = idx - 1; i >= 0; i -= 1) {
        const candidate = messages[i];
        if (candidate && candidate.role === "user") {
          userMessage = candidate;
          break;
        }
      }
      if (!userMessage?.content?.trim()) {
        toast.error(t("messageActions.thumbsDownNoUser", {
          defaultValue: "No previous prompt to retry.",
        }));
        return;
      }
      // Mark the rejected reply persistently so the user can scroll back
      // and see what they previously thumbed-down.
      setReaction(message.id, "down");
      const rejected = (message.content || "").trim().slice(0, 400);
      const wrapped =
        `${userMessage.content}\n\n` +
        `[The previous reply was rejected by the user. Try a different angle.\n` +
        `Rejected reply (truncated): ${rejected}]`;
      handleSend(wrapped, []);
    },
    [getReaction, setReaction, messages, handleSend, isStreaming, t],
  );

  const handleApprovalAction = useCallback(
    async (
      requestId: string,
      approved: boolean,
      options?: { reason?: string; tool?: string | null; allowForSession?: boolean }
    ) => {
      const sessionKey = activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
      if (!sessionKey) {
        toast.error("Agent user ID not yet resolved — try again in a moment");
        return;
      }
      try {
        const request =
          powerUserPendingApprovals.find((approval) => approval.id === requestId) ??
          (nullalisApprovalRequest?.id === requestId ? nullalisApprovalRequest : null);
        const canonicalApprovalId =
          request?.approvalId ||
          (/^apr-\d+$/i.test(requestId) ? requestId : null);
        const payload = {
          approved,
          tool: options?.tool ?? nullalisApprovalRequest?.tool,
          reason: approved ? undefined : options?.reason ?? "User denied from UI",
          ...(canonicalApprovalId ? { approval_id: canonicalApprovalId } : {}),
          ...(approved && options?.allowForSession ? { allow_for_session: true } : {}),
        };
        if (approved) {
          setApprovalContinuationPendingId(requestId);
          const now = Date.now();
          setNullalisNarrationFrame({
            id: `zaki-runtime-approval-continuing-${now}`,
            phase: "thinking",
            label: "Approved. ZAKI is continuing...",
            tool: request?.tool ?? options?.tool ?? nullalisApprovalRequest?.tool ?? null,
            iteration: null,
            durationMs: null,
            stepIndex: null,
            stepTotal: null,
            timestamp: now,
          });
          setStreamingIndicatorMode("writing");
        }
        const { response, data } = await approveAgentSession(sessionKey, payload);
        if (!response.ok) {
          const code =
            typeof data?.code === "string"
              ? data.code
              : typeof data?.error === "string"
                ? data.error
                : `approval_${response.status}`;
          // A connection-class outage (nullalis briefly restarting) surfaces as
          // 502 agent_unreachable with retryable:true after the BFF exhausted
          // its bounded retry budget. Flag the error so the approval card can
          // render a retrying state + a one-click "Retry approval" that re-POSTs
          // the SAME approval_id, rather than treating the click as lost.
          const retryable =
            data?.retryable === true ||
            code === "agent_unreachable" ||
            response.status === 502 ||
            response.status === 503 ||
            response.status === 504;
          const error = new Error(code);
          (error as Error & { code?: string; retryable?: boolean }).code = code;
          (error as Error & { code?: string; retryable?: boolean }).retryable = retryable;
          throw error;
        }
        if (approved) {
          const continuation = typeof data?.message === "string" ? data.message.trim() : "";
          let continuationSynced = false;
          if (continuation) {
            continuationSynced = await appendAgentAssistantContinuation(
              activeThreadId || "main",
              continuation
            );
          } else {
            try {
              continuationSynced = await reconcileAgentThreadHistory(
                activeThreadId || "main",
                "merged"
              );
            } catch {
              continuationSynced = false;
            }
          }
          if (!continuationSynced && !continuation) {
            toast.info("Approval sent. ZAKI is continuing; refresh if the latest response does not appear.");
          }
        }
        decrementSessionApprovalCount(sessionKey, requestId);
        setNullalisApprovalRequest(null);
        setApprovalContinuationPendingId(null);
        await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
        await hydrateActiveSessionDetail(sessionKey);
        await refreshAgentRuntimePanelData();
        void refreshContextGauge();
      } catch (err) {
        setApprovalContinuationPendingId(null);
        console.error("[approval]", err);
        const typedErr = err as Error & { code?: string; retryable?: boolean };
        if (typedErr?.code === "approval_id_mismatch") {
          await hydrateActiveSessionDetail(sessionKey);
          toast.error("Approval changed. Review the latest approval card.");
        } else if (typedErr?.retryable) {
          // The card renders an inline retrying / Retry-approval affordance for
          // this case, so don't fire a hard error toast that would imply the
          // click was lost.
          if (approved) {
            // The approve branch optimistically set a "ZAKI is continuing..."
            // narration frame + a "writing" streaming indicator BEFORE the POST.
            // Because the agent is unreachable, no SSE 'done' event will arrive
            // to clear them — so reset them here. Otherwise the chat would show
            // a contradictory state ("Approved. ZAKI is continuing..." + writing)
            // alongside the card's "retrying your approval..." affordance,
            // falsely implying the approval already succeeded.
            setNullalisNarrationFrame(null);
            setStreamingIndicatorMode("thinking");
          }
          toast.info("Agent restarting — retrying your approval...");
        } else {
          toast.error(approved ? "Failed to send approval" : "Failed to send denial");
        }
        throw err; // re-throw so the card surfaces the (retrying) state
      }
    },
    [
      activeThreadId,
      activeZakiSessionKey,
      agentUserId,
      appendAgentAssistantContinuation,
      decrementSessionApprovalCount,
      hydrateActiveSessionDetail,
      nullalisApprovalRequest?.tool,
      nullalisApprovalRequest,
      powerUserPendingApprovals,
      queryClient,
      reconcileAgentThreadHistory,
      refreshAgentRuntimePanelData,
      refreshContextGauge,
      t,
    ]
  );

  const handleApprovalModify = useCallback(
    async (requestId: string, request: NullalisApprovalRequest) => {
      await handleApprovalAction(requestId, false, {
        tool: request.tool,
        reason: "User requested modified arguments from UI",
      });
      composerHandleRef.current?.setDraft(
        t("zakiControls.approval.modifyDraft", {
          defaultValue: "Please retry {{tool}} with these changes: ",
          tool: request.tool,
        })
      );
      toast.info(
        t("zakiControls.approval.modifyReady", {
          defaultValue: "Approval denied. Describe the change and ZAKI will retry.",
        })
      );
    },
    [handleApprovalAction, t]
  );

  const handleSessionModeChange = useCallback(
    async (mode: AgentSessionMode) => {
      const sessionKey =
        activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId);
      if (!sessionKey) {
        toast.error(t("zakiControls.errors.sessionNotReady"));
        return;
      }
      const previousMode = activeSessionMode ?? "execute";
      if (previousMode === mode) return;
      if (!isActiveZakiSessionLive) {
        toast.error(
          t("zakiControls.errors.sessionNotLive", {
            defaultValue: "Start this session before changing mode.",
          })
        );
        return;
      }
      setZakiSessionModeUi(sessionKey, mode);
      setSessionModePending(true);
      try {
        const { response, data } = await setAgentSessionMode(sessionKey, mode);
        if (!response.ok) {
          throw new Error(data?.error || data?.message || t("zakiControls.errors.updateModeFailed"));
        }
        await queryClient.invalidateQueries({ queryKey: zakiSessionKeys.all });
        await hydrateActiveSessionDetail(sessionKey);
      } catch (error) {
        setZakiSessionModeUi(sessionKey, previousMode);
        toast.error(error instanceof Error ? error.message : t("zakiControls.errors.updateModeFailed"));
      } finally {
        setSessionModePending(false);
      }
    },
    [
      activeSessionMode,
      activeThreadId,
      activeZakiSessionKey,
      agentUserId,
      hydrateActiveSessionDetail,
      isActiveZakiSessionLive,
      queryClient,
      setZakiSessionModeUi,
      t,
    ]
  );

  useEffect(() => {
    const handleApprovalResolved = (event: Event) => {
      const detail = (
        event as CustomEvent<{ sessionKey?: string | null; requestId?: string | null }>
      ).detail;
      const resolvedSessionKey = normalizeZakiSessionKey(String(detail?.sessionKey || ""));
      const currentSessionKey = normalizeZakiSessionKey(
        String(activeZakiSessionKey || buildAgentSessionKey(activeThreadId || "main", agentUserId) || "")
      );
      if (!resolvedSessionKey || resolvedSessionKey !== currentSessionKey) return;
      if (detail?.requestId && nullalisApprovalRequest?.id === detail.requestId) {
        setNullalisApprovalRequest(null);
      }
    };
    window.addEventListener("zaki:approval-resolved", handleApprovalResolved);
    return () => {
      window.removeEventListener("zaki:approval-resolved", handleApprovalResolved);
    };
  }, [activeThreadId, activeZakiSessionKey, agentUserId, nullalisApprovalRequest?.id]);

  useEffect(() => {
    const handleOpenInspector = (event: Event) => {
      if (!isAgentSurface) return;
      const detail = (event as CustomEvent<{ tab?: unknown } | undefined>).detail;
      openAgentInspectorTab(normalizeAgentInspectorEventTab(detail?.tab));
    };

    window.addEventListener("zaki:open-power-user", handleOpenInspector);
    return () => {
      window.removeEventListener("zaki:open-power-user", handleOpenInspector);
    };
  }, [isAgentSurface, openAgentInspectorTab]);

  useEffect(() => {
    const handleOpenMobileInspector = () => {
      if (!isAgentSurface) return;
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        agentMobileInspectorReturnFocusRef.current = document.activeElement;
      }
      setAgentMobileInspectorOpen(true);
    };
    window.addEventListener("zaki:open-agent-mobile-inspector", handleOpenMobileInspector);
    return () => {
      window.removeEventListener("zaki:open-agent-mobile-inspector", handleOpenMobileInspector);
    };
  }, [isAgentSurface]);

  useEffect(() => {
    if (!isAgentSurface) return;
    const pendingTab = takePendingInspectorTab();
    if (!pendingTab) return;
    openAgentInspectorTab(pendingTab);
  }, [isAgentSurface, openAgentInspectorTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      AGENT_INSPECTOR_OPEN_KEY,
      agentInspectorOpen ? "true" : "false"
    );
    if (isAgentSurface) {
      window.dispatchEvent(
        new CustomEvent("zaki:agent-panel-state", {
          detail: { open: agentInspectorOpen },
        })
      );
    }
  }, [agentInspectorOpen, isAgentSurface]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAgentSurface) {
      window.localStorage.setItem(
        AGENT_FOCUS_MODE_KEY,
        agentFocusMode ? "true" : "false"
      );
      window.dispatchEvent(
        new CustomEvent("zaki:agent-focus-state", {
          detail: { enabled: agentFocusMode },
        })
      );
      document.body.classList.toggle("zaki-agent-focus-active", agentFocusMode);
    } else {
      document.body.classList.remove("zaki-agent-focus-active");
      window.dispatchEvent(
        new CustomEvent("zaki:agent-focus-state", {
          detail: { enabled: false },
        })
      );
    }
    return () => {
      document.body.classList.remove("zaki-agent-focus-active");
    };
  }, [agentFocusMode, isAgentSurface]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(AGENT_MOBILE_PANEL_QUERY);
    const sync = () => setAgentMobileViewport(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle(
      "zaki-agent-mobile-inspector-active",
      isAgentMobilePanelOpen
    );
    if (!isAgentSurface) {
      setAgentMobileInspectorOpen(false);
    }
    return () => {
      document.body.classList.remove("zaki-agent-mobile-inspector-active");
    };
  }, [isAgentMobilePanelOpen, isAgentSurface]);

  useEffect(() => {
    if (!isAgentMobilePanelOpen || typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const dialog = agentMobileInspectorRef.current;
    if (!dialog) return;

    if (
      !agentMobileInspectorReturnFocusRef.current &&
      document.activeElement instanceof HTMLElement &&
      !dialog.contains(document.activeElement)
    ) {
      agentMobileInspectorReturnFocusRef.current = document.activeElement;
    }

    const getFocusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(MOBILE_INSPECTOR_FOCUSABLE_SELECTOR)
      ).filter(
        (element) =>
          element.tabIndex !== -1 &&
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true"
      );

    const focusInitialTarget = () => {
      const initialTarget =
        agentMobileInspectorCloseRef.current ?? getFocusableElements()[0] ?? dialog;
      initialTarget.focus({ preventScroll: true });
    };
    focusInitialTarget();
    const focusFrame = window.requestAnimationFrame(focusInitialTarget);

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeAgentMobilePanel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }
      const activeElement = document.activeElement;

      if (!activeElement || !dialog.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus({ preventScroll: true });
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      }
    };

    dialog.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      dialog.removeEventListener("keydown", handleDialogKeyDown);
    };
  }, [closeAgentMobilePanel, isAgentMobilePanelOpen]);

  useEffect(() => {
    if (isAgentMobilePanelOpen || typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const returnTarget = agentMobileInspectorReturnFocusRef.current;
    agentMobileInspectorReturnFocusRef.current = null;
    if (!returnTarget || !document.contains(returnTarget)) return;

    returnTarget.focus({ preventScroll: true });
    const focusFrame = window.requestAnimationFrame(() => {
      if (document.activeElement === returnTarget) return;
      returnTarget.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [isAgentMobilePanelOpen]);

  useEffect(() => {
    if (!isAgentSurface) return;
    const togglePanel = () => setAgentInspectorOpen((open) => !open);
    const toggleFocus = () => setAgentFocusMode((enabled) => !enabled);
    const handlePanelShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== ".") return;
      event.preventDefault();
      togglePanel();
    };
    const handleFocusShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.code !== "Backslash") return;
      event.preventDefault();
      toggleFocus();
    };
    const handleEscapeFocus = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setAgentMobileInspectorOpen(false);
      setAgentFocusMode(false);
    };
    window.addEventListener("keydown", handlePanelShortcut);
    window.addEventListener("keydown", handleFocusShortcut);
    window.addEventListener("keydown", handleEscapeFocus);
    window.addEventListener("zaki:toggle-agent-panel", togglePanel);
    window.addEventListener("zaki:toggle-agent-focus", toggleFocus);
    return () => {
      window.removeEventListener("keydown", handlePanelShortcut);
      window.removeEventListener("keydown", handleFocusShortcut);
      window.removeEventListener("keydown", handleEscapeFocus);
      window.removeEventListener("zaki:toggle-agent-panel", togglePanel);
      window.removeEventListener("zaki:toggle-agent-focus", toggleFocus);
    };
  }, [isAgentSurface]);

  // New-thread shortcut. ⌘N is reserved by the browser, so the rail badge and
  // this handler agree on ⌘⇧O (Ctrl+Shift+O on Windows/Linux).
  useEffect(() => {
    if (!isAgentSurface) return;
    const handleNewThreadShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.code !== "KeyO") {
        return;
      }
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      handleCreateAgentSession();
    };
    window.addEventListener("keydown", handleNewThreadShortcut);
    return () => window.removeEventListener("keydown", handleNewThreadShortcut);
  }, [isAgentSurface, handleCreateAgentSession]);

  // ZakiSessionList per-row share button dispatches this event after
  // navigating to the chosen session. We queue the requested sessionKey
  // and only open the share modal once activeZakiSessionKey matches,
  // so we never share against the previous thread's hydrated state.
  const pendingShareSessionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionKey?: string } | undefined>)
        .detail;
      const requested = detail?.sessionKey || null;
      if (!requested || requested === activeZakiSessionKey) {
        setShareOpen(true);
      } else {
        pendingShareSessionKeyRef.current = requested;
      }
    };
    window.addEventListener("zaki:open-share", handler);
    return () => window.removeEventListener("zaki:open-share", handler);
  }, [activeZakiSessionKey]);
  useEffect(() => {
    if (
      pendingShareSessionKeyRef.current &&
      activeZakiSessionKey === pendingShareSessionKeyRef.current
    ) {
      pendingShareSessionKeyRef.current = null;
      setShareOpen(true);
    }
  }, [activeZakiSessionKey]);

  // H7: y/n keyboard shortcuts — fire approve/deny when an approval card is visible
  useEffect(() => {
    if (!nullalisApprovalRequest) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        void handleApprovalAction(nullalisApprovalRequest.id, true);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        void handleApprovalAction(nullalisApprovalRequest.id, false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nullalisApprovalRequest, handleApprovalAction]);

  const handleStartChat = useCallback(() => {
    const spaceId = activeWorkspaceSlug ?? primarySpace?.id ?? null;
    if (!spaceId) {
      goToSpaces();
      return;
    }
    window.dispatchEvent(new CustomEvent("zaki:create-thread", { detail: { spaceId } }));
  }, [activeWorkspaceSlug, goToSpaces, primarySpace?.id]);

  // Track previous thread for summarization on switch
  const prevThreadRef = useRef<{ id: string; workspaceSlug: string; title: string } | null>(null);

  // Summarize conversation when leaving a thread
  useEffect(() => {
    const prevThread = prevThreadRef.current;
    
    // If we had a previous thread and we're switching away from it
    if (prevThread && prevThread.id !== activeThreadId && !isZakiBotSpaceId(prevThread.workspaceSlug)) {
      const prevMessages = messagesByThread[prevThread.id];
      
      // Only summarize if there were meaningful messages (at least 2 exchanges)
      if (prevMessages && prevMessages.length >= 4) {
        // Fire and forget - don't block UI
        apiRequest("/api/memory/end-session", {
          method: "POST",
          body: JSON.stringify({
            messages: prevMessages.map((m) => ({ role: m.role, content: m.content })),
            threadId: prevThread.id,
            threadTitle: prevThread.title,
          }),
        })
          .then((response) => {
            if (!response.ok) return;
            pendingSessionSummaryRef.current = {
              threadId: prevThread.id,
              queuedAt: Date.now(),
            };
            window.setTimeout(() => {
              void maybeShowSessionSummaryCue(prevThread.id);
            }, 2500);
            window.setTimeout(() => {
              void maybeShowSessionSummaryCue(prevThread.id);
            }, 7000);
          })
          .catch((err) => {
            console.warn("[Memory] Failed to summarize session:", err);
          });
      }
    }

    // Update the ref with current thread info
    if (activeThreadId && activeWorkspaceSlug) {
      prevThreadRef.current = {
        id: activeThreadId,
        workspaceSlug: activeWorkspaceSlug,
        title: activeThread?.label || "Chat",
      };
    } else {
      prevThreadRef.current = null;
    }
  }, [activeThreadId, activeWorkspaceSlug, activeThread?.label, maybeShowSessionSummaryCue, messagesByThread]);

  // Auto-scroll effect
  useEffect(() => {
    if (scrollRef.current && autoScrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeThreadId, messagesByThread]);

  // Load thread history from React Query
  useEffect(() => {
    if (isZakiBotActiveSpace || isAnonymousSpacesActive) return;
    if (!activeThreadId || !activeWorkspaceSlug) return;
    if (!historyData || historyLoadedRef.current[activeThreadId]) return;
    if (messagesByThread[activeThreadId]?.length) {
      historyLoadedRef.current[activeThreadId] = true;
      return;
    }

    const cleaned = historyData.map((entry) => ({
      ...entry,
      content: entry.role === "user" ? stripMemoryContext(entry.content ?? "") : (entry.content ?? ""),
      createdAt:
        entry.createdAt ||
        messageRecordCreatedAtIso(entry as unknown as Record<string, unknown>),
    }));

    setMessagesByThread((prev) => ({
      ...prev,
      [activeThreadId]: cleaned,
    }));
    historyLoadedRef.current[activeThreadId] = true;
  }, [
    activeThreadId,
    activeWorkspaceSlug,
    historyData,
    isAnonymousSpacesActive,
    isZakiBotActiveSpace,
    messagesByThread,
  ]);

  useEffect(() => {
    if (!isZakiBotActiveSpace || !activeThreadId || !isAuthReady) {
      setIsBotHistoryLoading(false);
      return;
    }
    const shouldReconcileLoadedThread =
      !isStreaming && lastAgentHistoryReconcileThreadRef.current !== activeThreadId;
    if (historyLoadedRef.current[activeThreadId]) {
      setAgentHistoryHydratedThreadId(activeThreadId);
      setIsBotHistoryLoading(false);
      if (shouldReconcileLoadedThread) {
        void reconcileAgentThreadHistory(activeThreadId, "merged");
      }
      return;
    }
    if (messagesByThread[activeThreadId]?.length) {
      historyLoadedRef.current[activeThreadId] = true;
      setAgentHistoryHydratedThreadId(activeThreadId);
      setIsBotHistoryLoading(false);
      if (shouldReconcileLoadedThread) {
        void reconcileAgentThreadHistory(activeThreadId, "merged");
      }
      return;
    }

    let cancelled = false;
    setIsBotHistoryLoading(true);

    void reconcileAgentThreadHistory(activeThreadId, "merged")
      .then((changed) => {
        if (cancelled || !changed) return;
      })
      .catch(() => {
        // Ensure loading clears on error
      })
      .finally(() => {
        if (!cancelled) {
          setAgentHistoryHydratedThreadId(activeThreadId);
          setIsBotHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeThreadId,
    isAuthReady,
    isStreaming,
    isZakiBotActiveSpace,
    messagesByThread,
    reconcileAgentThreadHistory,
  ]);

  // First message transition effect
  useEffect(() => {
    if (messages.length === 1 && prevMessageCount.current === 0) {
      setFirstMessageTransition(true);
      const timeout = window.setTimeout(() => {
        setFirstMessageTransition(false);
      }, 420);
      prevMessageCount.current = messages.length;
      return () => window.clearTimeout(timeout);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Input offset effect
  useEffect(() => {
    const updateOffset = () => {
      if (!showReady || showSpacesView || showSpaceDetail || activeThreadId) {
        setInputOffset(0);
        return;
      }
      const container = containerRef.current;
      const input = inputWrapRef.current;
      if (!container || !input) return;
      const containerRect = container.getBoundingClientRect();
      const inputRect = input.getBoundingClientRect();
      const currentTop = inputRect.top - containerRect.top;
      const readyRect = readyRef.current?.getBoundingClientRect();
      if (!readyRect) return;
      const readyBottom = readyRect.bottom - containerRect.top;
      const gap = 12;
      setInputOffset(readyBottom + gap - currentTop);
    };

    const frame = window.requestAnimationFrame(updateOffset);
    window.addEventListener("resize", updateOffset);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateOffset);
    };
  }, [showReady, showSpacesView, showSpaceDetail, activeThreadId]);

  // Track input height to pad chat list (ChatGPT-style spacing)
  useEffect(() => {
    const inputEl = inputWrapRef.current;
    if (!inputEl) return;
    if (typeof ResizeObserver === "undefined") {
      // Fallback: single measurement without observing
      measureInputMetrics();
      return;
    }
    measureInputMetrics();
    const observer = new ResizeObserver(measureInputMetrics);
    observer.observe(inputEl);
    window.addEventListener("resize", measureInputMetrics);
    window.addEventListener("scroll", measureInputMetrics, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureInputMetrics);
      window.removeEventListener("scroll", measureInputMetrics, true);
    };
  }, [measureInputMetrics]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(measureInputMetrics);
    return () => window.cancelAnimationFrame(frame);
  }, [
    measureInputMetrics,
    inputOffset,
    showReady,
    showSpacesView,
    showSpaceDetail,
    activeThreadId,
  ]);

  // Click outside menu effect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Event listeners for spaces data and navigation
  useEffect(() => {
    window.dispatchEvent(new Event("zaki:request-spaces"));

    const handleClearThread = () => {
      clearThread();
      setAttachments([]);
    };

    const handleViewSpaces = () => {
      goToSpaces();
      setAttachments([]);
    };

    const handleSpacesData = (event: Event) => {
      const detail = (event as CustomEvent<{ spaces: Space[] }>).detail;
      setSpacesList(detail?.spaces ?? []);
    };

    const handleRenameThread = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; label: string }>).detail;
      if (!detail?.id || !detail?.label) return;
      setSpacesList((prev) =>
        prev.map((space) => ({
          ...space,
          threads: (space.threads ?? []).map((thread) =>
            thread.id === detail.id ? { ...thread, label: detail.label } : thread
          ),
        }))
      );
    };

    const handleOpenCreateSpace = () => {
      setCreateSpaceInitialValues(null);
      setCreateSpaceOpen(true);
    };

    const handleCreateSpaceFromTemplate = (event: Event) => {
      const detail = (event as CustomEvent<{
        name?: string;
        description?: string;
        instructions?: string;
      }>).detail;
      setCreateSpaceInitialValues(detail ?? null);
      setCreateSpaceOpen(true);
    };

    const handleViewSpace = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (detail?.id) {
        window.dispatchEvent(new CustomEvent("zaki:create-thread", { detail: { spaceId: detail.id } }));
      }
      setAttachments([]);
    };

    const handleEditSpaceInstructions = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      const selected = spacesList.find((space) => space.id === detail?.id);
      if (!selected) return;
      setEditSpaceId(selected.id);
      setEditInstructionsValue(selected.instructions ?? "");
      setEditInstructionsOpen(true);
    };

    const handleUploadSpaceFiles = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      beginWorkspaceUpload(detail.id);
    };

    const handleUploadActiveSpaceFiles = () => {
      beginWorkspaceUpload();
    };

    const handleViewZakiHome = () => {
      goHome();
      setAttachments([]);
    };

    window.addEventListener("zaki:clear-thread", handleClearThread);
    window.addEventListener("zaki:view-spaces", handleViewSpaces);
    window.addEventListener("zaki:spaces-data", handleSpacesData);
    window.addEventListener("zaki:rename-thread", handleRenameThread);
    window.addEventListener("zaki:open-create-space", handleOpenCreateSpace);
    window.addEventListener("zaki:create-space-from-template", handleCreateSpaceFromTemplate);
    window.addEventListener("zaki:view-space", handleViewSpace);
    window.addEventListener("zaki:edit-space-instructions", handleEditSpaceInstructions);
    window.addEventListener("zaki:upload-space-files", handleUploadSpaceFiles);
    window.addEventListener("zaki:upload-active-space-files", handleUploadActiveSpaceFiles);
    window.addEventListener("zaki:view-zaki-home", handleViewZakiHome);

    return () => {
      window.removeEventListener("zaki:clear-thread", handleClearThread);
      window.removeEventListener("zaki:view-spaces", handleViewSpaces);
      window.removeEventListener("zaki:spaces-data", handleSpacesData);
      window.removeEventListener("zaki:rename-thread", handleRenameThread);
      window.removeEventListener("zaki:open-create-space", handleOpenCreateSpace);
      window.removeEventListener("zaki:create-space-from-template", handleCreateSpaceFromTemplate);
      window.removeEventListener("zaki:view-space", handleViewSpace);
      window.removeEventListener("zaki:edit-space-instructions", handleEditSpaceInstructions);
      window.removeEventListener("zaki:upload-space-files", handleUploadSpaceFiles);
      window.removeEventListener("zaki:upload-active-space-files", handleUploadActiveSpaceFiles);
      window.removeEventListener("zaki:view-zaki-home", handleViewZakiHome);
    };
  }, [beginWorkspaceUpload, clearThread, goHome, goToSpaces, spacesList]);

  useEffect(() => {
    return () => {
      if (autoDismissTimerRef.current) {
        window.clearTimeout(autoDismissTimerRef.current);
      }
      if (zakiBotProcessClearTimerRef.current) {
        window.clearTimeout(zakiBotProcessClearTimerRef.current);
        zakiBotProcessClearTimerRef.current = null;
      }
      streamAbortRef.current?.abort();
    };
  }, []);

  // Render main content based on view
  const renderContent = () => {
    if (showSpacesView) {
      return (
        <SpacesView
          spacesList={spacesList}
          onCreateSpace={() => setCreateSpaceOpen(true)}
          onViewSpace={(id) => {
            if (!authUserId) {
              const existingThreadId =
                spacesList.find((space) => space.id === id)?.threads?.[0]?.id ??
                createAnonymousThreadId();
              goToThread(id, existingThreadId);
              navigate(`/spaces/${encodeURIComponent(id)}/threads/${encodeURIComponent(existingThreadId)}`);
              return;
            }
            window.dispatchEvent(new CustomEvent("zaki:view-space", { detail: { id } }));
          }}
        />
      );
    }

    if (showAbout) {
      return (
        <ZakiHomeView
          primarySpace={primarySpace}
          onSendExample={(example) => handleSend(example, [])}
          onGoToThread={goToThread}
          onDeleteThread={(threadId, spaceId) => {
            window.dispatchEvent(new CustomEvent("zaki:delete-thread", { detail: { id: threadId, spaceId } }));
          }}
        />
      );
    }

    if (showZakiHome) {
      if (sidebarMode === "zaki") {
        return (
          <ZakiDashboard
            onSendExample={(example) => handleSend(example, [])}
            onOpenMemoryImport={() => setMemoryImportOpen(true)}
            onOpenSession={selectAgentSession}
          />
        );
      }
      return (
        <ZakiHomeView
          primarySpace={primarySpace}
          onSendExample={(example) => handleSend(example, [])}
          onGoToThread={goToThread}
          onDeleteThread={(threadId, spaceId) => {
            window.dispatchEvent(new CustomEvent("zaki:delete-thread", { detail: { id: threadId, spaceId } }));
          }}
        />
      );
    }

    if (showReady) {
      return (
        <ReadyState
          ref={readyRef}
          onStartChat={handleStartChat}
        />
      );
    }

    const zakiStreamingModeVariant =
      isZakiBotActiveSpace && zakiBotProcessSnapshot.isReplyReplay
        ? "final_reply_reveal"
        : "thinking";
    const zakiStreamingBadgeLabel = isZakiBotActiveSpace
      ? zakiBotProcessSnapshot.isCacheHit
        ? isRtl
          ? "استجابة مخزنة"
          : "Cache hit"
        : zakiBotProcessSnapshot.isReplyReplay
          ? isRtl
            ? "الرد النهائي"
            : "Final reply"
          : undefined
      : undefined;
    const zakiStreamingHelperText =
      isZakiBotActiveSpace && zakiBotProcessSnapshot.isReplyReplay
        ? isRtl
          ? "الإجابة جاهزة"
          : "Answer is ready"
        : undefined;

    const replayTimelines: Record<string, NullalisTranscriptEntry[]> = {};
    if (isZakiBotActiveSpace) {
      for (const m of messages) {
        if (m.role !== "assistant") continue;
        const snapshot = localTurnSnapshots[m.id];
        if (snapshot && snapshot.length) {
          replayTimelines[m.id] = snapshot;
          continue;
        }
        const events = (m as { turnEvents?: Array<{ eventType: string; payload: Record<string, unknown>; ts?: number }> })
          .turnEvents;
        if (!Array.isArray(events) || events.length === 0) continue;
        const entries: NullalisTranscriptEntry[] = [];
        for (const e of events) {
          const ts = typeof e.ts === "number" ? e.ts : Date.now();
          const entry = extractNullalisTranscriptEntry(e.eventType, e.payload ?? {}, ts);
          if (entry) entries.push(entry);
        }
        if (entries.length) replayTimelines[m.id] = entries;
      }
    }

    return (
      <ChatView
        messages={messages}
        spaceId={activeWorkspaceSlug || ""}
        replayTimelines={replayTimelines}
        isHistoryLoading={isHistoryLoading || (isZakiBotActiveSpace && isBotHistoryLoading)}
        isStreaming={isStreaming}
        streamingLabel={
          streamingIndicatorMode === "researching"
            ? t("chat.researching")
            : streamingIndicatorMode === "writing"
              ? (isRtl ? "يكتب" : "Writing")
              : t("chat.thinking")
        }
        streamingPillLabel={
          isZakiBotActiveSpace && zakiBotReplyStart?.streamKind === "final_reply"
            ? isRtl
              ? "الرد النهائي"
              : "Final reply"
            : streamingIndicatorMode === "researching"
              ? t("chat.researching")
              : undefined
        }
        streamingBadgeLabel={zakiStreamingBadgeLabel}
        streamingHelperText={zakiStreamingHelperText}
        streamingModeVariant={zakiStreamingModeVariant}
        botReplyStart={isZakiBotActiveSpace ? zakiBotReplyStart : null}
        nullalisMode={isZakiBotActiveSpace}
        nullalisNarrationFrame={isZakiBotActiveSpace ? nullalisNarrationFrame : null}
        nullalisTranscriptEntries={isZakiBotActiveSpace ? nullalisTranscriptEntries : []}
        nullalisTaskItems={isZakiBotActiveSpace ? agentCurrentTaskItems : []}
        nullalisApprovalRequest={isZakiBotActiveSpace ? nullalisApprovalRequest : null}
        zakiUsageSummary={isZakiBotActiveSpace ? zakiUsageSummary : null}
        botMode={isZakiBotActiveSpace}
        firstMessageTransition={firstMessageTransition}
        turnStartedAt={turnStartedAt}
        turnDurationMs={turnDurationMs}
        onCopyMessage={handleCopyMessage}
        onRegenerateMessage={handleRegenerateMessage}
        onThumbsUpMessage={handleThumbsUpMessage}
        onThumbsDownMessage={handleThumbsDownMessage}
        getReaction={getReaction}
      />
    );
  };

  const renderAgentInspectorRail = (options?: { mobile?: boolean }) => isAgentSurface ? (
    <AgentInspectorRail
      sessionKey={normalizedActiveZakiSessionKey}
      tasks={agentCurrentTaskItems}
      isStreaming={isStreaming}
      isOnline={isOnline}
      cronJobs={agentCronJobs}
      cronLoading={agentCronLoading}
      cronError={agentCronError}
      jobs={agentJobs}
      jobsLoading={agentJobsLoading}
      jobsError={agentJobsError}
      artifacts={agentArtifactSnapshots}
      artifactsScope={agentArtifactScope}
      artifactsLoading={agentArtifactsLoading}
      artifactsError={agentArtifactsError}
      transcriptEntries={agentInspectorTranscriptEntries}
      onCronChanged={refreshAgentRuntimePanelData}
      onOpenArtifact={openAgentArtifactCanvas}
      onRetryPlanStep={handleRetryAgentPlanStep}
      tabRequest={agentInspectorTabRequest}
      onClose={
        options?.mobile
          ? () => setAgentMobileInspectorOpen(false)
          : () => setAgentInspectorOpen(false)
      }
    />
  ) : null;

  const renderLiveBrowserPanel = (options?: { mobile?: boolean }) => {
    if (!isAgentSurface || !liveBrowserFrame || !hasLiveBrowserFrame) return null;
    return (
      <section
        className={cn(
          "zaki-agent-live-browser",
          options?.mobile && "zaki-agent-live-browser--mobile"
        )}
        aria-label="Live browser"
        data-testid="agent-live-browser-panel"
      >
        <div className="zaki-agent-live-browser__head">
          <span>Browser</span>
          <strong>{liveBrowserFrame.title?.trim() || liveBrowserFrame.url?.trim() || "Live page"}</strong>
        </div>
        <BrowserViewFeedPanel
          frame={liveBrowserFrame}
          embedded
          onClose={closeLiveBrowserFrame}
        />
      </section>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "zaki-chat flex-1 relative flex min-h-0 flex-col h-full bg-transparent overflow-x-hidden",
        isAgentSurface && "zaki-agent-v2",
        isAgentSurface &&
          (agentInspectorOpen || hasLiveBrowserFrame) &&
          !agentFocusMode &&
          "zaki-agent-v2--inspector",
        isAgentSurface &&
          !agentInspectorOpen &&
          !hasLiveBrowserFrame &&
          "zaki-agent-v2--inspector-collapsed",
        isAgentSurface && agentFocusMode && "zaki-agent-v2--focus"
      )}
      data-agent-surface={isAgentSurface ? "true" : undefined}
      style={
        {
          "--zaki-input-height": `${inputHeight}px`,
          "--zaki-input-offset": `${inputOffset}px`,
          "--zaki-input-left": `${inputLeft}px`,
          "--zaki-input-width": `${inputWidth}px`,
        } as CSSProperties
      }
      onDragEnter={(event) => {
        event.preventDefault();
        dragCounter.current += 1;
        setDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
          setDragActive(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragCounter.current = 0;
        setDragActive(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length) {
          const targetSpaceId = activeWorkspaceSlug ?? primarySpace?.id ?? null;
          if (!targetSpaceId) {
            toast.error(isRtl ? "اختر مساحة أولًا لإضافة الملفات." : "Select a space before adding files.");
            return;
          }
          if (targetSpaceId === ZAKI_BOT_SPACE_ID) {
            // Route to InputArea attachments (chat-level) instead of workspace grounding
            setAttachments((prev) => [...prev, ...files]);
            return;
          }
          handleWorkspaceFilesSelected(targetSpaceId, files);
        }
      }}
    >
      {/* Drag overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
          <div className="rounded-zaki-lg border border-zaki bg-white px-5 py-3 text-sm text-zaki-secondary shadow-[0px_10px_24px_rgba(15,15,15,0.12)]">
            {chatCopy.dragPrompt}
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative h-full rounded-none border-0 bg-transparent overflow-hidden flex flex-col",
          isAgentSurface && "zaki-agent-v2__surface",
          // Spaces Classic scope: Chat/Spaces surfaces only (excludes the Agent
          // surface AND the Agent dashboard, which is !isAgentSurface but is a
          // bot space). Hosts the retuned background pattern + Spaces styling.
          !isZakiBotActiveSpace && "zaki-spaces-classic"
        )}
      >
        {/* Background */}
        {!isAgentSurface ? <BackgroundPattern /> : null}

        {isAgentSurface ? (
          <V2StatusStrip
            aria-label={t("agent.status.ariaLabel", { defaultValue: "Agent status" })}
            items={[
              {
                id: "runtime",
                label:
                  zakiBotProvisionState === "error"
                    ? t("agent.status.setupBlocked", { defaultValue: "Setup blocked" })
                    : zakiBotProvisionState !== "ready"
                      ? t("agent.status.settingUp", { defaultValue: "Setting up" })
                      : isStreaming || activeSessionUi?.live || activeSessionRecord?.live
                    ? t("agent.status.online", { defaultValue: "Online" })
                    : t("agent.status.ready", { defaultValue: "Ready" }),
                active:
                  zakiBotProvisionState === "ready" &&
                  Boolean(isStreaming || activeSessionUi?.live || activeSessionRecord?.live),
                tone:
                  zakiBotProvisionState === "error"
                    ? "danger"
                    : zakiBotProvisionState === "ready"
                      ? "accent"
                      : "warn",
              },
              {
                id: "mode",
                label: t("agent.status.mode", { defaultValue: "Mode" }),
                value: activeSessionMode ?? "execute",
              },
              {
                id: "context",
                label: t("agent.status.context", { defaultValue: "Context" }),
                value:
                  agentContextPercent != null
                    ? `${Math.round(agentContextPercent)}%`
                    : "--",
              },
              {
                id: "weekly",
                label: t("agent.status.weekly", { defaultValue: "Weekly" }),
                value: agentWeeklyLabel,
              },
            ]}
          />
        ) : null}

        <div
          className={cn(
            "relative z-20 h-full",
            isAgentSurface ? "zaki-agent-v2__grid" : "flex flex-col"
          )}
        >
          {isAgentSurface ? (
            <AgentSessionRail
              sessions={zakiThreadSessions}
              isLoading={zakiSessionsLoading}
              isError={zakiSessionsError}
              activeSessionKey={normalizedActiveZakiSessionKey}
              isRtl={isRtl}
              onSelectSession={selectAgentSession}
              onCreateSession={handleCreateAgentSession}
              onDeleteSession={handleDeleteAgentSession}
              onRenameSession={handleRenameAgentSession}
              onRepairSessionTitles={repairAgentSessionTitles}
              onRetrySessions={() => {
                void refetchZakiSessions();
              }}
            />
          ) : null}

          <section
            className={cn(
              "min-h-0",
              isAgentSurface ? "zaki-agent-v2__chat" : "flex h-full flex-col"
            )}
          >
          {/* Conversation actions */}
          {!isAgentSurface && !showZakiHome && !showSpacesView ? (
            <div
              className="pointer-events-none absolute right-3 top-3 z-30 flex items-center justify-end md:right-6 md:top-4"
              dir="ltr"
            >
              <div
                className="zaki-agent-head-actions pointer-events-auto relative z-30 flex items-center gap-2"
                ref={menuRef}
              >
                <button
                  type="button"
                  className="zaki-share-pill inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/80 px-3 py-1.5 text-sm text-zaki-primary hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                  onClick={handleShare}
                  aria-label={chatCopy.shareConversationAria}
                >
                  <Share2 className="size-4 text-zaki-muted" />
                  {chatCopy.shareConversation}
                </button>
                <button
                  type="button"
                  className="size-11 md:size-8 rounded-full border border-zaki-subtle bg-white/80 flex items-center justify-center text-zaki-muted hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label={chatCopy.moreOptionsAria}
                >
                  <MoreVertical className="size-4" />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-zaki-lg border border-zaki-subtle bg-white shadow-[0px_14px_30px_rgba(15,15,15,0.12)] p-1"
                    role="menu"
                  >
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-zaki-md px-3 py-2.5 text-left text-sm text-zaki-primary hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        if (isAgentSurface) {
                          openAgentMemorySurface();
                        } else {
                          openMemoryViewer();
                        }
                      }}
                      aria-label={chatCopy.reviewMemoriesAria}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                          <Brain className="size-4 shrink-0 text-zaki-muted" />
                          <span className="truncate">{chatCopy.reviewMemories}</span>
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="w-full cursor-pointer rounded-zaki-md px-3 py-2.5 text-left text-sm text-zaki-primary hover:bg-zaki-hover transition-colors focus-visible:ring-2 focus-visible:ring-zaki-brand focus-visible:ring-offset-2"
                      role="menuitem"
                      onClick={handleExport}
                      aria-label={chatCopy.exportJsonAria}
                    >
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <Download className="size-4 shrink-0 text-zaki-muted" />
                        <span>{chatCopy.exportJson}</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
              ) : !isAgentSurface ? (
                <div className="h-[64px]" aria-hidden="true" />
              ) : null}

          {/* C5: System notices — rendered here so they appear on ALL views
              (home, spaces, chat, brain) regardless of which view is active */}
          <SystemNoticesStack className="-mb-2" />

          {isZakiBotActiveSpace && authUserId && zakiBotProvisionState !== "ready" ? (
            <div
              className="zaki-agent-provision-state"
              data-state={zakiBotProvisionState === "error" ? "error" : "loading"}
              data-testid="agent-provision-state"
              role={zakiBotProvisionState === "error" ? "alert" : "status"}
              aria-live={zakiBotProvisionState === "error" ? "assertive" : "polite"}
            >
              <span className="zaki-agent-provision-state__icon" aria-hidden>
                {zakiBotProvisionState === "error" ? (
                  <RefreshCw className="size-3.5" />
                ) : (
                  <LoaderCircle className="size-3.5 animate-spin" />
                )}
              </span>
              <span className="zaki-agent-provision-state__copy">
                <strong>
                  {zakiBotProvisionState === "error"
                    ? t("agent.provision.errorTitle", {
                        defaultValue: "Agent setup needs another try",
                      })
                    : t("agent.provision.loadingTitle", {
                        defaultValue: "Setting up your agent…",
                      })}
                </strong>
                <span>
                  {zakiBotProvisionState === "error"
                    ? zakiBotProvisionError ||
                      t("agent.provision.errorFallback", {
                        defaultValue: "ZAKI could not finish setup.",
                      })
                    : t("agent.provision.loadingHelper", {
                        defaultValue: "The composer will unlock when setup is ready.",
                      })}
                </span>
              </span>
              {zakiBotProvisionState === "error" ? (
                <button
                  type="button"
                  className="zaki-agent-provision-state__retry"
                  onClick={() => void ensureZakiBotProvisioned()}
                >
                  <RefreshCw className="size-3" aria-hidden />
                  {t("agent.provision.retry", { defaultValue: "Retry setup" })}
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Main Content */}
          <div className={cn("zaki-chat-main flex-1 relative z-10 min-h-0 flex overflow-hidden", isAgentSurface && "zaki-agent-v2__workspace")}>
            <div
              className={cn(
                "flex-1 relative z-10 overflow-y-auto overflow-x-hidden overscroll-y-contain zaki-scrollbar-fade",
                isAgentSurface && "zaki-agent-v2__scroll"
              )}
              ref={scrollRef}
              style={{
                paddingBottom:
                  !showZakiHome && !showSpacesView && !showSpaceDetail
                    ? Math.max(24, inputHeight + 24)
                    : undefined,
                WebkitOverflowScrolling: "touch",
              }}
              onScroll={() => {
                if (!scrollRef.current) return;
                if (scrollRafRef.current) return;
                scrollRafRef.current = window.requestAnimationFrame(() => {
                  if (!scrollRef.current) return;
                  const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                  const atBottom = scrollTop + clientHeight >= scrollHeight - 48;
                  autoScrollRef.current = atBottom;
                  setShowScrollToBottom(scrollHeight - clientHeight > 120 && !atBottom);
                  scrollRafRef.current = null;
                });
              }}
            >
              {renderContent()}
            </div>

          </div>

          {isAgentSurface && selectedAgentArtifact ? (
            <aside
              className="zaki-agent-artifact-overlay"
              aria-label={t("agent.artifactCanvas.ariaLabel", {
                defaultValue: "Artifact canvas",
              })}
            >
              <AgentArtifactCanvas
                artifact={selectedAgentArtifact}
                onClose={() => setSelectedAgentArtifact(null)}
                onRequestAgentEdit={handleAgentArtifactRevisionRequest}
              />
            </aside>
          ) : null}

          {showScrollToBottom && !showZakiHome && !showSpacesView && !showSpaceDetail && (
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-30"
              style={{ bottom: Math.max(24, inputHeight + 24 + inputOffset) + 20 }}
            >
              <button
                type="button"
                className="pointer-events-auto size-10 rounded-full border border-zaki-subtle bg-white/90 text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover shadow-[0px_10px_24px_rgba(15,15,15,0.16)] transition-colors"
                onClick={() => {
                  const el = scrollRef.current;
                  if (!el) return;
                  el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
                  autoScrollRef.current = true;
                  setShowScrollToBottom(false);
                }}
                aria-label={chatCopy.scrollToBottomAria}
              >
                <ChevronDown className="size-5 mx-auto" />
              </button>
            </div>
          )}

          {/* Input Area */}
          {!showAbout && !showSpacesView && !showSpaceDetail && !(showZakiHome && sidebarMode === "zaki") && (
            <div
              ref={inputWrapRef}
              className="zaki-input-float relative z-20"
              style={{ transform: `translateY(${inputOffset}px)` }}
            >
              {isAgentSurface &&
              (firstRunPhase === "awaiting_name" || firstRunPhase === "saving_name") ? (
                <FirstRunNameCard
                  phase={firstRunPhase}
                  onComplete={completeFirstRunName}
                  error={firstRunError}
                />
              ) : null}
              {/* Single source of truth for ApprovalRequiredCard. The
                  timeline copy was dropped in 18328cd so the decided
                  state has one owner. Surfaces directly above the
                  composer where the user's attention is. */}
              {paywallCardData ? (
                <div className="zaki-approval-card-slot">
                  <PaywallCard
                    state={paywallCardData.state}
                    planLabel={paywallCardData.planLabel}
                    remaining={paywallCardData.remaining}
                    effectiveRemaining={paywallCardData.effectiveRemaining}
                    requiredUnits={paywallCardData.requiredUnits}
                    constraint={paywallCardData.constraint}
                    rollingWindowPercent={paywallCardData.rollingWindowPercent}
                    rollingWindowHours={paywallCardData.rollingWindowHours}
                    resetAt={paywallCardData.resetAt}
                    message={paywallCardData.message}
                    identity={paywallCardData.identity}
                    limitPeriod={paywallCardData.limitPeriod}
                    limitUsed={paywallCardData.limitUsed}
                    limitTotal={paywallCardData.limitTotal}
                    promptPreserved={paywallCardData.promptPreserved}
                    onSeePlans={() => navigate("/pricing")}
                    // The anonymous limit state's ONE action: an account. Carry the
                    // visitor back here after auth so the preserved prompt is still
                    // in front of them (the #89 claim flow imports the thread).
                    onSignIn={() => navigate("/?auth=login")}
                    onDismiss={() => setPaywallCardData(null)}
                  />
                </div>
              ) : null}
              {isZakiBotActiveSpace && nullalisApprovalRequest ? (
                <div className="zaki-approval-card-slot">
                  <ApprovalRequiredCard
                    request={nullalisApprovalRequest}
                    onApprove={handleApprovalAction ? (id) => handleApprovalAction(id, true) : undefined}
                    onApproveForSession={
                      handleApprovalAction
                        ? (id) => handleApprovalAction(id, true, { allowForSession: true })
                        : undefined
                    }
                    onModify={handleApprovalModify}
                    onDeny={handleApprovalAction ? (id) => handleApprovalAction(id, false) : undefined}
                  />
                </div>
              ) : null}
              {showComposerQuickReplies ? (
                <div
                  className="zaki-composer-quick-replies mx-auto w-full max-w-[900px] px-6"
                  data-visible={composerQuickReplyVisible ? "true" : "false"}
                >
                  <QuickReplyChips
                    onPick={handleQuickReply}
                    isRtl={isRtl}
                    items={composerQuickReplyItems}
                    disabled={!composerQuickReplyVisible}
                  />
                </div>
              ) : null}
              <InputArea
                composerHandleRef={composerHandleRef}
                onSend={handleSend}
                onCompact={handleCompactSession}
                isCompacting={isCompacting}
                agentUserId={isZakiBotActiveSpace ? agentUserId : null}
                attachments={attachments}
                setAttachments={setAttachments}
                isSending={isStreaming}
                onStop={handleStopStreaming}
                queryModeEnabled={queryModeEnabled}
                onToggleQueryMode={() => setQueryModeEnabled((prev) => !prev)}
                // Upgrade/plan affordance belongs to the Dashboard, not the
                // chat composer — the bar above the input was visual noise.
                showUpgradeStrip={false}
                sendLocked={isComposerSendLocked}
                zakiBotMode={isZakiBotActiveSpace}
                zakiDefaultAutonomy={agentDefaultAutonomy}
                zakiDefaultReasoningEffort={agentDefaultReasoningEffort}
                threadKey={
                  activeThreadId
                    ? `${activeWorkspaceSlug || "_"}::${activeThreadId}`
                    : null
                }
                lastUserMessage={
                  (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      const m = messages[i];
                      if (m && m.role === "user" && typeof m.content === "string" && m.content.trim()) {
                        return m.content;
                      }
                    }
                    return null;
                  })()
                }
                zakiMode={activeSessionMode ?? "execute"}
                onZakiModeChange={isZakiBotActiveSpace ? handleSessionModeChange : undefined}
                zakiModePending={isZakiBotActiveSpace ? sessionModePending : false}
                zakiApprovalCount={zakiApprovalCount}
                zakiArtifactCount={isZakiBotActiveSpace ? agentArtifactEventCount : 0}
                zakiSandboxLabel={
                  isZakiBotActiveSpace
                    ? sandboxState?.enabled
                      ? sandboxState.backend || "on"
                      : "off"
                    : null
                }
                onOpenZakiApprovals={
                  undefined
                }
                onOpenZakiBrowser={
                  isZakiBotActiveSpace && hasLiveBrowserFrame
                    ? () => {
                        setAgentFocusMode(false);
                        if (agentMobileViewport) {
                          setAgentMobileInspectorOpen(true);
                        }
                      }
                    : undefined
                }
                onOpenZakiArtifacts={
                  isZakiBotActiveSpace
                    ? () => openAgentInspectorTab("artifacts")
                    : undefined
                }
                zakiContextPressurePercent={
                  isZakiBotActiveSpace
                    ? agentContextPercent
                    : null
                }
                zakiCompactionThresholdPct={agentCompactionNudgePercent}
                quotaBadge={
                  !isZakiBotActiveSpace && legacyQuotaInfo
                    ? {
                        label:
                          legacyQuotaInfo.remaining <= 0
                            ? chatCopy.quotaBadgeDanger
                            : legacyQuotaInfo.remaining <= 2
                              ? chatCopy.quotaBadgeWarning
                              : chatCopy.quotaBadgeNeutral,
                        tone:
                          legacyQuotaInfo.remaining <= 0
                            ? "danger"
                            : legacyQuotaInfo.remaining <= 2
                              ? "warning"
                              : "neutral",
                      }
                    : null
                }
              />
            </div>
          )}

          {/* Hidden file input for space files */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept={Object.values(acceptedWorkspaceTypes).flat().join(",")}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              if (botAttachmentPickRef.current) {
                botAttachmentPickRef.current = false;
                if (files.length) {
                  setAttachments((prev) => [...prev, ...files]);
                }
                event.target.value = "";
                return;
              }
              const targetSpaceId = fileUploadSpaceId;
              setFileUploadSpaceId(null);
              event.target.value = "";
              if (!targetSpaceId || files.length === 0) return;
              handleWorkspaceFilesSelected(targetSpaceId, files);
            }}
          />
          </section>
          {isAgentSurface && (agentInspectorOpen || hasLiveBrowserFrame) && !agentFocusMode ? (
            <div className="zaki-agent-v2__side-stack" aria-label="Agent side panels">
              {renderLiveBrowserPanel()}
              {agentInspectorOpen ? renderAgentInspectorRail() : null}
            </div>
          ) : null}
        </div>
      </div>

      {isAgentMobilePanelOpen ? (
        <div
          ref={agentMobileInspectorRef}
          className="zaki-agent-mobile-inspector"
          role="dialog"
          aria-modal="true"
          aria-label={t("agent.mobilePanel.ariaLabel", { defaultValue: "Agent panel" })}
          data-testid="agent-mobile-inspector"
        >
          <button
            type="button"
            className="zaki-agent-mobile-inspector__backdrop"
            onClick={closeAgentMobilePanel}
            aria-label={t("agent.mobilePanel.closeBackdropAria", {
              defaultValue: "Close agent panel",
            })}
            tabIndex={-1}
          />
          <section className="zaki-agent-mobile-inspector__sheet">
            <div className="zaki-agent-mobile-inspector__handle" aria-hidden />
            <header className="zaki-agent-mobile-inspector__head">
              <div>
                <span>{t("agent.mobilePanel.kicker", { defaultValue: "Agent" })}</span>
                <strong>{t("agent.mobilePanel.title", { defaultValue: "Inspector" })}</strong>
              </div>
              <button
                ref={agentMobileInspectorCloseRef}
                type="button"
                onClick={closeAgentMobilePanel}
                aria-label={t("agent.mobilePanel.closeAria", {
                  defaultValue: "Close agent panel",
                })}
              >
                {t("agent.mobilePanel.close", { defaultValue: "Close" })}
              </button>
            </header>
            {renderLiveBrowserPanel({ mobile: true })}
            {agentMobileInspectorOpen ? renderAgentInspectorRail({ mobile: true }) : null}
          </section>
        </div>
      ) : null}

      {/* Modals */}
      <EditInstructionsModal
        isOpen={editInstructionsOpen}
        initialValue={editInstructionsValue}
        onClose={() => {
          setEditInstructionsOpen(false);
          setEditSpaceId(null);
        }}
        onSave={(instructions) => {
          if (editSpaceId) {
            window.dispatchEvent(
              new CustomEvent("zaki:update-space", {
                detail: { id: editSpaceId, instructions },
              })
            );
          }
        }}
      />

      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        workspaceSlug={activeWorkspaceSlug || ""}
        threadSlug={activeThreadId || ""}
        threadTitle={headerThreadName}
        messages={messages}
      />

      <MemoryImportSheet
        isOpen={memoryImportOpen}
        onClose={() => setMemoryImportOpen(false)}
        onImport={async (dump) => {
          let partialError: MemoryImportPartialError | null = null;
          let absorption;
          try {
            absorption = await absorbMemoryImport(dump, activeThreadId);
          } catch (error) {
            if (!(error instanceof MemoryImportPartialError)) throw error;
            partialError = error;
            absorption = error.partial;
          }
          const { saved, superseded, duplicates } = absorption;
          setMemoryError(null);
          setMemoryToastUndoError(null);
          setMemoryToastPartialUndoCount(0);
          presentMemoryToast({
            saved,
            supersededCount: superseded.length,
            duplicateCount: duplicates.length,
            source: "import",
          });
          if (saved.length > 0 && authUserId && !activationProgress.firstMemorySaved) {
            const nextProgress = markFirstMemorySaved(authUserId);
            setActivationProgress(nextProgress);
            void trackProductEvent({
              event: "first_memory_saved",
              source: "memory_import",
              language: isRtl ? "ar" : "en",
              plan: null,
              interval: null,
            }).catch(() => {
              // Best-effort telemetry only.
            });
            if (nextProgress.completed) {
              void trackProductEvent({
                event: "activation_completed",
                source: "memory_import",
                language: isRtl ? "ar" : "en",
                plan: null,
                interval: null,
              }).catch(() => {
                // Best-effort telemetry only.
              });
            }
          }
          if (partialError) throw partialError;
        }}
      />

      <CreateSpaceModal
        isOpen={createSpaceOpen}
        initialValues={createSpaceInitialValues}
        onClose={() => {
          setCreateSpaceOpen(false);
          setCreateSpaceInitialValues(null);
        }}
        onCreate={(data) => {
          window.dispatchEvent(
            new CustomEvent("zaki:create-space", { detail: data })
          );
          setCreateSpaceInitialValues(null);
        }}
      />

      {showMemoryToast && authUserId && (
        <MemoryCaptureToast
          position={toastPosition}
          source={memoryToastSource}
          savedCount={recentSavedMemories.length}
          supersededCount={recentSupersededCount}
          duplicateCount={recentDuplicateCount}
          processing={isUndoingMemoryToast}
          onUndo={
            recentSavedMemories.length > 0
              ? async () => {
                  if (isUndoingMemoryToast) return;
                  setIsUndoingMemoryToast(true);
                  setMemoryToastUndoError(null);
                  setMemoryToastPartialUndoCount(0);
                  try {
                    const results = await settleMemoryUndosNewestFirst(
                      recentSavedMemories,
                      (memory) =>
                        apiRequest(`/api/memory/undo/${memory.id}`, {
                          method: "POST",
                        }).then(async (response) => {
                          let data: { success?: boolean; error?: string | null } | null = null;
                          try {
                            data = (await response.json()) as {
                              success?: boolean;
                              error?: string | null;
                            };
                          } catch {
                            data = null;
                          }
                          const error =
                            typeof data?.error === "string" && data.error.trim()
                              ? data.error.trim()
                              : null;
                          if (!response.ok || data?.success === false) {
                            throw new Error(error || t("memory.undoFailed"));
                          }
                          return { id: memory.id };
                        })
                    );

                    const succeededIds = new Set<string>();
                    let firstError: string | null = null;
                    for (const result of results) {
                      if (result.status === "fulfilled") {
                        succeededIds.add(result.value.id);
                        continue;
                      }
                      if (!firstError && result.reason instanceof Error) {
                        firstError = result.reason.message;
                      }
                    }

                    if (succeededIds.size === recentSavedMemories.length) {
                      dismissMemoryToast();
                      requestMemoryStatusSync(true);
                      return;
                    }

                    const remainingMemories = recentSavedMemories.filter(
                      (memory) => !succeededIds.has(memory.id)
                    );
                    const partialUndoCount = succeededIds.size;
                    setRecentSavedMemories(remainingMemories);
                    setMemoryToastPartialUndoCount(partialUndoCount);
                    setMemoryToastUndoError(
                      firstError ||
                        t(
                          partialUndoCount > 0
                            ? "memory.undoPartialError"
                            : "memory.undoFailed"
                        )
                    );
                    setShowMemoryToast(remainingMemories.length > 0);
                    requestMemoryStatusSync(true);
                  } finally {
                    setIsUndoingMemoryToast(false);
                  }
                }
              : undefined
          }
          onOpenMemory={() => {
            dismissMemoryToast();
            if (memoryToastSource === "import") {
              openAgentMemorySurface();
            } else {
              openMemoryViewer();
            }
          }}
          onDismiss={dismissMemoryToast}
          undoError={memoryToastUndoError}
          partialUndoCount={memoryToastPartialUndoCount}
        />
      )}

      {memoryError && (
        <div
          className="fixed z-50"
          aria-live="polite"
          style={{
            left: toastPosition.left,
            width: toastPosition.width,
            bottom: toastPosition.bottom + 36,
          }}
        >
          <div className="rounded-full border border-zaki-subtle dark:border-zaki-dark bg-white dark:bg-zaki-dark-card px-3 py-1.5 text-2xs text-zaki-secondary dark:text-zaki-dark-subtle shadow-[0px_8px_20px_rgba(15,15,15,0.08)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand text-[10px] font-semibold">
                !
              </span>
              <span>{memoryError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-zaki-brand font-semibold hover:underline"
                  onClick={() => {
                    const last = lastMemoryRequestRef.current;
                    if (last) {
                      checkForSavedMemories(last.message, last.threadId);
                    }
                    setMemoryError(null);
                  }}
              >
                Retry
              </button>
              <button
                type="button"
                className="text-zaki-muted dark:text-zaki-dark-muted font-medium hover:underline"
                onClick={() => setMemoryError(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

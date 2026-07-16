export type BotStatusEvent = {
  id: string;
  text: string;
  timestamp: number;
  fingerprint?: string | null;
  source?: "progress" | "status" | "fallback" | "summary";
  phase?: string | null;
  state?: string | null;
  label?: string | null;
  tool?: string | null;
  taskId?: string | null;
  iteration?: number | null;
  durationMs?: number | null;
  terminal?: "done" | "error" | null;
};

export type BotReasoningSummary = {
  id: string;
  text: string;
  timestamp: number;
  phase?: string | null;
  tool?: string | null;
  iteration?: number | null;
};

export type BotReplyStart = {
  id: string;
  timestamp: number;
  streamKind?: string | null;
  deliveryMode?: string | null;
  live?: boolean | null;
};

export type ZakiTranscriptEntryKind =
  | "narration"
  | "task"
  | "tool"
  | "status"
  | "transition";

export type ZakiTranscriptEntry = {
  id: string;
  kind: ZakiTranscriptEntryKind;
  text: string;
  timestamp: number;
  meta?: string | null;
  state?: "active" | "done" | "error" | null;
};

export type ZakiUxPhase =
  | "ack"
  | "working"
  | "tooling"
  | "reply_ready"
  | "revealing"
  | "complete"
  | "error";

export type ZakiProcessSnapshot = {
  phase: ZakiUxPhase;
  summaryText: string | null;
  latestStatusText: string | null;
  latestStatusMeta: string | null;
  latestToolName: string | null;
  currentActionText?: string | null;
  currentActionMeta?: string | null;
  currentActionKind?: ZakiTranscriptEntryKind | null;
  transcriptEntries?: ZakiTranscriptEntry[];
  workStartedAt?: number | null;
  hasTools: boolean;
  isCacheHit: boolean;
  isReplyReplay: boolean;
  replyRevealStarted: boolean;
};

export type NullalisNarrationPhase =
  | "thinking"
  | "tool_start"
  | "tool_done"
  | "waiting"
  | "plan_step"
  | "error_recovery"
  | "listening"
  | "speaking"
  | "turn_auto_compaction"
  | "post_reply_compaction"
  | "history_maintenance_after_tools"
  | "durable_continuity_refresh"
  | "durable_continuity_refreshed";

export type NullalisNarrationFrame = {
  id: string;
  phase: NullalisNarrationPhase;
  label: string;
  tool?: string | null;
  iteration?: number | null;
  durationMs?: number | null;
  stepIndex?: number | null;
  stepTotal?: number | null;
  timestamp: number;
};

export type NullalisTranscriptEntryKind =
  | "narration"
  | "task"
  | "tool"
  | "approval"
  | "status"
  | "transition";

export type NullalisTranscriptIntent =
  | "memory"
  | "context"
  | "thinking"
  | "planning"
  | "model"
  | "tool"
  | "file"
  | "test"
  | "git"
  | "approval"
  | "final"
  | "status";

export type NullalisTranscriptEntry = {
  id: string;
  kind: NullalisTranscriptEntryKind;
  intent?: NullalisTranscriptIntent;
  text: string;
  timestamp: number;
  importance?: number;
  phase?: string | null;
  tool?: string | null;
  toolUseId?: string | null;
  taskId?: string | null;
  stepIndex?: number | null;
  stepTotal?: number | null;
  durationMs?: number | null;
  status?: string | null;
  files?: string[];
  command?: string | null;
  inputPreview?: string | null;
  outputPreview?: string | null;
  outputTruncated?: boolean;
  resultSummary?: string | null;
  activityLabel?: string | null;
  heartbeat?: boolean;
  exitCode?: number | null;
  resultState?: "running" | "done" | "failed" | "queued" | "blocked" | null;
  groupKey?: string | null;
  source?: "reasoning_summary" | "progress" | "tool" | "task" | "approval" | "done" | "fallback";
};

export type NullalisTaskStatus =
  | "queued"
  | "running"
  | "done"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "blocked"
  | "deferred";

export type NullalisTaskItem = {
  taskId: string;
  status: NullalisTaskStatus;
  description: string;
  progressPct?: number | null;
  updatedAt: number;
};

export type NullalisApprovalRequest = {
  id: string;
  approvalId?: string | null;
  numericId?: number | string | null;
  toolCallId?: string | null;
  tool: string;
  reason: string;
  riskLevel: string;
  timestamp: number;
  intent?: string | null;
  params?: unknown;
  allowForSessionSafe?: boolean;
  inputPreview?: string | null;
  effectPreview?: string | null;
  command?: string | null;
  files?: string[];
  expiresAt?: string | null;
};

export type ZakiUsageSummary = {
  usageTokens?: number | null;
  costUsd?: number | null;
  turnWeight?: number | null;
  sessionWeight?: number | null;
};

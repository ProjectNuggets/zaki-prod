import type { NullalisTranscriptEntry } from "./BotStatusRail";
import { sanitizeAssistantScaffold } from "./rendering/scaffoldSanitizer";

export type AgentInspectorPanelEvent = {
  id: string;
  artifactId?: string | null;
  category: "tool" | "schedule" | "artifact";
  label: string;
  summary: string;
  meta: string | null;
  timestamp: number;
  durationMs: number | null;
  state: NullalisTranscriptEntry["resultState"];
  files: string[];
  command: string | null;
};

export type AgentInspectorPanelModel = {
  artifacts: AgentInspectorPanelEvent[];
  cron: AgentInspectorPanelEvent[];
};

const MAX_PANEL_EVENTS = 5;

function valueToText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalize(value: unknown): string {
  return valueToText(value).toLowerCase();
}

function haystack(entry: NullalisTranscriptEntry): string {
  return [
    entry.kind,
    entry.intent,
    entry.phase,
    entry.source,
    entry.tool,
    entry.status,
    entry.command,
    entry.activityLabel,
    entry.resultSummary,
    entry.inputPreview,
    entry.outputPreview,
    entry.groupKey,
    entry.text,
    ...(entry.files ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function includesAny(entry: NullalisTranscriptEntry, terms: readonly string[]) {
  const text = haystack(entry);
  return terms.some((term) => text.includes(term));
}

function primaryLabel(entry: NullalisTranscriptEntry): string {
  return (
    valueToText(entry.activityLabel) ||
    valueToText(entry.tool) ||
    valueToText(entry.intent) ||
    valueToText(entry.phase) ||
    valueToText(entry.kind) ||
    "event"
  );
}

function primarySummary(entry: NullalisTranscriptEntry): string {
  return (
    valueToText(entry.resultSummary) ||
    valueToText(entry.outputPreview) ||
    valueToText(entry.inputPreview) ||
    valueToText(entry.text) ||
    "Event captured"
  );
}

function hasEntryContent(entry: NullalisTranscriptEntry): boolean {
  return [
    entry.activityLabel,
    entry.resultSummary,
    entry.outputPreview,
    entry.inputPreview,
    entry.text,
    entry.tool,
    entry.intent,
    entry.phase,
    entry.kind,
  ].some((value) => valueToText(value).length > 0) || Boolean(entry.files?.length);
}

function formatDuration(ms?: number | null): string | null {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  if (ms < 1000) return `${Math.max(1, Math.round(ms))}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
}

function metaForEntry(entry: NullalisTranscriptEntry): string | null {
  const bits = [
    valueToText(entry.status),
    entry.resultState ? String(entry.resultState) : "",
    formatDuration(entry.durationMs) ?? "",
    entry.files?.length ? `${entry.files.length} file${entry.files.length === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
  return bits.length ? bits.join(" · ") : null;
}

function artifactIdForEntry(entry: NullalisTranscriptEntry): string | null {
  const groupKey = valueToText(entry.groupKey);
  const groupMatch = groupKey.match(/^artifact:(.+)$/i);
  if (groupMatch?.[1]) return groupMatch[1].trim();
  for (const value of [entry.inputPreview, entry.outputPreview, entry.resultSummary, entry.text]) {
    const text = valueToText(value);
    const match = text.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
    if (match?.[0]) return match[0];
  }
  return null;
}

function categoryForEntry(entry: NullalisTranscriptEntry): AgentInspectorPanelEvent["category"] {
  if (isAgentArtifactEntry(entry)) return "artifact";
  if (isAgentCronEntry(entry)) return "schedule";
  return "tool";
}

function toPanelEvent(entry: NullalisTranscriptEntry): AgentInspectorPanelEvent {
  return {
    id:
      entry.id ||
      `${entry.kind || "event"}:${entry.timestamp || 0}:${sanitizeAssistantScaffold(primarySummary(entry))}`,
    artifactId: artifactIdForEntry(entry),
    category: categoryForEntry(entry),
    label: sanitizeAssistantScaffold(primaryLabel(entry)),
    summary: sanitizeAssistantScaffold(primarySummary(entry)),
    meta: metaForEntry(entry),
    timestamp: typeof entry.timestamp === "number" ? entry.timestamp : 0,
    durationMs:
      typeof entry.durationMs === "number" && Number.isFinite(entry.durationMs)
        ? entry.durationMs
        : null,
    state: entry.resultState ?? null,
    files: entry.files ? [...entry.files] : [],
    command: entry.command ?? null,
  };
}

function recentEvents(entries: NullalisTranscriptEntry[], limit = MAX_PANEL_EVENTS) {
  return [...entries]
    .filter(hasEntryContent)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, limit)
    .map(toPanelEvent);
}

export function isAgentCronEntry(entry: NullalisTranscriptEntry): boolean {
  const tool = normalize(entry.tool);
  if (tool === "schedule" || tool.startsWith("cron_")) return true;
  return includesAny(entry, [
    "cron",
    "scheduled",
    "recurring",
    "schedule action",
    "follow-up scheduled",
    "follow up scheduled",
  ]);
}

export function isAgentArtifactEntry(entry: NullalisTranscriptEntry): boolean {
  if (normalize(entry.phase) === "artifact_event") return true;
  if (normalize(entry.kind) === "artifact_event") return true;
  return normalize(entry.tool) === "artifact_event";
}

export function buildAgentInspectorPanelModel(
  entries: NullalisTranscriptEntry[]
): AgentInspectorPanelModel {
  const normalized = entries.filter((entry) => Boolean(entry && primarySummary(entry)));
  return {
    artifacts: recentEvents(normalized.filter(isAgentArtifactEntry)),
    cron: recentEvents(normalized.filter(isAgentCronEntry)),
  };
}

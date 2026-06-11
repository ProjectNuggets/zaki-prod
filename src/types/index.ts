/**
 * Shared type definitions for ZAKI
 */

export interface Thread {
  id: string;
  label: string;
  pinned?: boolean;
}

export interface Space {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  instructions?: string;
  pinnedFiles?: PinnedFile[];
  pinned?: boolean;
  fixed?: boolean;
  threads?: Thread[];
}

export type PinnedFileStatus = "embedded" | "processing" | "failed";

export interface PinnedFile {
  name: string;
  type: string;
  size: number;
  status?: PinnedFileStatus;
  location?: string | null;
  source?: string | null;
  title?: string | null;
  error?: string | null;
}

export interface PersistedTurnEvent {
  eventType: string;
  payload: Record<string, unknown>;
  ts?: number;
}

/**
 * One narration step for the normal Spaces always-agent chat, derived from an
 * engine `agentThought` SSE event. `kind` drives the icon; `label` is a short,
 * user-friendly string (never the raw `@agent` text).
 */
export interface AgentNarrationStep {
  kind: "search" | "scrape" | "file" | "docs" | "thought";
  label: string;
}

/**
 * A file the engine agent generated during a normal Spaces turn, surfaced from
 * a `fileDownload` SSE event and rendered as a download chip.
 */
export interface GeneratedFileRef {
  filename: string;
  storageFilename: string;
  fileSize: number | null;
}

/**
 * A document citation surfaced by the BFF doc-grounding pre-injection. One per distinct source
 * document retrieved from the workspace vector store for the turn. Rendered as a citation chip.
 */
export interface DocSource {
  id: string;
  title: string;
  snippet?: string;
  score?: number | null;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: MessageAttachment[];
  chatId?: number;
  memorySources?: MemorySource[];
  docSources?: DocSource[];
  error?: boolean;
  errorCode?: string | null;
  channel?: string | null;
  lane?: string | null;
  createdAt?: string | null;
  turnEvents?: PersistedTurnEvent[];
  /**
   * Per-turn agent narration for the NORMAL Spaces always-agent chat. These are
   * stored on the assistant message during streaming and rendered above it
   * (steps) / below it (file chips). The nullALIS agent space does NOT use
   * these — it has its own transcript rail.
   */
  agentSteps?: AgentNarrationStep[];
  agentFiles?: GeneratedFileRef[];
  agentRunning?: boolean;
}

export interface MessageAttachment {
  name: string;
  type: string;
  url: string;
}

export interface MemorySource {
  id: string;
  content: string;
  type: string;
}

export interface LibraryResult {
  id: string;
  text: string;
  score?: number;
  metadata?: Record<string, string>;
}

export interface User {
  id?: string | number;
  username?: string;
  email?: string;
  fullName?: string | null;
  role?: string;
}

/**
 * A single browser screenshot frame emitted by the agent runtime on the
 * per-turn SSE stream (`event: browser_frame`). Watch-only — the user can
 * see what the agent is browsing but cannot send input back.
 *
 * `frame` is RAW base64-encoded PNG data (NOT a data: URL). Render with the
 * `data:image/png;base64,` prefix.
 */
export interface BrowserFrame {
  sessionId: string;
  frame: string; // raw base64 PNG
  url: string;
  title: string;
  runId?: string;
  timestamp: number;
}

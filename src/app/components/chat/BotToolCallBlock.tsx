type ToolResult = {
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type BotToolCallStatus = "pending" | "blocked" | "ok" | "fail";

export type BotToolCall = {
  id: string;
  requestId?: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: ToolResult;
  status?: BotToolCallStatus;
  timestamp: number;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
};

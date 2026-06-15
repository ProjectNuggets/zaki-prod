import type { BotSettingsProfile } from "./api";

export type AgentDefaultReasoningEffort = "low" | "medium" | "high";
export type AgentDefaultAutonomy = NonNullable<BotSettingsProfile["autonomy"]>;

export const AGENT_DEFAULT_REASONING_EFFORTS = [
  "low",
  "medium",
  "high",
] as const satisfies readonly AgentDefaultReasoningEffort[];

export function assistantModeToReasoningEffort(
  mode?: BotSettingsProfile["assistant_mode"]
): AgentDefaultReasoningEffort {
  if (mode === "fast") return "low";
  if (mode === "deep") return "high";
  return "medium";
}

export function reasoningEffortToAssistantMode(
  effort: AgentDefaultReasoningEffort
): NonNullable<BotSettingsProfile["assistant_mode"]> {
  if (effort === "low") return "fast";
  if (effort === "high") return "deep";
  return "balanced";
}


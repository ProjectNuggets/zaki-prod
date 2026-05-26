export type AgentModelCostClass = "A" | "B" | "C";

export type AgentModelCapability = "text" | "vision" | "video";

export type AgentModelCatalogItem = {
  id: string;
  label: string;
  contextWindow: string;
  maxOutput: string;
  capabilities: AgentModelCapability[];
  costClass: AgentModelCostClass;
  note: string;
};

export const DEFAULT_AGENT_MODEL_ID = "kimi-k2.6";

export const AGENT_MODEL_CATALOG: AgentModelCatalogItem[] = [
  {
    id: "kimi-k2.6",
    label: "Kimi K2.6",
    contextWindow: "256K",
    maxOutput: "32K",
    capabilities: ["text", "vision", "video"],
    costClass: "A",
    note: "Default fast long-context model for everyday agent work.",
  },
  {
    id: "claude-opus-4.7",
    label: "Claude Opus 4.7",
    contextWindow: "1M",
    maxOutput: "8K",
    capabilities: ["text", "vision"],
    costClass: "C",
    note: "Premium reasoning model for the hardest long-horizon work.",
  },
  {
    id: "claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    contextWindow: "1M",
    maxOutput: "8K",
    capabilities: ["text", "vision"],
    costClass: "B",
    note: "High-quality balanced Claude route with large context.",
  },
  {
    id: "claude-opus-4.6",
    label: "Claude Opus 4.6",
    contextWindow: "1M",
    maxOutput: "8K",
    capabilities: ["text", "vision"],
    costClass: "C",
    note: "Premium Claude route kept available for compatibility.",
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    contextWindow: "1M",
    maxOutput: "8K",
    capabilities: ["text", "vision", "video"],
    costClass: "B",
    note: "Native large-context multimodal route.",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    contextWindow: "200K",
    maxOutput: "8K",
    capabilities: ["text", "vision", "video"],
    costClass: "A",
    note: "Cost-efficient multimodal option for short visual tasks.",
  },
  {
    id: "gpt-5.2",
    label: "GPT-5.2",
    contextWindow: "128K",
    maxOutput: "8K",
    capabilities: ["text", "vision"],
    costClass: "C",
    note: "OpenAI flagship route for users who prefer OpenAI behavior.",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    contextWindow: "128K",
    maxOutput: "8K",
    capabilities: ["text", "vision"],
    costClass: "B",
    note: "Cost-conscious OpenAI route.",
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    contextWindow: "512K",
    maxOutput: "32K",
    capabilities: ["text"],
    costClass: "A",
    note: "Long-context text and coding route.",
  },
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    contextWindow: "512K",
    maxOutput: "32K",
    capabilities: ["text"],
    costClass: "A",
    note: "Fast low-cost long-context text route.",
  },
  {
    id: "kimi-k2.5",
    label: "Kimi K2.5",
    contextWindow: "256K",
    maxOutput: "32K",
    capabilities: ["text"],
    costClass: "A",
    note: "Stable Kimi fallback when multimodal is not needed.",
  },
];

const MODEL_BY_ID = new Map(AGENT_MODEL_CATALOG.map((model) => [model.id, model]));

export function resolveAgentModel(modelId: string | null | undefined): AgentModelCatalogItem {
  const fallback = MODEL_BY_ID.get(DEFAULT_AGENT_MODEL_ID) ?? AGENT_MODEL_CATALOG[0];
  if (!fallback) {
    throw new Error("Agent model catalog is empty.");
  }
  if (!modelId) return fallback;
  return MODEL_BY_ID.get(modelId) ?? fallback;
}

export function formatAgentModelCapabilities(model: AgentModelCatalogItem) {
  if (!model.capabilities.length) return "text";
  return model.capabilities.join(" + ");
}

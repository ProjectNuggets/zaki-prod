import { backendAuthRequest } from "@/lib/api";

export type AgentSuggestion = {
  key: string;
  origin: string;
  content: string;
};

type SuggestionsResponse = {
  suggestions?: SuggestionWireItem[];
};

type SuggestionWireItem = {
  key?: unknown;
  origin?: unknown;
  content?: unknown;
};

function suggestionFromUnknown(value: SuggestionWireItem) {
  if (!value || typeof value.key !== "string" || !value.key.trim()) return null;
  return {
    key: value.key,
    origin: typeof value.origin === "string" && value.origin.trim() ? value.origin : "unknown",
    content: typeof value.content === "string" ? value.content : "",
  } satisfies AgentSuggestion;
}

export async function fetchAgentSuggestions(): Promise<AgentSuggestion[]> {
  const response = await backendAuthRequest("/api/agent/suggestions", {
    method: "GET",
    redirectOnAuthFailure: false,
  });
  if (!response.ok) {
    throw new Error("suggestions_unavailable");
  }
  const payload = (await response.json().catch(() => null)) as SuggestionsResponse | null;
  return (payload?.suggestions ?? [])
    .map(suggestionFromUnknown)
    .filter((suggestion): suggestion is AgentSuggestion => suggestion !== null);
}

export async function transitionAgentSuggestion(
  action: "adopt" | "dismiss",
  key: string,
): Promise<void> {
  const response = await backendAuthRequest(`/api/agent/suggestions/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
    redirectOnAuthFailure: false,
  });
  if (!response.ok) {
    throw new Error(`suggestion_${action}_failed`);
  }
}

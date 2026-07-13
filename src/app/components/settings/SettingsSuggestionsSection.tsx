import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAgentSuggestions,
  transitionAgentSuggestion,
  type AgentSuggestion,
} from "@/lib/suggestionsApi";
import { V2Button } from "@/app/components/v2";

import { V2SettingsBlock, V2SettingsRow } from "./V2SettingsPrimitives";

const SUGGESTIONS_QUERY_KEY = ["agent", "suggestions"] as const;

export function SettingsSuggestionsSection() {
  const queryClient = useQueryClient();
  const suggestions = useQuery({
    queryKey: SUGGESTIONS_QUERY_KEY,
    queryFn: fetchAgentSuggestions,
    staleTime: 30_000,
  });
  const transition = useMutation({
    mutationFn: ({ action, key }: { action: "adopt" | "dismiss"; key: string }) =>
      transitionAgentSuggestion(action, key),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData<AgentSuggestion[]>(SUGGESTIONS_QUERY_KEY, (current = []) =>
        current.filter((suggestion) => suggestion.key !== variables.key),
      );
    },
  });

  const items = suggestions.data ?? [];
  const pendingKey = transition.isPending ? transition.variables?.key : null;

  return (
    <V2SettingsBlock
      id="settings-suggestions"
      data-testid="settings-suggestions"
      title="Suggestions"
      meta={items.length > 0 ? `${items.length} awaiting review` : undefined}
    >
      {suggestions.isLoading ? (
        <V2SettingsRow name="Loading suggestions…" />
      ) : suggestions.isError ? (
        <V2SettingsRow
          name="Suggestions are unavailable"
          description="ZAKI couldn't load learning suggestions right now. Try again shortly."
        >
          <V2Button variant="ghost" size="sm" onClick={() => void suggestions.refetch()}>
            Retry
          </V2Button>
        </V2SettingsRow>
      ) : items.length === 0 ? (
        <V2SettingsRow
          name="No suggestions awaiting review"
          description="When ZAKI notices a repeated working preference, it will draft it here for you to adopt or dismiss."
        />
      ) : (
        items.map((suggestion) => (
          <V2SettingsRow
            key={suggestion.key}
            name={suggestion.content || "Untitled suggestion"}
            description={`Observed by ${suggestion.origin}. Nothing changes until you choose.`}
          >
            <div className="zaki-settings-v2__actions">
              <V2Button
                variant="ghost"
                size="sm"
                disabled={transition.isPending}
                onClick={() => transition.mutate({ action: "dismiss", key: suggestion.key })}
              >
                {pendingKey === suggestion.key && transition.variables?.action === "dismiss"
                  ? "Dismissing…"
                  : "Dismiss"}
              </V2Button>
              <V2Button
                size="sm"
                disabled={transition.isPending}
                onClick={() => transition.mutate({ action: "adopt", key: suggestion.key })}
              >
                {pendingKey === suggestion.key && transition.variables?.action === "adopt"
                  ? "Adopting…"
                  : "Adopt"}
              </V2Button>
            </div>
          </V2SettingsRow>
        ))
      )}
      {transition.isError ? (
        <p className="zaki-settings-v2__field-error" role="alert">
          That suggestion changed or couldn't be updated. Refresh and try again.
        </p>
      ) : null}
    </V2SettingsBlock>
  );
}

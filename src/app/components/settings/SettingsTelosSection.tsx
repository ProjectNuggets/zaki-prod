import { useQuery } from "@tanstack/react-query";

import { fetchTelos } from "@/lib/telosApi";

import { V2SettingsBlock, V2SettingsRow } from "./V2SettingsPrimitives";

/**
 * Read-only view of the curated user-model north star (TELOS). The model is
 * inferred from conversation and confirmed inline in chat — this surface is for
 * *seeing and correcting* what ZAKI understands, not authoring it (T4). So it is
 * deliberately read-only: to change a goal, tell ZAKI in chat.
 */
export function SettingsTelosSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["telos"],
    queryFn: fetchTelos,
    staleTime: 60_000,
  });

  const items = data ?? [];

  return (
    <V2SettingsBlock
      id="settings-telos"
      data-testid="settings-telos"
      title="What ZAKI understands about your goals"
      meta={items.length > 0 ? String(items.length) : undefined}
    >
      {isLoading ? (
        <V2SettingsRow name="Loading…" />
      ) : isError ? (
        <V2SettingsRow name="Couldn't load your goals right now." />
      ) : items.length === 0 ? (
        <V2SettingsRow
          name="Nothing here yet"
          description="As you talk about your goals, ZAKI will ask to add them to your north star."
        />
      ) : (
        items.map((item) => (
          <V2SettingsRow key={item.key} name={item.content} description={item.type} />
        ))
      )}
    </V2SettingsBlock>
  );
}

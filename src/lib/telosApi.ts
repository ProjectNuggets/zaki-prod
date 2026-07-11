import { backendAuthRequest } from "@/lib/api";

export type TelosItem = {
  key: string;
  /** Referent type parsed from the key: mission | goal | challenge | … */
  type: string;
  content: string;
};

/**
 * GET /api/agent/telos — the curated user-model north star (see the nullalis
 * `docs/telos-contract.md`). Token-scoped, so no user id is needed in the path
 * (mirrors `fetchBrainMe`). READ-ONLY by design: the model is inferred from
 * conversation and confirmed inline, and durable edits go through the approved
 * `wish/telos` curation loop — never a UI write (T4). Fail-soft: any non-OK
 * response yields an empty list so the Settings view degrades to its empty state.
 */
export async function fetchTelos(): Promise<TelosItem[]> {
  const response = await backendAuthRequest("/api/agent/telos", { method: "GET" });
  if (!response.ok) return [];
  const raw = (await response.json().catch(() => null)) as {
    telos?: Array<{ key?: string; type?: string; content?: string }>;
  } | null;
  const items = raw?.telos ?? [];
  return items
    .filter((i): i is { key: string; type?: string; content?: string } => Boolean(i?.key))
    .map((i) => ({ key: i.key, type: i.type ?? "unknown", content: i.content ?? "" }));
}

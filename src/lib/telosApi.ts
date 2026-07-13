import { backendAuthRequest } from "@/lib/api";

export type TelosItem = {
  key: string;
  /** Referent type from the endpoint (the gateway derives it from the key):
   *  mission | goal | challenge | strategy | project | value | identity. */
  type: string;
  content: string;
};

export type TelosStatus = {
  items: TelosItem[];
  telosInPrompt: boolean;
};

/**
 * GET /api/agent/telos — the curated user-model north star (see the nullalis
 * `docs/telos-contract.md`). Token-scoped, so no user id is needed in the path
 * (mirrors `fetchBrainMe`). READ-ONLY by design: the model is inferred from
 * conversation and confirmed inline, and durable edits go through the approved
 * `wish/telos` curation loop — never a UI write (T4). Non-OK responses reject so
 * Settings can distinguish an upstream failure from a genuinely empty model.
 */
export async function fetchTelos(): Promise<TelosStatus> {
  const response = await backendAuthRequest("/api/agent/telos", {
    method: "GET",
    redirectOnAuthFailure: false,
  });
  if (!response.ok) throw new Error("telos_unavailable");
  const raw = (await response.json().catch(() => null)) as {
    telos?: unknown;
    telos_in_prompt?: unknown;
  } | null;
  const items = Array.isArray(raw?.telos) ? raw.telos : [];
  return {
    telosInPrompt: raw?.telos_in_prompt === true,
    items: items
      .filter(
        (item): item is Record<string, unknown> & { key: string } =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof (item as Record<string, unknown>).key === "string" &&
              String((item as Record<string, unknown>).key).trim(),
          ),
      )
      .map((item) => ({
        key: item.key,
        type: typeof item.type === "string" ? item.type : "unknown",
        content: typeof item.content === "string" ? item.content : "",
      })),
  };
}

export type BrainHealth = "ready" | "degraded" | "stale" | "unavailable";

export function brainHealth({
  requestFailed,
  hasUsableData,
  semanticDegraded,
}: {
  requestFailed: boolean;
  hasUsableData: boolean;
  semanticDegraded: boolean;
}): BrainHealth {
  if (requestFailed) return hasUsableData ? "stale" : "unavailable";
  return semanticDegraded ? "degraded" : "ready";
}

export type BrainHealth = "ready" | "degraded" | "unavailable";

export function brainHealth({
  requestFailed,
  semanticDegraded,
}: {
  requestFailed: boolean;
  semanticDegraded: boolean;
}): BrainHealth {
  if (requestFailed) return "unavailable";
  return semanticDegraded ? "degraded" : "ready";
}

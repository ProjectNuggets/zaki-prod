export const DEFAULT_THREAD_LABEL = "New chat";

const DEFAULT_THREAD_LABELS = new Set(["", DEFAULT_THREAD_LABEL.toLowerCase(), "thread"]);

export function isDefaultThreadLabel(label: string | null | undefined) {
  return DEFAULT_THREAD_LABELS.has(String(label || "").trim().toLowerCase());
}

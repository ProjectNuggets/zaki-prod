// 2026-05-09 — Per-thread message reactions (thumbs up / down).
//
// Today the reactions are local-only annotations. Click thumbs-down
// triggers a regenerate (the agent gets to take another swing); the
// thumb stays red on the rejected message so the user can scroll back
// and see what they previously rejected. Click thumbs-up just persists
// the green highlight as a personal "good answer" mark.
//
// Storage key: zaki:reactions:<threadKey> → { [messageId]: "up"|"down" }
// localStorage so the highlight survives reload, scoped per thread.
//
// When the BE adds a feedback endpoint, the same shape can mirror up.

import { useCallback, useEffect, useState } from "react";

export type Reaction = "up" | "down";

type Map = Record<string, Reaction>;

function storageKey(threadKey: string | null): string | null {
  if (!threadKey) return null;
  return `zaki:reactions:${threadKey}`;
}

function readFromStorage(threadKey: string | null): Map {
  const key = storageKey(threadKey);
  if (!key || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Map;
  } catch {
    return {};
  }
}

function writeToStorage(threadKey: string | null, next: Map) {
  const key = storageKey(threadKey);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Quota or storage disabled; drop silently.
  }
}

export function useMessageReactions(threadKey: string | null) {
  const [reactions, setReactions] = useState<Map>(() => readFromStorage(threadKey));

  useEffect(() => {
    setReactions(readFromStorage(threadKey));
  }, [threadKey]);

  const setReaction = useCallback(
    (messageId: string, reaction: Reaction | null) => {
      setReactions((prev) => {
        const next: Map = { ...prev };
        if (reaction === null) delete next[messageId];
        else next[messageId] = reaction;
        writeToStorage(threadKey, next);
        return next;
      });
    },
    [threadKey],
  );

  const getReaction = useCallback(
    (messageId: string): Reaction | null => reactions[messageId] ?? null,
    [reactions],
  );

  return { getReaction, setReaction };
}

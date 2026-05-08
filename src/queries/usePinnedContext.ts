// 2026-05-09 — Per-thread pinned-memory state for the composer.
//
// Pinned memories are user-chosen brain entries that get prepended to
// every outgoing turn in the active thread until the user unpins them.
// They live in sessionStorage so a tab refresh keeps the pins, but a
// new session starts clean.
//
// State shape per thread:
//   { id: string; label: string; content?: string }[]
//
// We persist `content` (the full memory detail body) at pin time so
// outgoing turns don't have to re-fetch on every send. If the body is
// long we trim to PIN_CONTENT_MAX_CHARS to keep the prefix bounded.

import { useCallback, useEffect, useState } from "react";

export type PinnedMemory = {
  id: string;
  label: string;
  content?: string;
};

const PIN_CONTENT_MAX_CHARS = 600;
const PIN_LIMIT_PER_THREAD = 6;

function storageKey(threadKey: string | null): string | null {
  if (!threadKey) return null;
  return `zaki:pinned-memories:${threadKey}`;
}

function readFromStorage(threadKey: string | null): PinnedMemory[] {
  const key = storageKey(threadKey);
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is PinnedMemory =>
        entry && typeof entry.id === "string" && typeof entry.label === "string",
    );
  } catch {
    return [];
  }
}

function writeToStorage(threadKey: string | null, pins: PinnedMemory[]) {
  const key = storageKey(threadKey);
  if (!key || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(pins));
  } catch {
    // Quota exceeded or storage unavailable — drop silently.
  }
}

export function usePinnedContext(threadKey: string | null) {
  const [pins, setPins] = useState<PinnedMemory[]>(() => readFromStorage(threadKey));

  // Reset when the thread changes — the previous thread's pins shouldn't
  // bleed into a new one.
  useEffect(() => {
    setPins(readFromStorage(threadKey));
  }, [threadKey]);

  const persist = useCallback(
    (next: PinnedMemory[]) => {
      writeToStorage(threadKey, next);
      setPins(next);
    },
    [threadKey],
  );

  const pin = useCallback(
    (memory: PinnedMemory) => {
      setPins((prev) => {
        const trimmed: PinnedMemory = {
          id: memory.id,
          label: memory.label.trim(),
          content:
            memory.content && memory.content.length > PIN_CONTENT_MAX_CHARS
              ? `${memory.content.slice(0, PIN_CONTENT_MAX_CHARS).trim()}...`
              : memory.content,
        };
        const filtered = prev.filter((p) => p.id !== trimmed.id);
        const next = [...filtered, trimmed].slice(-PIN_LIMIT_PER_THREAD);
        writeToStorage(threadKey, next);
        return next;
      });
    },
    [threadKey],
  );

  const unpin = useCallback(
    (id: string) => {
      setPins((prev) => {
        const next = prev.filter((p) => p.id !== id);
        writeToStorage(threadKey, next);
        return next;
      });
    },
    [threadKey],
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return { pins, pin, unpin, clear, limit: PIN_LIMIT_PER_THREAD };
}

/**
 * Build the prefix string that gets prepended to outgoing turn text
 * when there are pinned memories. Returns empty string if no pins.
 */
export function buildPinnedContextPrefix(pins: PinnedMemory[]): string {
  if (!pins.length) return "";
  const lines = pins.map((p) =>
    p.content ? `- ${p.label}: ${p.content}` : `- ${p.label}`,
  );
  return `[Pinned context]\n${lines.join("\n")}\n\n`;
}

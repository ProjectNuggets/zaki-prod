// 2026-05-09 — Per-user session title overlay.
//
// The agent BFF persists manual renames. This overlay remains as the
// optimistic write target so the right rail can update immediately and
// keep old local names if the backend is temporarily unavailable.
//
// Storage shape: a single JSON object keyed by sessionKey →
//   { [sessionKey]: { label: string, updated_at: number } }
//
// LocalStorage (not session) so the overlay survives tab close — the
// user has explicitly named the session.
//
// Backend titles are the source of truth after the next successful
// session-list refresh.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "zaki:session-titles";

type Entry = { label: string; updated_at: number };
type Overlay = Record<string, Entry>;

function readOverlay(): Overlay {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Overlay;
  } catch {
    return {};
  }
}

function writeOverlay(next: Overlay) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota or storage disabled — drop silently.
  }
}

export function useSessionTitleOverlay() {
  const [overlay, setOverlay] = useState<Overlay>(() => readOverlay());

  // Listen for cross-tab changes so multiple ZAKI tabs stay in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setOverlay(readOverlay());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setLabel = useCallback((sessionKey: string, label: string) => {
    const trimmed = label.trim();
    setOverlay((prev) => {
      const next: Overlay = { ...prev };
      if (!trimmed) {
        delete next[sessionKey];
      } else {
        next[sessionKey] = { label: trimmed, updated_at: Date.now() };
      }
      writeOverlay(next);
      return next;
    });
  }, []);

  const clearLabel = useCallback((sessionKey: string) => {
    setOverlay((prev) => {
      if (!prev[sessionKey]) return prev;
      const next: Overlay = { ...prev };
      delete next[sessionKey];
      writeOverlay(next);
      return next;
    });
  }, []);

  const getLabel = useCallback(
    (sessionKey: string): string | null => overlay[sessionKey]?.label ?? null,
    [overlay],
  );

  return { getLabel, setLabel, clearLabel };
}

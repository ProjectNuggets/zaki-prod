// 2026-05-09 — Per-user staged onboarding progress.
//
// Replaces the dual SimpleOnboardingModal / OnboardingModal scheme
// (deleted in 7f65b82). The new tour is staged: each stage has its
// own status, the orchestrator picks the highest "pending" one and
// surfaces it. Click-gated: stages advance only when the user clicks
// Next or Skip, never on action detection.
//
// Storage key per user: zaki:onboarding-progress:v2:<userId>
// Shape: { [stageId]: "pending" | "done" | "skipped" }
// localStorage so the user's progress survives reload + cross-tab.
//
// Stage order matters — the orchestrator walks them in the order
// declared by ONBOARDING_STAGES.

import { useCallback, useEffect, useState } from "react";

export const ONBOARDING_STAGES = [
  "welcome",
  "plus_menu",
  "compaction",
  "brain_panel",
  "channels",
] as const;

export type OnboardingStageId = (typeof ONBOARDING_STAGES)[number];
export type OnboardingStageStatus = "pending" | "done" | "skipped";
export type OnboardingProgress = Record<OnboardingStageId, OnboardingStageStatus>;

const STORAGE_KEY_PREFIX = "zaki:onboarding-progress:v2:";

function defaultProgress(): OnboardingProgress {
  const out = {} as OnboardingProgress;
  for (const id of ONBOARDING_STAGES) out[id] = "pending";
  return out;
}

function storageKey(userId: string | null): string | null {
  if (!userId) return null;
  return `${STORAGE_KEY_PREFIX}${String(userId).trim().toLowerCase()}`;
}

function readFromStorage(userId: string | null): OnboardingProgress {
  const key = storageKey(userId);
  if (!key || typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultProgress();
    const out = defaultProgress();
    for (const id of ONBOARDING_STAGES) {
      const value = (parsed as Record<string, unknown>)[id];
      if (value === "done" || value === "skipped") out[id] = value;
    }
    return out;
  } catch {
    return defaultProgress();
  }
}

function writeToStorage(userId: string | null, progress: OnboardingProgress) {
  const key = storageKey(userId);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // Quota or storage disabled — drop silently.
  }
}

export function useOnboardingProgress(userId: string | null) {
  const [progress, setProgress] = useState<OnboardingProgress>(() => readFromStorage(userId));

  // Reload on user switch + listen for cross-tab storage events.
  useEffect(() => {
    setProgress(readFromStorage(userId));
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    const key = storageKey(userId);
    const handler = (event: StorageEvent) => {
      if (event.key !== key) return;
      setProgress(readFromStorage(userId));
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [userId]);

  const setStage = useCallback(
    (stage: OnboardingStageId, status: OnboardingStageStatus) => {
      setProgress((prev) => {
        if (prev[stage] === status) return prev;
        const next = { ...prev, [stage]: status };
        writeToStorage(userId, next);
        return next;
      });
    },
    [userId],
  );

  const reset = useCallback(() => {
    const next = defaultProgress();
    writeToStorage(userId, next);
    setProgress(next);
  }, [userId]);

  /** Highest-priority unfinished stage. Returns null if every stage is
   *  done or skipped. */
  const nextStage = (() => {
    for (const id of ONBOARDING_STAGES) {
      if (progress[id] === "pending") return id;
    }
    return null;
  })();

  return { progress, setStage, reset, nextStage };
}

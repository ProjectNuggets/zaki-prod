export type ActivationProgress = {
  firstMessageSent: boolean;
  firstMemorySaved: boolean;
  completed: boolean;
};

const EMPTY_PROGRESS: ActivationProgress = {
  firstMessageSent: false,
  firstMemorySaved: false,
  completed: false,
};

function keyForUser(userKey: string) {
  return `zaki:activation:v1:${String(userKey || "").trim().toLowerCase()}`;
}

function isStorageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getActivationProgress(userKey: string): ActivationProgress {
  const normalized = String(userKey || "").trim().toLowerCase();
  if (!normalized || !isStorageAvailable()) return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(keyForUser(normalized));
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<ActivationProgress>;
    const next: ActivationProgress = {
      firstMessageSent: Boolean(parsed.firstMessageSent),
      firstMemorySaved: Boolean(parsed.firstMemorySaved),
      completed: Boolean(parsed.completed),
    };
    next.completed = next.completed || (next.firstMessageSent && next.firstMemorySaved);
    return next;
  } catch {
    return EMPTY_PROGRESS;
  }
}

function setActivationProgress(userKey: string, progress: ActivationProgress) {
  const normalized = String(userKey || "").trim().toLowerCase();
  if (!normalized || !isStorageAvailable()) return;
  try {
    window.localStorage.setItem(keyForUser(normalized), JSON.stringify(progress));
  } catch {
    // Best-effort persistence only.
  }
}

export function markFirstMessageSent(userKey: string): ActivationProgress {
  const current = getActivationProgress(userKey);
  const next: ActivationProgress = {
    ...current,
    firstMessageSent: true,
    completed: current.firstMemorySaved || current.completed,
  };
  setActivationProgress(userKey, next);
  return next;
}

export function markFirstMemorySaved(userKey: string): ActivationProgress {
  const current = getActivationProgress(userKey);
  const next: ActivationProgress = {
    ...current,
    firstMemorySaved: true,
    completed: current.firstMessageSent || current.completed,
  };
  setActivationProgress(userKey, next);
  return next;
}


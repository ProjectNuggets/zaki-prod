import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "zaki.hiddenSessionKeys";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* storage may be full or disabled */
  }
}

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function hideSessionKey(key: string) {
  const next = readSet();
  next.add(key);
  writeSet(next);
  notify();
}

export function unhideSessionKey(key: string) {
  const next = readSet();
  next.delete(key);
  writeSet(next);
  notify();
}

export function useHiddenSessions() {
  const [set, setSet] = useState<Set<string>>(() => readSet());

  useEffect(() => {
    const handler = () => setSet(readSet());
    listeners.add(handler);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) handler();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(handler);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const hide = useCallback((key: string) => hideSessionKey(key), []);
  const unhide = useCallback((key: string) => unhideSessionKey(key), []);

  return { hidden: set, hide, unhide };
}

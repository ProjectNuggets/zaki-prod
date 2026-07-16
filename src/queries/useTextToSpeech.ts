// 2026-05-08 — Text-to-speech hook for assistant messages.
//
// Wires the existing `synthesizeSpeech` endpoint
// (/api/agent/voice/synthesize → nullalis) to a per-message Read-aloud
// button. One audio element plays at a time globally — clicking the
// button on message B while message A is playing stops A and starts
// B. The audio blob URL is cached per message id so re-clicks don't
// re-fetch.
//
// State is held in a Zustand store so any number of MessageActions
// rows can subscribe to "is THIS message playing" without prop
// drilling. The store also owns the singleton HTMLAudioElement.

import { create } from "zustand";
import { synthesizeSpeech } from "@/lib/api";

const MAX_CACHED_URLS = 8;

type TtsState = {
  /** Message id currently playing or fetching, or null when idle. */
  activeMessageId: string | null;
  /** "fetching" while the synth request is in flight, "playing" once
   *  audio has started, null when idle. */
  status: "fetching" | "playing" | null;
  /** Cached blob URL per message id. Bounded LRU — eldest gets revoked. */
  cache: Record<string, string>;
  /** LRU ordering: most-recently-used last. */
  cacheOrder: string[];
  /** The singleton audio element. Created lazily in the browser. */
  audio: HTMLAudioElement | null;
  /** Invalidates in-flight synthesis when the authenticated account changes. */
  generation: number;
  /** Toggle play/stop for a given message. */
  toggle: (messageId: string, text: string) => Promise<void>;
  /** Stop any active playback (used on unmount / route change). */
  stop: () => void;
  /** Remove account-scoped audio state during a principal switch. */
  reset: () => void;
};

function base64ToBlobUrl(base64: string, format: string): string {
  // nullalis returns plain base64 (no data: prefix). Decode → Blob → URL.
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const mime =
    format === "mp3"
      ? "audio/mpeg"
      : format === "wav"
        ? "audio/wav"
        : format === "opus"
          ? "audio/ogg"
          : `audio/${format}`;
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

export const useTextToSpeechStore = create<TtsState>((set, get) => ({
  activeMessageId: null,
  status: null,
  cache: {},
  cacheOrder: [],
  audio: null,
  generation: 0,

  toggle: async (messageId, text) => {
    const state = get();
    const generation = state.generation;
    // Click on the same message that's currently active → stop.
    if (state.activeMessageId === messageId && state.status) {
      state.audio?.pause();
      set({ activeMessageId: null, status: null });
      return;
    }
    // Click on a different message while one is playing → stop the
    // active one before starting the new one.
    if (state.audio && (state.status === "playing" || state.status === "fetching")) {
      state.audio.pause();
    }
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    // No-op on the server: don't mutate state if there's no Audio
    // available, otherwise the store latches in "fetching" forever.
    if (typeof window === "undefined") return;

    // Lazy-init the singleton audio element atomically inside set() so
    // two concurrent first-time toggles can't each construct their own.
    set((s) =>
      s.audio
        ? { activeMessageId: messageId, status: "fetching" }
        : { activeMessageId: messageId, status: "fetching", audio: new Audio() },
    );
    const audio = get().audio;
    if (!audio) return;

    let blobUrl: string | undefined = get().cache[messageId];
    if (!blobUrl) {
      try {
        const { response, data } = await synthesizeSpeech(trimmed);
        if (!response.ok || !data?.audio) {
          throw new Error(`synthesizeSpeech ${response.status}`);
        }
        if (get().generation !== generation || get().activeMessageId !== messageId) return;
        const fresh = base64ToBlobUrl(data.audio, data.format || "mp3");
        blobUrl = fresh;
        set((s) => {
          // Insert/promote to MRU; evict LRU if over cap, revoking the URL.
          const nextOrder = s.cacheOrder.filter((id) => id !== messageId);
          nextOrder.push(messageId);
          const nextCache: Record<string, string> = { ...s.cache, [messageId]: fresh };
          while (nextOrder.length > MAX_CACHED_URLS) {
            const evicted = nextOrder.shift();
            if (evicted && nextCache[evicted]) {
              URL.revokeObjectURL(nextCache[evicted]);
              delete nextCache[evicted];
            }
          }
          return { cache: nextCache, cacheOrder: nextOrder };
        });
      } catch (err) {
        // Bail out — caller surfaces a toast via the play wrapper.
        if (get().generation === generation && get().activeMessageId === messageId) {
          set({ activeMessageId: null, status: null });
        }
        throw err;
      }
    } else {
      // Cache hit → promote to MRU.
      set((s) => {
        if (s.cacheOrder[s.cacheOrder.length - 1] === messageId) return {};
        const nextOrder = s.cacheOrder.filter((id) => id !== messageId);
        nextOrder.push(messageId);
        return { cacheOrder: nextOrder };
      });
    }
    if (!blobUrl) return;

    // Race guard: another message may have been triggered while we were
    // fetching. If so, drop this play.
    if (get().generation !== generation || get().activeMessageId !== messageId) return;

    const ownsActivePlayback = () =>
      get().generation === generation && get().activeMessageId === messageId;

    audio.src = blobUrl;
    audio.onended = () => {
      if (ownsActivePlayback()) {
        set({ activeMessageId: null, status: null });
      }
    };
    audio.onerror = () => {
      if (ownsActivePlayback()) {
        set({ activeMessageId: null, status: null });
      }
    };
    set({ status: "playing" });
    try {
      await audio.play();
    } catch {
      // Browsers can refuse audio.play() before user gesture; clear state.
      if (ownsActivePlayback()) {
        set({ activeMessageId: null, status: null });
      }
    }
  },

  stop: () => {
    const state = get();
    if (state.audio) state.audio.pause();
    set({ activeMessageId: null, status: null });
  },

  reset: () => {
    const state = get();
    if (state.audio) {
      state.audio.pause();
      state.audio.onended = null;
      state.audio.onerror = null;
      state.audio.removeAttribute("src");
      state.audio.load();
    }
    for (const blobUrl of Object.values(state.cache)) {
      URL.revokeObjectURL(blobUrl);
    }
    set({
      activeMessageId: null,
      status: null,
      cache: {},
      cacheOrder: [],
      audio: null,
      generation: state.generation + 1,
    });
  },
}));

/**
 * Convenience hook for a single message — returns the play/stop status
 * scoped to messageId plus a `toggle` callback. Components subscribe
 * narrowly so unrelated messages don't re-render when others change.
 */
export function useTextToSpeechForMessage(messageId: string) {
  const status = useTextToSpeechStore((s) =>
    s.activeMessageId === messageId ? s.status : null
  );
  const toggle = useTextToSpeechStore((s) => s.toggle);
  return { status, toggle };
}

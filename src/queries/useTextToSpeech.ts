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

type TtsState = {
  /** Message id currently playing or fetching, or null when idle. */
  activeMessageId: string | null;
  /** "fetching" while the synth request is in flight, "playing" once
   *  audio has started, null when idle. */
  status: "fetching" | "playing" | null;
  /** Cached blob URL per message id. */
  cache: Record<string, string>;
  /** The singleton audio element. Created lazily in the browser. */
  audio: HTMLAudioElement | null;
  /** Toggle play/stop for a given message. */
  toggle: (messageId: string, text: string) => Promise<void>;
  /** Stop any active playback (used on unmount / route change). */
  stop: () => void;
};

function getOrCreateAudio(state: TtsState): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (state.audio) return state.audio;
  const audio = new Audio();
  return audio;
}

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
  audio: null,

  toggle: async (messageId, text) => {
    const state = get();
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

    set({ activeMessageId: messageId, status: "fetching" });

    const audio = getOrCreateAudio(state) ?? new Audio();
    if (!state.audio) set({ audio });

    let blobUrl: string | undefined = get().cache[messageId];
    if (!blobUrl) {
      try {
        const { response, data } = await synthesizeSpeech(trimmed);
        if (!response.ok || !data?.audio) {
          throw new Error(`synthesizeSpeech ${response.status}`);
        }
        const fresh = base64ToBlobUrl(data.audio, data.format || "mp3");
        blobUrl = fresh;
        set((s) => ({ cache: { ...s.cache, [messageId]: fresh } }));
      } catch (err) {
        // Bail out — caller surfaces a toast via the play wrapper.
        if (get().activeMessageId === messageId) {
          set({ activeMessageId: null, status: null });
        }
        throw err;
      }
    }
    if (!blobUrl) return;

    // Race guard: another message may have been triggered while we were
    // fetching. If so, drop this play.
    if (get().activeMessageId !== messageId) return;

    audio.src = blobUrl;
    audio.onended = () => {
      if (get().activeMessageId === messageId) {
        set({ activeMessageId: null, status: null });
      }
    };
    audio.onerror = () => {
      if (get().activeMessageId === messageId) {
        set({ activeMessageId: null, status: null });
      }
    };
    set({ status: "playing" });
    try {
      await audio.play();
    } catch {
      // Browsers can refuse audio.play() before user gesture; clear state.
      if (get().activeMessageId === messageId) {
        set({ activeMessageId: null, status: null });
      }
    }
  },

  stop: () => {
    const state = get();
    if (state.audio) state.audio.pause();
    set({ activeMessageId: null, status: null });
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

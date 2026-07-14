import { create } from "zustand";
import type { AnonymousWorkClaimResult, AnonymousWorkClaimStatus } from "@/lib/anonymousWorkClaim";

/**
 * The outcome of the anonymous -> account claim, as reported by the SERVER.
 *
 * The dashboard reads its "we kept your work" headline from here. It used to
 * derive that headline from `token && items.length > 0` — a claim that was
 * asserted and never verified, and was false every single time, because the
 * claim endpoint imported nothing. Nothing may write `imported` into this store
 * except a server response that actually carried rows.
 */
interface AnonymousWorkClaimState {
  status: AnonymousWorkClaimStatus;
  importedCount: number;
  route: string | null;
  error: string | null;
  setClaiming: () => void;
  setResult: (result: AnonymousWorkClaimResult) => void;
  reset: () => void;
}

const INITIAL = {
  status: "idle" as AnonymousWorkClaimStatus,
  importedCount: 0,
  route: null,
  error: null,
};

export const useAnonymousWorkClaimStore = create<AnonymousWorkClaimState>((set) => ({
  ...INITIAL,

  setClaiming: () => set({ status: "claiming", error: null }),

  setResult: (result) =>
    set({
      status: result.status,
      importedCount: result.importedCount,
      route: result.route,
      error: result.error,
    }),

  reset: () => set({ ...INITIAL }),
}));

/** True only when the server confirmed it wrote the visitor's work into a thread. */
export function selectWorkWasKept(state: AnonymousWorkClaimState): boolean {
  return state.status === "imported" && state.importedCount > 0;
}

export type { AnonymousWorkClaimState };

import { create } from "zustand";
import type { Space } from "@/types";

interface SpacesState {
  spaces: Space[];
  activeSpaceId: string | null;
  activeSpace: Space | null;
  isLoading: boolean;
  error: string | null;
  createModalOpen: boolean;
}

interface SpacesStore extends SpacesState {
  // Actions
  setSpaces: (spaces: Space[]) => void;
  addSpace: (space: Space) => void;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  deleteSpace: (id: string) => void;
  setActiveSpace: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCreateModalOpen: (open: boolean) => void;
  getSpace: (id: string) => Space | undefined;
  addThreadToSpace: (spaceId: string, thread: { id: string; label: string }) => void;
  deleteThreadFromSpace: (spaceId: string, threadId: string) => void;
}

export const useSpacesStore = create<SpacesStore>((set, get) => ({
  spaces: [],
  activeSpaceId: null,
  activeSpace: null,
  isLoading: false,
  error: null,
  createModalOpen: false,
  
  setSpaces: (spaces) => set({ spaces }),
  
  addSpace: (space) =>
    set((state) => ({ spaces: [...state.spaces, space] })),
  
  updateSpace: (id, updates) =>
    set((state) => ({
      spaces: state.spaces.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      activeSpace: state.activeSpace?.id === id
        ? { ...state.activeSpace, ...updates }
        : state.activeSpace,
    })),
  
  deleteSpace: (id) =>
    set((state) => ({
      spaces: state.spaces.filter((s) => s.id !== id),
      activeSpace: state.activeSpace?.id === id ? null : state.activeSpace,
    })),
  
  setActiveSpace: (id) =>
    set((state) => ({
      activeSpaceId: id,
      activeSpace: state.spaces.find((s) => s.id === id) || null,
    })),
  
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCreateModalOpen: (createModalOpen) => set({ createModalOpen }),
  
  getSpace: (id) => get().spaces.find((s) => s.id === id),
  
  addThreadToSpace: (spaceId, thread) =>
    set((state) => ({
      spaces: state.spaces.map((s) =>
        s.id === spaceId
          ? { ...s, threads: [...(s.threads || []), thread] }
          : s
      ),
    })),
  
  deleteThreadFromSpace: (spaceId, threadId) =>
    set((state) => ({
      spaces: state.spaces.map((s) =>
        s.id === spaceId
          ? { ...s, threads: s.threads?.filter((t) => t.id !== threadId) }
          : s
      ),
    })),
}));

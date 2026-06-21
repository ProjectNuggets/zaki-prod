import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { PinnedFile, Space, Thread } from "@/types";
import {
  DEFAULT_THREAD_LABEL,
  isDefaultThreadLabel,
  stripThreadDisplayName,
} from "@/lib/threadTitles";
import {
  createZakiBotSpace,
  createZakiBotThread,
  isZakiBotSpaceId,
  ZAKI_BOT_DESCRIPTION,
  ZAKI_BOT_LABEL,
} from "@/lib/zakiBot";

export class SpacesLoadError extends Error {
  code: string | null;
  status: number;

  constructor(message: string, options: { code?: string | null; status?: number } = {}) {
    super(message);
    this.name = "SpacesLoadError";
    this.code = options.code ?? null;
    this.status = options.status ?? 0;
  }
}

// Keys
export const spaceKeys = {
  all: ["spaces"] as const,
  detail: (id: string) => ["spaces", id] as const,
  threads: (spaceId: string) => ["spaces", spaceId, "threads"] as const,
};

// Types for API responses
interface WorkspaceResponse {
  id: number;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  instructions?: string;
  openAiPrompt?: string;
  pinnedFiles?: PinnedFile[];
  threads?: ThreadResponse[];
}

interface ThreadResponse {
  slug?: string;
  name?: string;
  id?: string;
  label?: string;
}

function normalizeWorkspaceIcon(icon?: string) {
  return icon === "zaki" ? "folder" : icon;
}

function normalizeThreadLabel(label?: string) {
  // Strip the [[ZAKI_MEMORY_CONTEXT_V2]] guardrail/memory envelope that the
  // engine can leak into an auto-generated thread title (robust to a
  // truncated, leading-only marker too) BEFORE the default-label check, so a
  // title that was nothing but envelope text falls back to "New chat".
  const cleaned = stripThreadDisplayName(label);
  return isDefaultThreadLabel(cleaned) ? DEFAULT_THREAD_LABEL : cleaned;
}

// Fetchers
export async function fetchSpaces(): Promise<Space[]> {
  const response = await apiRequest("/workspaces");
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as {
      error?: string;
      message?: string;
      code?: string;
      status?: number;
    };
    throw new SpacesLoadError(
      data.error || data.message || "Failed to load workspaces",
      {
        code: data.code || null,
        status: data.status || response.status,
      }
    );
  }
  
  const data = await response.json() as { workspaces?: WorkspaceResponse[] };
  const workspaces = data.workspaces ?? [];
  
  // Fetch threads for each workspace in parallel
  const spacesWithThreads = await Promise.all(
    workspaces.map(async (ws) => {
      let threads: Thread[] = [];
      let instructions = ws.instructions ?? ws.openAiPrompt ?? "";
      let pinnedFiles = ws.pinnedFiles ?? [];
      try {
        const detailRes = await apiRequest(`/workspace/${ws.slug}`);
        if (detailRes.ok) {
          const detailData = (await detailRes.json()) as { workspace?: WorkspaceResponse };
          const detail = detailData.workspace;
          instructions = detail?.instructions ?? detail?.openAiPrompt ?? instructions;
          pinnedFiles = detail?.pinnedFiles ?? pinnedFiles;
          threads = (detail?.threads ?? []).map((t) => ({
            id: t.slug ?? t.id ?? "",
            label: normalizeThreadLabel(t.name ?? t.label),
          })).filter((thread) => thread.id);
        }
      } catch {
        // Ignore thread fetch failures
      }
      
      return {
        id: ws.slug,
        title: ws.name,
        description: ws.description,
        icon: normalizeWorkspaceIcon(ws.icon),
        color: ws.color,
        instructions,
        pinnedFiles,
        threads,
      } satisfies Space;
    })
  );
  
  const injectedBotSpace = createZakiBotSpace();
  const withoutBot = spacesWithThreads.filter((space) => !isZakiBotSpaceId(space.id));
  const existingBot = spacesWithThreads.find((space) => isZakiBotSpaceId(space.id));

  return [
    existingBot
      ? {
          ...existingBot,
          ...injectedBotSpace,
          id: injectedBotSpace.id,
          title: ZAKI_BOT_LABEL,
          description: ZAKI_BOT_DESCRIPTION,
          icon: existingBot.icon || injectedBotSpace.icon,
          fixed: true,
          threads: [createZakiBotThread()],
        }
      : injectedBotSpace,
    ...withoutBot,
  ];
}

async function createSpace(space: {
  name: string;
  description?: string;
  instructions?: string;
  icon?: string;
  color?: string;
}): Promise<Space> {
  const response = await apiRequest("/zaki/workspaces", {
    method: "POST",
    body: JSON.stringify(space),
  });
  
  if (!response.ok) {
    throw new Error("Failed to create space");
  }
  
  const data = await response.json() as { workspace?: WorkspaceResponse };
  const ws = data.workspace;
  
  if (!ws) {
    throw new Error("Invalid response");
  }
  
  return {
    id: ws.slug,
    title: ws.name,
    description: ws.description,
    icon: normalizeWorkspaceIcon(ws.icon),
    color: ws.color,
    instructions: ws.instructions ?? ws.openAiPrompt ?? "",
    pinnedFiles: ws.pinnedFiles ?? [],
    threads: [],
  };
}

async function updateSpace(
  id: string,
  updates: Partial<Space>
): Promise<Space> {
  const response = await apiRequest(`/workspace/${id}/update`, {
    method: "POST",
    body: JSON.stringify({
      name: updates.title,
      description: updates.description,
      instructions: updates.instructions,
      icon: updates.icon,
      color: updates.color,
    }),
  });
  
  if (!response.ok) {
    throw new Error("Failed to update space");
  }
  
  const data = await response.json() as { workspace?: WorkspaceResponse };
  const ws = data.workspace;
  
  if (!ws) {
    throw new Error("Invalid response");
  }
  
  return {
    id: ws.slug,
    title: ws.name,
    description: ws.description,
    icon: normalizeWorkspaceIcon(ws.icon),
    color: ws.color,
    instructions: ws.instructions ?? ws.openAiPrompt ?? "",
    pinnedFiles: ws.pinnedFiles ?? [],
    threads: updates.threads ?? [],
  };
}

async function deleteSpace(id: string): Promise<void> {
  const response = await apiRequest(`/zaki/workspaces/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    throw new Error("Failed to delete space");
  }
}

// Hooks
export function useSpaces(enabled = true) {
  return useQuery({
    queryKey: spaceKeys.all,
    queryFn: fetchSpaces,
    enabled,
  });
}

export function useCreateSpace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSpace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useUpdateSpace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Space> }) =>
      updateSpace(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useDeleteSpace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteSpace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

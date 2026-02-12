import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { Space, Thread } from "@/types";

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
}

interface ThreadResponse {
  slug: string;
  name: string;
}

// Fetchers
async function fetchSpaces(): Promise<Space[]> {
  const response = await apiRequest("/workspaces");
  if (!response.ok) {
    throw new Error("Failed to load workspaces");
  }
  
  const data = await response.json() as { workspaces?: WorkspaceResponse[] };
  const workspaces = data.workspaces ?? [];
  
  // Fetch threads for each workspace in parallel
  const spacesWithThreads = await Promise.all(
    workspaces.map(async (ws, index) => {
      let threads: Thread[] = [];
      try {
        const threadsRes = await apiRequest(`/workspace/${ws.slug}/threads`);
        if (threadsRes.ok) {
          const threadsData = await threadsRes.json() as { threads?: ThreadResponse[] };
          threads = (threadsData.threads ?? []).map((t) => ({
            id: t.slug,
            label: t.name,
          }));
        }
      } catch {
        // Ignore thread fetch failures
      }
      
      return {
        id: ws.slug,
        title: ws.name,
        description: ws.description,
        icon: ws.icon,
        color: ws.color,
        instructions: ws.instructions,
        fixed: index === 0,
        threads,
      } satisfies Space;
    })
  );
  
  return spacesWithThreads;
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
    icon: ws.icon,
    color: ws.color,
    instructions: ws.instructions,
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
    icon: ws.icon,
    color: ws.color,
    instructions: ws.instructions,
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

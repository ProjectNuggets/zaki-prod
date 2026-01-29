import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { Message } from "@/types";
import { spaceKeys } from "./useSpaces";

// Keys
export const threadKeys = {
  messages: (spaceId: string, threadId: string) =>
    ["threads", spaceId, threadId, "messages"] as const,
};

// Types
interface MessageResponse {
  id?: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; type: string; url: string }[];
}

// Fetchers
async function fetchMessages(
  spaceId: string,
  threadId: string
): Promise<Message[]> {
  const response = await apiRequest(
    `/workspace/${spaceId}/thread/${threadId}/messages`
  );
  
  if (!response.ok) {
    throw new Error("Failed to load messages");
  }
  
  const data = await response.json() as { messages?: MessageResponse[] };
  
  return (data.messages ?? []).map((msg, i) => ({
    id: msg.id ?? `msg-${i}`,
    role: msg.role,
    content: msg.content,
    attachments: msg.attachments,
  }));
}

async function createThread(
  spaceId: string
): Promise<{ id: string; label: string }> {
  const response = await apiRequest(`/workspace/${spaceId}/thread/new`, {
    method: "POST",
  });
  
  if (!response.ok) {
    throw new Error("Failed to create thread");
  }
  
  const data = await response.json() as {
    thread?: { slug: string; name: string };
  };
  
  return {
    id: data.thread?.slug ?? `thread-${Date.now()}`,
    label: data.thread?.name ?? "New chat",
  };
}

async function deleteThread(
  spaceId: string,
  threadId: string
): Promise<void> {
  const response = await apiRequest(
    `/workspace/${spaceId}/thread/${threadId}`,
    { method: "DELETE" }
  );
  
  if (!response.ok) {
    throw new Error("Failed to delete thread");
  }
}

// Hooks
export function useMessages(spaceId: string | null, threadId: string | null) {
  return useQuery({
    queryKey: threadKeys.messages(spaceId ?? "", threadId ?? ""),
    queryFn: () => fetchMessages(spaceId!, threadId!),
    enabled: !!spaceId && !!threadId,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (spaceId: string) => createThread(spaceId),
    onSuccess: () => {
      // Invalidate spaces to refresh thread lists
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ spaceId, threadId }: { spaceId: string; threadId: string }) =>
      deleteThread(spaceId, threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

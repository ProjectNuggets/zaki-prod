import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import type { Message } from "@/types";
import { DEFAULT_THREAD_LABEL, isDefaultThreadLabel } from "@/lib/threadTitles";
import { spaceKeys } from "./useSpaces";

// Keys
export const threadKeys = {
  messages: (spaceId: string, threadId: string) =>
    ["threads", spaceId, threadId, "messages"] as const,
};

// Types
interface MessageResponse {
  role: "user" | "assistant";
  content: string;
  chatId?: number;
  attachments?: { name: string; type: string; url: string }[];
  createdAt?: string | number | null;
  created_at?: string | number | null;
  createdAtMs?: string | number | null;
  created_at_ms?: string | number | null;
  timestamp?: string | number | null;
  ts?: string | number | null;
}

function normalizeMessageCreatedAt(msg: MessageResponse): string | null {
  const raw =
    msg.createdAt ??
    msg.created_at ??
    msg.createdAtMs ??
    msg.created_at_ms ??
    msg.timestamp ??
    msg.ts;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    const ms = raw < 10_000_000_000 ? raw * 1000 : raw;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

// Fetchers
async function fetchMessages(
  spaceId: string,
  threadId: string
): Promise<Message[]> {
  const response = await apiRequest(
    `/workspace/${spaceId}/thread/${threadId}/chats`
  );
  
  if (!response.ok) {
    throw new Error("Failed to load messages");
  }
  
  const data = await response.json() as { history?: MessageResponse[] };
  
  return (data.history ?? []).map((msg, i) => ({
    id: msg.chatId ? `${msg.chatId}-${msg.role}-${i}` : `${msg.role}-${i}`,
    role: msg.role,
    content: msg.content ?? "",
    attachments: msg.attachments,
    chatId: msg.chatId,
    createdAt: normalizeMessageCreatedAt(msg),
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
    thread?: { slug?: string; id?: string; name?: string; label?: string };
  };
  const threadLabel = data.thread?.name ?? data.thread?.label;
  
  return {
    id: data.thread?.slug ?? data.thread?.id ?? `thread-${Date.now()}`,
    label: isDefaultThreadLabel(threadLabel) ? DEFAULT_THREAD_LABEL : threadLabel ?? DEFAULT_THREAD_LABEL,
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

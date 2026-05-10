import type { Space } from "@/types";
import { DEFAULT_THREAD_LABEL } from "@/lib/threadTitles";

export const ANONYMOUS_SPACES_WORKSPACE_ID = "zaky";

export function createAnonymousThreadId() {
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createAnonymousSpaces(): Space[] {
  return [
    {
      id: ANONYMOUS_SPACES_WORKSPACE_ID,
      title: "Spaces",
      description: "Free daily workspace chat",
      icon: "folder",
      color: "#c75236",
      instructions:
        "You are ZAKI Spaces, a concise workspace assistant. Help the user reason, draft, plan, and learn. Do not claim to remember them across anonymous sessions.",
      fixed: true,
      threads: [
        {
          id: createAnonymousThreadId(),
          label: DEFAULT_THREAD_LABEL,
        },
      ],
    },
  ];
}

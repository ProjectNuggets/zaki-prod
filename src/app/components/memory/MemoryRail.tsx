import { useState } from "react";
import { Brain, Check, X, Undo2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

type MemoryItem = {
  id: string;
  content: string;
  type: string;
  confirmationId?: string;
};

interface MemoryRailProps {
  userId: string;
  memories: MemoryItem[];
  memoryMode: "autosave" | "manual";
  position: { left: number; width: number; bottom: number };
  onDismiss: () => void;
  onResolve: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  fact: "Fact",
  preference: "Preference",
  emotion: "Emotion",
  event: "Event",
  goal: "Goal",
  relationship: "Relationship",
  struggle: "Challenge",
};

export function MemoryRail({ userId, memories, memoryMode, position, onDismiss, onResolve }: MemoryRailProps) {
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState(false);

  const visibleMemories = memories.slice(0, 3);
  const hasMore = memories.length > visibleMemories.length;

  const confirm = async (confirmationId?: string) => {
    if (!confirmationId) return;
    setProcessing(true);
    try {
      await apiRequest(`/api/memory/confirmations/${confirmationId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      onResolve(confirmationId);
    } finally {
      setProcessing(false);
    }
  };

  const reject = async (confirmationId?: string) => {
    if (!confirmationId) return;
    setProcessing(true);
    try {
      await apiRequest(`/api/memory/confirmations/${confirmationId}/reject`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      onResolve(confirmationId);
    } finally {
      setProcessing(false);
    }
  };

  const undo = async (id: string) => {
    setProcessing(true);
    try {
      await apiRequest(`/api/memory/undo/${id}`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      onResolve(id);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed z-30"
      style={{
        left: position.left,
        width: position.width,
        bottom: position.bottom,
      }}
    >
      <div className="rounded-full border border-zaki-subtle bg-white/90 px-3 py-1.5 text-2xs text-zaki-secondary shadow-[0px_8px_20px_rgba(15,15,15,0.08)] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-zaki-hover text-zaki-brand">
            <Brain className="size-3" />
          </span>
          <span className="truncate">
            {memories.length} {memoryMode === "autosave" ? "memory saved" : "memory to review"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-zaki-brand font-semibold hover:underline"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Hide" : "Review"}
          </button>
          <button
            type="button"
            className="text-zaki-muted"
            onClick={onDismiss}
            aria-label="Dismiss memory rail"
          >
            ×
          </button>
          <button
            type="button"
            className="text-zaki-muted"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label="Toggle memory list"
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 zaki-card zaki-card-elevated px-3 py-3">
          <div className="space-y-3">
            {visibleMemories.map((memory) => (
              <div key={memory.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-zaki-muted uppercase tracking-wider">
                    {typeLabels[memory.type] || memory.type}
                  </div>
                  <div className="text-sm text-zaki-primary">{memory.content}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-zaki-muted">
                    {memoryMode === "manual" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => confirm(memory.confirmationId)}
                          disabled={processing}
                          className={cn("hover:text-zaki-primary", "disabled:opacity-50")}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(memory.confirmationId)}
                          disabled={processing}
                          className={cn("hover:text-zaki-primary", "disabled:opacity-50")}
                        >
                          Ignore
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => undo(memory.id)}
                        disabled={processing}
                        className={cn("hover:text-zaki-primary", "disabled:opacity-50")}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Undo2 className="size-3" />
                          Undo
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                {memoryMode === "manual" && (
                  <span className="rounded-full bg-zaki-hover px-2 py-0.5 text-[10px] text-zaki-muted">
                    Pending
                  </span>
                )}
              </div>
            ))}
            {hasMore && (
              <div className="text-2xs text-zaki-muted">+{memories.length - visibleMemories.length} more</div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-2xs text-zaki-muted">
            <span>Review all memories</span>
            <button
              type="button"
              className="text-zaki-brand font-semibold hover:underline"
              onClick={() => window.dispatchEvent(new Event("zaki:open-memory"))}
            >
              Open
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * MemoryToast - Manual Mode
 * 
 * Staged memories waiting for user confirmation
 * Enhances credibility by giving user control
 */

import { useState } from "react";
import { Brain, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

interface StagedMemory {
  id: string;
  content: string;
  type: string;
  confirmationId: string;
}

interface MemoryToastProps {
  userId: string;
  memories: StagedMemory[];
  onDismiss: () => void;
  position?: { left: number; width: number; bottom: number };
}

const typeIcons: Record<string, string> = {
  fact: "💡",
  preference: "✨",
  emotion: "💭",
  event: "📅",
  goal: "🎯",
  relationship: "👤",
  struggle: "🌧️",
};

const typeLabels: Record<string, string> = {
  fact: "Fact",
  preference: "Preference",
  emotion: "Emotion",
  event: "Event",
  goal: "Goal",
  relationship: "Relationship",
  struggle: "Challenge",
};

export function MemoryToast({ userId, memories, onDismiss, position }: MemoryToastProps) {
  const [processedIds, setProcessedIds] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingCount = memories.filter(m => !processedIds.includes(m.confirmationId)).length;

  const confirm = async (confirmationId: string) => {
    setIsProcessing(true);
    try {
      await apiRequest(`/api/memory/confirmations/${confirmationId}/confirm`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      setProcessedIds(prev => [...prev, confirmationId]);
    } catch (err) {
      console.error("Failed to confirm:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const reject = async (confirmationId: string) => {
    setIsProcessing(true);
    try {
      await apiRequest(`/api/memory/confirmations/${confirmationId}/reject`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      setProcessedIds(prev => [...prev, confirmationId]);
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAll = async () => {
    setIsProcessing(true);
    const pending = memories.filter(m => !processedIds.includes(m.confirmationId));
    await Promise.all(pending.map(m => confirm(m.confirmationId)));
    setIsProcessing(false);
    setTimeout(onDismiss, 500);
  };

  if (pendingCount === 0) {
    setTimeout(onDismiss, 1000);
    return null;
  }

  return (
    <div
      className="fixed z-50"
      style={{
        left: position?.left ?? 16,
        width: position?.width ?? "calc(100% - 32px)",
        bottom: position?.bottom ?? 24,
      }}
    >
      <div
        className={cn(
          "rounded-2xl border shadow-[0px_10px_22px_rgba(15,15,15,0.1)]",
          "border-[#d6e2ff] bg-[#eef3ff] dark:border-[#2c3550] dark:bg-[#1f2330]",
          "overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 dark:bg-white/10">
              <Brain className="h-3 w-3 text-[#2d5bff]" />
            </div>
            <p className="text-2xs text-zaki-primary dark:text-zaki-dark-primary truncate">
              {pendingCount} new memory
            </p>
          </div>
          <div className="flex items-center gap-2 text-2xs text-zaki-muted dark:text-zaki-dark-muted">
            <button
              onClick={confirmAll}
              disabled={isProcessing}
              className={cn(
                "font-medium underline underline-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Save All
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-full text-zaki-muted hover:bg-white/60 dark:hover:bg-white/10"
              aria-label={isExpanded ? "Collapse memory list" : "Expand memory list"}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-white dark:bg-zaki-dark-card px-4 py-3 border-t border-[#d9e4ff] dark:border-[#27314a]">
            <div className="space-y-4">
              {memories
                .filter((m) => !processedIds.includes(m.confirmationId))
                .slice(0, 2)
                .map((memory) => (
                  <div key={memory.confirmationId} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-zaki-primary">{memory.content}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zaki-muted">
                        <button
                          onClick={() => confirm(memory.confirmationId)}
                          disabled={isProcessing}
                          className={cn("hover:text-zaki-primary", "disabled:opacity-50")}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => reject(memory.confirmationId)}
                          disabled={isProcessing}
                          className={cn("hover:text-zaki-primary", "disabled:opacity-50")}
                        >
                          Ignore
                        </button>
                      </div>
                    </div>
                    <span className="rounded-full bg-[#ede7ff] px-2 py-0.5 text-[10px] font-semibold text-[#6a4bff] tracking-wide">
                      {(typeLabels[memory.type] || memory.type).toUpperCase()}
                    </span>
                  </div>
                ))}
              {memories.filter((m) => !processedIds.includes(m.confirmationId)).length > 2 && (
                <div className="text-2xs text-zaki-muted">
                  +{memories.filter((m) => !processedIds.includes(m.confirmationId)).length - 2} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

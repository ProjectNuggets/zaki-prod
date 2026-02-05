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

export function MemoryToast({ userId, memories, onDismiss }: MemoryToastProps) {
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
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
      <div className={cn(
        "rounded-zaki-lg border bg-white dark:bg-zinc-900 shadow-lg",
        "border-zinc-200 dark:border-zinc-700 overflow-hidden"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/20">
              <Brain className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {pendingCount} new memory{pendingCount > 1 ? 'ies' : 'y'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Review before saving
              </p>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Memory List */}
        {isExpanded && (
          <div className="max-h-64 overflow-y-auto">
            {memories
              .filter(m => !processedIds.includes(m.confirmationId))
              .map((memory, index) => (
              <div
                key={memory.confirmationId}
                className={cn(
                  "p-3 border-b border-zinc-50 dark:border-zinc-800",
                  index % 2 === 0 && "bg-zinc-50/50 dark:bg-zinc-800/50"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{typeIcons[memory.type] || "💡"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {memory.content}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {typeLabels[memory.type] || memory.type}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => confirm(memory.confirmationId)}
                    disabled={isProcessing}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5",
                      "bg-teal-500 hover:bg-teal-600 text-white text-sm rounded-md",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save
                  </button>
                  <button
                    onClick={() => reject(memory.confirmationId)}
                    disabled={isProcessing}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5",
                      "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700",
                      "text-zinc-700 dark:text-zinc-300 text-sm rounded-md",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <X className="h-3.5 w-3.5" />
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 flex gap-2">
          <button
            onClick={confirmAll}
            disabled={isProcessing}
            className={cn(
              "flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-md",
              "disabled:opacity-50"
            )}
          >
            Save All
          </button>
          <button
            onClick={onDismiss}
            disabled={isProcessing}
            className={cn(
              "px-4 py-2 text-zinc-600 dark:text-zinc-400 text-sm hover:text-zinc-900",
              "disabled:opacity-50"
            )}
          >
            Decide Later
          </button>
        </div>
      </div>
    </div>
  );
}

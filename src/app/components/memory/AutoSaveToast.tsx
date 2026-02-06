/**
 * AutoSaveToast - Auto-save with 3-second Undo
 * 
 * UX: Save immediately → Show toast with Undo button → 3s countdown → Keep
 */

import { useState, useEffect, useCallback } from "react";
import { Brain, Undo2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";

interface SavedMemory {
  id: string;
  content: string;
  type: string;
}

interface AutoSaveToastProps {
  userId: string;
  memories: SavedMemory[];
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

const UNDO_DURATION = 3000; // 3 seconds

export function AutoSaveToast({ userId, memories, onDismiss }: AutoSaveToastProps) {
  const [undoneIds, setUndoneIds] = useState<string[]>([]);
  const [progress, setProgress] = useState(100);
  const [isUndoing, setIsUndoing] = useState(false);

  // Filter out undone memories
  const activeMemories = memories.filter(m => !undoneIds.includes(m.id));

  // Undo handler
  const undo = useCallback(async (id: string) => {
    if (isUndoing) return;
    setIsUndoing(true);
    
    try {
      await apiRequest(`/api/memory/undo/${id}`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      setUndoneIds(prev => [...prev, id]);
    } catch (err) {
      console.error("Undo failed:", err);
    } finally {
      setIsUndoing(false);
    }
  }, [userId, isUndoing]);

  // 3-second countdown
  useEffect(() => {
    if (activeMemories.length === 0) {
      onDismiss();
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, UNDO_DURATION - elapsed);
      setProgress((remaining / UNDO_DURATION) * 100);

      if (remaining === 0) {
        clearInterval(timer);
        onDismiss();
      }
    }, 16); // ~60fps

    return () => clearInterval(timer);
  }, [activeMemories.length, onDismiss]);

  // Auto-dismiss when all undone
  useEffect(() => {
    if (undoneIds.length === memories.length) {
      const timer = setTimeout(onDismiss, 500);
      return () => clearTimeout(timer);
    }
  }, [undoneIds, memories.length, onDismiss]);

  if (activeMemories.length === 0) {
    return null;
  }

  const count = activeMemories.length;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm">
      <div className={cn(
        "rounded-zaki-lg border bg-white dark:bg-zinc-900 shadow-lg",
        "border-zinc-200 dark:border-zinc-700 overflow-hidden"
      )}>
        {/* Header */}
        <div className="p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/20">
            <Brain className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              {count} memory{count > 1 ? 'ies' : 'y'} saved
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Undo within 3 seconds
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
          <div 
            className="h-full bg-teal-500 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Memory list */}
        <div className="max-h-32 overflow-y-auto p-3 space-y-2">
          {activeMemories.map((memory) => (
            <div
              key={memory.id}
              className="flex items-center gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-800/50"
            >
              <span className="text-lg">{typeIcons[memory.type] || "💡"}</span>
              <p className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate">
                {memory.content}
              </p>
              <button
                onClick={() => undo(memory.id)}
                disabled={isUndoing}
                className={cn(
                  "p-1.5 rounded-md text-zinc-500 hover:text-teal-600",
                  "hover:bg-teal-50 dark:hover:bg-teal-900/20",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                title="Undo"
              >
                {isUndoing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Undo2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
          <button
            onClick={() => activeMemories.forEach(m => undo(m.id))}
            disabled={isUndoing}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
          >
            Undo all
          </button>
          <span className="text-xs text-zinc-400">
            {Math.ceil((progress / 100) * 3)}s left
          </span>
        </div>
      </div>
    </div>
  );
}

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
  position?: { left: number; width: number; bottom: number };
  progress?: number;
}

const UNDO_DURATION = 3000; // 3 seconds

export function AutoSaveToast({ userId, memories, onDismiss, position, progress: progressOverride }: AutoSaveToastProps) {
  const [undoneIds, setUndoneIds] = useState<string[]>([]);
  const [progress, setProgress] = useState(100);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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

    if (progressOverride !== undefined) {
      setProgress(progressOverride);
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
  }, [activeMemories.length, onDismiss, progressOverride]);

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
              {count} new memory saved
            </p>
          </div>
          <div className="flex items-center gap-2 text-2xs text-zaki-muted dark:text-zaki-dark-muted">
            <span>{Math.ceil((progress / 100) * 3)}s left</span>
            <button
              onClick={() => activeMemories.forEach((m) => undo(m.id))}
              disabled={isUndoing}
              className={cn(
                "font-medium underline underline-offset-2 relative",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              Undo (3s)
              <span
                className="absolute left-0 -bottom-1 h-0.5 bg-[#2d5bff] transition-all"
                style={{ width: `${progress}%` }}
              />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 rounded-full text-zaki-muted hover:bg-white/60 dark:hover:bg-white/10"
              aria-label={isExpanded ? "Collapse memory list" : "Expand memory list"}
            >
              {isExpanded ? "–" : "+"}
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-[#d9e4ff] dark:bg-[#27314a]">
          <div
            className="h-full bg-[#2d5bff] transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        {isExpanded && (
          <div className="bg-white dark:bg-zaki-dark-card px-4 py-2 border-t border-[#d9e4ff] dark:border-[#27314a]">
            <div className="space-y-2">
              {activeMemories.slice(0, 2).map((memory) => (
                <div key={memory.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded-full bg-[#ede7ff] px-2 py-0.5 text-[10px] font-semibold text-[#6a4bff] tracking-wide">
                      {(memory.type || "memory").toUpperCase()}
                    </span>
                    <span className="text-sm text-zaki-primary truncate">{memory.content}</span>
                  </div>
                  <button
                    onClick={() => undo(memory.id)}
                    disabled={isUndoing}
                    className={cn(
                      "text-zaki-muted hover:text-zaki-secondary",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    aria-label="Undo memory"
                  >
                    {isUndoing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Undo2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
              {activeMemories.length > 2 && (
                <div className="text-2xs text-zaki-muted">+{activeMemories.length - 2} more</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

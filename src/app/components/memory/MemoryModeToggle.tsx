/**
 * MemoryModeToggle - User preference for memory handling
 * 
 * Auto-Save (default): Save immediately, 3s undo
 * Manual: Stage for confirmation
 */

import { useState, useEffect } from "react";
import { Brain, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type MemoryMode = "autosave" | "manual";

interface MemoryModeToggleProps {
  value: MemoryMode;
  onChange: (mode: MemoryMode) => void;
}

export function MemoryModeToggle({ value, onChange }: MemoryModeToggleProps) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-teal-500" />
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Memory Mode
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Auto-Save Option */}
        <button
          onClick={() => onChange("autosave")}
          className={cn(
            "relative p-3 rounded-md text-left transition-all",
            "border-2",
            value === "autosave"
              ? "border-teal-500 bg-teal-50/50 dark:bg-teal-900/20"
              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
          )}
        >
          <div className="flex items-start gap-2">
            <Clock className={cn(
              "h-4 w-4 mt-0.5",
              value === "autosave" ? "text-teal-500" : "text-zinc-400"
            )} />
            <div>
              <p className={cn(
                "text-sm font-medium",
                value === "autosave" ? "text-teal-700 dark:text-teal-400" : "text-zinc-700 dark:text-zinc-300"
              )}>
                Auto-Save
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Save instantly, 3s undo
              </p>
            </div>
          </div>
          {value === "autosave" && (
            <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-teal-500" />
          )}
        </button>

        {/* Manual Option */}
        <button
          onClick={() => onChange("manual")}
          className={cn(
            "relative p-3 rounded-md text-left transition-all",
            "border-2",
            value === "manual"
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-900/20"
              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
          )}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className={cn(
              "h-4 w-4 mt-0.5",
              value === "manual" ? "text-amber-500" : "text-zinc-400"
            )} />
            <div>
              <p className={cn(
                "text-sm font-medium",
                value === "manual" ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
              )}>
                Manual
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Confirm each memory
              </p>
            </div>
          </div>
          {value === "manual" && (
            <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-amber-500" />
          )}
        </button>
      </div>
    </div>
  );
}

// Hook for persistent storage
export function useMemoryMode(): [MemoryMode, (mode: MemoryMode) => void] {
  const [mode, setMode] = useState<MemoryMode>("autosave");

  useEffect(() => {
    const saved = localStorage.getItem("zaki-memory-mode");
    if (saved === "manual" || saved === "autosave") {
      setMode(saved);
    }
  }, []);

  const setPersistentMode = (newMode: MemoryMode) => {
    setMode(newMode);
    localStorage.setItem("zaki-memory-mode", newMode);
  };

  return [mode, setPersistentMode];
}

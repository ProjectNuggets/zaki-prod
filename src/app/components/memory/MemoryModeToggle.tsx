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
    <div className="rounded-zaki-lg border border-zaki-subtle bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-zaki-accent" />
        <span className="text-sm font-medium text-zaki-primary">
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
              ? "border-zaki-accent bg-zaki-accent-10"
              : "border-zaki-subtle hover:border-zaki-strong"
          )}
        >
          <div className="flex items-start gap-2">
            <Clock className={cn(
              "h-4 w-4 mt-0.5",
              value === "autosave" ? "text-zaki-accent" : "text-zaki-muted"
            )} />
            <div>
              <p className={cn(
                "text-sm font-medium",
                value === "autosave" ? "text-zaki-accent" : "text-zaki-secondary"
              )}>
                Auto-Save
              </p>
              <p className="text-2xs text-zaki-muted mt-1">
                Save instantly, 3s undo
              </p>
            </div>
          </div>
          {value === "autosave" && (
            <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-zaki-accent" />
          )}
        </button>

        {/* Manual Option */}
        <button
          onClick={() => onChange("manual")}
          className={cn(
            "relative p-3 rounded-md text-left transition-all",
            "border-2",
            value === "manual"
              ? "border-zaki-brand bg-zaki-brand-10"
              : "border-zaki-subtle hover:border-zaki-strong"
          )}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className={cn(
              "h-4 w-4 mt-0.5",
              value === "manual" ? "text-zaki-brand" : "text-zaki-muted"
            )} />
            <div>
              <p className={cn(
                "text-sm font-medium",
                value === "manual" ? "text-zaki-brand" : "text-zaki-secondary"
              )}>
                Manual
              </p>
              <p className="text-2xs text-zaki-muted mt-1">
                Confirm each memory
              </p>
            </div>
          </div>
          {value === "manual" && (
            <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-zaki-brand" />
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

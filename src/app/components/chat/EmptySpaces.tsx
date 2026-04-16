/**
 * EmptySpaces - Warm welcome when no workspaces exist
 *
 * Personality: Welcoming, encouraging, action-oriented
 */

import { Plus, FolderOpen, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/app/components/ui/zaki";

interface EmptySpacesProps {
  onCreateSpace?: () => void;
  className?: string;
}

export function EmptySpaces({ onCreateSpace, className }: EmptySpacesProps) {
  const quickTemplates = [
    { icon: "W", label: "Work", color: "bg-blue-50 border-blue-100 text-blue-600" },
    { icon: "P", label: "Personal", color: "bg-green-50 border-green-100 text-green-600" },
    { icon: "L", label: "Learning", color: "bg-purple-50 border-purple-100 text-purple-600" },
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center h-full px-6 py-12", className)}>
      <EmptyState
        icon={<FolderOpen className="size-5" strokeWidth={1.75} />}
        title="Let's build your first space"
        helper="Spaces help organize your memories. Work, personal, learning. Each space remembers what's important in that part of your life."
        action={
          <div className="flex flex-col items-center gap-6">
            <div className="flex gap-3 flex-wrap justify-center">
              {quickTemplates.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={onCreateSpace}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all",
                    "hover:scale-105 hover:shadow-md active:scale-95",
                    template.color
                  )}
                >
                  <span className="text-sm font-semibold">{template.icon}</span>
                  <span className="text-sm font-medium">{template.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onCreateSpace}
              className={cn(
                "group flex items-center gap-3 px-8 py-4 rounded-full",
                "bg-zaki-brand text-white font-medium",
                "hover:bg-zaki-brand-hover transition-all",
                "shadow-lg shadow-zaki-brand/25",
                "hover:shadow-xl hover:shadow-zaki-brand/30",
                "hover:scale-105 active:scale-95"
              )}
            >
              <Plus className="size-5" />
              <span>Create your first space</span>
              <ArrowRight className="size-4 opacity-60 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        }
      />
    </div>
  );
}

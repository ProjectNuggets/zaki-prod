/**
 * EmptySpaces - Warm welcome when no workspaces exist
 * 
 * Personality: Welcoming, encouraging, action-oriented
 */

import { Plus, FolderOpen, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptySpacesProps {
  onCreateSpace?: () => void;
  className?: string;
}

export function EmptySpaces({ onCreateSpace, className }: EmptySpacesProps) {
  const quickTemplates = [
    { icon: "💼", label: "Work", color: "bg-blue-50 border-blue-100 text-blue-600" },
    { icon: "🏠", label: "Personal", color: "bg-green-50 border-green-100 text-green-600" },
    { icon: "📚", label: "Learning", color: "bg-purple-50 border-purple-100 text-purple-600" },
  ];

  return (
    <div className={cn("flex flex-col items-center justify-center h-full px-6 py-12", className)}>
      {/* Animated illustration */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-zaki-brand/10 rounded-full blur-3xl scale-150 animate-pulse" />
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-zaki-brand to-zaki-primary-500 flex items-center justify-center shadow-xl">
          <FolderOpen className="size-12 text-white" strokeWidth={1.5} />
        </div>
        {/* Floating sparkles */}
        <div className="absolute -top-2 -right-2 text-2xl animate-bounce" style={{ animationDuration: '2s' }}>
          ✨
        </div>
        <div className="absolute -bottom-1 -left-3 text-xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
          🌟
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-semibold text-zaki-primary mb-3 text-center">
        Let's build your first space
      </h2>

      {/* Subtext */}
      <p className="text-zaki-muted text-center max-w-sm mb-8 leading-relaxed">
        Spaces help organize your memories. Work, personal, learning — 
        each space remembers what's important in that part of your life.
      </p>

      {/* Quick templates */}
      <div className="flex gap-3 mb-8">
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
            <span className="text-lg">{template.icon}</span>
            <span className="text-sm font-medium">{template.label}</span>
          </button>
        ))}
      </div>

      {/* Primary CTA */}
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

      {/* Trust hint */}
      <div className="mt-8 flex items-center gap-2 text-xs text-zaki-muted">
        <Sparkles className="size-3.5" />
        <span>ZAKI remembers context within each space</span>
      </div>
    </div>
  );
}

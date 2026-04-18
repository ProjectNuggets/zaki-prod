import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pencil,
  Compass,
  Code2,
  Heart,
  Sparkles,
  Upload,
  X,
  ChevronRight,
} from "lucide-react";
import { CenterLogo } from "../../icons";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { MetaLabel } from "@/app/components/ui/zaki";
import { MemoryImportSheet } from "@/app/components/memory/MemoryImportSheet";

interface ZakiDashboardProps {
  onSendExample: (example: string) => void;
}

type Category = {
  id: string;
  label: string;
  icon: typeof Pencil;
  suggestions: string[];
};

const CATEGORIES: Category[] = [
  {
    id: "write",
    label: "Write",
    icon: Pencil,
    suggestions: [
      "Create blog article series",
      "Research topics for my writing",
      "Create interview questions",
      "Write video scripts",
      "Improve my writing style",
    ],
  },
  {
    id: "learn",
    label: "Learn",
    icon: Compass,
    suggestions: [
      "Explain a complex topic simply",
      "Create a study plan for a new skill",
      "Quiz me on what I am learning",
      "Summarize a research paper",
      "Break down a difficult concept",
    ],
  },
  {
    id: "code",
    label: "Code",
    icon: Code2,
    suggestions: [
      "Debug my code and explain the fix",
      "Review my code for best practices",
      "Help me design a system architecture",
      "Write unit tests for my function",
      "Optimize my database queries",
    ],
  },
  {
    id: "life",
    label: "Life stuff",
    icon: Heart,
    suggestions: [
      "Plan my week for balance and focus",
      "Help me make a decision with pros and cons",
      "Draft a message I have been putting off",
      "Create a meal plan for the week",
      "Help me organize my thoughts on something",
    ],
  },
  {
    id: "zaki",
    label: "ZAKI picks",
    icon: Sparkles,
    suggestions: [
      "Plan my day for focus, energy, and calm",
      "Teach me something useful in 5 minutes",
      "Give me three smart ideas I can use today",
      "Help me think through a problem step by step",
      "Summarize what we have been working on",
    ],
  },
];

// Greeting buckets, tuned to the user's local wall-clock hour.
// getHours() returns the browser's local timezone, so users in any tz get
// a greeting that matches their actual time of day.
function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Still up, night owl";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Hello, night owl";
}

// Recompute the greeting each minute so a session that spans a boundary
// (e.g. 04:59 → 05:01) updates without a page refresh.
function useLiveGreeting(): string {
  const [greeting, setGreeting] = useState(() => getGreeting());
  useEffect(() => {
    const id = window.setInterval(() => {
      setGreeting(getGreeting());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return greeting;
}

export function ZakiDashboard({ onSendExample }: ZakiDashboardProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const { user } = useAuthStore();
  const userName = user?.fullName?.split(" ")[0] || user?.username || "there";
  const greeting = useLiveGreeting();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 w-full h-full",
        isRtl && "rtl"
      )}
    >
      <div className="flex flex-col items-center w-full max-w-[680px]">
        {/* Greeting */}
        <div className="flex items-center gap-2.5 mb-8">
          <CenterLogo className="size-7 text-zaki-brand" />
          <h1
            className={cn(
              "text-2xl md:text-3xl font-bold text-zaki-primary",
              "tracking-tight leading-tight",
              isRtl && "font-arabic"
            )}
          >
            {greeting}, {userName}
          </h1>
        </div>

        {/* Suggestion pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  setActiveCategory(isActive ? null : cat.id)
                }
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  "border",
                  isActive
                    ? "bg-zaki-selected border-zaki-brand/20 text-zaki-primary"
                    : "bg-transparent border-zaki-strong text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary"
                )}
              >
                <Icon className="size-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Memory import — bring your context from another AI */}
        {!activeCat && (
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className={cn(
              "mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              "text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover",
              isRtl && "flex-row-reverse"
            )}
            data-testid="zaki-memory-import-trigger"
          >
            <Upload className="size-3.5" />
            Bring your memory from ChatGPT, Claude, or Gemini
          </button>
        )}

        {/* Expanded sub-suggestions */}
        {activeCat && (
          <div className="w-full mt-4 rounded-zaki-xl border border-zaki bg-zaki-raised dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zaki dark:border-[rgba(240,236,230,0.06)]">
              <MetaLabel
                icon={(() => {
                  const Icon = activeCat.icon;
                  return <Icon className="size-3.5" />;
                })()}
              >
                {activeCat.label}
              </MetaLabel>
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="size-6 rounded-md flex items-center justify-center text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-col">
              {activeCat.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm text-zaki-secondary text-left transition-colors",
                    "hover:bg-zaki-hover hover:text-zaki-primary",
                    "dark:hover:bg-[#1a1714]",
                    index < activeCat.suggestions.length - 1 &&
                      "border-b border-zaki dark:border-[rgba(240,236,230,0.04)]",
                    isRtl && "text-right flex-row-reverse"
                  )}
                  onClick={() => onSendExample(suggestion)}
                >
                  <span>{suggestion}</span>
                  <ChevronRight
                    className={cn(
                      "size-4 text-zaki-muted opacity-0 transition-opacity",
                      "group-hover:opacity-100",
                      isRtl && "rotate-180"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <MemoryImportSheet
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}

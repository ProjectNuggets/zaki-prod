import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  Pencil,
  Compass,
  Code2,
  Copy,
  Heart,
  Sparkles,
  Upload,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { CenterLogo } from "../../icons";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { MetaLabel } from "@/app/components/ui/zaki";

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

const MEMORY_IMPORT_PROMPT = `Export all of my stored memories and any context you have learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions and preferences.

Categories (output in this order):

1. Instructions: Rules I have explicitly asked you to follow going forward — tone, format, style, "always do X", "never do Y", and corrections to your behavior. Only from stored memories, not from conversation transcripts.

2. Identity: Name, age, location, time zone, languages, education, family, relationships, personal interests, and any accessibility or health context relevant to helping me.

3. Career: Current and past roles, companies, industries, and general skill areas.

4. Projects: Projects I meaningfully built or committed to. Ideally ONE entry per project. Include what it does, current status, and key decisions. Start each entry with the project name or a short descriptor.

5. Preferences: Opinions, tastes, and working-style preferences that apply broadly — including tools, languages, frameworks I use, and how I prefer to communicate.

Format:

Use section headers for each category. Within each category, one entry per line, sorted oldest first:

[YYYY-MM-DD] - Entry content here.

Use [unknown] when no date is available. Skip anything that would leak private information about someone other than me.

Output:

Begin with exactly this line (include it inside the code block too):

Zaki: here are my facts. Save and update your memory accordingly.

Then wrap the entire export in a single code block. After the code block, state whether this is the complete set or if more entries remain.`;

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
  const [importFullView, setImportFullView] = useState(false);
  const [importCopied, setImportCopied] = useState(false);

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory);

  const handleCopyImportPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(MEMORY_IMPORT_PROMPT);
      setImportCopied(true);
      window.setTimeout(() => setImportCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text manually.");
    }
  }, []);

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
          <div className="w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                setImportOpen((v) => !v);
                setImportFullView(false);
              }}
              aria-expanded={importOpen}
              className={cn(
                "mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                "text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover",
                isRtl && "flex-row-reverse"
              )}
              data-testid="zaki-memory-import-trigger"
            >
              <Upload className="size-3.5" />
              Bring your memory from ChatGPT, Claude, or Gemini
              {importOpen ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>

            {importOpen && (
              <div
                className={cn(
                  "w-full mt-3 rounded-zaki-xl border border-zaki bg-zaki-raised overflow-hidden",
                  "dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]"
                )}
                data-testid="zaki-memory-import-panel"
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zaki dark:border-[rgba(240,236,230,0.06)]">
                  <MetaLabel icon={<Upload className="size-3.5" />}>
                    Memory import
                  </MetaLabel>
                  <button
                    type="button"
                    onClick={() => setImportOpen(false)}
                    className="size-6 rounded-md flex items-center justify-center text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover transition-colors"
                    aria-label="Close"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <div className="px-4 py-3 flex flex-col gap-3">
                  <div
                    className={cn(
                      "rounded-zaki-md border border-zaki bg-zaki-sunken p-3",
                      "font-mono text-xs leading-relaxed text-zaki-secondary whitespace-pre-wrap",
                      !importFullView && "max-h-[120px] overflow-hidden relative"
                    )}
                  >
                    {importFullView
                      ? MEMORY_IMPORT_PROMPT
                      : MEMORY_IMPORT_PROMPT.slice(0, 260) + "..."}
                    {!importFullView && (
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zaki-sunken to-transparent pointer-events-none" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setImportFullView((v) => !v)}
                      className="text-xs font-medium text-zaki-brand hover:underline"
                    >
                      {importFullView ? "Show less" : "Show full prompt"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyImportPrompt}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        "bg-zaki-brand text-white hover:bg-zaki-brand/90"
                      )}
                      data-testid="zaki-memory-import-copy"
                    >
                      {importCopied ? (
                        <>
                          <Check className="size-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" /> Copy prompt
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-zaki-muted leading-relaxed">
                    Paste it into ChatGPT, Claude, or Gemini. Then paste the
                    answer into Zaki's chat box below and send. Zaki will save
                    the facts into memory and confirm.
                  </p>
                </div>
              </div>
            )}
          </div>
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
    </div>
  );
}

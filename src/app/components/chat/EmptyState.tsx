import { CenterLogo } from "../icons";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  userName?: string;
  onExampleClick?: (text: string) => void;
  examples?: string[];
  className?: string;
}

const defaultExamples = [
  "Draft a bold brand manifesto for a rebellious fintech.",
  "Summarize this meeting and pull out the 3 real decisions.",
  "Give me a brutally honest UX critique of this flow.",
];

export function EmptyState({
  userName = "there",
  onExampleClick,
  examples = defaultExamples,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full px-6", className)}>
      <div className="w-16 h-16 mb-6 rounded-zaki-lg bg-zaki-gradient flex items-center justify-center shadow-lg">
        <CenterLogo className="size-8 text-white" />
      </div>
      
      <h2 className="text-2xl font-semibold text-zaki-primary dark:text-zaki-primary mb-2">
        Good to see you, {userName}
      </h2>
      
      <p className="text-zaki-muted dark:text-zaki-dark-muted text-sm mb-8 text-center max-w-md">
        Ready when you are. Ask me anything or pick a suggestion to get started.
      </p>

      <div className="w-full max-w-lg space-y-2">
        {examples.map((example, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onExampleClick?.(example)}
            className="w-full text-left p-4 rounded-zaki-md border border-zaki dark:border-zaki-dark bg-white dark:bg-zaki-dark-card text-zaki-secondary dark:text-zaki-dark-subtle text-sm hover:border-zaki-focus hover:bg-zaki-hover dark:hover:bg-zaki-dark-elevated transition-all group"
          >
            <span className="flex items-center gap-3">
              <Sparkles className="size-4 text-zaki-brand opacity-60 group-hover:opacity-100 transition-opacity" />
              {example}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

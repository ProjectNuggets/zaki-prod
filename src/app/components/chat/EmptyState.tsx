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
      <div className="w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-[#D24430] to-[#e85d4b] flex items-center justify-center shadow-lg">
        <CenterLogo className="size-8 text-white" />
      </div>
      
      <h2 className="text-2xl font-semibold text-[#1f1a14] dark:text-[#efe6d9] mb-2">
        Good to see you, {userName}
      </h2>
      
      <p className="text-[#88735A] dark:text-[#a89a8a] text-sm mb-8 text-center max-w-md">
        Ready when you are. Ask me anything or pick a suggestion to get started.
      </p>

      <div className="w-full max-w-lg space-y-2">
        {examples.map((example, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onExampleClick?.(example)}
            className="w-full text-left p-4 rounded-xl border border-[#efe4d6] dark:border-[#2a2118] bg-white dark:bg-[#16120e] text-[#655543] dark:text-[#b8a99a] text-sm hover:border-[#D24430] hover:bg-[#fff8f5] dark:hover:bg-[#1f1814] transition-all group"
          >
            <span className="flex items-center gap-3">
              <Sparkles className="size-4 text-[#D24430] opacity-60 group-hover:opacity-100 transition-opacity" />
              {example}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

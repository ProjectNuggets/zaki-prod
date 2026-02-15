import { CenterLogo } from "../icons";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface EmptyStateProps {
  userName?: string;
  onExampleClick?: (text: string) => void;
  onStartChat?: () => void;
  examples?: string[];
  className?: string;
}

export function EmptyState({
  userName = "there",
  onExampleClick,
  onStartChat,
  examples,
  className,
}: EmptyStateProps) {
  const { t } = useTranslation();
  const fallbackExamples = t("empty.examples", { returnObjects: true }) as string[];
  const resolvedExamples = examples ?? fallbackExamples;
  return (
    <div className={cn("flex flex-col items-center justify-center h-full px-6", className)}>
      <div className="w-16 h-16 mb-6 rounded-zaki-lg bg-zaki-gradient flex items-center justify-center shadow-lg">
        <CenterLogo className="size-8 text-white" />
      </div>
      
      <h2 className="text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary mb-2">
        {t("empty.greeting", { name: userName })}
      </h2>
      
      <p className="text-zaki-muted dark:text-zaki-dark-muted text-sm mb-8 text-center max-w-md">
        {t("empty.subtext")}
      </p>

      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zaki-muted">
          {t("empty.ctaHelper")}
        </div>
        <button className="zaki-btn bg-zaki-accent text-white" onClick={onStartChat}>
          {t("empty.cta")}
        </button>
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
          {resolvedExamples.slice(0, 2).map((example) => (
            <button
              key={example}
              type="button"
              className="zaki-btn-sm border border-zaki-subtle bg-white text-zaki-secondary hover:bg-zaki-hover"
              onClick={() => onExampleClick?.(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full max-w-lg space-y-2">
        {resolvedExamples.map((example, index) => (
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

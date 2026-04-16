import { CenterLogo } from "../icons";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ThinkingIndicatorProps {
  className?: string;
  label?: string;
  pillLabel?: string;
}

export function ThinkingIndicator({
  className,
  label,
  pillLabel,
}: ThinkingIndicatorProps) {
  const { t } = useTranslation();
  const displayLabel = label || t("chat.thinking");

  return (
    <div className={cn("flex gap-4 items-start", className)}>
      {/* Pulsing Avatar */}
      <div className="size-8 shrink-0 flex items-center justify-center">
        <div className="zaki-avatar-pulse relative">
          <div className="absolute inset-0 rounded-full bg-zaki-brand-10 animate-ping-slow" />
          <div className="relative scale-75">
            <CenterLogo />
          </div>
        </div>
      </div>

      {/* Thinking Text with Shimmer */}
      <div className="rounded-zaki-lg px-4 py-3 text-sm bg-transparent">
        <div className="flex items-center gap-3">
          {pillLabel ? (
            <span className="inline-flex items-center rounded-full border border-zaki bg-zaki-raised px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zaki-secondary shadow-sm animate-pulse dark:border-[rgba(240,236,230,0.08)] dark:bg-[#1a1714]">
              {pillLabel}
            </span>
          ) : (
            <span className="zaki-thinking-text text-zaki-muted font-medium">
              {displayLabel}
            </span>
          )}
          
          {/* Animated dots — teal accent */}
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="zaki-dot" style={{ animationDelay: "0s" }} />
            <span className="zaki-dot" style={{ animationDelay: "0.15s" }} />
            <span className="zaki-dot" style={{ animationDelay: "0.3s" }} />
          </span>
        </div>
      </div>
    </div>
  );
}

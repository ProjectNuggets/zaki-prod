import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  size?: "display" | "title";
  className?: string;
}

/**
 * Unified section header.
 * - "display" size: page titles (24-32px Cabinet Grotesk extrabold)
 * - "title" size: section headers (18-20px Cabinet Grotesk bold)
 */
export function SectionHeader({
  icon,
  title,
  subtitle,
  action,
  size = "title",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand">
              {icon}
            </span>
          ) : null}
          <h2
            className={cn(
              "font-display text-zaki-primary min-w-0 truncate",
              size === "display"
                ? "text-2xl md:text-[28px] font-bold tracking-[-0.03em] leading-tight"
                : "text-lg md:text-xl font-bold tracking-[-0.02em] leading-tight"
            )}
          >
            {title}
          </h2>
        </div>
        {subtitle ? (
          <p
            className={cn(
              "text-sm text-zaki-secondary leading-relaxed",
              icon ? "mt-2 ml-[46px]" : "mt-2"
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

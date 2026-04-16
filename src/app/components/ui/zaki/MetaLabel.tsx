import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetaLabelProps {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Small uppercase tracked eyebrow label.
 * Used for section labels, meta tags, category names.
 * Typography: Plus Jakarta Sans 600, 11px, uppercase, 0.12em tracking.
 */
export function MetaLabel({ icon, children, className }: MetaLabelProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zaki-muted",
        className
      )}
    >
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}

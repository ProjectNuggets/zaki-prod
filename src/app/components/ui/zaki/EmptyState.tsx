import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  helper?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

/**
 * Minimal empty state. Icon in a muted pill, one-line title, one helper, optional CTA.
 * Use this for every empty collection across the app.
 */
export function EmptyState({ icon, title, helper, action, compact, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-3" : "py-10 px-4",
        className
      )}
    >
      <span className="inline-flex size-10 items-center justify-center rounded-full bg-zaki-hover text-zaki-muted mb-3">
        {icon}
      </span>
      <p className="text-sm font-medium text-zaki-primary">{title}</p>
      {helper ? (
        <p className="mt-1 text-xs text-zaki-secondary max-w-[280px] leading-relaxed">
          {helper}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

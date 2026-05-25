import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2ActionGridItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export type V2ActionGridProps = {
  actions: readonly V2ActionGridItem[];
  ariaLabel: string;
  className?: string;
};

export function V2ActionGrid({ actions, ariaLabel, className }: V2ActionGridProps) {
  return (
    <div
      className={cn("v2-action-grid", className)}
      aria-label={ariaLabel}
      style={{ "--v2-action-count": actions.length } as CSSProperties}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={action.onClick}
          disabled={action.disabled || !action.onClick}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}

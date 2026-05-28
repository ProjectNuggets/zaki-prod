import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2StatusStripItem = {
  id: string;
  label: ReactNode;
  value?: ReactNode;
  active?: boolean;
  showPip?: boolean;
  tone?: "default" | "accent" | "success" | "warn" | "danger";
  onClick?: () => void;
  ariaLabel?: string;
};

export type V2StatusStripProps = HTMLAttributes<HTMLDivElement> & {
  items: readonly V2StatusStripItem[];
};

export function V2StatusStrip({
  items,
  className,
  role = "status",
  ...props
}: V2StatusStripProps) {
  return (
    <div className={cn("v2-status-strip", className)} role={role} {...props}>
      {items.map((item) => {
        const showPip = item.showPip ?? Boolean(item.active || item.tone);
        const content = (
          <>
            {showPip ? (
              <span
                className={cn(
                  "v2-status-strip__pip",
                  item.active && "is-active",
                  item.tone && item.tone !== "default" && `is-${item.tone}`
                )}
                aria-hidden
              />
            ) : null}
            {item.label}
            {item.value != null ? <strong>{item.value}</strong> : null}
          </>
        );
        if (item.onClick) {
          return (
            <button
              key={item.id}
              type="button"
              className="v2-status-strip__item is-action"
              onClick={item.onClick}
              aria-label={item.ariaLabel}
            >
              {content}
            </button>
          );
        }
        return (
          <span key={item.id} className="v2-status-strip__item">
            {content}
          </span>
        );
      })}
    </div>
  );
}

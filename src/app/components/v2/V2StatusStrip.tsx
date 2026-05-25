import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2StatusStripItem = {
  id: string;
  label: ReactNode;
  value?: ReactNode;
  active?: boolean;
  showPip?: boolean;
  tone?: "default" | "accent" | "success" | "warn" | "danger";
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
        return (
          <span key={item.id} className="v2-status-strip__item">
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
          </span>
        );
      })}
    </div>
  );
}

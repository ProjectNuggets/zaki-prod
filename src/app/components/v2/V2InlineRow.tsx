import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2InlineRowTone = "default" | "accent" | "warn" | "danger" | "success";

export type V2InlineRowProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  tone?: V2InlineRowTone;
};

export function V2InlineRow({
  icon,
  title,
  meta,
  tone = "default",
  className,
  ...props
}: V2InlineRowProps) {
  return (
    <div
      className={cn(
        "v2-inline-row",
        tone !== "default" && `v2-inline-row--${tone}`,
        className
      )}
      {...props}
    >
      {icon != null ? <span className="v2-inline-row__icon">{icon}</span> : null}
      <div>
        <strong>{title}</strong>
        {meta != null ? <span>{meta}</span> : null}
      </div>
    </div>
  );
}

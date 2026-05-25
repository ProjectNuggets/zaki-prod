import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2BadgeTone = "default" | "accent" | "success" | "warn" | "danger" | "solid";

export type V2BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: V2BadgeTone;
  dot?: boolean;
  pulse?: boolean;
  children: ReactNode;
};

export function V2Badge({
  tone = "default",
  dot = false,
  pulse = false,
  className,
  children,
  ...props
}: V2BadgeProps) {
  return (
    <span
      className={cn(
        "v2-badge",
        tone !== "default" && `v2-badge--${tone}`,
        className
      )}
      {...props}
    >
      {dot ? <span className={cn("dot", pulse && "dot--pulse")} aria-hidden /> : null}
      {children}
    </span>
  );
}

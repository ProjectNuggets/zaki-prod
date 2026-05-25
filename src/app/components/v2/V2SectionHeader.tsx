import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2SectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
};

export function V2SectionHeader({
  title,
  subtitle,
  meta,
  className,
  ...props
}: V2SectionHeaderProps) {
  return (
    <div className={cn("v2-section-head", className)} {...props}>
      <div>
        <h2>{title}</h2>
        {subtitle != null ? <p>{subtitle}</p> : null}
      </div>
      {meta != null ? <span>{meta}</span> : null}
    </div>
  );
}

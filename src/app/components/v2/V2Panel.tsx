import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2PanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function V2Panel({ className, children, ...props }: V2PanelProps) {
  return (
    <section className={cn("v2-panel", className)} {...props}>
      {children}
    </section>
  );
}

export type V2PanelHeadProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
};

export function V2PanelHead({
  title,
  meta,
  children,
  className,
  ...props
}: V2PanelHeadProps) {
  return (
    <div className={cn("v2-panel-head", className)} {...props}>
      {children ?? (
        <>
          <span>{title}</span>
          {meta != null ? <span>{meta}</span> : null}
        </>
      )}
    </div>
  );
}

export function V2PanelBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("v2-panel-body", className)} {...props}>
      {children}
    </div>
  );
}

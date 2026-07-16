import * as React from "react";
import { cn } from "./utils";

export function Card({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zk-border-strong bg-zk-surface p-6 text-zk-text shadow-[0_2px_4px_rgba(0,0,0,0.2),0_20px_60px_rgba(0,0,0,0.35)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.25),0_28px_80px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {children}
    </div>
  );
}

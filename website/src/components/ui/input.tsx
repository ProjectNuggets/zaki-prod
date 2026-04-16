import * as React from "react";
import { cn } from "./utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-12 w-full rounded-full border border-zk-border-strong bg-zk-surface px-4 py-3 text-sm text-zk-text outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-zk-text-secondary/40 focus:border-zk-accent focus:shadow-[0_0_0_3px_rgba(241,2,2,0.12)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

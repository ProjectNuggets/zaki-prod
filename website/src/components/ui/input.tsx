import * as React from "react";
import { cn } from "./utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "min-h-12 w-full rounded-pill border border-line-strong bg-chat-surface px-4 py-3 text-sm text-chat-text outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-chat-muted/50 focus:border-chat-accent focus:shadow-[0_0_0_3px_rgba(201,57,42,0.10)]",
        "dark:border-line-dark-strong dark:bg-white/[0.04] dark:text-bot-text dark:placeholder:text-bot-muted/40 dark:focus:border-bot-accent dark:focus:shadow-[0_0_0_3px_rgba(255,77,46,0.12)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

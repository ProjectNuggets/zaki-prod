import * as React from "react";
import { cn } from "./utils";

export function Card({
  className,
  children,
  tone = "chat",
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "chat" | "bot" }) {
  return (
    <div
      className={cn(
        "rounded-card border p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5",
        tone === "chat"
          ? "border-line-strong bg-chat-surface text-chat-text shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.03),0_24px_64px_rgba(17,10,6,0.10)]"
          : "border-[rgba(60,40,30,0.25)] bg-[#110c0a] text-bot-text shadow-[0_2px_4px_rgba(0,0,0,0.2),0_20px_60px_rgba(0,0,0,0.35)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.25),0_28px_80px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {children}
    </div>
  );
}

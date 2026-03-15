import { cn } from "./utils";

export function Badge({
  className,
  pulse = false,
  tone = "chat",
  children,
}: {
  className?: string;
  pulse?: boolean;
  tone?: "chat" | "bot" | "warning";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]",
        tone === "chat" &&
          "border-[rgba(201,57,42,0.20)] bg-[rgba(201,57,42,0.07)] text-chat-accent",
        tone === "bot" &&
          "border-line-dark-strong bg-[rgba(255,255,255,0.05)] text-bot-text",
        tone === "warning" &&
          "border-[rgba(255,186,107,0.25)] bg-[rgba(255,186,107,0.10)] text-[#f0a050]",
        className
      )}
    >
      {pulse ? <span className="size-2 rounded-full bg-current animate-[pulse_2s_ease-in-out_infinite]" /> : null}
      {children}
    </span>
  );
}

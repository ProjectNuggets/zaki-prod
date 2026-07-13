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
          "border-zk-accent/20 bg-zk-accent/[0.07] text-zk-accent",
        tone === "bot" &&
          "border-zk-border-strong bg-white/[0.05] text-zk-text",
        tone === "warning" &&
          "border-zk-warning/25 bg-zk-warning/10 text-zk-warning",
        className
      )}
    >
      {pulse ? <span className="size-2 rounded-full bg-current animate-[pulse_2s_ease-in-out_infinite]" /> : null}
      {children}
    </span>
  );
}

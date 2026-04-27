import { cn } from "@/lib/utils";

export function TextShimmer({
  text,
  active = true,
  className,
}: {
  text: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block text-[14px] leading-6",
        active ? "zaki-thinking-shimmer" : "text-zaki-muted dark:text-zaki-dark-muted",
        className
      )}
      aria-live="polite"
    >
      {text}
    </span>
  );
}

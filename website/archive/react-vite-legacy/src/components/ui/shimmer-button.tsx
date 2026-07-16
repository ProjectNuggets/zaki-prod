import React from "react";
import { cn } from "./utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
}

export function ShimmerButton({
  className,
  children,
  shimmerColor = "rgba(255, 255, 255, 0.12)",
  borderRadius = "9999px",
  shimmerDuration = "2.5s",
  background = "var(--zk-accent)",
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex min-h-11 cursor-pointer items-center justify-center overflow-hidden px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(241,2,2,0.35)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      style={{ borderRadius, background }}
      {...props}
    >
      <div
        className="absolute inset-0 animate-shimmer"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 40%, ${shimmerColor} 60%, transparent 100%)`,
          backgroundSize: "200% 100%",
          animationDuration: shimmerDuration,
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}

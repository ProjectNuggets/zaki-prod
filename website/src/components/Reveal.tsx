import { useEffect, useRef, useState } from "react";
import { cn } from "./ui/utils";

interface RevealProps {
  className?: string;
  children: React.ReactNode;
  /** Delay in ms before the reveal animation starts */
  delay?: number;
  /** Animation variant */
  variant?: "up" | "fade" | "scale";
}

export function Reveal({
  className,
  children,
  delay = 0,
  variant = "up",
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const hiddenClasses = {
    up: "translate-y-7 opacity-0",
    fade: "opacity-0",
    scale: "scale-[0.97] opacity-0",
  };

  const visibleClasses = {
    up: "translate-y-0 opacity-100",
    fade: "opacity-100",
    scale: "scale-100 opacity-100",
  };

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "reveal-block transition-[opacity,transform] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        visible ? visibleClasses[variant] : hiddenClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

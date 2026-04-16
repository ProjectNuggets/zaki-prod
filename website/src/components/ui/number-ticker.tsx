import { useEffect, useRef, useState } from "react";
import { cn } from "./utils";

interface NumberTickerProps {
  value: number;
  delay?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function NumberTicker({
  value,
  delay = 0,
  className,
  prefix = "",
  suffix = "",
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("0");
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !hasStarted) {
          setTimeout(() => {
            setHasStarted(true);
            const duration = 1600;
            const start = performance.now();
            const tick = (now: number) => {
              const elapsed = now - start;
              const progress = Math.min(elapsed / duration, 1);
              // ease out cubic
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = Math.round(eased * value);
              setDisplay(Intl.NumberFormat("en-US").format(current));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }, delay * 1000);
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, delay, hasStarted]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}{display}{suffix}
    </span>
  );
}

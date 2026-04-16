import { useEffect, useRef, useState } from "react";
import { cn } from "./utils";

interface LampEffectProps {
  className?: string;
  children: React.ReactNode;
}

export function LampEffect({ className, children }: LampEffectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden",
        className,
      )}
    >
      {/* Lamp beam */}
      <div className="relative flex w-full flex-1 items-center justify-center">
        <div
          className="absolute top-0 h-48 -translate-y-1/2 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: visible ? "20rem" : "8rem",
            opacity: visible ? 1 : 0.4,
            backgroundImage:
              "conic-gradient(from 90deg at 50% 100%, var(--zk-accent) 0deg, transparent 60deg, transparent 300deg, var(--zk-accent) 360deg)",
          }}
        />
        <div
          className="absolute top-0 h-48 -translate-y-1/2 blur-3xl transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: visible ? "28rem" : "12rem",
            opacity: visible ? 1 : 0.4,
            backgroundColor: "rgba(241, 2, 2, 0.2)",
          }}
        />
        {/* Mask gradient */}
        <div className="absolute inset-0 bg-zk-bg [mask-image:radial-gradient(ellipse_at_top_center,transparent_20%,black)]" />
      </div>

      {/* Content */}
      <div
        className="relative z-10 -mt-32 flex flex-col items-center transition-all duration-600 ease-out"
        style={{
          transitionDelay: "500ms",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

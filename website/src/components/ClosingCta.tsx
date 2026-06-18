import type { Locale } from "../lib/content";
import { appHandoffUrl } from "../lib/appHandoff";
import { ShimmerButton } from "./ui/shimmer-button";
import { useEffect, useRef, useState } from "react";

export function ClosingCta({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
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
    <section className="px-5 md:px-8">
      <div
        ref={ref}
        className="relative mx-auto flex min-h-[480px] max-w-5xl flex-col items-center justify-center overflow-hidden py-24"
      >
        {/* Logo with glow */}
        <div
          className="relative mb-10 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.8)",
          }}
        >
          {/* Glow behind logo */}
          <div
            className="absolute inset-0 rounded-full blur-[40px] transition-all duration-[800ms]"
            style={{
              background: "radial-gradient(circle, var(--zk-accent-muted) 0%, var(--zk-accent-glow) 60%, transparent 80%)",
              opacity: visible ? 1 : 0,
            }}
          />
          <img
            src="/assets/zaki-logo.png"
            alt="ZAKI"
            className="relative size-20 rounded-2xl md:size-24"
          />
        </div>

        {/* Headline */}
        <h2
          className="font-display text-center text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:text-5xl"
          style={{
            transitionDelay: "300ms",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
          }}
        >
          {isArabic ? (
            <>
              وكيلك.
              <br />
              ذاكرتك.
              <br />
              <span className="text-zk-accent">قواعدك.</span>
            </>
          ) : (
            <>
              Your agent.
              <br />
              Your memory.
              <br />
              <span className="text-zk-accent">Your rules.</span>
            </>
          )}
        </h2>

        {/* CTA */}
        <div
          className="mt-8 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transitionDelay: "500ms",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <a href={appHandoffUrl("/agent", "website_home_cta", "agent")}>
            <ShimmerButton>
              {isArabic ? "قابل وكيلك" : "Meet your agent"}
            </ShimmerButton>
          </a>
        </div>

        {/* Ambient red glow — centered behind content */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 -z-10 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-[1000ms]"
          style={{
            width: "clamp(300px, 50vw, 600px)",
            height: "clamp(200px, 30vw, 400px)",
            background: "radial-gradient(ellipse 70% 60% at 50% 50%, var(--zk-accent-glow), transparent)",
            filter: "blur(40px)",
            opacity: visible ? 1 : 0,
          }}
        />
      </div>
    </section>
  );
}

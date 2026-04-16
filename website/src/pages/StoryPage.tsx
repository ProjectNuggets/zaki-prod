import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "../components/layout/SiteShell";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Reveal } from "../components/Reveal";
import { ClosingCta } from "../components/ClosingCta";
import { content } from "../components/landingContent";
import type { Locale } from "../lib/content";

/* ─── pill color map ─── */
const pillColors: Record<string, string> = {
  Origin: "bg-zk-accent/10 text-zk-accent",
  Gap: "bg-amber-500/10 text-amber-400",
  Launch: "bg-emerald-500/10 text-emerald-400",
  Learn: "bg-sky-500/10 text-sky-400",
  Focus: "bg-violet-500/10 text-violet-400",
  Vision: "bg-rose-500/10 text-rose-400",
  "الأصل": "bg-zk-accent/10 text-zk-accent",
  "الفجوة": "bg-amber-500/10 text-amber-400",
  "الانطلاق": "bg-emerald-500/10 text-emerald-400",
  "يتعلّم": "bg-sky-500/10 text-sky-400",
  "التركيز": "bg-violet-500/10 text-violet-400",
  "الرؤية": "bg-rose-500/10 text-rose-400",
};

/* ─── tag color map for newsroom ─── */
const tagColors: Record<string, string> = {
  launch: "bg-emerald-500/10 text-emerald-400",
  milestone: "bg-sky-500/10 text-sky-400",
  ecosystem: "bg-violet-500/10 text-violet-400",
  next: "bg-amber-500/10 text-amber-400",
};

export function StoryPage({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const t = content[locale];
  const { why, horizontal, updatesCarousel, cta } = t;
  const scrollSectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [gsapReady, setGsapReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let rafId: number | null = null;
    let cleanup: (() => void) | undefined;
    let removeImageListeners: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let refreshScroll = () => {};

    async function initStoryScroll() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      setGsapReady(true);

      const ctx = gsap.context(() => {
        const track = trackRef.current;
        const section = scrollSectionRef.current;
        if (!track || !section) return;

        refreshScroll = () => ScrollTrigger.refresh();

        const setupScroll = () => {
          ScrollTrigger.getAll().forEach((trigger) => {
            if (trigger.trigger === section) {
              trigger.kill();
            }
          });

          const totalScroll = Math.max(0, track.scrollWidth - section.offsetWidth);
          if (totalScroll <= 0) {
            gsap.set(track, { x: 0 });
            return;
          }

          const startX = isArabic ? -totalScroll : 0;
          const endX = isArabic ? 0 : -totalScroll;

          gsap.set(track, { x: startX });
          gsap.to(track, {
            x: endX,
            ease: "none",
            overwrite: "auto",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: `+=${totalScroll}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          });

          refreshScroll();
        };

        rafId = window.requestAnimationFrame(setupScroll);

        const images = Array.from(track.querySelectorAll("img")) as HTMLImageElement[];
        const handleImageReady = () => {
          setupScroll();
        };
        images.forEach((image) => {
          image.addEventListener("load", handleImageReady);
        });
        removeImageListeners = () => {
          images.forEach((image) => {
            image.removeEventListener("load", handleImageReady);
          });
        };

        if ("ResizeObserver" in window) {
          resizeObserver = new ResizeObserver(() => {
            setupScroll();
          });
          resizeObserver.observe(section);
          resizeObserver.observe(track);
        }
        window.addEventListener("resize", refreshScroll);
      }, scrollSectionRef);

      cleanup = () => {
        resizeObserver?.disconnect();
        window.removeEventListener("resize", refreshScroll);
        removeImageListeners?.();
        ctx.revert();
      };
    }

    void initStoryScroll();

    return () => {
      cancelled = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      cleanup?.();
      setGsapReady(false);
    };
  }, [isArabic]);

  return (
    <SiteShell locale={locale} route="story">
      {/* ══════ MANIFESTO HERO ══════ */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 md:px-8 md:pb-28 md:pt-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "url(/assets/newsroom-pattern.svg)", backgroundSize: "400px" }}
        />
        <div className="relative mx-auto max-w-[1240px]">
          <Reveal>
            <div className="flex items-center gap-3">
              <img src="/assets/zaki-logo-secondary.png" alt="" className="size-10 rounded-[10px]" />
              <Badge tone="chat">{isArabic ? "لماذا زكي" : "Why ZAKI"}</Badge>
            </div>
          </Reveal>
          <Reveal delay={40}>
            <h1 className="font-display mt-8 max-w-[18ch] text-[40px] font-extrabold leading-[0.94] tracking-[-0.06em] text-zk-text md:text-[72px]">
              {why.heading}
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="font-display mt-5 max-w-[22ch] text-[22px] font-bold leading-tight tracking-[-0.03em] text-zk-accent md:text-[32px]">
              {why.subheading}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-8 max-w-[62ch] text-base leading-8 text-zk-text-secondary md:text-lg md:leading-9">
              {why.intro}
            </p>
          </Reveal>
          <Reveal delay={160}>
            <p className="font-display mt-6 text-[20px] font-extrabold tracking-[-0.02em] text-zk-text md:text-[24px]">
              {why.builtLine}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-10 grid max-w-[820px] gap-3 sm:grid-cols-2">
              {why.points.map((point: string) => (
                <div
                  key={point}
                  className="rounded-[18px] border border-zk-border-strong bg-zk-surface px-5 py-4 text-sm leading-7 text-zk-text backdrop-blur-sm"
                >
                  {point}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ GSAP HORIZONTAL SCROLL -- "Zaki gets you" ══════ */}
      <div
        ref={scrollSectionRef}
        className={`story-horizontal-section relative z-10${gsapReady ? " gsap-ready" : ""}`}
        style={{ background: "var(--zk-bg)" }}
      >
        {/* Section header */}
        <div className="story-horizontal-header px-4 pb-4 pt-10 md:px-8 md:pt-14">
          <div className="mx-auto max-w-[1240px]">
            <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-zk-accent">
              {horizontal.subheading}
            </p>
            <h2 className="font-display mt-3 text-[32px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[48px]">
              {horizontal.heading}
            </h2>
          </div>
        </div>

        {/* Scrollable track */}
        <div
          ref={trackRef}
          className="story-horizontal-track flex items-center gap-6 px-8 md:gap-10 md:px-16"
        >
          {horizontal.cards.map(
            (card: { pill: string; title: string; description: string }, i: number) => (
              <div
                key={card.pill}
                className="flex w-[340px] shrink-0 flex-col rounded-[28px] border border-zk-border bg-zk-bg-raised p-7 shadow-[0_24px_60px_rgba(0,0,0,0.5)] md:w-[420px] md:p-9"
              >
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    pillColors[card.pill] ?? "bg-zk-surface text-zk-text-secondary"
                  }`}
                >
                  {card.pill}
                </span>
                <h3 className="font-display mt-5 text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-[26px]">
                  {card.title}
                </h3>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zk-text-secondary">
                  {card.description}
                </p>
                {i < 6 && (
                  <img
                    src={`/slides/${i + 1}.png`}
                    alt=""
                    className="mt-6 w-full rounded-[14px] border border-zk-border opacity-60"
                    loading="lazy"
                  />
                )}
              </div>
            )
          )}
          <div className="w-[20vw] shrink-0" />
        </div>
      </div>

      {/* ══════ NEWSROOM / BUILDING IN PUBLIC ══════ */}
      <section
        className="relative z-10 px-4 py-16 md:px-8 md:py-24"
        style={{
          backgroundImage: "url(/assets/newsroom-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <Badge tone="chat">{updatesCarousel.batchLabel}</Badge>
            <h2 className="font-display mt-6 text-[28px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[44px]">
              {updatesCarousel.heading}
            </h2>
            <p className="mt-3 max-w-[52ch] text-sm leading-7 text-zk-text-secondary md:text-base">
              {updatesCarousel.subheading}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {updatesCarousel.slides.map(
              (
                slide: {
                  id: string;
                  tag: string;
                  title: string;
                  description: string;
                  dateLabel: string;
                  emoji: string;
                  status: string;
                  link?: { label: string; url: string };
                },
                i: number
              ) => (
                <Reveal key={slide.id} delay={i * 50}>
                  <Card className="flex h-full flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{slide.emoji}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                          tagColors[slide.tag] ?? "bg-zk-surface text-zk-text-tertiary"
                        }`}
                      >
                        {slide.tag}
                      </span>
                      <span
                        className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          slide.status === "done"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {slide.status === "done"
                          ? updatesCarousel.statusLabels.done
                          : updatesCarousel.statusLabels.next}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-bold leading-snug text-zk-text">
                      {slide.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-6 text-zk-text-secondary">
                      {slide.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-zk-text-secondary">
                        {slide.dateLabel}
                      </span>
                      {slide.link && (
                        <a
                          href={slide.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-zk-accent transition-colors hover:text-zk-accent-hover"
                        >
                          {slide.link.label}
                          <ArrowUpRight className="size-3" />
                        </a>
                      )}
                    </div>
                  </Card>
                </Reveal>
              )
            )}
          </div>
        </div>
      </section>

      <ClosingCta locale={locale} />

      {/* ══════ Comparison links (SEO bridges) ══════ */}
      <section className="relative z-10 border-t border-zk-border-strong px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-secondary">
              {isArabic ? "قراءات إضافية" : "Read more"}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={isArabic ? "/ar/autism-guidance/" : "/autism-guidance/"}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                {isArabic ? "دليل التوحّد مع زكي" : "Autism guidance with ZAKI"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/zaki-vs-spaces/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                {isArabic ? "زكي مقابل Spaces" : "ZAKI vs Spaces"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/how-to/how-zaki-and-spaces-work/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                {isArabic ? "كيف يعمل زكي وSpaces" : "How ZAKI and Spaces work together"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/how-to/what-to-use-spaces-for/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                {isArabic ? "متى تستخدم Spaces" : "What to use Spaces for"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/how-to/what-to-use-zaki-for/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                {isArabic ? "متى تستخدم زكي" : "What to use ZAKI for"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/vs-chatgpt/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                {isArabic ? "Spaces مقابل ChatGPT" : "Spaces vs ChatGPT"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/zaki-vs-openclaw/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                {isArabic ? "زكي مقابل OpenClaw" : "ZAKI vs OpenClaw"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/best-arabic-ai-assistant/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                {isArabic ? "أفضل مساعد ذكي عربي" : "Best Arabic AI Assistant 2026"}
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

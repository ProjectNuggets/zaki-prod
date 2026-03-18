import { useEffect, useRef } from "react";
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
  Origin: "bg-chat-accent/10 text-chat-accent",
  Gap: "bg-amber-100 text-amber-700",
  Launch: "bg-emerald-100 text-emerald-700",
  Learn: "bg-sky-100 text-sky-700",
  Focus: "bg-violet-100 text-violet-700",
  Vision: "bg-rose-100 text-rose-700",
  "الأصل": "bg-chat-accent/10 text-chat-accent",
  "الفجوة": "bg-amber-100 text-amber-700",
  "الانطلاق": "bg-emerald-100 text-emerald-700",
  "يتعلّم": "bg-sky-100 text-sky-700",
  "التركيز": "bg-violet-100 text-violet-700",
  "الرؤية": "bg-rose-100 text-rose-700",
};

/* ─── tag color map for newsroom ─── */
const tagColors: Record<string, string> = {
  launch: "bg-emerald-100 text-emerald-700",
  milestone: "bg-sky-100 text-sky-700",
  ecosystem: "bg-violet-100 text-violet-700",
  next: "bg-amber-100 text-amber-700",
};

export function StoryPage({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const t = content[locale];
  const { why, horizontal, updatesCarousel, cta } = t;
  const scrollSectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

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
            <h1 className="font-display mt-8 max-w-[18ch] text-[40px] font-extrabold leading-[0.94] tracking-[-0.06em] text-chat-text md:text-[72px]">
              {why.heading}
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="font-display mt-5 max-w-[22ch] text-[22px] font-bold leading-tight tracking-[-0.03em] text-chat-accent md:text-[32px]">
              {why.subheading}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-8 max-w-[62ch] text-base leading-8 text-chat-muted md:text-lg md:leading-9">
              {why.intro}
            </p>
          </Reveal>
          <Reveal delay={160}>
            <p className="font-display mt-6 text-[20px] font-extrabold tracking-[-0.02em] text-chat-text md:text-[24px]">
              {why.builtLine}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-10 grid max-w-[820px] gap-3 sm:grid-cols-2">
              {why.points.map((point: string) => (
                <div
                  key={point}
                  className="rounded-[18px] border border-line-strong bg-white/60 px-5 py-4 text-sm leading-7 text-chat-text backdrop-blur-sm"
                >
                  {point}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══════ GSAP HORIZONTAL SCROLL — "Zaki gets you" ══════ */}
      <div
        ref={scrollSectionRef}
        className="relative z-10 h-screen overflow-hidden"
        style={{ background: "#0a0a0a" }}
      >
        {/* Section header */}
        <div className="absolute inset-x-0 top-0 z-10 px-4 pb-4 pt-10 md:px-8 md:pt-14">
          <div className="mx-auto max-w-[1240px]">
            <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-[#ff4d2e]">
              {horizontal.subheading}
            </p>
            <h2 className="font-display mt-3 text-[32px] font-extrabold tracking-[-0.04em] text-white md:text-[48px]">
              {horizontal.heading}
            </h2>
          </div>
        </div>

        {/* Scrollable track */}
        <div
          ref={trackRef}
          className="absolute bottom-0 left-0 top-28 flex items-center gap-6 px-8 md:top-32 md:gap-10 md:px-16"
          style={{ width: "max-content" }}
        >
          {horizontal.cards.map(
            (card: { pill: string; title: string; description: string }, i: number) => (
              <div
                key={card.pill}
                className="flex w-[340px] shrink-0 flex-col rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[#141414] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.5)] md:w-[420px] md:p-9"
              >
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    pillColors[card.pill] ?? "bg-white/10 text-white/60"
                  }`}
                >
                  {card.pill}
                </span>
                <h3 className="font-display mt-5 text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-white md:text-[26px]">
                  {card.title}
                </h3>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#9a9a9a]">
                  {card.description}
                </p>
                {i < 6 && (
                  <img
                    src={`/slides/${i + 1}.png`}
                    alt=""
                    className="mt-6 w-full rounded-[14px] border border-white/5 opacity-60"
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
            <h2 className="font-display mt-6 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[44px]">
              {updatesCarousel.heading}
            </h2>
            <p className="mt-3 max-w-[52ch] text-sm leading-7 text-chat-muted md:text-base">
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
                          tagColors[slide.tag] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {slide.tag}
                      </span>
                      <span
                        className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          slide.status === "done"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {slide.status === "done"
                          ? updatesCarousel.statusLabels.done
                          : updatesCarousel.statusLabels.next}
                      </span>
                    </div>
                    <h3 className="mt-4 text-sm font-bold leading-snug text-chat-text">
                      {slide.title}
                    </h3>
                    <p className="mt-2 text-[13px] leading-6 text-chat-muted">
                      {slide.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-chat-muted">
                        {slide.dateLabel}
                      </span>
                      {slide.link && (
                        <a
                          href={slide.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-chat-accent transition-colors hover:text-chat-accent-hover"
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

      <ClosingCta locale={locale} t={t} source="website_story" />

      {/* ══════ Comparison links (SEO bridges) ══════ */}
      <section className="relative z-10 border-t border-line-strong px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-chat-muted">
              {isArabic ? "قراءات إضافية" : "Read more"}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/zaki-vs-spaces/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/80 px-4 text-sm font-medium text-chat-text transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
              >
                {isArabic ? "زكي مقابل Spaces" : "ZAKI vs Spaces"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/how-to/how-zaki-and-spaces-work/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/80 px-4 text-sm font-medium text-chat-text transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
              >
                {isArabic ? "كيف يعمل زكي وSpaces" : "How ZAKI and Spaces work together"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/how-to/what-to-use-spaces-for/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/80 px-4 text-sm font-medium text-chat-text transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
              >
                {isArabic ? "متى تستخدم Spaces" : "What to use Spaces for"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/how-to/what-to-use-zaki-for/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/80 px-4 text-sm font-medium text-chat-text transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
              >
                {isArabic ? "متى تستخدم زكي" : "What to use ZAKI for"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/vs-chatgpt/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/80 px-4 text-sm font-medium text-chat-text transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
              >
                {isArabic ? "Spaces مقابل ChatGPT" : "Spaces vs ChatGPT"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/zaki-vs-openclaw/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/80 px-4 text-sm font-medium text-chat-text transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
              >
                {isArabic ? "زكي مقابل OpenClaw" : "ZAKI vs OpenClaw"}
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                to="/best-arabic-ai-assistant/"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-white/80 px-4 text-sm font-medium text-chat-text transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
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

import { ArrowRight } from "lucide-react";
import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";
import { TextGenerate } from "./ui/text-generate";
import { ShimmerButton } from "./ui/shimmer-button";
import { SafariMockup } from "./ui/safari-mockup";

export function Hero({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const tryHref = `https://app.chatzaki.com/?auth=signup&source=website_home_hero`;

  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-[10vh] md:px-8 md:pb-32 md:pt-[14vh]">
      <div className="mx-auto max-w-5xl text-center">
        {/* Badge */}
        <Reveal variant="fade">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface/50 px-4 py-1.5 text-xs font-medium text-zk-text-secondary backdrop-blur-sm">
            <span className="inline-block size-1.5 rounded-full bg-zk-accent animate-pulse" />
            {isArabic ? "ابدأ مجانًا · أول موظف رقمي لك" : "Start for free · Your first digital employee"}
          </div>
        </Reveal>

        {/* Headline */}
        <h1 className="font-display mx-auto max-w-[16ch] text-[clamp(2.5rem,8vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-zk-text">
          {isArabic ? (
            <Reveal>
              <span>ذكاء اصطناعي</span>
              <br />
              <span className="text-zk-accent">يبقى معك.</span>
            </Reveal>
          ) : (
            <TextGenerate words="AI that stays with you." delay={0.15} />
          )}
        </h1>

        {/* Subheadline */}
        <Reveal delay={200}>
          <p className="mx-auto mt-6 max-w-[52ch] text-base leading-7 text-zk-text-secondary md:text-lg md:leading-8">
            {isArabic
              ? "زكي هو وكيل ذكاء اصطناعي شخصي بذاكرة مستمرة، خزنة مشفّرة، وأتمتة تعمل وأنت نائم. ليس شات بوت. وكيل يعمل من أجلك."
              : "A personal AI agent with persistent memory, encrypted secrets, and automation that runs while you sleep. Not a chatbot. An agent that works for you."}
          </p>
        </Reveal>

        {/* CTAs */}
        <Reveal delay={350}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a href={tryHref}>
              <ShimmerButton>
                {isArabic ? "قابل وكيلك" : "Meet your agent"}
              </ShimmerButton>
            </a>
            <a
              href={isArabic ? "/ar/story/" : "/story/"}
              className="inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-zk-text-secondary transition-colors hover:text-zk-text"
            >
              {isArabic ? "كيف يعمل" : "See how it works"}
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </Reveal>

        {/* Product screenshot */}
        <Reveal delay={500} variant="scale">
          <div className="relative mx-auto mt-14 max-w-4xl">
            {/* Red glow behind mockup */}
            <div className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 h-64 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,var(--zk-accent-glow),transparent)] blur-3xl" />
            <SafariMockup
              src="/slides/1.png"
              url="app.chatzaki.com"
              alt="ZAKI AI agent interface"
              className="shadow-2xl shadow-black/40 ring-1 ring-zk-border"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

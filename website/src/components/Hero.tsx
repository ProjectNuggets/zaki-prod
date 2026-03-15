import { ArrowUpRight } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Reveal } from "./Reveal";
import { HeroParallaxImage } from "./HeroParallaxImage";

export function Hero({
  locale,
  t,
}: {
  locale: Locale;
  t: WebsiteContent;
}) {
  const isArabic = locale === "ar";
  const botHref = isArabic ? "/ar/zaki-bot/#waitlist" : "/zaki-bot/#waitlist";

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-[8vh] md:px-8 md:pb-24 md:pt-[10vh]">
      <div className="mx-auto grid max-w-[1240px] gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] md:items-start md:gap-12">
        {/* Left — Copy */}
        <Reveal className="relative z-10">
          <div className="mb-4 flex items-center gap-3">
            <img src="/assets/zaki-logo.png" alt="ZAKI" className="size-10 rounded-[10px]" />
            <Badge tone="chat" pulse>
              {isArabic ? "البيتا مفتوحة — 5 رسائل يوميًا مجانًا" : "Beta open — 5 msgs/day free"}
            </Badge>
          </div>

          <h1 className="font-display mt-6 max-w-[18ch] text-[36px] font-extrabold leading-[0.95] tracking-[-0.06em] text-chat-text md:text-[68px]">
            {isArabic
              ? <>معظم الذكاء<br />الاصطناعي ينساك.<br className="hidden md:block" />زكي يتذكرك.</>
              : <>Most AI<br />forgets you.<br className="hidden md:block" />ZAKI remembers.</>
            }
          </h1>

          <p className="mt-6 max-w-[52ch] whitespace-pre-line text-sm leading-7 text-chat-muted md:text-base md:leading-8">
            {isArabic
              ? "ZAKI Chat مساحة عمل لتفكيرك اليومي المنظّم — متاحة الآن!\nزكي هو الخطوة التجريبية التالية: مشغّل ذكاء شخصي بذاكرة مستمرة، ومراحل عمل مرئية."
              : "ZAKI Chat is a workspace for organized daily thinking, live now!\nZAKI is the experimental next step: a personal AI operator to close the last mile between Humans and LLMs."}
          </p>

          <div className="mt-7 flex items-center gap-5">
            <Button asChild>
              <a href={botHref}>
                {isArabic ? "انضم إلى البيتا" : "Join the Beta"}
              </a>
            </Button>
            <a href={isArabic ? "/ar/zaki-bot/" : "/zaki-bot/"} className="inline-flex items-center gap-2 text-sm font-medium text-chat-text transition-colors hover:text-chat-accent">
              {isArabic ? "ما هو زكي؟" : "What is ZAKI?"}
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </Reveal>

        {/* Right — Product screenshot */}
        <Reveal className="relative w-full max-w-[420px] md:w-[360px] md:justify-self-end md:self-start md:mt-1" delay={120}>
          <div className="pointer-events-none absolute inset-x-6 top-4 h-20 rounded-full bg-[radial-gradient(circle,rgba(255,77,46,0.10),transparent_68%)] blur-2xl" />
          <HeroParallaxImage />
        </Reveal>
      </div>
    </section>
  );
}

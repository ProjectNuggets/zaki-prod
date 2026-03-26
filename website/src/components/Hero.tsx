import { ArrowUpLeft, ArrowUpRight } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Reveal } from "./Reveal";
import { HeroParallaxImage } from "./HeroParallaxImage";
import { RotatingPhrase } from "./RotatingPhrase";

const ASK_AI_PROMPT = [
  "Give me a concise, factual overview of ZAKI and Spaces using their public website.",
  "",
  "Explain:",
  "1. What ZAKI is",
  "2. What Spaces are",
  "3. How ZAKI and Spaces differ",
  "4. How they work together",
  "5. How ZAKI compares to OpenClaw where publicly documented",
  "",
  "Use these pages as the primary references:",
  "https://www.chatzaki.com/",
  "https://www.chatzaki.com/zaki-vs-spaces/",
  "https://www.chatzaki.com/how-to/how-zaki-and-spaces-work/",
  "https://www.chatzaki.com/zaki-bot/",
  "https://www.chatzaki.com/zaki-vs-openclaw/",
  "",
  "Keep the answer structured, concise, and note any uncertainty.",
].join("\n");

export function Hero({
  locale,
  t,
}: {
  locale: Locale;
  t: WebsiteContent;
}) {
  const isArabic = locale === "ar";
  const tryZakiHref = `https://app.chatzaki.com/?auth=login&source=${
    isArabic ? "website_home_hero_ar" : "website_home_hero"
  }`;
  const askAiHref = `https://chatgpt.com/?q=${encodeURIComponent(ASK_AI_PROMPT)}`;
  const rotatingPhrases = isArabic
    ? ["يتذكرك", "يتابعك", "يبقى معك"]
    : ["remembers.", "follows through.", "stays useful."];
  const LinkArrow = isArabic ? ArrowUpLeft : ArrowUpRight;

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-[8vh] md:px-8 md:pb-24 md:pt-[10vh]">
      <div className="mx-auto grid max-w-[1240px] gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] md:items-start md:gap-12">
        {/* Left — Copy */}
        <Reveal className="relative z-10">
          <div className="mb-4 flex items-center gap-3">
            <img src="/assets/zaki-logo.png" alt="ZAKI" className="size-10 rounded-[10px]" />
            <Badge tone="chat" pulse>
              {isArabic ? "رسائل مجانية يومية في البيتا المفتوحة" : "Daily free msgs in open BETA"}
            </Badge>
          </div>

          <h1 className="font-display mt-6 max-w-[18ch] text-[36px] font-extrabold leading-[0.95] tracking-[-0.06em] text-chat-text md:text-[68px]">
            {isArabic
              ? (
                <>
                  معظم الذكاء
                  <br />
                  الاصطناعي ينساك.
                  <br className="hidden md:block" />
                  زكي{" "}
                  <RotatingPhrase
                    phrases={rotatingPhrases}
                    className="text-chat-accent"
                  />
                </>
              ) : (
                <>
                  Most AI
                  <br />
                  forgets you.
                  <br className="hidden md:block" />
                  ZAKI{" "}
                  <RotatingPhrase
                    phrases={rotatingPhrases}
                    className="text-chat-accent"
                  />
                </>
              )
            }
          </h1>

          <p className="mt-6 max-w-[52ch] whitespace-pre-line text-sm leading-7 text-chat-muted md:text-base md:leading-8">
            {isArabic
              ? "Spaces هي مساحات العمل الذكية للإنتاجية اليومية المنظمة.\nوهي متاحة الآن. زكي هو البيتا العامة للخطوة التالية: ذكاء شخصي مستمر بذاكرة متصلة ومراحل عمل واضحة."
              : "Spaces are the structured AI workspaces for daily productivity, live now.\nZAKI is the public beta for what comes next: persistent personal intelligence with memory continuity and visible work phases."}
          </p>

          <div className="mt-7 flex items-center gap-5">
            <Button asChild>
              <a href={tryZakiHref}>
                {isArabic ? "جرّب زكي" : "Try ZAKI"}
              </a>
            </Button>
            <a href={isArabic ? "/ar/zaki-bot/" : "/zaki-bot/"} className="inline-flex items-center gap-2 text-sm font-medium text-chat-text transition-colors hover:text-chat-accent">
              {isArabic ? "ما هو زكي؟" : "What is ZAKI?"}
              <LinkArrow className="size-4" />
            </a>
            <a
              href={askAiHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-chat-text transition-colors hover:text-chat-accent"
            >
              {isArabic ? "اسأل" : "Ask"}
              <span className="inline-flex h-5 min-w-8 items-center justify-center rounded-full border border-line-strong bg-white px-2 text-[10px] font-semibold text-chat-muted">
                GPT
              </span>
              <LinkArrow className="size-4" />
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

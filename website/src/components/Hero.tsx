import { ArrowUpLeft, ArrowUpRight } from "lucide-react";
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
  const tryZakiHref = `https://app.chatzaki.com/?auth=signup&source=${
    isArabic ? "website_home_hero_ar" : "website_home_hero"
  }`;
  const LinkArrow = isArabic ? ArrowUpLeft : ArrowUpRight;

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-[8vh] md:px-8 md:pb-24 md:pt-[10vh]">
      <div className="mx-auto grid max-w-[1240px] gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] md:items-start md:gap-12">
        {/* Left — Copy */}
        <Reveal className="relative z-10">
          <div className="mb-4 flex items-center gap-3">
            <img src="/assets/zaki-logo.png" alt="ZAKI" className="size-10 rounded-[10px]" />
            <Badge tone="chat" pulse>
              {isArabic ? "5 رسائل مجانية يوميًا في البيتا العامة" : "5 free messages/day in public beta"}
            </Badge>
          </div>

          <h1 className="font-display mt-6 max-w-[18ch] text-[36px] font-extrabold leading-[0.95] tracking-[-0.06em] text-chat-text md:text-[68px]">
            {isArabic
              ? (
                <>
                  معظم الذكاء
                  <br />
                  الاصطناعي ينساك.
                  <br />
                  <span className="text-chat-accent">زكي لا يفعل.</span>
                </>
              ) : (
                <>
                  Most AI
                  <br />
                  forgets you.
                  <br />
                  <span className="text-chat-accent">ZAKI doesn't.</span>
                </>
              )
            }
          </h1>

          <p className="mt-6 max-w-[52ch] whitespace-pre-line text-sm leading-7 text-chat-muted md:text-base md:leading-8">
            {isArabic
              ? "زكي هو ذكاء مستمر بذاكرة واستمرارية. يحتفظ بالخيط معك بدل أن يبدأ من الصفر كل جلسة.\nاستخدم Spaces عندما يحتاج العمل إلى تعليماته الخاصة وملفاته وسياقه النظيف."
              : "ZAKI is persistent AI with memory and continuity. It keeps the thread with you instead of starting over every session.\nUse Spaces when the work needs its own instructions, documents, and clean context."}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button asChild>
              <a href={tryZakiHref}>
                {isArabic ? "جرّب زكي مجانًا" : "Try ZAKI free"}
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href="/zaki-vs-spaces/">
                {isArabic ? "تعرّف على الفرق" : "See ZAKI vs Spaces"}
              </a>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-chat-muted">
            <span>{isArabic ? "زكي: 5 رسائل مجانية يوميًا" : "ZAKI: 5 free messages per day"}</span>
            <span className="hidden size-1 rounded-full bg-chat-muted/40 md:inline-flex" />
            <a href="https://app.chatzaki.com/pricing?auth=signup&plan=personal&interval=monthly&source=website_home_hero_spaces" className="inline-flex items-center gap-2 font-medium text-chat-text transition-colors hover:text-chat-accent">
              {isArabic ? "ابدأ بـ Spaces مقابل 13 دولارًا/شهر" : "Start with Spaces for $13/month"}
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

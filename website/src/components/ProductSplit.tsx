import type { Locale, WebsiteContent } from "../lib/content";
import { Button } from "./ui/button";
import { Reveal } from "./Reveal";

export function ProductSplit({ locale, t }: { locale: Locale; t: WebsiteContent }) {
  const isArabic = locale === "ar";

  return (
    <section className="px-4 py-14 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="mb-10 max-w-[48ch]">
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.28em] text-chat-accent">
              {isArabic ? "كيف يعمل زكي" : "How ZAKI works"}
            </p>
            <h2 className="font-display mt-4 text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] text-chat-text md:text-[44px]">
              {isArabic
                ? "مساران. اتجاه واحد."
                : "Two paths. One direction."}
            </h2>
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {/* ZAKI Chat */}
          <Reveal>
            <div className="flex h-full flex-col rounded-card border border-line-strong bg-chat-surface p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] md:p-9">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-muted">
                {isArabic ? "يعمل الآن" : "Live now"}
              </p>
              <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[36px]">
                ZAKI Chat
              </h3>
              <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.8] text-chat-muted">
                {isArabic
                  ? "مساحة عمل ذكاء اصطناعي منظّمة يمكنك استخدامها الآن. تسأل، يُجيب — لكن كل محادثة تعيش في مساحتها الخاصة. المشاريع منفصلة. السياق نظيف. مبني لطريقة عملك الفعلية."
                  : "A structured AI workspace you can use right now. You ask, it answers. yet every conversation lives in its own space. Projects stay separated. Context stays clean. Built for the way daily work actually happens."}
              </p>
              <div className="mt-auto flex items-baseline justify-between pt-8">
                <p className="font-display text-[32px] font-extrabold tracking-[-0.04em] text-chat-text">
                  $13<span className="ms-1 font-mono-ui text-[11px] font-normal uppercase tracking-[0.16em] text-chat-muted">{isArabic ? "/شهر" : "/mo"}</span>
                </p>
                <Button asChild variant="secondary" className="text-[13px]">
                  <a href="https://app.chatzaki.com/pricing?auth=signup&plan=personal&interval=monthly&source=website_product_split">
                    {isArabic ? "ابدأ الآن" : "Start now"}
                  </a>
                </Button>
              </div>
            </div>
          </Reveal>

          {/* ZAKI */}
          <Reveal delay={80}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-card border border-chat-accent/15 bg-chat-surface p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] md:p-9">
              {/* Subtle top glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-chat-accent/[0.03] to-transparent" />
              <div className="relative flex h-full flex-col">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-accent">
                  {isArabic ? "تجريبي — مجاني" : "Experimental — free"}
                </p>
                <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[36px]">
                  ZAKI
                </h3>
              <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.8] text-chat-muted">
                {isArabic
                   ? "معظم الذكاء الاصطناعي يُعيد الضبط لحظة تُغلق التبويب. زكي يختبر ماذا يحدث عندما لا يفعل ذلك — ذاكرة مستمرة، مراحل عمل مرئية، وسياق يمتد عبر الجلسات. مبكر، محدود، وهو الاتجاه الذي نبنيه."
                   : "Most AI resets the moment you close the tab. ZAKI explores what happens when it doesn't: persistent memory, visible work phases, and context that carries across sessions. Early, limited, and the direction we're building toward."}
              </p>
                <div className="mt-auto flex items-baseline justify-between pt-8">
                  <p className="font-display text-[32px] font-extrabold tracking-[-0.04em] text-chat-accent">
                    {isArabic ? "مجاني" : "Free"}
                  </p>
                  <Button asChild className="text-[13px]">
                    <a href={isArabic ? "/ar/zaki-bot/#waitlist" : "/zaki-bot/#waitlist"}>
                      {isArabic ? "جرّب الآن" : "Try it now"}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

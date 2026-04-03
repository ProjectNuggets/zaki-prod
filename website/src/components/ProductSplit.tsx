import type { Locale, WebsiteContent } from "../lib/content";
import { Button } from "./ui/button";
import { Reveal } from "./Reveal";

export function ProductSplit({ locale, t }: { locale: Locale; t: WebsiteContent }) {
  const isArabic = locale === "ar";
  const quickMap = isArabic
    ? [
        {
          label: "ZAKI",
          body: "ذكاء مستمر بذاكرة واستمرارية عندما تريد AI يتذكرك.",
        },
        {
          label: "Spaces",
          body: "مساحات عمل منظّمة. كل مساحة يمكن أن تحمل تعليماتها وملفاتها الخاصة.",
        },
        {
          label: "معًا",
          body: "ابدأ مع زكي عندما يكون التفكير ما زال مفتوحًا، ثم انتقل إلى Spaces عندما يبدأ التنفيذ.",
        },
      ]
    : [
        {
          label: "ZAKI",
          body: "Persistent AI with memory and continuity when you want AI that remembers you.",
        },
        {
          label: "Spaces",
          body: "Structured workspaces. Each Space can carry its own instructions and documents.",
        },
        {
          label: "Together",
          body: "Start with ZAKI while the thinking is still open, then move into Spaces when the work turns into execution.",
        },
      ];

  return (
    <section className="px-4 py-14 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="mb-10 max-w-[48ch]">
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.28em] text-chat-accent">
              {isArabic ? "زكي مقابل Spaces" : "ZAKI vs Spaces"}
            </p>
            <h2 className="font-display mt-4 text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] text-chat-text md:text-[44px]">
              {isArabic
                ? "Spaces للعمل المنظّم. وزكي للاستمرارية الشخصية."
                : "Spaces for structured work. ZAKI for personal continuity."}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-chat-muted">
              {isArabic
                ? "الفرق بسيط: استخدم زكي عندما تريد AI لا يبدأ من الصفر كل مرة. استخدم Spaces عندما يحتاج المشروع إلى تعليماته وملفاته وخيوطه داخل سياق واحد."
                : "The split is simple: use ZAKI when you want AI that does not reset every time. Use Spaces when a project needs its own instructions, documents, and threads inside one shared context."}
            </p>
          </div>
        </Reveal>

        <Reveal delay={40}>
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {quickMap.map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-line-strong bg-chat-bg/60 px-4 py-4 text-sm leading-7 text-chat-text"
              >
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.24em] text-chat-accent">
                  {item.label}
                </p>
                <p className="mt-2 text-[14px] leading-[1.7] text-chat-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Spaces */}
          <Reveal>
            <div className="flex h-full flex-col rounded-card border border-line-strong bg-chat-surface p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] md:p-9">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-muted">
                {isArabic ? "يعمل الآن" : "Live now"}
              </p>
              <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[36px]">
                Spaces
              </h3>
              <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.8] text-chat-muted">
                {isArabic
                  ? "مساحات عمل منظّمة يمكنك استخدامها الآن. كل مساحة يمكن أن تحمل تعليماتها وملفاتها الخاصة، والخيوط داخلها تشترك في ذلك السياق. هذا هو المنتج المدفوع المباشر، وقد يظهر في التطبيق باسم ZAKI Chat."
                  : "Structured AI workspaces you can use right now. Each Space can hold its own instructions and documents, and threads inside that Space share the same context. This is the live paid product, even if the app may still call it ZAKI Chat."}
              </p>
              <div className="mt-auto flex items-baseline justify-between pt-8">
                <p className="font-display text-[32px] font-extrabold tracking-[-0.04em] text-chat-text">
                  $13<span className="ms-1 font-mono-ui text-[11px] font-normal uppercase tracking-[0.16em] text-chat-muted">{isArabic ? "/شهر" : "/mo"}</span>
                </p>
                <Button asChild variant="secondary" className="text-[13px]">
                  <a href="https://app.chatzaki.com/pricing?auth=signup&plan=personal&interval=monthly&source=website_product_split">
                    {isArabic ? "ابدأ بـ Spaces" : "Start with Spaces"}
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
                  {isArabic ? "تجريبي مجاني" : "Experimental — free"}
                </p>
                <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[36px]">
                  ZAKI
                </h3>
              <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.8] text-chat-muted">
                {isArabic
                   ? "زكي هو طبقة الذكاء المستمر: ذاكرة واستمرارية وعلاقة لا تعود للصفر كل جلسة. استخدمه عندما تريد AI يتذكرك، ثم انتقل إلى Spaces عندما يحتاج العمل إلى تنفيذ منظّم."
                   : "ZAKI is the continuity layer: memory, recall, and a relationship that does not reset every session. Use it when you want AI that remembers you, then move into Spaces when the work needs structure."}
              </p>
                <div className="mt-auto flex items-baseline justify-between pt-8">
                  <div>
                    <p className="font-display text-[32px] font-extrabold tracking-[-0.04em] text-chat-accent">
                      {isArabic ? "5 مجانًا" : "5 free"}
                    </p>
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-chat-muted">
                      {isArabic ? "رسائل / يوم" : "msgs / day"}
                    </p>
                  </div>
                  <Button asChild className="text-[13px]">
                    <a href={isArabic ? "/ar/zaki-bot/#waitlist" : "/zaki-bot/#waitlist"}>
                      {isArabic ? "جرّب زكي" : "Try ZAKI"}
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

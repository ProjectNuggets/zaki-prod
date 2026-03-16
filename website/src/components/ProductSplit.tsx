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
              {isArabic ? "سلّم المنتج" : "Product ladder"}
            </p>
            <h2 className="font-display mt-4 text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] text-chat-text md:text-[44px]">
              {isArabic
                ? "منتج عملي الآن. وبيتا للذكاء المستمر تتشكل علنًا."
                : "A practical product now. A public beta for persistent intelligence taking shape in the open."}
            </h2>
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
                  ? "مساحات عمل ذكاء اصطناعي منظّمة يمكنك استخدامها الآن. المشاريع تبقى منفصلة، والسياق يبقى نظيفًا، والعمل اليومي لا يضيع داخل فوضى خيوط عامة. هذا هو ما قد يشير إليه التطبيق حاليًا باسم ZAKI Chat."
                  : "Structured AI workspaces you can use right now. Projects stay separated, context stays clean, and daily work does not dissolve into generic chat threads. This is the layer the current app may still call ZAKI Chat."}
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
                   ? "معظم الذكاء الاصطناعي يعيد الضبط مع كل جلسة. زكي يختبر ماذا يحدث عندما لا يفعل ذلك: استمرارية، وذاكرة، وعلاقة طويلة الخيط. وعندما يصبح العمل بحاجة إلى كتابة أو بحث أو تنفيذ منظّم، تنتقل إلى Spaces."
                   : "Most AI resets with every session. ZAKI explores what happens when it does not: continuity, memory, and a long-running relationship. When the work needs writing, research, or organized execution, you move into Spaces."}
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

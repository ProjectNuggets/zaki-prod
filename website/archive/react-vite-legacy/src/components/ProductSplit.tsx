import type { Locale, WebsiteContent } from "../lib/content";
import { appHandoffUrl } from "../lib/appHandoff";
import { Button } from "./ui/button";
import { Reveal } from "./Reveal";

export function ProductSplit({ locale, t }: { locale: Locale; t: WebsiteContent }) {
  const isArabic = locale === "ar";
  const quickMap = isArabic
    ? [
        {
          label: "ZAKI",
          body: "Agent للاستمرارية والذاكرة والمتابعة عندما يصبح العمل مهمًا.",
        },
        {
          label: "Chat",
          body: "دردشة مجانية وسريعة للمسودات والترجمة والبحث بدون ذاكرة دائمة.",
        },
        {
          label: "معًا",
          body: "ابدأ في Chat. انتقل إلى Agent عندما تحتاج أن يتذكر ZAKI ويتابع.",
        },
      ]
    : [
        {
          label: "ZAKI",
          body: "Agent for continuity, memory, and follow-through when the work matters.",
        },
        {
          label: "Chat",
          body: "Free, fast chat for drafts, translation, research, and planning without durable memory.",
        },
        {
          label: "Together",
          body: "Start in Chat. Move to Agent when ZAKI needs to remember and continue the work.",
        },
      ];

  return (
    <section className="px-4 py-14 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="mb-10 max-w-[48ch]">
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.28em] text-zk-accent">
              {isArabic ? "Agent مقابل Chat" : "Agent vs Chat"}
            </p>
            <h2 className="font-display mt-4 text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] text-zk-text md:text-[44px]">
              {isArabic
                ? "Chat للبدء. Agent للاستمرارية الشخصية."
                : "Chat to start. Agent for personal continuity."}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-zk-text-secondary">
              {isArabic
                ? "الفرق بسيط: استخدم Chat عندما تريد إنجازًا سريعًا بلا تسجيل. استخدم Agent عندما تريد ذاكرة ومتابعة وأدوات بإذن."
                : "The split is simple: use Chat when you need fast work without signing in. Use Agent when you need memory, follow-through, and permissioned tools."}
            </p>
          </div>
        </Reveal>

        <Reveal delay={40}>
          <div className="mb-6 grid gap-3 md:grid-cols-3">
            {quickMap.map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-zk-border-strong bg-zk-bg/60 px-4 py-4 text-sm leading-7 text-zk-text"
              >
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.24em] text-zk-accent">
                  {item.label}
                </p>
                <p className="mt-2 text-[14px] leading-[1.7] text-zk-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Chat */}
          <Reveal>
            <div className="flex h-full flex-col rounded-2xl border border-zk-border-strong bg-zk-surface p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] md:p-9">
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-zk-text-secondary">
                {isArabic ? "يعمل الآن" : "Live now"}
              </p>
              <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[36px]">
                ZAKI Chat
              </h3>
              <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.8] text-zk-text-secondary">
                {isArabic
                  ? "دردشة مجانية يمكنك استخدامها الآن للكتابة والترجمة والبحث والتخطيط. لا تحفظ ذاكرة دائمة حتى تسجّل الدخول."
                  : "Free chat you can use now for writing, translation, research, and planning. It does not keep durable memory until you sign in."}
              </p>
              <div className="mt-auto flex items-baseline justify-between pt-8">
                <p className="font-display text-[32px] font-extrabold tracking-[-0.04em] text-zk-text">
                  $0<span className="ms-1 font-mono-ui text-[11px] font-normal uppercase tracking-[0.16em] text-zk-text-secondary">{isArabic ? "للبدء" : "to start"}</span>
                </p>
                <Button asChild variant="secondary" className="text-[13px]">
                  <a href={appHandoffUrl("/spaces", "website_product_split_chat", "chat")}>
                    {isArabic ? "ابدأ Chat" : "Start Chat"}
                  </a>
                </Button>
              </div>
            </div>
          </Reveal>

          {/* ZAKI */}
          <Reveal delay={80}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-zk-accent/15 bg-zk-surface p-7 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] md:p-9">
              {/* Subtle top glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-zk-accent/[0.03] to-transparent" />
              <div className="relative flex h-full flex-col">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-zk-accent">
                  {isArabic ? "استمرارية الحساب" : "Account continuity"}
                </p>
                <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[36px]">
                  ZAKI
                </h3>
              <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.8] text-zk-text-secondary">
                {isArabic
                  ? "ZAKI Agent هو طبقة الاستمرارية: ذاكرة واسترجاع وعلاقة لا تعود للصفر كل جلسة. استخدمه عندما تريد AI يتذكرك ويتابع."
                  : "ZAKI Agent is the continuity layer: memory, recall, and a relationship that does not reset every session. Use it when you want AI that remembers and follows through."}
              </p>
                <div className="mt-auto flex items-baseline justify-between pt-8">
                  <div>
                    <p className="font-display text-[32px] font-extrabold tracking-[-0.04em] text-zk-accent">
                      {isArabic ? "Agent" : "Agent"}
                    </p>
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-zk-text-secondary">
                      {isArabic ? "ذاكرة ومتابعة" : "memory and follow-through"}
                    </p>
                  </div>
                  <Button asChild className="text-[13px]">
                    <a href={appHandoffUrl("/agent", "website_product_split_agent", "agent")}>
                      {isArabic ? "افتح Agent" : "Open Agent"}
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

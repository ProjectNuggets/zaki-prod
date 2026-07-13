import { Brain, Check, ArrowRight, Clock3, PenTool } from "lucide-react";
import type { Locale } from "../lib/content";
import { productHandoffUrl } from "../lib/appHandoff";
import { Reveal } from "./Reveal";
import { ShimmerButton } from "./ui/shimmer-button";

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-zk-text-secondary">
      <Check className="mt-0.5 size-4 shrink-0 text-zk-accent" strokeWidth={2} />
      <span>{children}</span>
    </li>
  );
}

export function ProductCards({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <section className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="font-mono-ui text-center text-xs uppercase tracking-[0.2em] text-zk-accent">
            {isArabic ? "اختر طريقك" : "Choose your path"}
          </p>
          <h2 className="font-display mt-3 text-center text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-4xl">
            {isArabic ? "أربعة مسارات مرئية. نظام واحد." : "Four visible spokes. One system."}
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-center text-sm leading-6 text-zk-text-secondary">
            {isArabic
              ? "Agent وChat/Spaces مباشران. Design قائمة انتظار وMinutes قريبًا. Brain هو عرض ذاكرة Agent."
              : "Agent and Chat/Spaces are live. Design is waitlist and Minutes is coming soon. Brain is the Agent memory view."}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {/* Chat card */}
          <Reveal delay={60}>
            <div className="relative flex h-full flex-col rounded-2xl border border-zk-border bg-zk-surface p-7">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold text-zk-text">ZAKI Chat</span>
                <span className="rounded-full bg-zk-success/10 px-2.5 py-0.5 text-[11px] font-medium text-zk-success">
                  {isArabic ? "مباشر" : "Live"}
                </span>
              </div>

              <p className="mt-2 text-sm text-zk-text-secondary">
                {isArabic
                  ? "مدخل مجاني وسريع للمسودات والترجمة والبحث والتخطيط."
                  : "A free, fast entry point for drafts, translation, research, and planning."}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zk-text">$0</span>
                <span className="text-sm text-zk-text-tertiary">{isArabic ? "للبدء" : "to start"}</span>
              </div>

              <ul className="mt-6 flex flex-col gap-3">
                <FeatureItem>{isArabic ? "10 رسائل يوميًا للمستخدم المجهول" : "10 anonymous messages per day"}</FeatureItem>
                <FeatureItem>{isArabic ? "بلا ذاكرة دائمة حتى تسجّل الدخول" : "No durable memory until you sign in"}</FeatureItem>
                <FeatureItem>{isArabic ? "مناسب للعربية والإنجليزية" : "Built for Arabic and English work"}</FeatureItem>
                <FeatureItem>{isArabic ? "انتقل إلى Agent عندما تحتاج متابعة" : "Move to Agent when you need follow-through"}</FeatureItem>
              </ul>

              <div className="mt-auto pt-6">
                <a
                  href={productHandoffUrl("chat")}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface-hover py-3 text-sm font-medium text-zk-text transition-all duration-300 hover:-translate-y-0.5 hover:border-zk-text-ghost hover:bg-zk-surface-active"
                >
                  {isArabic ? "ابدأ Chat" : "Start Chat"}
                  <ArrowRight className="size-3.5" />
                </a>
              </div>
            </div>
          </Reveal>

          {/* ZAKI Agent card */}
          <Reveal delay={120}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-zk-border-accent bg-zk-surface p-7">
              <div className="flex items-center gap-2">
                <span className="font-logo text-xl text-zk-accent">ZAKI</span>
                <span className="font-display text-xl font-bold text-zk-text">Agent</span>
                <span className="rounded-full bg-zk-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-zk-accent">
                  {isArabic ? "أساسي" : "Core"}
                </span>
              </div>

              <p className="mt-2 text-sm text-zk-text-secondary">
                {isArabic
                  ? "ذكاء شخصي مستمر بذاكرة وأتمتة وتنفيذ أدوات."
                  : "Persistent personal intelligence with memory, automation, and tool execution."}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zk-text">{isArabic ? "حساب" : "Account"}</span>
                <span className="text-sm text-zk-text-tertiary">{isArabic ? "مطلوب" : "required"}</span>
              </div>

              <p className="mt-2 text-xs text-zk-text-tertiary">
                {isArabic ? "ذاكرة ومتابعة وموافقات أدوات" : "Memory, follow-through, and tool approvals"}
              </p>

              <ul className="mt-6 flex flex-col gap-3">
                <FeatureItem>{isArabic ? "ذاكرة مستمرة وتحسين ذاتي" : "Memory & self-improvement"}</FeatureItem>
                <FeatureItem>{isArabic ? "3 أوضاع: سريع، متوازن، عميق" : "3 modes: Fast, Balanced, Deep"}</FeatureItem>
                <FeatureItem>{isArabic ? "أتمتة مجدولة (cron)" : "Scheduled automation (cron)"}</FeatureItem>
                <FeatureItem>{isArabic ? "خزنة أسرار ببيانات مخفية بعد الحفظ" : "Secrets stay write-only after save"}</FeatureItem>
                <FeatureItem>{isArabic ? "موافقات واضحة قبل الأدوات الحساسة" : "Clear approvals for sensitive tools"}</FeatureItem>
              </ul>

              <div className="mt-auto pt-6">
                <a href={productHandoffUrl("agent")}>
                  <ShimmerButton className="w-full">
                    {isArabic ? "افتح Agent" : "Open Agent"}
                    <ArrowRight className="size-3.5" />
                  </ShimmerButton>
                </a>
              </div>
            </div>
          </Reveal>

          {/* Design card */}
          <Reveal delay={180}>
            <div className="relative flex h-full flex-col rounded-2xl border border-zk-border bg-zk-surface p-7">
              <div className="flex items-center gap-2">
                <PenTool className="size-5 text-zk-accent" strokeWidth={1.5} />
                <span className="font-display text-xl font-bold text-zk-text">ZAKI Design</span>
                <span className="rounded-full bg-zk-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-zk-accent">
                  {isArabic ? "انتظار" : "Waitlist"}
                </span>
              </div>

              <p className="mt-2 text-sm text-zk-text-secondary">
                {isArabic
                  ? "تحويل الموجزات إلى اتجاهات وواجهات عندما يثبت المسار الكامل."
                  : "Briefs into directions and interfaces once the complete flow is proven."}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zk-text">{isArabic ? "قريبًا" : "Next"}</span>
              </div>

              <ul className="mt-6 flex flex-col gap-3">
                <FeatureItem>{isArabic ? "إنشاء مشاريع مثبت" : "Proven project creation"}</FeatureItem>
                <FeatureItem>{isArabic ? "تسليم واضح وقابل للمراجعة" : "Reviewable delivery"}</FeatureItem>
              </ul>

              <div className="mt-auto pt-6">
                <a
                  href={productHandoffUrl("design")}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface-hover py-3 text-sm font-medium text-zk-text transition-all duration-300 hover:-translate-y-0.5 hover:border-zk-text-ghost hover:bg-zk-surface-active"
                >
                  {isArabic ? "انضم للانتظار" : "Join waitlist"}
                  <ArrowRight className="size-3.5" />
                </a>
              </div>
            </div>
          </Reveal>

          {/* Minutes card */}
          <Reveal delay={240}>
            <div className="relative flex h-full flex-col rounded-2xl border border-zk-border bg-zk-surface p-7">
              <div className="flex items-center gap-2">
                <Clock3 className="size-5 text-zk-accent" strokeWidth={1.5} />
                <span className="font-display text-xl font-bold text-zk-text">ZAKI Minutes</span>
                <span className="rounded-full bg-zk-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-zk-accent">
                  {isArabic ? "قريبًا" : "Coming soon"}
                </span>
              </div>

              <p className="mt-2 text-sm text-zk-text-secondary">
                {isArabic
                  ? "الاجتماعات إلى قرارات ومسؤولين ومتابعات بعد اكتمال الخصوصية والاحتفاظ."
                  : "Meetings into decisions, owners, and follow-ups once privacy and retention are ready."}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zk-text">{isArabic ? "قريبًا" : "Soon"}</span>
              </div>

              <ul className="mt-6 flex flex-col gap-3">
                <FeatureItem>{isArabic ? "ملاحظات وقرارات واضحة" : "Clear notes and decisions"}</FeatureItem>
                <FeatureItem>{isArabic ? "مسؤولون ومتابعات" : "Owners and follow-ups"}</FeatureItem>
              </ul>

              <div className="mt-auto pt-6">
                <a
                  href={productHandoffUrl("minutes")}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface-hover py-3 text-sm font-medium text-zk-text transition-all duration-300 hover:-translate-y-0.5 hover:border-zk-text-ghost hover:bg-zk-surface-active"
                >
                  {isArabic ? "شاهد الحالة" : "See status"}
                  <ArrowRight className="size-3.5" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={300}>
          <a href={productHandoffUrl("brain")} className="mt-6 flex items-center gap-3 border border-zk-border bg-zk-bg-raised p-4 text-sm text-zk-text-secondary transition-colors hover:border-zk-border-strong">
            <Brain className="size-5 shrink-0 text-zk-accent" strokeWidth={1.5} />
            <span>{isArabic ? "Brain هو عرض ذاكرة Agent: ابحث وراجع وعدّل ما يحمله ZAKI للأمام." : "Brain is the Agent memory view: search, inspect, edit, export, or forget what ZAKI carries forward."}</span>
            <ArrowRight className="ms-auto size-3.5 shrink-0" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

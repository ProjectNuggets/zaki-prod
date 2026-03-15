import { Quote, Shield, Zap } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { Card } from "./ui/card";
import { Reveal } from "./Reveal";

/* Stylised growth chart — editorial, not dashboard */
function GrowthChart({ isArabic }: { isArabic: boolean }) {
  const bars = [
    { year: "2024", value: 5.4, h: 14 },
    { year: "2025", value: 11, h: 28 },
    { year: "2026", value: 18, h: 42 },
    { year: "2027", value: 26, h: 56 },
    { year: "2028", value: 35, h: 72 },
    { year: "2029", value: 43, h: 86 },
    { year: "2030", value: 50, h: 100 },
  ];

  return (
    <div className="mt-6 rounded-[18px] border border-line-strong/60 bg-chat-bg/60 p-5">
      <div className="flex items-baseline justify-between">
        <p className="font-mono-ui text-[10px] uppercase tracking-[0.24em] text-chat-muted/60">
          {isArabic ? "حجم سوق وكلاء AI (مليار $)" : "AI agents market size (USD B)"}
        </p>
        <p className="font-mono-ui text-[10px] tracking-[0.16em] text-chat-accent">
          {isArabic ? "نمو سنوي 45.8%" : "45.8% CAGR"}
        </p>
      </div>
      <div className="mt-5 flex items-end gap-2.5" dir="ltr">
        {bars.map((bar, i) => (
          <div key={bar.year} className="flex flex-1 flex-col items-center gap-2">
            <span
              className="w-full rounded-t-[6px] transition-all duration-500"
              style={{
                height: `${bar.h}px`,
                background:
                  i === bars.length - 1
                    ? "linear-gradient(180deg, hsl(10 68% 52%), hsl(10 68% 42%))"
                    : `rgba(210, 68, 48, ${0.12 + i * 0.08})`,
              }}
            />
            <span className="font-mono-ui text-[9px] text-chat-muted/70">
              {bar.year.slice(2)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-baseline justify-between border-t border-line-strong/40 pt-3">
        <span className="text-[12px] text-chat-muted">$5.4B</span>
        <span className="font-display text-[18px] font-extrabold tracking-[-0.03em] text-chat-text">$50B</span>
      </div>
    </div>
  );
}

/* Edge metrics — inline stat pills */
function EdgeMetrics({ isArabic }: { isArabic: boolean }) {
  const metrics = isArabic
    ? [
        { icon: Zap, label: "استمرارية الذاكرة", value: "مدمجة" },
        { icon: Shield, label: "عزل لكل مستخدم", value: "افتراضي" },
      ]
    : [
        { icon: Zap, label: "Memory continuity", value: "Built-in" },
        { icon: Shield, label: "Per-user isolation", value: "Default" },
      ];

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="flex items-center gap-3 rounded-[14px] border border-line-strong/60 bg-chat-bg/60 px-4 py-3.5 transition-colors duration-200 hover:border-chat-accent/15"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-chat-accent/10 text-chat-accent">
            <m.icon className="size-3.5" strokeWidth={2.5} />
          </span>
          <div>
            <p className="font-display text-[18px] font-extrabold tracking-[-0.03em] text-chat-text">{m.value}</p>
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.20em] text-chat-muted/70">{m.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeatureGrid({ locale, t }: { locale: Locale; t: WebsiteContent }) {
  const isArabic = locale === "ar";

  return (
    <section className="px-4 py-14 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-[1240px] gap-5 md:grid-cols-2">
        {/* Card 1 — Editorial quote */}
        <Reveal>
          <Card className="flex h-full flex-col">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-chat-accent/10 text-chat-accent">
                <Quote className="size-3.5" strokeWidth={2.5} />
              </span>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-accent">
                {t.geo.citationHeading}
              </p>
            </div>
            <blockquote className="font-display mt-2 text-[24px] font-extrabold leading-[1.12] tracking-[-0.04em] text-chat-text md:text-[32px]">
              {t.geo.citationQuote}
            </blockquote>
            <div className="mt-auto pt-6">
              <div className="flex items-center gap-3 border-t border-line-strong/60 pt-4">
                <div className="size-1 rounded-full bg-chat-accent" />
                <p className="text-[13px] leading-6 text-chat-muted">{t.geo.citationSource}</p>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* Card 2 — What is ZAKI */}
        <Reveal delay={60}>
          <Card className="flex h-full flex-col">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-accent">
              {isArabic ? "المنتج الآن" : "The product today"}
            </p>
            <h3 className="font-display mt-4 text-[26px] font-extrabold leading-[1.1] tracking-[-0.04em] text-chat-text md:text-[30px]">
              {t.geo.definitionHeading}
            </h3>
            <p className="mt-3 text-[14px] leading-[1.8] text-chat-muted">{t.geo.definitionText}</p>
            <div className="mt-auto pt-5">
              <div className="rounded-[18px] border border-line-strong/60 bg-chat-bg/60 p-5">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-muted/60">
                  {isArabic ? "خريطة المنتج" : "Product map"}
                </p>
                <ul className="mt-3 space-y-2">
                  {(isArabic
                    ? [
                        { label: "ZAKI Chat", desc: "مساحة عمل مباشرة ومدفوعة للتركيز والإنتاجية", color: "bg-chat-accent" },
                        { label: "ZAKI BOT", desc: "بيتا تجريبية لذكاء شخصي مستمر", color: "bg-[#f0a050]" },
                        { label: "Nullalis", desc: "طبقة تشغيل داخلية وراء الاستمرارية والذاكرة", color: "bg-chat-muted" },
                      ]
                    : [
                        { label: "ZAKI Chat", desc: "live, paid workspace for focused productivity", color: "bg-chat-accent" },
                        { label: "ZAKI BOT", desc: "experimental beta for persistent personal intelligence", color: "bg-[#f0a050]" },
                        { label: "Nullalis", desc: "private runtime layer behind continuity and memory", color: "bg-chat-muted" },
                      ]
                  ).map((item) => (
                    <li key={item.label} className="flex items-center gap-3 text-[13px] leading-6 text-chat-text">
                      <span className={`size-1.5 shrink-0 rounded-full ${item.color}`} />
                      <span className="font-medium">{item.label}</span>
                      <span className="text-chat-muted">{isArabic ? "←" : "→"} {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* Card 3 — Market context */}
        <Reveal delay={120}>
          <Card className="flex h-full flex-col">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-accent">
              {isArabic ? "لماذا هذا الاتجاه؟" : "Why this direction matters"}
            </p>
            <h3 className="font-display mt-4 text-[26px] font-extrabold leading-[1.1] tracking-[-0.04em] text-chat-text md:text-[30px]">
              {isArabic
                ? "التحول القادم ليس في الإجابة فقط"
                : "AI is moving from answers to continuity"}
            </h3>
            <p className="mt-3 text-[14px] leading-[1.8] text-chat-muted">
              {isArabic
                ? "المرحلة التالية ليست مجرد مخرجات أفضل، بل أنظمة تتذكر وتحافظ على السياق وتبقى مفيدة مع الوقت. زكي يُبنى لهذا التحول: دردشة عملية الآن، وذكاء مستمر بعد ذلك."
                : "The next shift is not just better outputs. It is systems that remember, keep context, and stay useful across time. ZAKI is being built for that shift: practical chat now, persistent intelligence next."}
            </p>
            <GrowthChart isArabic={isArabic} />
          </Card>
        </Reveal>

        {/* Card 4 — ZAKI's edge */}
        <Reveal delay={180}>
          <Card className="flex h-full flex-col">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-accent">
              {isArabic ? "ما الذي يميز زكي" : "What makes ZAKI different"}
            </p>
            <h3 className="font-display mt-4 text-[26px] font-extrabold leading-[1.1] tracking-[-0.04em] text-chat-text md:text-[30px]">
              {isArabic
                ? "ذكاء مستمر، لا مخرجات عامة"
                : "Persistent intelligence, not generic output"}
            </h3>
            <p className="mt-3 text-[14px] leading-[1.8] text-chat-muted">
              {isArabic
                ? "ZAKI Chat مُحسَّن للإنتاجية المنظمة، لا للنصوص العامة المتكررة. وZAKI BOT يمد هذا الانضباط إلى ذكاء شخصي مستمر: ذاكرة متواصلة، وسياق لكل مستخدم، ومراحل عمل مرئية."
                : "ZAKI Chat is optimized for structured productivity, not endless generic output. ZAKI BOT extends that discipline into persistent personal intelligence: memory continuity, per-user context, and visible work phases."}
            </p>
            <EdgeMetrics isArabic={isArabic} />
            <div className="mt-auto pt-5">
              <div className="rounded-[14px] border border-line-strong/60 bg-chat-bg/60 p-4">
                <p className="text-[13px] leading-[1.7] text-chat-muted">
                  {isArabic
                    ? "Nullalis يبقى في الخلفية. المهم للمستخدم هو النتيجة: استمرارية، وذاكرة، وسياق أكثر أمانًا لكل مستخدم."
                    : "Nullalis stays under the hood. What matters publicly is the result: continuity, memory, and safer per-user context."}
                </p>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

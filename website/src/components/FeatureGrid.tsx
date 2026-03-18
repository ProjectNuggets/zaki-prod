import { ArrowUpRight, Quote, Shield, Zap } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { Card } from "./ui/card";
import { Reveal } from "./Reveal";

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
            <p className="mt-3 max-w-[44ch] text-[14px] leading-[1.75] text-chat-muted">{t.geo.definitionText}</p>
            <div className="mt-auto pt-5">
              <div className="rounded-[18px] border border-line-strong/60 bg-chat-bg/60 p-5">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-muted/60">
                  {isArabic ? "خريطة المنتج" : "Product map"}
                </p>
                <ul className="mt-3 space-y-2">
                  {(isArabic
                    ? [
                        { label: "Spaces", desc: "مساحات عمل مباشرة ومدفوعة للتركيز والتنفيذ المنظّم", color: "bg-chat-accent" },
                        { label: "ZAKI", desc: "بيتا تجريبية لوكيل ذكاء شخصي مستمر", color: "bg-[#f0a050]" },
                        { label: "Nullalis", desc: "طبقة تشغيل داخلية وراء الاستمرارية والذاكرة", color: "bg-chat-muted" },
                      ]
                    : [
                        { label: "Spaces", desc: "live, paid workspaces for focused execution", color: "bg-chat-accent" },
                        { label: "ZAKI", desc: "experimental beta for a persistent personal agent", color: "bg-[#f0a050]" },
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
              {isArabic ? "لماذا تهم الاستمرارية؟" : "Why persistence matters"}
            </p>
            <h3 className="font-display mt-4 text-[26px] font-extrabold leading-[1.1] tracking-[-0.04em] text-chat-text md:text-[30px]">
              {isArabic
                ? "السياق هو ما يفصل الأداة عن النظير"
                : "Context is what separates a tool from a counterpart"}
            </h3>
            <p className="mt-3 text-[14px] leading-[1.75] text-chat-muted">
              {isArabic
                ? "الفرق الحقيقي ليس في إجابة واحدة جيدة، بل في بقاء الذكاء الاصطناعي مفيدًا عبر الوقت. لهذا يبدأ زكي بالدردشة المنظّمة ثم يبني فوقها طبقة استمرارية وذاكرة."
                : "The real difference is not one good answer. It is whether AI stays useful over time. ZAKI starts with structured chat, then builds a continuity and memory layer on top."}
            </p>
            <ul className="mt-5 space-y-3">
              {(isArabic
                ? [
                    "العمل الطويل يحتاج سياقًا لا يضيع بين الجلسات.",
                    "الذاكرة تغيّر ما إذا كان الذكاء الاصطناعي يساعدك مرة واحدة أو يتطور معك.",
                  ]
                : [
                    "Long-running work needs context that does not disappear between sessions.",
                    "Memory changes whether AI helps once or improves with repeated use.",
                  ]
              ).map((item) => (
                <li
                  key={item}
                  className="rounded-[16px] border border-line-strong/60 bg-chat-bg/60 px-4 py-3 text-[13px] leading-6 text-chat-text"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-5">
              <div className="rounded-[14px] border border-line-strong/60 bg-chat-bg/60 p-4">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-chat-muted/70">
                  {isArabic ? "مصدر" : "Source"}
                </p>
                <p className="mt-2 text-[13px] leading-[1.7] text-chat-muted">
                  {isArabic
                    ? "Anthropic أشارت إلى أن إدارة السياق والذاكرة تحسّن أداء الـ agents في المهام المعقدة ومتعددة الخطوات."
                    : "Anthropic reports that context management and memory improve agent performance on complex, multi-step tasks."}
                </p>
                <a
                  href="https://www.anthropic.com/news/context-management"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-chat-accent transition-colors hover:text-chat-accent-hover"
                >
                  {isArabic ? "Anthropic: Managing context" : "Anthropic: Managing context"}
                  <ArrowUpRight className="size-4" />
                </a>
              </div>
            </div>
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
            <p className="mt-3 text-[14px] leading-[1.75] text-chat-muted">
              {isArabic
                ? "Spaces مُحسَّنة للعمل المنظّم، لا للنصوص العامة المتكررة. وزكي يضيف إلى ذلك ما لا تعطيه الدردشة العادية: ذاكرة متواصلة، وسياق لكل مستخدم، ومراحل عمل مرئية."
                : "Spaces are optimized for structured work, not endless generic output. ZAKI adds what ordinary chat does not: memory continuity, per-user context, and visible work phases."}
            </p>
            <ul className="mt-5 space-y-3">
              {(isArabic
                ? [
                    "زكي مبني على الاستمرارية أولًا، لا كإضافة لاحقة.",
                  ]
                : [
                    "ZAKI is built around continuity first, not as a bolt-on later.",
                  ]
              ).map((item) => (
                <li
                  key={item}
                  className="rounded-[16px] border border-line-strong/60 bg-chat-bg/60 px-4 py-3 text-[13px] leading-6 text-chat-text"
                >
                  {item}
                </li>
              ))}
            </ul>
            <EdgeMetrics isArabic={isArabic} />
            <div className="mt-auto pt-5">
              <div className="rounded-[14px] border border-line-strong/60 bg-chat-bg/60 p-4">
                <p className="text-[13px] leading-[1.7] text-chat-muted">
                  {isArabic
                    ? "ما يراه المستخدم ليس المحرك الداخلي، بل النتيجة: استمرارية، وذاكرة، وعلاقة عمل أوضح مع الذكاء الاصطناعي."
                    : "What users feel is not the runtime label. It is the result: continuity, memory, and a clearer working relationship with AI."}
                </p>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

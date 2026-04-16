import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";

type Status = "shipped" | "building" | "next";

const items: { title: { en: string; ar: string }; desc: { en: string; ar: string }; status: Status }[] = [
  {
    title: { en: "Persistent memory & self-improvement", ar: "ذاكرة مستمرة وتحسين ذاتي" },
    desc: { en: "The agent learns from corrections, remembers preferences, and improves over time. The more you use it, the better it gets.", ar: "الوكيل يتعلم من التصحيحات، يتذكر التفضيلات، ويتحسن مع الوقت. كلما استخدمته أكثر، كان أفضل." },
    status: "shipped",
  },
  {
    title: { en: "Cron automation & scheduled jobs", ar: "أتمتة مجدولة ومهام دورية" },
    desc: { en: "Daily summaries, monitoring, data collection. The agent works while you sleep.", ar: "ملخصات يومية، مراقبة، جمع بيانات. الوكيل يعمل وأنت نائم." },
    status: "shipped",
  },
  {
    title: { en: "Multi-channel presence", ar: "تواجد متعدد القنوات" },
    desc: { en: "Telegram is live. More channels coming soon. Talk to your agent wherever you are.", ar: "تيليجرام متاح الآن. قنوات أخرى قادمة قريبًا. تحدث مع وكيلك أينما كنت." },
    status: "shipped",
  },
  {
    title: { en: "Skills & procedure extraction", ar: "مهارات واستخراج إجراءات" },
    desc: { en: "The agent extracts reusable procedures from complex tasks and retrieves them when relevant.", ar: "الوكيل يستخرج إجراءات قابلة لإعادة الاستخدام ويسترجعها عند الحاجة." },
    status: "shipped",
  },
  {
    title: { en: "Agent-to-agent communication", ar: "تواصل بين الوكلاء" },
    desc: { en: "Agents that coordinate with each other. Delegate, hand off, and collaborate across specialized agents.", ar: "وكلاء يتنسّقون مع بعضهم. تفويض، تسليم، وتعاون بين وكلاء متخصصين." },
    status: "next",
  },
  {
    title: { en: "Downloadable ZAKI app with CLI", ar: "تطبيق زكي قابل للتحميل مع CLI" },
    desc: { en: "A native app and command-line interface. Run ZAKI from your terminal, your desktop, or both.", ar: "تطبيق محلي وواجهة سطر أوامر. شغّل زكي من الطرفية، سطح المكتب، أو كلاهما." },
    status: "next",
  },
];

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; label: { en: string; ar: string } }> = {
  shipped: { icon: CheckCircle2, color: "text-zk-success", label: { en: "Shipped", ar: "تم" } },
  building: { icon: Loader2, color: "text-zk-warning", label: { en: "In progress", ar: "قيد البناء" } },
  next: { icon: Circle, color: "text-zk-text-tertiary", label: { en: "Next", ar: "التالي" } },
};

export function Roadmap({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <section className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="font-mono-ui text-center text-xs uppercase tracking-[0.2em] text-zk-accent">
            {isArabic ? "ما نبنيه" : "What we're building"}
          </p>
          <h2 className="font-display mt-3 text-center text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-4xl">
            {isArabic ? "زكي في البيتا العامة. إليك ما نعمل عليه." : "ZAKI is in public beta. Here's what we're building."}
          </h2>
        </Reveal>

        <div className="mt-12 flex flex-col gap-4">
          {items.map((item, i) => {
            const s = statusConfig[item.status];
            const Icon = s.icon;
            return (
              <Reveal key={i} delay={i * 60}>
                <div className="flex gap-4 rounded-xl border border-zk-border bg-zk-surface p-5 transition-colors hover:border-zk-border-strong">
                  <Icon className={`mt-0.5 size-5 shrink-0 ${s.color} ${item.status === "building" ? "animate-spin" : ""}`} strokeWidth={1.5} />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-zk-text">
                      {isArabic ? item.title.ar : item.title.en}
                    </h3>
                    <p className="mt-1 text-[13px] leading-6 text-zk-text-secondary">
                      {isArabic ? item.desc.ar : item.desc.en}
                    </p>
                  </div>
                  <span className={`shrink-0 self-start font-mono-ui text-[10px] uppercase tracking-wider ${s.color}`}>
                    {isArabic ? s.label.ar : s.label.en}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Brain, Shield, Zap, Lock, Timer, Layers } from "lucide-react";
import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";
import { MagicCard } from "./ui/magic-card";

const features = [
  {
    icon: Brain,
    title: { en: "Memory & Self-Improvement", ar: "ذاكرة وتحسين ذاتي" },
    description: {
      en: "ZAKI remembers across sessions, detects corrections, and improves over time. The more you use it, the better it gets at understanding you.",
      ar: "زكي يتذكر عبر الجلسات، يكتشف التصحيحات، ويتحسن مع الوقت. كلما استخدمته أكثر، فهمك أفضل.",
    },
    stat: { en: "Self-improving agent", ar: "وكيل يتحسن ذاتيًا" },
  },
  {
    icon: Shield,
    title: { en: "Pod Isolation", ar: "عزل خاص" },
    description: {
      en: "Each user gets their own isolated agent pod. Your data, context, and memory never touch another user's.",
      ar: "كل مستخدم يحصل على حاوية وكيل معزولة. بياناتك وسياقك وذاكرتك لا تمس بيانات مستخدم آخر.",
    },
    stat: { en: "Per-user architecture", ar: "هيكل لكل مستخدم" },
  },
  {
    icon: Zap,
    title: { en: "Three Agent Modes", ar: "ثلاثة أوضاع للوكيل" },
    description: {
      en: "Fast routes to lightweight models for speed. Deep routes to frontier models for reasoning. Balanced sits between. You pick the mode, ZAKI picks the right model across 7 providers.",
      ar: "السريع يوجّه لنماذج خفيفة للسرعة. العميق يوجّه لنماذج متقدمة للتفكير. المتوازن بينهما. أنت تختار الوضع، وزكي يختار النموذج المناسب من 7 مزوّدين.",
    },
    stat: { en: "Auto-routed per task", ar: "توجيه تلقائي لكل مهمة" },
  },
  {
    icon: Lock,
    title: { en: "Encrypted Vault", ar: "خزنة مشفّرة" },
    description: {
      en: "ChaCha20-Poly1305 AEAD encryption for API keys and secrets the agent uses during tool execution. Your keys, encrypted at rest.",
      ar: "تشفير ChaCha20-Poly1305 AEAD لمفاتيح API والأسرار. مفاتيحك مشفرة أثناء التخزين.",
    },
    stat: { en: "AEAD encryption", ar: "تشفير AEAD" },
  },
  {
    icon: Timer,
    title: { en: "Cron Automation", ar: "أتمتة مجدولة" },
    description: {
      en: "Schedule agent tasks like daily summaries, monitoring, and data collection. ZAKI creates isolated sessions with full context for each job.",
      ar: "جدوِل مهام الوكيل مثل ملخصات يومية، مراقبة، وجمع بيانات. زكي ينشئ جلسات معزولة بسياق كامل.",
    },
    stat: { en: "Runs while you sleep", ar: "يعمل وأنت نائم" },
  },
  {
    icon: Layers,
    title: { en: "25-Step Agent Loop", ar: "حلقة وكيل من 25 خطوة" },
    description: {
      en: "Not single-shot Q&A. ZAKI persists through complex multi-step tasks with tool use and forced follow-through logic.",
      ar: "ليس سؤال وجواب لمرة واحدة. زكي يستمر في المهام المعقدة متعددة الخطوات مع استخدام الأدوات.",
    },
    stat: { en: "Forced follow-through", ar: "متابعة إجبارية" },
  },
];

export function BentoFeatures({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <section className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <Reveal>
          <p className="font-mono-ui text-xs uppercase tracking-[0.2em] text-zk-accent">
            {isArabic ? "ما الذي يجعل زكي مختلفًا" : "What makes ZAKI different"}
          </p>
          <h2 className="font-display mt-3 max-w-[20ch] text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-4xl">
            {isArabic ? "ليس شات بوت آخر." : "Not another chatbot."}
          </h2>
        </Reveal>

        {/* Bento grid: 3 top + 3 bottom */}
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 60}>
              <MagicCard className="flex h-full flex-col p-6">
                <f.icon className="size-5 text-zk-accent" strokeWidth={1.5} />
                <h3 className="mt-4 text-base font-semibold text-zk-text">
                  {isArabic ? f.title.ar : f.title.en}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-zk-text-secondary">
                  {isArabic ? f.description.ar : f.description.en}
                </p>
                <p className="mt-4 font-mono-ui text-[11px] uppercase tracking-wider text-zk-text-tertiary">
                  {isArabic ? f.stat.ar : f.stat.en}
                </p>
              </MagicCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

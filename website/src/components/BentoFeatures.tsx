import { Brain, Shield, Zap, Lock, Timer, Layers } from "lucide-react";
import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";
import { MagicCard } from "./ui/magic-card";

const features = [
  {
    icon: Brain,
    title: { en: "Visible memory", ar: "ذاكرة مرئية" },
    description: {
      en: "Agent can carry context forward, and Brain gives that memory a place to search, inspect, export, or remove.",
      ar: "يمكن للوكيل حمل السياق للأمام، ويمنح Brain الذاكرة مكانًا للبحث والمراجعة والتصدير أو الحذف.",
    },
    stat: { en: "Brain control plane", ar: "لوحة تحكم Brain" },
  },
  {
    icon: Shield,
    title: { en: "User-safe boundaries", ar: "حدود آمنة للمستخدم" },
    description: {
      en: "Public product copy follows the backend truth: signed-in scope, explicit settings, named failure states, and no hidden claims.",
      ar: "نسخة المنتج العامة تتبع حقيقة الخلفية: نطاق تسجيل دخول، إعدادات واضحة، حالات فشل مسماة، ولا وعود مخفية.",
    },
    stat: { en: "Truthful launch state", ar: "حالة إطلاق صادقة" },
  },
  {
    icon: Zap,
    title: { en: "Agent run controls", ar: "تحكم تشغيل Agent" },
    description: {
      en: "Mode, autonomy, reasoning effort, approvals, cancel, artifacts, traces, cron, and browser status sit in the workbench.",
      ar: "الوضع، الاستقلالية، جهد التفكير، الموافقات، الإيقاف، المخرجات، الآثار، الجدولة، وحالة المتصفح داخل سطح العمل.",
    },
    stat: { en: "Visible execution", ar: "تنفيذ مرئي" },
  },
  {
    icon: Lock,
    title: { en: "Write-only secrets", ar: "أسرار لا تُعرض بعد الحفظ" },
    description: {
      en: "Secrets can be added, rotated, and deleted without returning saved values to the browser.",
      ar: "يمكن إضافة الأسرار وتدويرها وحذفها بدون إعادة القيم المحفوظة إلى المتصفح.",
    },
    stat: { en: "Metadata-only reads", ar: "قراءة بيانات فقط" },
  },
  {
    icon: Timer,
    title: { en: "Cron Automation", ar: "أتمتة مجدولة" },
    description: {
      en: "Schedule supported Agent work, inspect run history, and keep background jobs visible instead of burying them.",
      ar: "جدولة عمل Agent المدعوم، مراجعة تاريخ التشغيل، وإبقاء المهام الخلفية مرئية بدل دفنها.",
    },
    stat: { en: "Runs while you sleep", ar: "يعمل وأنت نائم" },
  },
  {
    icon: Layers,
    title: { en: "Public, gated, waitlist", ar: "عام، مقيد، انتظار" },
    description: {
      en: "Agent, Chat, and Brain are public. Learn and Career stay gated. Design stays waitlist until the service is proven.",
      ar: "Agent وChat وBrain عامة. Learn وCareer مقيدة. Design قائمة انتظار حتى تثبت الخدمة.",
    },
    stat: { en: "No false availability", ar: "لا توفر مزيف" },
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

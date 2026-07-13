import {
  ArrowRight,
  Brain,
  CreditCard,
  ListChecks,
  LockKeyhole,
  MessageSquareText,
  Settings,
  Sparkles,
} from "lucide-react";
import type { Locale } from "../lib/content";
import { appHandoffUrl, productHandoffUrl } from "../lib/appHandoff";
import { Reveal } from "./Reveal";

type Journey = {
  icon: typeof MessageSquareText;
  label: { en: string; ar: string };
  status: { en: string; ar: string };
  steps: { en: string[]; ar: string[] };
  href: string;
  cta: { en: string; ar: string };
};

const journeys: Journey[] = [
  {
    icon: MessageSquareText,
    label: { en: "Start in Chat", ar: "ابدأ في Chat" },
    status: { en: "Public / anonymous", ar: "عام / مجهول" },
    steps: {
      en: ["Website command", "App /spaces", "Anonymous quota", "Sign in when work should persist"],
      ar: ["أمر من الموقع", "التطبيق /spaces", "حصة مجهولة", "سجّل الدخول عندما يجب حفظ العمل"],
    },
    href: productHandoffUrl("chat"),
    cta: { en: "Start Chat", ar: "ابدأ Chat" },
  },
  {
    icon: Sparkles,
    label: { en: "Continue in Agent", ar: "تابع في Agent" },
    status: { en: "Public / signed in", ar: "عام / بتسجيل دخول" },
    steps: {
      en: ["Website Agent CTA", "Auth if needed", "Prompt replay", "Workbench, approvals, artifacts, trace"],
      ar: ["CTA الخاص بـAgent", "تسجيل الدخول عند الحاجة", "إعادة الأمر", "سطح العمل والموافقات والمخرجات والأثر"],
    },
    href: productHandoffUrl("agent"),
    cta: { en: "Open Agent", ar: "افتح Agent" },
  },
  {
    icon: Brain,
    label: { en: "Review in Brain", ar: "راجع في Brain" },
    status: { en: "Public / account memory", ar: "عام / ذاكرة الحساب" },
    steps: {
      en: ["Brain CTA", "Auth if needed", "Graph/search/timeline", "Govern through Brain and Settings"],
      ar: ["CTA الخاص بـBrain", "تسجيل الدخول عند الحاجة", "الخريطة والبحث والزمن", "التحكم عبر Brain وSettings"],
    },
    href: productHandoffUrl("brain"),
    cta: { en: "Open Brain", ar: "افتح Brain" },
  },
  {
    icon: Settings,
    label: { en: "Configure in Settings", ar: "اضبط في Settings" },
    status: { en: "Account control plane", ar: "لوحة تحكم الحساب" },
    steps: {
      en: ["Billing and usage", "Products and access", "Channels and secrets", "Devices, memory, privacy"],
      ar: ["الدفع والاستخدام", "المنتجات والوصول", "القنوات والأسرار", "الأجهزة والذاكرة والخصوصية"],
    },
    href: appHandoffUrl("/settings", "website_journey_settings", "dashboard"),
    cta: { en: "Open Settings", ar: "افتح Settings" },
  },
  {
    icon: CreditCard,
    label: { en: "Choose a plan", ar: "اختر خطة" },
    status: { en: "Pricing / billing", ar: "الأسعار / الدفع" },
    steps: {
      en: ["Pricing CTA", "Plan selection", "Checkout or portal", "Usage visible in app"],
      ar: ["CTA الأسعار", "اختيار الخطة", "الدفع أو البوابة", "الاستخدام مرئي في التطبيق"],
    },
    href: appHandoffUrl("/pricing", "website_pricing", "plans"),
    cta: { en: "See plans", ar: "اعرض الخطط" },
  },
  {
    icon: LockKeyhole,
    label: { en: "Join gated lanes", ar: "انضم للمسارات المقيّدة" },
    status: { en: "Learn/Career gated, Design waitlist", ar: "Learn/Career مقيد، Design انتظار" },
    steps: {
      en: ["Website waitlist", "Public endpoint", "Operator review", "No public runtime claim"],
      ar: ["قائمة انتظار الموقع", "نقطة عامة", "مراجعة تشغيلية", "بدون وعد تشغيل عام"],
    },
    href: "#future-access",
    cta: { en: "Get updates", ar: "تابع التحديثات" },
  },
];

export function JourneyMap({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <section className="border-y border-zk-border px-5 py-20 md:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono-ui text-xs uppercase tracking-[0.2em] text-zk-accent">
                {isArabic ? "المسارات من الموقع إلى التطبيق" : "Website to app paths"}
              </p>
              <h2 className="font-display mt-3 max-w-[18ch] text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-4xl">
                {isArabic ? "كل وعد ينتهي بسطح حقيقي." : "Every promise ends on a real surface."}
              </h2>
            </div>
            <p className="max-w-[48ch] text-sm leading-7 text-zk-text-secondary">
              {isArabic
                ? "هذا هو العقد: الموقع يشرح، التطبيق ينفذ، وSettings يتحكم. المسارات غير العامة تبقى بوصول مقيد أو قائمة انتظار."
                : "This is the contract: the website explains, the app executes, and Settings controls. Non-public lanes stay gated or waitlist."}
            </p>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-px overflow-hidden border border-zk-border bg-zk-border md:grid-cols-2 xl:grid-cols-3">
          {journeys.map((journey, index) => (
            <Reveal key={journey.label.en} delay={index * 45} variant="fade">
              <a
                href={journey.href}
                className="group flex min-h-[250px] flex-col bg-zk-surface p-5 transition-colors hover:bg-zk-surface-hover"
              >
                <div className="flex items-start justify-between gap-4">
                  <journey.icon className="size-5 text-zk-accent" strokeWidth={1.5} />
                  <span className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-zk-text-tertiary">
                    {isArabic ? journey.status.ar : journey.status.en}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-zk-text">
                  {isArabic ? journey.label.ar : journey.label.en}
                </h3>
                <ol className="mt-4 grid gap-2">
                  {(isArabic ? journey.steps.ar : journey.steps.en).map((step, stepIndex) => (
                    <li key={step} className="flex items-start gap-3 text-sm leading-6 text-zk-text-secondary">
                      <span className="mt-1 font-mono-ui text-[10px] text-zk-accent">
                        {String(stepIndex + 1).padStart(2, "0")}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-zk-text transition-colors group-hover:text-zk-accent">
                  {isArabic ? journey.cta.ar : journey.cta.en}
                  <ArrowRight className="size-3.5" strokeWidth={1.5} />
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal delay={220}>
          <p className="mt-5 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-zk-text-tertiary">
            <ListChecks className="size-3.5 text-zk-accent" strokeWidth={1.5} />
            {isArabic
              ? "لا توجد مطالبة عامة بدون مسار، صلاحية، حالة فشل، واختبار."
              : "No public claim without route, entitlement, failure state, and test path."}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

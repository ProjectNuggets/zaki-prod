import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";
import { NumberTicker } from "./ui/number-ticker";

const metrics = [
  {
    value: 4,
    suffix: "",
    label: { en: "Public routes", ar: "مسارات عامة" },
    sublabel: { en: "Home, Agent, Brain, Settings", ar: "الرئيسية، Agent، Brain، Settings" },
  },
  {
    value: 3,
    suffix: "",
    label: { en: "Public products", ar: "منتجات عامة" },
    sublabel: { en: "Chat, Agent, Brain", ar: "Chat وAgent وBrain" },
  },
  {
    value: 2,
    suffix: "",
    label: { en: "Gated lanes", ar: "مسارات مقيدة" },
    sublabel: { en: "Learn and Carrier", ar: "Learn وCarrier" },
  },
  {
    value: 1,
    suffix: "",
    label: { en: "Waitlist lane", ar: "قائمة انتظار" },
    sublabel: { en: "Design", ar: "Design" },
  },
];

export function BuiltDifferent({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <section className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="font-mono-ui text-xs uppercase tracking-[0.2em] text-zk-accent">
            {isArabic ? "بُني بشكل مختلف" : "Built different"}
          </p>
          <h2 className="font-display mt-3 max-w-[22ch] text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-4xl">
            {isArabic
              ? "الموقع يبيع المسار الحقيقي، لا قائمة ميزات متخيلة."
              : "The website sells the real path, not an imaginary feature list."}
          </h2>
          <p className="mt-4 max-w-[56ch] text-sm leading-6 text-zk-text-secondary md:text-base md:leading-7">
            {isArabic
              ? "كل CTA يقود إلى سطح متاح أو قائمة انتظار صحيحة: Chat للبدء، Agent للاستمرارية، Brain للذاكرة، Settings للتحكم."
              : "Every CTA routes to a real state: Chat to start, Agent for continuity, Brain for memory, Settings for control, and waitlist where the product is not public."}
          </p>
        </Reveal>

        {/* Metrics grid */}
        <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zk-border bg-zk-border md:grid-cols-4">
          {metrics.map((m, i) => (
            <Reveal key={i} delay={i * 80} variant="fade">
              <div className="flex flex-col items-center bg-zk-surface px-4 py-8 text-center">
                <span className="font-mono-ui text-3xl font-medium text-zk-text md:text-4xl">
                  <NumberTicker value={m.value} delay={0.3 + i * 0.15} suffix={m.suffix} />
                </span>
                <span className="mt-2 text-sm font-medium text-zk-text">
                  {isArabic ? m.label.ar : m.label.en}
                </span>
                <span className="mt-1 text-xs text-zk-text-tertiary">
                  {isArabic ? m.sublabel.ar : m.sublabel.en}
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Architecture highlights */}
        <Reveal delay={200}>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: { en: "Website to app handoff", ar: "تسليم من الموقع إلى التطبيق" },
                desc: { en: "Source, intent, product, and prompt travel into the app so the user path can continue after auth.", ar: "المصدر والنية والمنتج والأمر تنتقل إلى التطبيق حتى يستمر المسار بعد تسجيل الدخول." },
              },
              {
                title: { en: "Central control plane", ar: "لوحة تحكم مركزية" },
                desc: { en: "Account, billing, products, channels, secrets, providers, devices, memory, and privacy all route to Settings.", ar: "الحساب، الدفع، المنتجات، القنوات، الأسرار، المزودون، الأجهزة، الذاكرة، والخصوصية تعود إلى Settings." },
              },
              {
                title: { en: "Truthful gates", ar: "بوابات صادقة" },
                desc: { en: "Private-access and waitlist products stay visible without implying general availability or a working runtime.", ar: "منتجات الوصول الخاص وقائمة الانتظار تبقى مرئية بدون الإيحاء بتوفر عام أو تشغيل كامل." },
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-zk-border bg-zk-bg-raised p-5">
                <h3 className="font-mono-ui text-sm font-medium text-zk-text">
                  {isArabic ? item.title.ar : item.title.en}
                </h3>
                <p className="mt-2 text-[13px] leading-6 text-zk-text-secondary">
                  {isArabic ? item.desc.ar : item.desc.en}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";

const stats = [
  { value: "83,500+", label: { en: "lines of code", ar: "سطر برمجي" } },
  { value: "5,300+", label: { en: "tests passing", ar: "اختبار ناجح" } },
  { value: "7", label: { en: "AI providers", ar: "مزوّد ذكاء" } },
  { value: "17", label: { en: "channels", ar: "قناة تواصل" } },
  { value: "ChaCha20", label: { en: "encryption", ar: "تشفير" } },
];

export function CredibilityStrip({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <Reveal>
      <section className="border-y border-zk-border bg-zk-bg-raised/50 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 md:gap-x-12">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="font-mono-ui text-sm font-medium text-zk-text">
                {stat.value}
              </span>
              <span className="text-xs text-zk-text-tertiary">
                {isArabic ? stat.label.ar : stat.label.en}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Reveal>
  );
}

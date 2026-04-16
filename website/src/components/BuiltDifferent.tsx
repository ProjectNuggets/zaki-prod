import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";
import { NumberTicker } from "./ui/number-ticker";

const metrics = [
  {
    value: 83500,
    suffix: "+",
    label: { en: "Lines of code", ar: "سطر برمجي" },
    sublabel: { en: "Custom agent runtime", ar: "محرّك وكيل مخصص" },
  },
  {
    value: 5300,
    suffix: "+",
    label: { en: "Tests passing", ar: "اختبار ناجح" },
    sublabel: { en: "Production-grade", ar: "جاهز للإنتاج" },
  },
  {
    value: 7,
    suffix: "",
    label: { en: "AI providers", ar: "مزوّد ذكاء" },
    sublabel: { en: "Auto-routed per task", ar: "توجيه تلقائي لكل مهمة" },
  },
  {
    value: 25,
    suffix: "",
    label: { en: "Iteration depth", ar: "عمق التكرار" },
    sublabel: { en: "Forced follow-through", ar: "متابعة إجبارية" },
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
              ? "محرّك وكيل مخصص. ليس غلاف واجهة."
              : "Custom agent runtime. Not a wrapper."}
          </h2>
          <p className="mt-4 max-w-[56ch] text-sm leading-6 text-zk-text-secondary md:text-base md:leading-7">
            {isArabic
              ? "بُني زكي من الصفر بمحرّك مخصص. بدون جامع نفايات، بدون حمل زائد، ملف تنفيذي واحد يعمل على Kubernetes. أداء حقيقي، لا تسويق."
              : "ZAKI is built from the ground up on a custom runtime. No garbage collector, no runtime overhead, single binary deploys on Kubernetes. Real engineering, not marketing."}
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
                title: { en: "Per-user pods", ar: "حاويات لكل مستخدم" },
                desc: { en: "Isolated compute, memory, and secrets. Not multi-tenant. Your agent is yours alone.", ar: "حوسبة وذاكرة وأسرار معزولة. ليس متعدد المستأجرين. وكيلك لك وحدك." },
              },
              {
                title: { en: "ChaCha20-Poly1305", ar: "ChaCha20-Poly1305" },
                desc: { en: "AEAD encryption for every secret the agent touches. API keys encrypted at rest, decrypted only during execution.", ar: "تشفير AEAD لكل سر يلمسه الوكيل. مفاتيح مشفرة أثناء التخزين." },
              },
              {
                title: { en: "Three-pass context", ar: "سياق ثلاثي المراحل" },
                desc: { en: "Smart compression prevents context degradation on long tasks. Your agent doesn't forget what happened 10 minutes ago.", ar: "ضغط ذكي يمنع تدهور السياق في المهام الطويلة. وكيلك لا ينسى ما حدث قبل 10 دقائق." },
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

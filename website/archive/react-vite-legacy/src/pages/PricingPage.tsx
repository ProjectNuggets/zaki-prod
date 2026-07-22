import { SiteShell } from "../components/layout/SiteShell";
import { PricingSplit } from "../components/PricingSplit";
import { Reveal } from "../components/Reveal";
import { getContent, type Locale } from "../lib/content";
import { V3PricingPage } from "../components/v3/V3Website";

export function PricingPage({ locale }: { locale: Locale }) {
  if (locale === "en") return <V3PricingPage />;

  const isArabic = locale === "ar";
  const t = getContent(locale);

  return (
    <SiteShell locale={locale} route="pricing">
      <section className="border-b border-zk-border px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.28em] text-zk-accent-hover">
              {isArabic ? "الأسعار" : "Pricing"}
            </p>
            <h1 className="font-display mt-5 max-w-[13ch] text-[44px] font-extrabold leading-[0.94] tracking-[-0.05em] text-zk-text md:text-[72px]">
              {isArabic ? "ابدأ مجانًا. ادفع عندما تحتاج الاستمرارية." : "Start free. Pay when continuity matters."}
            </h1>
            <p className="mt-6 max-w-[64ch] text-base leading-8 text-zk-text-secondary">
              {isArabic
                ? "التسعير لا يبيع منتجات غير جاهزة. Agent وChat/Spaces يعملان الآن، وDesign على قائمة الانتظار، وMinutes قريبًا. Brain هو عرض ذاكرة Agent."
                : "Pricing does not sell unfinished surfaces. Agent and Chat/Spaces are live, Design is waitlist, Minutes is coming soon, and Brain is the Agent memory view."}
            </p>
          </Reveal>
        </div>
      </section>

      <PricingSplit locale={locale} t={t} />
    </SiteShell>
  );
}

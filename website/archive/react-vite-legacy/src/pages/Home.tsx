import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { SiteShell } from "../components/layout/SiteShell";
import { getContent, type Locale } from "../lib/content";
import { Reveal } from "../components/Reveal";

import { Hero } from "../components/Hero";
import { CredibilityStrip } from "../components/CredibilityStrip";
import { BentoFeatures } from "../components/BentoFeatures";
import { ProductCards } from "../components/ProductCards";
import { JourneyMap } from "../components/JourneyMap";
import { BuiltDifferent } from "../components/BuiltDifferent";
import { Roadmap } from "../components/Roadmap";
import { ClosingCta } from "../components/ClosingCta";
import { HomeV4 } from "./HomeV4";

export function HomePage({ locale }: { locale: Locale }) {
  if (locale === "en") return <HomeV4 />;

  const t = getContent(locale);
  const isArabic = locale === "ar";

  return (
    <SiteShell locale={locale} route="home">
      {/* 1. Hero */}
      <Hero locale={locale} />

      {/* 2. Credibility strip */}
      <CredibilityStrip locale={locale} />

      {/* 3. Feature bento grid */}
      <BentoFeatures locale={locale} />

      {/* 4. Two products */}
      <ProductCards locale={locale} />

      {/* 5. End-to-end handoff paths */}
      <JourneyMap locale={locale} />

      {/* 6. Built different — architecture */}
      <BuiltDifferent locale={locale} />

      {/* 7. Roadmap */}
      <Roadmap locale={locale} />

      {/* 8. FAQ */}
      <section className="px-5 py-24 md:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="font-mono-ui text-center text-xs uppercase tracking-[0.2em] text-zk-accent">
              {isArabic ? "الأسئلة الشائعة" : "FAQ"}
            </p>
            <h2 className="font-display mt-3 text-center text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-4xl">
              {isArabic ? "أسئلة المنتج، بوضوح" : "Product questions, answered plainly"}
            </h2>
          </Reveal>
          <Reveal delay={80} className="mt-10">
            <Accordion type="single" collapsible className="grid gap-3">
              {t.faq.items.slice(0, 6).map((item, index) => (
                <AccordionItem key={item.question} value={`faq-${index}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* 9. Closing CTA */}
      <ClosingCta locale={locale} />

      {/* 10. V2 website links */}
      <section className="border-t border-zk-border px-5 py-12 md:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-tertiary">
              {isArabic ? "تابع في الموقع" : "Continue on the site"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {[
                { to: "/story", label: isArabic ? "لماذا بنينا زكي" : "Why we built ZAKI" },
                { to: "/product", label: isArabic ? "لوحة المنتج" : "Product overview" },
                { to: "/use-cases", label: isArabic ? "استخدامات زكي" : "Use cases" },
                { to: "/pricing", label: isArabic ? "الأسعار" : "Pricing" },
                { to: "/faq", label: isArabic ? "الأسئلة" : "FAQ" },
                { to: "/contact", label: isArabic ? "تواصل" : "Contact" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zk-border bg-zk-surface px-4 py-2 text-xs font-medium text-zk-text-secondary transition-all hover:-translate-y-0.5 hover:border-zk-border-strong hover:text-zk-text"
                >
                  {link.label}
                  <ArrowRight className="size-3" />
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

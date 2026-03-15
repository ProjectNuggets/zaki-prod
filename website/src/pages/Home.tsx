import { Hero } from "../components/Hero";
import { ProductSplit } from "../components/ProductSplit";
import { BetaWarningStrip } from "../components/BetaWarningStrip";
import { FeatureGrid } from "../components/FeatureGrid";
import { PricingSplit } from "../components/PricingSplit";
import { CommunityFeedback } from "../components/CommunityFeedback";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { SiteShell } from "../components/layout/SiteShell";
import { getContent, type Locale } from "../lib/content";
import { Reveal } from "../components/Reveal";

export function HomePage({ locale }: { locale: Locale }) {
  const t = getContent(locale);

  return (
    <SiteShell locale={locale} route="home">
      <Hero locale={locale} t={t} />
      <ProductSplit locale={locale} t={t} />
      <BetaWarningStrip locale={locale} t={t} />
      <FeatureGrid locale={locale} t={t} />
      
      <PricingSplit locale={locale} t={t} />
      <CommunityFeedback locale={locale} />
      <section className="px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <div className="max-w-[56ch]">
              <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-chat-accent">
                {t.faq.heading}
              </p>
              <h2 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] md:text-[40px]">
                {locale === "ar" ? "أسئلة المنتج كما هي فعلًا" : "Product questions, answered plainly"}
              </h2>
            </div>
          </Reveal>
          <Reveal delay={80} className="mt-8">
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
    </SiteShell>
  );
}

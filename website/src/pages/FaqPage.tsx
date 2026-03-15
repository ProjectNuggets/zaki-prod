import { SiteShell } from "../components/layout/SiteShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Badge } from "../components/ui/badge";
import { getContent, type Locale } from "../lib/content";
import { Reveal } from "../components/Reveal";

export function FaqPage({ locale }: { locale: Locale }) {
  const t = getContent(locale);
  const isArabic = locale === "ar";

  return (
    <SiteShell locale={locale} route="faq">
      <section className="px-4 pb-10 pt-8 md:px-8 md:pb-18 md:pt-12">
        <div className="mx-auto max-w-[980px]">
          <Reveal>
            <Badge tone="chat">{isArabic ? "الأسئلة الشائعة" : "FAQ"}</Badge>
            <h1 className="font-display mt-6 text-[40px] font-extrabold leading-[0.96] tracking-[-0.06em] md:text-[72px]">
              {isArabic ? "أسئلة المنتج كما هو فعلًا." : "Product questions, as they actually are."}
            </h1>
            <p className="mt-6 max-w-[60ch] text-sm leading-7 text-[var(--chat-muted)] md:text-base md:leading-8">
              {isArabic
                ? "تشرح هذه الصفحة الفرق بين ZAKI Chat وزكي، وما الذي تتضمنه البيتا العامة، ولماذا هي تجريبية، ومتى تبدأ الاشتراكات."
                : "This page explains the difference between ZAKI Chat and ZAKI, what the public beta includes, why it is experimental, and when subscriptions begin."}
            </p>
          </Reveal>
          <Reveal delay={80} className="mt-8">
            <Accordion type="single" collapsible className="grid gap-4">
              {t.faq.items.map((item, index) => (
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

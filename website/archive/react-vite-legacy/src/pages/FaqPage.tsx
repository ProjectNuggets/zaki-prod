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
              {isArabic ? "أسئلة المنتج، بإجابات مباشرة." : "Product questions, answered directly."}
            </h1>
            <p className="mt-6 max-w-[60ch] text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
              {isArabic
                ? "تشرح هذه الصفحة ما يتضمنه زكي V1: Chat وAgent وBrain والتحكم في الذاكرة والأسعار والأسطح القادمة."
                : "This page explains what ZAKI includes in V1: Chat, Agent, Brain, memory controls, pricing, privacy, and gated future surfaces."}
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

          {/* Still have questions? */}
          <Reveal delay={120}>
            <div className="mt-12 rounded-xl border border-zk-border bg-zk-surface p-6 text-center md:p-8">
              <p className="text-base font-semibold text-zk-text">
                {isArabic ? "لا تزال لديك أسئلة؟" : "Still have questions?"}
              </p>
              <p className="mt-2 text-sm text-zk-text-secondary">
                {isArabic
                  ? "تواصل معنا مباشرة وسنرد في أقرب وقت."
                  : "Reach out directly and we'll get back to you."}
              </p>
              <a
                href={isArabic ? "/ar/contact/" : "/contact/"}
                className="mt-4 inline-flex items-center rounded-full bg-zk-accent px-5 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-zk-accent-hover"
              >
                {isArabic ? "تواصل معنا" : "Contact us"}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

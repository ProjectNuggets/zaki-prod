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
import { BuiltDifferent } from "../components/BuiltDifferent";
import { Roadmap } from "../components/Roadmap";
import { ClosingCta } from "../components/ClosingCta";

export function HomePage({ locale }: { locale: Locale }) {
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

      {/* 5. Built different — architecture */}
      <BuiltDifferent locale={locale} />

      {/* 6. Roadmap */}
      <Roadmap locale={locale} />

      {/* 7. FAQ */}
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

      {/* 8. Closing CTA */}
      <ClosingCta locale={locale} />

      {/* 9. Read more links (SEO) */}
      <section className="border-t border-zk-border px-5 py-12 md:px-8">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-tertiary">
              {isArabic ? "قراءات إضافية" : "Read more"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {[
                { to: "/story", label: isArabic ? "لماذا بنينا زكي" : "Why we built ZAKI" },
                { to: "/zaki-vs-spaces", label: isArabic ? "زكي مقابل Spaces" : "ZAKI vs Spaces" },
                { to: "/how-to/how-zaki-and-spaces-work", label: isArabic ? "كيف يعمل زكي وSpaces" : "How ZAKI & Spaces work" },
                { to: "/vs-chatgpt", label: isArabic ? "Spaces مقابل ChatGPT" : "Spaces vs ChatGPT" },
                { to: "/best-arabic-ai-assistant", label: isArabic ? "أفضل مساعد عربي" : "Best Arabic AI 2026" },
                { to: "/zaki-vs-openclaw", label: isArabic ? "زكي مقابل OpenClaw" : "ZAKI vs OpenClaw" },
                { to: "/how-to/write-arabic-emails-ai", label: isArabic ? "كتابة إيميلات عربية بالذكاء" : "Write Arabic emails with AI" },
                { to: "/how-to/translate-dialects-arabic-english", label: isArabic ? "ترجمة اللهجات" : "Translate Arabic dialects" },
                { to: "/how-to/create-social-media-content-arabic", label: isArabic ? "محتوى سوشال ميديا بالعربي" : "Create Arabic social content" },
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

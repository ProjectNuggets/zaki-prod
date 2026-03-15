import { ArrowUpRight, Binary, Bot, Cpu, Orbit } from "lucide-react";
import { SiteShell } from "../components/layout/SiteShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { WaitlistForm } from "../components/WaitlistForm";
import { Reveal } from "../components/Reveal";

import { getContent, type Locale } from "../lib/content";

export function BotPage({ locale }: { locale: Locale }) {
  const t = getContent(locale);
  const isArabic = locale === "ar";
  const runtimeFacts = [
    { label: isArabic ? "الكمية" : "Quota", value: isArabic ? "5 رسائل / 24 ساعة" : "5 msgs / 24h" },
    { label: isArabic ? "الحالة" : "State", value: isArabic ? "بيتا عامة" : "Public beta" },
    { label: isArabic ? "الفوترة" : "Billing", value: isArabic ? "الاشتراكات لاحقًا" : "Subscriptions later" },
    { label: "Runtime", value: "Nullalis" },
  ];

  return (
    <SiteShell locale={locale} route="bot">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden px-4 pb-16 pt-[8vh] md:px-8 md:pb-24 md:pt-[10vh]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(255,77,46,0.10),transparent_50%)]" />

        <div className="mx-auto grid max-w-[1240px] gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <Reveal>
            <Badge tone="warning" pulse>{isArabic ? "النسخة التجريبية الرائدة" : "Experimental flagship"}</Badge>
            <h1 className="font-display mt-6 max-w-[10ch] text-[40px] font-extrabold leading-[0.92] tracking-[-0.06em] text-bot-text md:text-[72px]">
              {isArabic ? "مشغّل ذكاء شخصي." : "Personal AI Operator."}
            </h1>
            <p className="mt-6 max-w-[58ch] text-sm leading-7 text-bot-muted md:text-base md:leading-8">
              {isArabic
                ? "زكي مشغّل ذكاء تجريبي بذاكرة مستمرة، ومراحل عمل مرئية، وسياق لكل مستخدم لا يُعاد ضبطه بين الجلسات."
                : "ZAKI is an experimental AI operator with persistent memory, visible work phases, and per-user context that doesn't reset between sessions."}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href="#waitlist">{isArabic ? "انضم إلى البيتا" : "Join the beta"}</a>
              </Button>
              <Button asChild variant="bot">
                <a href="https://app.chatzaki.com/?auth=signup&source=website_bot_page">
                  {isArabic ? "استخدم ZAKI Chat الآن" : "Use ZAKI Chat now"}
                </a>
              </Button>
              <a href={isArabic ? "/ar/faq/" : "/faq/"} className="inline-flex items-center gap-2 text-sm font-medium text-bot-text transition-colors hover:text-bot-accent">
                {isArabic ? "اقرأ الأسئلة" : "Read the FAQ"}
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <Card tone="bot" className="relative overflow-hidden">
              <div className="absolute end-[-40px] top-[-40px] size-32 rounded-full bg-[radial-gradient(circle,rgba(255,77,46,0.20),transparent_68%)] blur-2xl" />
              <div className="grid gap-3 md:grid-cols-2">
                {runtimeFacts.map((fact) => (
                  <div key={fact.label} className="rounded-[20px] border border-line-dark-strong bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.05]">
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.24em] text-bot-muted">{fact.label}</p>
                    <p className="mt-2 text-sm font-medium text-bot-text">{fact.value}</p>
                  </div>
                ))}
              </div>
              <p className="font-mono-ui mt-5 text-[10px] uppercase tracking-[0.3em] text-bot-accent">
                {isArabic ? "مشغّل شخصي / واجهة تجريبية" : "personal operator / experimental interface"}
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ═══ WHAT / WHY / EXPERIMENTAL ═══ */}
      <section className="px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-6 md:grid-cols-3">
          {[
            { icon: Bot, title: isArabic ? "ما هو" : "What it is", body: t.botProduct.intro },
            { icon: Orbit, title: isArabic ? "لماذا هو مختلف" : "Why it is different", body: t.botProduct.bridgeLine },
            { icon: Cpu, title: isArabic ? "لماذا هو تجريبي" : "Why it is experimental", body: t.beta.warning },
          ].map((item, index) => (
            <Reveal key={item.title} delay={index * 70}>
              <Card tone="bot" className="group relative flex h-full flex-col overflow-hidden">
                <div className="pointer-events-none absolute -end-12 -top-12 size-24 rounded-full bg-[radial-gradient(circle,rgba(255,77,46,0.12),transparent_60%)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <item.icon className="size-6 text-bot-accent" />
                <h3 className="font-display mt-4 text-[24px] font-extrabold tracking-[-0.04em] text-bot-text md:text-[28px]">
                  {item.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-bot-muted">{item.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES + WAITLIST ═══ */}
      <section className="px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-6 md:grid-cols-2">
          <Reveal>
            <Card tone="bot" className="flex h-full flex-col">
              <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-bot-accent">
                {isArabic ? "ماذا يتضمن هذا" : "What this includes"}
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-bot-text">
                {[
                  ...t.botProduct.bullets,
                  isArabic ? "5 رسائل مجانية كل 24 ساعة" : "5 free messages every 24 hours",
                ].map((bullet) => (
                  <li key={bullet} className="rounded-pill border border-line-dark-strong bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]">
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Nullalis technical block */}
              <div className="mt-auto pt-8">
                <div className="rounded-[20px] border border-line-dark-strong bg-black/20 p-5">
                  <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-bot-muted">
                    {isArabic ? "مدعوم بـ Nullalis" : "Powered by Nullalis"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-bot-muted">
                    {t.nullalis.intro}
                  </p>
                  <div className="mt-4 grid gap-2.5">
                    {t.nullalis.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3 text-sm leading-7 text-bot-text">
                        <Binary className="mt-1 size-4 shrink-0 text-bot-accent" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

          {/* Waitlist — premium conversion surface */}
          <Reveal delay={80}>
            <Card tone="bot" className="flex h-full flex-col" id="waitlist">
              <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-bot-accent">
                {isArabic ? "وصول مبكر" : "Early access"}
              </p>
              <h2 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-bot-text md:text-[34px]">
                {isArabic ? "جرّب زكي في البيتا" : "Try ZAKI during beta"}
              </h2>
              <p className="mt-3 max-w-[44ch] text-sm leading-7 text-bot-muted">
                {isArabic
                  ? "البيتا تشمل 5 رسائل كل 24 ساعة — مجانًا بينما نتعلّم ما ينجح. الاشتراكات المدفوعة تبدأ بعد هذه المرحلة."
                  : "The beta includes 5 messages every 24 hours — free while we learn what works. Paid subscriptions start after this phase."}
              </p>

              <div className="mt-5 flex-1">
                <WaitlistForm locale={locale} source="website_bot_page_waitlist" variant="dark" />
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <h2 className="font-display text-[28px] font-extrabold tracking-[-0.04em] text-bot-text md:text-[36px]">
              {isArabic ? "أسئلة زكي" : "ZAKI questions"}
            </h2>
          </Reveal>
          <Reveal delay={60} className="mt-8">
            <Accordion type="single" collapsible className="grid gap-2.5">
              {t.faq.items.map((item, index) => (
                <AccordionItem key={item.question} value={`bot-faq-${index}`}>
                  <AccordionTrigger className="text-bot-text">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-bot-muted">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

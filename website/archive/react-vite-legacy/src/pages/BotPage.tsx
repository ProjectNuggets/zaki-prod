import { ArrowUpRight, Binary, Bot, Cpu, Orbit } from "lucide-react";
import { SiteShell } from "../components/layout/SiteShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { WaitlistForm } from "../components/WaitlistForm";
import { Reveal } from "../components/Reveal";

import { appHandoffUrl } from "../lib/appHandoff";
import { getContent, type Locale } from "../lib/content";

export function BotPage({ locale }: { locale: Locale }) {
  const t = getContent(locale);
  const isArabic = locale === "ar";
  const runtimeFacts = [
    { label: isArabic ? "المدخل" : "Entry", value: isArabic ? "Chat مجاني" : "Free Chat" },
    { label: isArabic ? "الحالة" : "State", value: isArabic ? "Agent أساسي" : "Core Agent" },
    { label: isArabic ? "الأنسب لـ" : "Best for", value: isArabic ? "الخيط المستمر" : "Ongoing threads" },
    { label: isArabic ? "الذاكرة" : "Memory", value: "Brain" },
  ];

  return (
    <SiteShell locale={locale} route="product">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden px-4 pb-16 pt-[8vh] md:px-8 md:pb-24 md:pt-[10vh]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(241,2,2,0.10),transparent_50%)]" />

        <div className="mx-auto grid max-w-[1240px] gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <Reveal>
            <Badge tone="warning" pulse>{isArabic ? "Agent مع ذاكرة" : "Agent with memory"}</Badge>
            <h1 className="font-display mt-6 max-w-[12ch] text-[40px] font-extrabold leading-[0.92] tracking-[-0.06em] text-zk-text md:text-[72px]">
              {isArabic ? "معظم الذكاء الاصطناعي ينساك. زكي لا يفعل." : "Most AI forgets you. ZAKI doesn't."}
            </h1>
            <p className="mt-6 max-w-[58ch] text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
              {isArabic
                ? "ZAKI Agent هو AI مستمر بذاكرة واستمرارية. يحتفظ بالخيط معك بدل أن يبدأ من الصفر كل جلسة. وعندما يحتاج العمل إلى متابعة، يعطيه Agent وBrain مكانًا واضحًا."
                : "ZAKI Agent is persistent AI with memory and continuity. It keeps the thread with you instead of starting over every session. When the work should continue, Agent and Brain give it a visible home."}
            </p>
            <p className="mt-4 text-sm leading-7 text-zk-text-secondary">
              {isArabic
                ? "ابدأ من Chat مجانًا. عندما يصبح العمل مهمًا، افتح Agent للاستمرارية وراجع الذاكرة في Brain."
                : "Start from free Chat. When the work matters, open Agent for continuity and review memory in Brain."}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href={appHandoffUrl("/agent", "website_bot_page", "agent")}>{isArabic ? "افتح Agent" : "Open Agent"}</a>
              </Button>
              <Button asChild variant="bot">
                <a href="/product/">
                  {isArabic ? "تعرّف على الفرق" : "See ZAKI vs Spaces"}
                </a>
              </Button>
              <a href={appHandoffUrl("/spaces", "website_bot_page_chat", "chat")} className="inline-flex items-center gap-2 text-sm font-medium text-zk-text transition-colors hover:text-zk-accent">
                {isArabic ? "ابدأ Chat" : "Start with Chat"}
                <ArrowUpRight className="size-4" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <Card className="relative overflow-hidden">
              <div className="absolute end-[-40px] top-[-40px] size-32 rounded-full bg-[radial-gradient(circle,rgba(241,2,2,0.20),transparent_68%)] blur-2xl" />
              <div className="grid gap-3 md:grid-cols-2">
                {runtimeFacts.map((fact) => (
                  <div key={fact.label} className="rounded-[20px] border border-zk-border-strong bg-white/[0.03] px-4 py-4 transition-colors hover:bg-white/[0.05]">
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.24em] text-zk-text-secondary">{fact.label}</p>
                    <p className="mt-2 text-sm font-medium text-zk-text">{fact.value}</p>
                  </div>
                ))}
              </div>
              <p className="font-mono-ui mt-5 text-[10px] uppercase tracking-[0.3em] text-zk-accent">
                {isArabic ? "مشغّل شخصي / معاينة قابلة للتدريب" : "personal operator / trainable preview"}
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
            {
              icon: Orbit,
              title: isArabic ? "كيف يعمل مع Chat وBrain" : "How it works with Chat and Brain",
              body: isArabic
                ? "Chat يعطيك بداية سريعة. Agent يحمل الاستمرارية والعلاقة طويلة المدى. Brain يعرض ما يعرفه ZAKI وما يحتاج مراجعة."
                : "Chat gives you a fast start. Agent carries the long-running relationship. Brain shows what ZAKI knows and what needs review.",
            },
            { icon: Cpu, title: isArabic ? "لماذا المسارات القادمة مقيّدة" : "Why future lanes are gated", body: t.beta.warning },
          ].map((item, index) => (
            <Reveal key={item.title} delay={index * 70}>
              <Card className="group relative flex h-full flex-col overflow-hidden">
                <div className="pointer-events-none absolute -end-12 -top-12 size-24 rounded-full bg-[radial-gradient(circle,rgba(241,2,2,0.12),transparent_60%)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <item.icon className="size-6 text-zk-accent" />
                <h3 className="font-display mt-4 text-[24px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[28px]">
                  {item.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-7 text-zk-text-secondary">{item.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES + WAITLIST ═══ */}
      <section className="px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-[1240px] gap-6 md:grid-cols-2">
          <Reveal>
            <Card className="flex h-full flex-col">
              <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-zk-accent">
                {isArabic ? "ماذا يتضمن هذا" : "What this includes"}
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-zk-text">
                {[
                  ...t.botProduct.bullets,
                  isArabic ? "Brain يجعل الذاكرة مرئية وقابلة للمراجعة" : "Brain makes memory visible and reviewable",
                ].map((bullet) => (
                  <li key={bullet} className="rounded-xl border border-zk-border-strong bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]">
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Runtime technical block */}
              <div className="mt-auto pt-8">
                <div className="rounded-[20px] border border-zk-border-strong bg-black/20 p-5">
                  <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-secondary">
                    {isArabic ? "مدعوم ببنية زكي الخاصة" : "Powered by ZAKI's private runtime"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-zk-text-secondary">
                    {t.privateRuntime.intro}
                  </p>
                  <div className="mt-4 grid gap-2.5">
                    {t.privateRuntime.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-start gap-3 text-sm leading-7 text-zk-text">
                        <Binary className="mt-1 size-4 shrink-0 text-zk-accent" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>

              {/* Updates — future product conversion surface */}
          <Reveal delay={80}>
            <Card className="flex h-full flex-col" id="waitlist">
              <p className="font-mono-ui text-xs uppercase tracking-[0.24em] text-zk-accent">
                {isArabic ? "تحديثات المنتجات القادمة" : "Future product updates"}
              </p>
              <h2 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[34px]">
                {isArabic ? "تابع Learn وDesign وHire" : "Follow Learn, Design, and Hire"}
              </h2>
              <p className="mt-3 max-w-[44ch] text-sm leading-7 text-zk-text-secondary">
                {isArabic
                  ? "هذه المسارات ليست وصولًا عامًا بعد. اترك بريدك لتحديثات الوصول المبكر بينما تبقى البداية اليوم في Chat وAgent."
                  : "These lanes are not public access yet. Leave an email for early-access updates while today's start remains Chat and Agent."}
              </p>

              <div className="mt-5 flex-1">
                <WaitlistForm locale={locale} source="website_bot_page_waitlist" />
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <h2 className="font-display text-[28px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[36px]">
              {isArabic ? "أسئلة زكي" : "ZAKI questions"}
            </h2>
          </Reveal>
          <Reveal delay={60} className="mt-8">
            <Accordion type="single" collapsible className="grid gap-2.5">
              {t.faq.items.map((item, index) => (
                <AccordionItem key={item.question} value={`bot-faq-${index}`}>
                  <AccordionTrigger className="text-zk-text">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-zk-text-secondary">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

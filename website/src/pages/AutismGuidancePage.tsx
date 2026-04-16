import {
  ArrowUpRight,
  FlaskConical,
  Globe2,
  ShieldAlert,
  Stethoscope,
  UserRoundSearch,
} from "lucide-react";
import { Reveal } from "../components/Reveal";
import { SiteShell } from "../components/layout/SiteShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import type { Locale } from "../lib/content";
import type { ComponentType } from "react";

type AutismGuidancePageContent = {
  badge: string;
  title: string;
  intro: string;
  subnote: string;
  scopeTitle: string;
  scopeSummary: string;
  helpsTitle: string;
  helpsWith: Array<{
    title: string;
    body: string;
    icon: ComponentType<{ className?: string }>;
  }>;
  boundariesTitle: string;
  boundaries: string[];
  workflowTitle: string;
  workflow: Array<{ title: string; body: string }>;
  thesisTitle: string;
  thesis: string;
  expertTitle: string;
  expertReview: string[];
  embed: {
    title: string;
    intro: string;
    url: string | null;
    fallback: string;
    openExternalLabel: string;
  };
  closingTitle: string;
  closingBody: string;
  cta: {
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
};

const AUTISM_GUIDANCE_EMBED_URL =
  "https://lnx.novanuggets.com/chatbot/5c246d32-93e1-4106-8ae9-5dacf1a16357";

const contentByLocale: Record<Locale, AutismGuidancePageContent> = {
  en: {
    badge: "Proof of concept",
    title: "A bilingual autism guidance assistant, built for structured understanding.",
    intro:
      "This ZAKI proof of concept is designed to help users understand autism-related questions, organize observations, and prepare for assessment or support conversations in a more structured way.",
    subnote: "For education and assessment preparation. Not a formal diagnosis.",
    scopeTitle: "What this page is for",
    scopeSummary:
      "This page is being shared with experts to validate scope, safety, language quality, and whether a structured bilingual assistant can be useful before clinical or educational conversations.",
    helpsTitle: "What it can help with",
    helpsWith: [
      {
        icon: UserRoundSearch,
        title: "Structured understanding",
        body:
          "Explain autism presentations, traits, and common questions in plain but clinically responsible language.",
      },
      {
        icon: Stethoscope,
        title: "Assessment preparation",
        body:
          "Help users organize examples, patterns, and questions before speaking with a specialist or assessment center.",
      },
      {
        icon: FlaskConical,
        title: "Framework explanation",
        body:
          "Clarify categories, support needs, and diagnostic frameworks without overstating certainty.",
      },
      {
        icon: Globe2,
        title: "Bilingual guidance",
        body:
          "Support Arabic and English conversations for users, caregivers, and professionals working across both languages.",
      },
    ],
    boundariesTitle: "What it does not do",
    boundaries: [
      "It does not provide a formal diagnosis.",
      "It does not replace qualified clinicians, psychologists, or specialist assessment teams.",
      "It does not treat a short chat as certainty.",
      "It is not for emergencies, crisis situations, or urgent mental-health risk.",
    ],
    workflowTitle: "How it works",
    workflow: [
      {
        title: "1. Describe the concern",
        body:
          "The user explains behaviors, traits, history, or questions they want help understanding.",
      },
      {
        title: "2. ZAKI asks structured follow-up questions",
        body:
          "The assistant gathers clearer context instead of jumping too quickly to a conclusion.",
      },
      {
        title: "3. It organizes observations and next steps",
        body:
          "The output should help the user prepare for assessment, support planning, or better-informed conversations.",
      },
    ],
    thesisTitle: "Why this PoC exists",
    thesis:
      "Many people struggle to organize patterns, understand terminology, and prepare clearly for autism-related conversations. This proof of concept explores whether a calm, structured assistant can reduce confusion and improve readiness without pretending to replace expert judgment.",
    expertTitle: "What experts are being asked to validate",
    expertReview: [
      "Whether the scope is clinically and ethically framed correctly.",
      "Whether the language is accurate without becoming inaccessible.",
      "Whether structured follow-up is genuinely useful for users and caregivers.",
      "Whether the Arabic presentation feels credible and natural.",
      "Whether the boundaries are strong enough for a public-facing prototype.",
    ],
    embed: {
      title: "Assistant preview",
      intro:
        "The live assistant is embedded below. You can also open it in a separate tab if you want a cleaner standalone view.",
      url: AUTISM_GUIDANCE_EMBED_URL,
      fallback:
        "The assistant preview could not be loaded here right now. Please open it in a new tab and try again later.",
      openExternalLabel: "Open in new tab",
    },
    closingTitle: "A guidance surface, not a diagnostic shortcut",
    closingBody:
      "The value of this concept is structure, clarity, and preparation. If the framing is right, it can help users arrive at clinical or educational conversations better prepared, not falsely reassured.",
    cta: {
      primaryLabel: "Open the assistant",
      primaryHref: "#assistant-preview",
      secondaryLabel: "Read the scope",
      secondaryHref: "#scope-note",
    },
  },
  ar: {
    badge: "إثبات مفهوم",
    title: "مساعد لفهم التوحّد بصورة منظّمة ودقيقة.",
    intro:
      "هذا النموذج الأولي من زكي صُمّم لمساعدة المستخدم على فهم الأسئلة المرتبطة بالتوحّد، وتنظيم الملاحظات، والاستعداد بشكل أوضح لمحادثات التقييم أو الدعم.",
    subnote: "للتثقيف والاستعداد للتقييم. ليس تشخيصًا رسميًا.",
    scopeTitle: "ما الغرض من هذه الصفحة",
    scopeSummary:
      "هذه الصفحة مخصّصة لمراجعة الخبراء، من أجل تقييم سلامة الإطار، ودقة اللغة، وجودة العرض بالعربية والإنجليزية، ومدى فائدة المساعد المنظّم قبل أي نقاش سريري أو تعليمي.",
    helpsTitle: "ما الذي يمكن أن يساعد فيه",
    helpsWith: [
      {
        icon: UserRoundSearch,
        title: "فهم منظّم",
        body: "شرح أنماط التوحّد وسماته والأسئلة الشائعة بلغة واضحة ومسؤولة علميًا.",
      },
      {
        icon: Stethoscope,
        title: "الاستعداد للتقييم",
        body:
          "مساعدة المستخدم على جمع الأمثلة والأنماط والأسئلة قبل التحدث إلى مختص أو مركز تقييم.",
      },
      {
        icon: FlaskConical,
        title: "شرح الأطر والفئات",
        body: "توضيح الفئات والاحتياجات الداعمة والأطر التشخيصية من دون مبالغة في اليقين.",
      },
      {
        icon: Globe2,
        title: "دعم ثنائي اللغة",
        body:
          "إتاحة الحوار بالعربية والإنجليزية للمستخدمين والأهالي والمهنيين العاملين بين اللغتين.",
      },
    ],
    boundariesTitle: "ما الذي لا يقوم به",
    boundaries: [
      "لا يقدّم تشخيصًا رسميًا.",
      "لا يحل محل الأطباء أو الأخصائيين أو فرق التقييم المتخصصة.",
      "لا يتعامل مع محادثة قصيرة على أنها يقين سريري.",
      "ليس مخصصًا للطوارئ أو الأزمات أو حالات الخطر النفسي العاجل.",
    ],
    workflowTitle: "كيف يعمل",
    workflow: [
      {
        title: "1. وصف السؤال أو القلق",
        body:
          "يشرح المستخدم السلوكيات أو السمات أو الخلفية أو الأسئلة التي يريد فهمها بصورة أدق.",
      },
      {
        title: "2. يطرح زكي أسئلة متابعة منظّمة",
        body: "يجمع المساعد سياقًا أوضح بدل أن يقفز بسرعة إلى استنتاج غير مسؤول.",
      },
      {
        title: "3. ينظّم الملاحظات والخطوات التالية",
        body:
          "يهدف الناتج إلى مساعدة المستخدم على الاستعداد للتقييم أو التخطيط للدعم أو إجراء حوار أوضح مع المختصين.",
      },
    ],
    thesisTitle: "لماذا يوجد هذا النموذج الأولي",
    thesis:
      "كثير من الناس يجدون صعوبة في تنظيم الملاحظات وفهم المصطلحات والاستعداد بوضوح للمحادثات المرتبطة بالتوحّد. هذا النموذج يختبر ما إذا كان المساعد الهادئ والمنظّم قادرًا على تقليل الالتباس وتحسين الاستعداد، من دون الادعاء بأنه بديل عن الحكم المتخصص.",
    expertTitle: "ما الذي نطلب من الخبراء تقييمه",
    expertReview: [
      "هل الإطار السريري والأخلاقي مضبوط كما ينبغي.",
      "هل اللغة دقيقة من دون أن تصبح معقدة أو مغلقة على غير المختصين.",
      "هل أسئلة المتابعة المنظّمة مفيدة فعلًا للمستخدمين والأهالي.",
      "هل الصياغة العربية طبيعية وموثوقة مهنيًا.",
      "هل حدود المنتج واضحة بما يكفي لنموذج أولي موجه للعامة.",
    ],
    embed: {
      title: "معاينة المساعد",
      intro:
        "المساعد التفاعلي مضمّن في الأسفل مباشرة، ويمكنك أيضًا فتحه في تبويب مستقل إذا أردت مساحة أوضح.",
      url: AUTISM_GUIDANCE_EMBED_URL,
      fallback:
        "تعذر تحميل معاينة المساعد هنا الآن. افتحها في تبويب جديد ثم أعد المحاولة لاحقًا.",
      openExternalLabel: "افتحه في تبويب جديد",
    },
    closingTitle: "سطح إرشادي، لا طريق مختصر إلى التشخيص",
    closingBody:
      "قيمة هذا المفهوم هي التنظيم والوضوح والاستعداد الأفضل. وإذا كان الإطار مضبوطًا، فيمكنه أن يساعد المستخدم على الوصول إلى الحوار السريري أو التعليمي بصورة أنضج، لا أن يمنحه يقينًا زائفًا.",
    cta: {
      primaryLabel: "افتح المساعد",
      primaryHref: "#assistant-preview",
      secondaryLabel: "اقرأ النطاق",
      secondaryHref: "#scope-note",
    },
  },
};

export function AutismGuidancePage({ locale }: { locale: Locale }) {
  const content = contentByLocale[locale];
  const assistantHref = content.cta.primaryHref;

  return (
    <SiteShell locale={locale} route="autism-guidance">
      <section className="px-4 pb-10 pt-8 md:px-8 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <Badge tone="chat">{content.badge}</Badge>
            <h1 className="font-display mt-6 max-w-[14ch] text-[40px] font-extrabold leading-[0.94] tracking-[-0.06em] md:text-[72px]">
              {content.title}
            </h1>
            <p className="mt-6 max-w-[68ch] text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
              {content.intro}
            </p>
            <p className="font-mono-ui mt-5 text-xs uppercase tracking-[0.18em] text-zk-accent">
              {content.subnote}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href={assistantHref}>{content.cta.primaryLabel}</a>
              </Button>
              <Button asChild variant="secondary">
                <a href={content.cta.secondaryHref}>{content.cta.secondaryLabel}</a>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-4 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1240px] space-y-6">
          <Reveal>
            <Card
              id="scope-note"
              className="scroll-mt-24 bg-zk-bg-raised"
            >
              <p className="font-mono-ui text-[11px] uppercase tracking-[0.18em] text-zk-accent">
                {content.scopeTitle}
              </p>
              <p className="mt-4 text-sm leading-7 text-zk-text md:text-base md:leading-8">
                {content.scopeSummary}
              </p>
            </Card>
          </Reveal>

          <Reveal delay={60}>
            <Card id="assistant-preview" className="scroll-mt-24 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-[64ch]">
                  <p className="font-mono-ui text-[11px] uppercase tracking-[0.18em] text-zk-accent">
                    {content.embed.title}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
                    {content.embed.intro}
                  </p>
                </div>
                {content.embed.url ? (
                  <a
                    href={content.embed.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
                  >
                    {content.embed.openExternalLabel}
                    <ArrowUpRight className="size-4" />
                  </a>
                ) : null}
              </div>

              {content.embed.url ? (
                <div className="mt-6">
                  <div className="overflow-hidden rounded-[24px] border border-zk-border bg-zk-bg">
                    <iframe
                      src={content.embed.url}
                      title={locale === "ar" ? "مساعد زكي للتوحّد" : "ZAKI autism guidance assistant"}
                      className="min-h-[780px] w-full border-0"
                      loading="lazy"
                      allow="clipboard-write; microphone"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[24px] border border-dashed border-zk-border-strong bg-zk-surface px-6 py-10 text-sm leading-7 text-zk-text-secondary md:px-8">
                  {content.embed.fallback}
                </div>
              )}
            </Card>
          </Reveal>

          <Reveal delay={90}>
            <h2 className="font-display text-[28px] font-extrabold tracking-[-0.04em] md:text-[36px]">
              {content.helpsTitle}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {content.helpsWith.map((item, index) => (
                <Card
                  key={item.title}
                  className={
                    index === content.helpsWith.length - 1 && content.helpsWith.length % 2 === 1
                      ? "md:col-span-2"
                      : ""
                  }
                >
                  <item.icon className="size-6 text-zk-accent" />
                  <h2 className="font-display mt-4 text-[24px] font-extrabold tracking-[-0.04em] md:text-[30px]">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
                    {item.body}
                  </p>
                </Card>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <Card className="border border-zk-accent/18 bg-zk-accent/6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="size-5 text-zk-accent" />
                <h2 className="font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[30px]">
                  {content.boundariesTitle}
                </h2>
              </div>
              <ul className="mt-5 space-y-3">
                {content.boundaries.map((item) => (
                  <li
                    key={item}
                    className="rounded-[18px] border border-zk-accent/12 bg-zk-surface px-4 py-4 text-sm leading-7 text-zk-text"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
            <Reveal delay={150}>
              <Card className="h-full">
                <h2 className="font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[30px]">
                  {content.workflowTitle}
                </h2>
                <ol className="mt-6 space-y-4">
                  {content.workflow.map((step) => (
                    <li
                      key={step.title}
                      className="rounded-[20px] border border-zk-border bg-zk-surface px-5 py-5"
                    >
                      <p className="text-sm font-semibold text-zk-text">{step.title}</p>
                      <p className="mt-2 text-sm leading-7 text-zk-text-secondary">{step.body}</p>
                    </li>
                  ))}
                </ol>
              </Card>
            </Reveal>

            <div className="grid gap-6">
              <Reveal delay={180}>
                <Card className="h-full">
                  <h2 className="font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[30px]">
                    {content.thesisTitle}
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
                    {content.thesis}
                  </p>
                </Card>
              </Reveal>

              <Reveal delay={210}>
                <Card className="h-full">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="size-5 text-zk-accent" />
                    <h2 className="font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[30px]">
                      {content.expertTitle}
                    </h2>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {content.expertReview.map((item) => (
                      <li
                        key={item}
                        className="rounded-[18px] border border-zk-border bg-zk-surface px-4 py-4 text-sm leading-7 text-zk-text"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              </Reveal>
            </div>
          </div>

          <Reveal delay={240}>
            <Card className="bg-zk-bg-raised">
              <h2 className="font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[30px]">
                {content.closingTitle}
              </h2>
              <p className="mt-4 max-w-[72ch] text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
                {content.closingBody}
              </p>
            </Card>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

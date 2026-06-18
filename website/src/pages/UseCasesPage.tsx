import { ArrowRight, BriefcaseBusiness, GraduationCap, Languages, PenLine, Search, Settings2 } from "lucide-react";
import { SiteShell } from "../components/layout/SiteShell";
import { JourneyMap } from "../components/JourneyMap";
import { Reveal } from "../components/Reveal";
import type { Locale } from "../lib/content";
import { appHandoffUrl, productHandoffUrl } from "../lib/appHandoff";
import { V3UseCasesPage } from "../components/v3/V3Website";

const useCases = [
  {
    icon: PenLine,
    title: "Write and ship daily work",
    body: "Draft emails, posts, summaries, and briefs in Arabic, English, or both without turning every task into a new tool setup.",
    href: productHandoffUrl("chat"),
    cta: "Start in Chat",
  },
  {
    icon: Search,
    title: "Research with continuity",
    body: "Keep decisions, sources, and next steps connected through Agent instead of losing the thread between sessions.",
    href: productHandoffUrl("agent"),
    cta: "Open Agent",
  },
  {
    icon: Languages,
    title: "Work across languages",
    body: "Move between dialect, Arabic, and English while preserving tone, intent, and business context.",
    href: productHandoffUrl("chat"),
    cta: "Try bilingual work",
  },
  {
    icon: Settings2,
    title: "Control memory and access",
    body: "Use Brain and Settings to inspect memory, manage product access, connect providers, and keep account-level controls in one place.",
    href: appHandoffUrl("/settings", "website_use_cases_settings", "dashboard"),
    cta: "Open Settings",
  },
  {
    icon: GraduationCap,
    title: "Study planning",
    body: "Learn remains private beta. Today, Chat can help with study notes and Agent can plan a learning path without claiming a launched Learn product.",
    href: appHandoffUrl("/learn", "website_use_cases_learn_beta", "learn_waitlist"),
    cta: "View beta",
  },
  {
    icon: BriefcaseBusiness,
    title: "Job-search preparation",
    body: "Hire remains private beta. Today, Chat can improve CV copy and Agent can plan the search while the full Hire flow stays gated.",
    href: appHandoffUrl("/hire", "website_use_cases_hire_beta", "hire_waitlist"),
    cta: "View beta",
  },
];

export function UseCasesPage({ locale }: { locale: Locale }) {
  if (locale === "en") return <V3UseCasesPage />;

  const isArabic = locale === "ar";

  return (
    <SiteShell locale={locale} route="use-cases">
      <section className="border-b border-zk-border px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.28em] text-zk-accent">
              {isArabic ? "الاستخدامات" : "Use cases"}
            </p>
            <h1 className="font-display mt-5 max-w-[13ch] text-[44px] font-extrabold leading-[0.94] tracking-[-0.05em] text-zk-text md:text-[72px]">
              {isArabic ? "ابدأ بالعمل، لا بالواجهة." : "Start with the work, not the interface."}
            </h1>
            <p className="mt-6 max-w-[64ch] text-base leading-8 text-zk-text-secondary">
              {isArabic
                ? "استخدم Chat عندما تحتاج بداية سريعة، Agent عندما يحتاج العمل متابعة، وBrain عندما تريد فهم الذاكرة والتحكم بها."
                : "Use Chat when you need a fast start, Agent when work needs follow-through, and Brain when memory needs to be visible and controllable."}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid border border-zk-border-strong bg-zk-surface md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="group flex min-h-[300px] flex-col border-b border-e border-zk-border p-6 transition-colors hover:bg-zk-surface-hover lg:[&:nth-child(3n)]:border-e-0 lg:[&:nth-last-child(-n+3)]:border-b-0"
              >
                <item.icon className="size-5 text-zk-accent" strokeWidth={1.5} />
                <h2 className="mt-8 text-xl font-semibold text-zk-text">{item.title}</h2>
                <p className="mt-4 flex-1 text-sm leading-7 text-zk-text-secondary">{item.body}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-zk-accent">
                  {item.cta}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <JourneyMap locale={locale} />
    </SiteShell>
  );
}

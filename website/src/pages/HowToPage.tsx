import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "../components/layout/SiteShell";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Reveal } from "../components/Reveal";
import type { HowToSlug } from "../lib/routeContent";
import { getHowToContent } from "../lib/routeContent";

export function HowToPage({ slug }: { slug: HowToSlug }) {
  const content = getHowToContent(slug);

  return (
    <SiteShell locale="en" route="howto">
      <section className="px-4 pb-10 pt-8 md:px-8 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-[1180px]">
          <Reveal>
            <Badge tone="chat">{content.badge}</Badge>
            <h1 className="font-display mt-6 max-w-[14ch] text-[40px] font-extrabold leading-[0.94] tracking-[-0.06em] md:text-[72px]">
              {content.title}
            </h1>
            <p className="mt-6 max-w-[64ch] text-sm leading-7 text-[var(--chat-muted)] md:text-base md:leading-8">
              {content.intro}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-4 md:px-8 md:py-8">
        <div className="mx-auto grid max-w-[1180px] gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <Card className="h-full">
              <h2 className="font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[32px]">
                Step-by-step
              </h2>
              <ol className="mt-6 space-y-4">
                {content.steps.map((step, index) => (
                  <li
                    key={step.title}
                    className="rounded-[20px] border border-[var(--line-light)] bg-[rgba(255,255,255,0.72)] px-5 py-5"
                  >
                    <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-[var(--chat-accent)]">
                      Step {index + 1}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-[var(--chat-text)]">{step.title}</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--chat-muted)]">{step.text}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </Reveal>

          <div className="grid gap-6">
            <Reveal delay={70}>
              <Card className="h-full">
                <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-[var(--chat-accent)]">
                  Example prompt
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--chat-text)]">{content.examplePrompt}</p>
              </Card>
            </Reveal>
            <Reveal delay={110}>
              <Card className="h-full">
                <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-[var(--chat-accent)]">
                  What good output looks like
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--chat-muted)]">{content.goodOutput}</p>
              </Card>
            </Reveal>
            <Reveal delay={150}>
              <div className="flex flex-wrap gap-3">
                {content.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line-light)] bg-white/88 px-4 text-sm font-medium text-[var(--chat-text)] transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
                  >
                    {link.label}
                    <ArrowUpRight className="size-4" />
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}


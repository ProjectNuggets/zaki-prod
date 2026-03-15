import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "../components/layout/SiteShell";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Reveal } from "../components/Reveal";
import type { ComparisonSlug } from "../lib/routeContent";
import { getComparisonContent } from "../lib/routeContent";

export function ComparisonPage({ slug }: { slug: ComparisonSlug }) {
  const content = getComparisonContent(slug);

  return (
    <SiteShell locale="en" route="comparison">
      <section className="px-4 pb-10 pt-8 md:px-8 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-[1240px]">
          <Reveal>
            <Badge tone="chat">{content.badge}</Badge>
            <h1 className="font-display mt-6 max-w-[14ch] text-[40px] font-extrabold leading-[0.94] tracking-[-0.06em] md:text-[72px]">
              {content.title}
            </h1>
            <p className="mt-6 max-w-[68ch] text-sm leading-7 text-[var(--chat-muted)] md:text-base md:leading-8">
              {content.intro}
            </p>
            {content.note ? (
              <p className="font-mono-ui mt-5 text-xs uppercase tracking-[0.18em] text-[var(--chat-accent)]">
                {content.note}
              </p>
            ) : null}
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-4 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1240px] space-y-6">
          <Reveal>
            <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,244,236,0.9))]">
              <p className="text-sm leading-7 text-[var(--chat-text)] md:text-base md:leading-8">
                {content.definition}
              </p>
            </Card>
          </Reveal>

          <Reveal delay={60}>
            <div className="overflow-hidden rounded-[28px] border border-[var(--line-light)] bg-white shadow-[0_24px_60px_rgba(17,10,6,0.08)]">
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      {content.table.headers.map((header) => (
                        <th
                          key={header}
                          className="border-b border-[var(--line-light)] bg-[#f7efe6] px-5 py-4 text-left font-mono-ui text-[11px] uppercase tracking-[0.18em] text-[#7b6a57]"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {content.table.rows.map((row) => (
                      <tr key={row.feature}>
                        <td className="border-b border-[var(--line-light)] px-5 py-4 text-sm font-semibold text-[var(--chat-text)]">
                          {row.feature}
                        </td>
                        {row.values.map((value) => (
                          <td
                            key={`${row.feature}-${value}`}
                            className="border-b border-[var(--line-light)] px-5 py-4 text-sm leading-7 text-[var(--chat-muted)]"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <Card className="border-l-[4px] border-l-[var(--chat-accent)] bg-[#fcf7f0]">
              <p className="text-sm leading-7 text-[#4f473d] md:text-base md:leading-8">"{content.quote}"</p>
            </Card>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-2">
            {content.sections.map((section, index) => (
              <Reveal key={section.title} delay={index * 70}>
                <Card className={section.items ? "h-full" : index === content.sections.length - 1 ? "md:col-span-2" : "h-full"}>
                  <h2 className="font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[32px]">
                    {section.title}
                  </h2>
                  {section.body ? (
                    <p className="mt-4 text-sm leading-7 text-[var(--chat-muted)] md:text-base md:leading-8">
                      {section.body}
                    </p>
                  ) : null}
                  {section.items ? (
                    <ul className="mt-5 space-y-3">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="rounded-[18px] border border-[var(--line-light)] bg-[rgba(255,255,255,0.66)] px-4 py-4 text-sm leading-7 text-[var(--chat-text)]"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Card>
              </Reveal>
            ))}
          </div>

          {content.disclaimer ? (
            <Reveal delay={120}>
              <div className="rounded-[24px] border border-[rgba(210,68,48,0.18)] bg-[rgba(210,68,48,0.07)] px-5 py-5 text-sm leading-7 text-[#6f5347]">
                {content.disclaimer}
              </div>
            </Reveal>
          ) : null}

          <Reveal delay={140}>
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
      </section>
    </SiteShell>
  );
}


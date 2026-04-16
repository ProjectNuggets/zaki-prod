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
            <p className="mt-6 max-w-[68ch] text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
              {content.intro}
            </p>
            {content.note ? (
              <p className="font-mono-ui mt-5 text-xs uppercase tracking-[0.18em] text-zk-accent">
                {content.note}
              </p>
            ) : null}
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-4 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1240px] space-y-6">
          <Reveal>
            <Card className="bg-zk-bg-raised">
              <p className="text-sm leading-7 text-zk-text md:text-base md:leading-8">
                {content.definition}
              </p>
            </Card>
          </Reveal>

          <Reveal delay={60}>
            <div className="overflow-hidden rounded-[28px] border border-zk-border bg-zk-surface shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full border-separate border-spacing-0">
                  <thead>
                    <tr>
                      {content.table.headers.map((header) => (
                        <th
                          key={header}
                          className="border-b border-zk-border bg-zk-bg-raised px-5 py-4 text-left font-mono-ui text-[11px] uppercase tracking-[0.18em] text-zk-text-tertiary"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {content.table.rows.map((row) => (
                      <tr key={row.feature}>
                        <td className="border-b border-zk-border px-5 py-4 text-sm font-semibold text-zk-text">
                          {row.feature}
                        </td>
                        {row.values.map((value) => (
                          <td
                            key={`${row.feature}-${value}`}
                            className="border-b border-zk-border px-5 py-4 text-sm leading-7 text-zk-text-secondary"
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
            <Card className="border-l-[4px] border-l-zk-accent bg-zk-bg-raised">
              <p className="text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">"{content.quote}"</p>
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
                    <p className="mt-4 text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
                      {section.body}
                    </p>
                  ) : null}
                  {section.items ? (
                    <ul className="mt-5 space-y-3">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="rounded-[18px] border border-zk-border bg-zk-surface px-4 py-4 text-sm leading-7 text-zk-text"
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
              <div className="rounded-[24px] border border-[rgba(241,2,2,0.2)] bg-[rgba(241,2,2,0.08)] px-5 py-5 text-sm leading-7 text-zk-text-secondary">
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
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
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


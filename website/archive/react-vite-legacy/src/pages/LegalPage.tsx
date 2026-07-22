import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SiteShell } from "../components/layout/SiteShell";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Reveal } from "../components/Reveal";
import type { Locale } from "../lib/content";
import type { LegalSlug } from "../lib/routeContent";
import { getLegalContent } from "../lib/routeContent";

export function LegalPage({ locale, slug }: { locale: Locale; slug: LegalSlug }) {
  const content = getLegalContent(slug, locale);
  const { hash } = useLocation();

  // React Router does not auto-scroll to hash fragments. Manually align so
  // /privacy#cookies (linked from the cookie banner) lands on the right
  // section instead of the page top.
  useEffect(() => {
    if (!hash) return;
    const id = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!id) return;
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hash, slug]);

  return (
    <SiteShell locale={locale} route="legal">
      <section className="px-4 pb-10 pt-8 md:px-8 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-[1180px]">
          <Reveal>
            <Badge tone="chat">{content.badge}</Badge>
            <h1 className="font-display mt-6 text-[40px] font-extrabold leading-[0.94] tracking-[-0.06em] md:text-[72px]">
              {content.title}
            </h1>
            <p className="mt-6 max-w-[68ch] text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
              {content.intro}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-4 md:px-8 md:py-8">
        <div className="mx-auto grid max-w-[1180px] gap-5">
          {content.sections.map((section, index) => (
            <Reveal key={section.title} delay={index * 40}>
              <Card>
                <h2
                  id={section.anchor}
                  className="scroll-mt-24 font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[28px]"
                >
                  {section.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
                  {section.body.includes("@") ? (
                    <a href={`mailto:${section.body}`} className="text-zk-text underline decoration-zk-accent/35 underline-offset-4">
                      {section.body}
                    </a>
                  ) : (
                    section.body
                  )}
                </p>
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
      </section>
    </SiteShell>
  );
}

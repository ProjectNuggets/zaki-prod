import { Mail, ArrowUpRight } from "lucide-react";
import { SiteShell } from "../components/layout/SiteShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Reveal } from "../components/Reveal";
import { appHandoffUrl } from "../lib/appHandoff";
import { getContactContent } from "../lib/routeContent";
import type { Locale } from "../lib/content";

export function ContactPage({ locale }: { locale: Locale }) {
  const content = getContactContent(locale);
  const isArabic = locale === "ar";

  return (
    <SiteShell locale={locale} route="contact">
      <section className="px-4 pb-10 pt-8 md:px-8 md:pb-16 md:pt-12">
        <div className="mx-auto max-w-[1180px]">
          <Reveal>
            <Badge tone="chat">{content.badge}</Badge>
            <h1 className="font-display mt-6 text-[40px] font-extrabold leading-[0.94] tracking-[-0.06em] md:text-[72px]">
              {content.title}
            </h1>
            <p className="mt-6 max-w-[60ch] text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
              {content.intro}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href="mailto:support@chatzaki.com">
                  <Mail className="size-4" />
                  {content.emailLabel}
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a href={appHandoffUrl("/", "website_contact", "dashboard")}>{content.appLabel}</a>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-4 md:px-8 md:py-8">
        <div className="mx-auto grid max-w-[1180px] gap-6 md:grid-cols-2">
          {content.cards.map((card, index) => (
            <Reveal key={card.title} delay={index * 80}>
              <Card className="h-full">
                <h2 className="font-display text-[24px] font-extrabold tracking-[-0.04em] md:text-[32px]">
                  {card.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-zk-text-secondary md:text-base md:leading-8">
                  {card.body}
                </p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-4 py-4 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1180px]">
          <Reveal delay={100}>
            <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-zk-accent">
                  {isArabic ? "استجابة مباشرة" : "Direct response"}
                </p>
                <p className="mt-3 text-sm leading-7 text-zk-text-secondary">
                  {isArabic
                    ? "للطلبات الحساسة، أرسل بريد الحساب والطابع الزمني وملخصًا واضحًا للمشكلة."
                    : "For sensitive requests, include the account email, timestamp, and a clear summary of the issue."}
                </p>
              </div>
              <a
                href="mailto:support@chatzaki.com"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-zk-border bg-zk-surface px-4 text-sm font-medium text-zk-text transition hover:-translate-y-0.5 hover:border-zk-border-strong"
              >
                support@chatzaki.com
                <ArrowUpRight className="size-4" />
              </a>
            </Card>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Reveal } from "./Reveal";
import type { Locale, WebsiteContent } from "../lib/content";

export function ClosingCta({ locale, t, source }: { locale: Locale; t: WebsiteContent; source: string }) {
  const isArabic = locale === "ar";

  return (
    <section className="relative z-10 px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1240px] text-center">
        <Reveal>
          <h2 className="font-display mx-auto max-w-[18ch] text-[32px] font-extrabold leading-[0.96] tracking-[-0.05em] text-chat-text md:text-[56px]">
            {t.cta.heading}
          </h2>
        </Reveal>
        <Reveal delay={60}>
          <p className="mx-auto mt-6 max-w-[48ch] whitespace-pre-line text-base leading-8 text-chat-muted">
            {t.cta.subheading}
          </p>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`https://app.chatzaki.com/?auth=signup&source=${source}`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-chat-accent px-6 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(201,57,42,0.3)] transition hover:-translate-y-0.5 hover:bg-chat-accent-hover"
            >
              {t.cta.secondary}
              <ArrowUpRight className="size-4" />
            </a>
            <Link
              to={isArabic ? "/ar/contact/" : "/contact/"}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong bg-white/80 px-6 text-sm font-medium text-chat-text transition hover:-translate-y-0.5 hover:border-[#d7c6b5]"
            >
              {t.cta.primary}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </Reveal>
        <Reveal delay={160}>
          <p className="font-mono-ui mt-8 text-xs uppercase tracking-[0.24em] text-chat-accent">
            {t.cta.hoverLine}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

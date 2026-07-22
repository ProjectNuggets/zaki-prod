import { AlertTriangle } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { Badge } from "./ui/badge";
import { Reveal } from "./Reveal";

export function BetaWarningStrip({ locale, t }: { locale: Locale; t: WebsiteContent }) {
  const isArabic = locale === "ar";
  return (
    <section className="bg-[#0d0b09] py-10 md:py-16">
      <Reveal>
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="max-w-[520px]">
            <Badge tone="warning" pulse>
              <AlertTriangle className="size-3" />
              {isArabic ? "تجريبي" : "Experimental"}
            </Badge>
            <p className="mt-5 text-[15px] leading-[1.8] text-[#f8f2e9]/70 md:text-base">
              {t.beta.warning}
            </p>
          </div>
          <div className="grid gap-2.5 text-[14px] leading-7 md:min-w-[340px]">
            {t.beta.bullets.slice(0, 3).map((bullet) => (
              <div
                key={bullet}
                className="rounded-[14px] border border-[#f8f2e9]/10 px-4 py-3 text-[#f8f2e9]/70 transition-all duration-200 hover:border-[#e56a54]/30 hover:text-[#f8f2e9]"
              >
                {bullet}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

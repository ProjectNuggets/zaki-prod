import { Quote } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { Card } from "./ui/card";
import { Reveal } from "./Reveal";

export function EditorialManifesto({ locale, t }: { locale: Locale; t: WebsiteContent }) {
  const isArabic = locale === "ar";
  return (
    <section className="px-4 py-8 md:px-8 md:py-14">
      <div className="mx-auto grid max-w-[1240px] gap-5 md:grid-cols-2">
        <Reveal>
          <Card className="flex h-full flex-col">
            <div className="mb-6 flex items-center gap-2.5">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-chat-accent/10 text-chat-accent">
                <Quote className="size-3.5" strokeWidth={2.5} />
              </span>
              <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-accent">
                {t.geo.citationHeading}
              </p>
            </div>
            <blockquote className="font-display mt-2 text-[28px] font-extrabold leading-[1.08] tracking-[-0.04em] text-chat-text md:text-[38px]">
              {t.geo.citationQuote}
            </blockquote>
            <div className="mt-auto pt-8">
              <div className="flex items-center gap-3 border-t border-line-strong/60 pt-5">
                <div className="size-1 rounded-full bg-chat-accent" />
                <p className="text-[13px] leading-6 text-chat-muted">
                  {t.geo.citationSource}
                </p>
              </div>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={80}>
          <Card className="flex h-full flex-col">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-accent">
              {isArabic ? "ما الموجود اليوم" : "What exists today"}
            </p>
            <h3 className="font-display mt-6 text-[26px] font-extrabold leading-[1.1] tracking-[-0.04em] text-chat-text md:text-[30px]">
              {t.geo.definitionHeading}
            </h3>
            <p className="mt-4 text-[14px] leading-[1.8] text-chat-muted">
              {t.geo.definitionText}
            </p>
            <div className="mt-auto pt-8">
              <div className="rounded-[18px] border border-line-strong/60 bg-chat-bg/60 p-5">
                <p className="font-mono-ui text-[10px] uppercase tracking-[0.28em] text-chat-muted/60">
                  {isArabic ? "خريطة المنتج" : "Product map"}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {(isArabic
                    ? [
                        { label: "ZAKI Chat", desc: "مساحة عمل مباشرة ومدفوعة للتركيز والإنتاجية", color: "bg-chat-accent" },
                        { label: "ZAKI BOT", desc: "بيتا تجريبية لذكاء شخصي مستمر", color: "bg-[#f0a050]" },
                        { label: "Nullalis", desc: "طبقة تشغيل داخلية وراء الاستمرارية والذاكرة", color: "bg-chat-muted" },
                      ]
                    : [
                        { label: "ZAKI Chat", desc: "live, paid workspace for focused productivity", color: "bg-chat-accent" },
                        { label: "ZAKI BOT", desc: "experimental beta for persistent personal intelligence", color: "bg-[#f0a050]" },
                        { label: "Nullalis", desc: "private runtime layer behind continuity and memory", color: "bg-chat-muted" },
                      ]
                  ).map((item) => (
                    <li key={item.label} className="flex items-center gap-3 text-[13px] leading-6 text-chat-text">
                      <span className={`size-1.5 shrink-0 rounded-full ${item.color}`} />
                      <span className="font-medium">{item.label}</span>
                      <span className="text-chat-muted">{isArabic ? "←" : "→"} {item.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

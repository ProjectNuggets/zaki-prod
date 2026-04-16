import { Check, ArrowRight } from "lucide-react";
import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";
import { BorderBeam } from "./ui/border-beam";
import { ShimmerButton } from "./ui/shimmer-button";
import { useState } from "react";

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-zk-text-secondary">
      <Check className="mt-0.5 size-4 shrink-0 text-zk-accent" strokeWidth={2} />
      <span>{children}</span>
    </li>
  );
}

export function ProductCards({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const [isStudent, setIsStudent] = useState(false);
  const spacesPrice = isStudent ? "$8" : "$13";

  return (
    <section className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="font-mono-ui text-center text-xs uppercase tracking-[0.2em] text-zk-accent">
            {isArabic ? "اختر طريقك" : "Choose your path"}
          </p>
          <h2 className="font-display mt-3 text-center text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-4xl">
            {isArabic ? "منتجان. هدف واحد." : "Two products. One goal."}
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-center text-sm leading-6 text-zk-text-secondary">
            {isArabic
              ? "Spaces للعمل المنظّم اليوم. زكي Agent للذكاء الشخصي المستمر."
              : "Spaces for structured work today. ZAKI Agent for persistent personal intelligence."}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Spaces card */}
          <Reveal delay={60}>
            <div className="relative flex h-full flex-col rounded-2xl border border-zk-border bg-zk-surface p-7">
              <div className="flex items-center gap-2">
                <span className="font-display text-xl font-bold text-zk-text">Spaces</span>
                <span className="rounded-full bg-zk-success/10 px-2.5 py-0.5 text-[11px] font-medium text-zk-success">
                  {isArabic ? "مباشر" : "Live"}
                </span>
              </div>

              <p className="mt-2 text-sm text-zk-text-secondary">
                {isArabic
                  ? "مساحات عمل ذكاء اصطناعي منظمة للإنتاجية اليومية."
                  : "Structured AI workspaces for daily productivity."}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zk-text">{spacesPrice}</span>
                <span className="text-sm text-zk-text-tertiary">/{isArabic ? "شهر" : "mo"}</span>
              </div>

              <button
                onClick={() => setIsStudent(!isStudent)}
                className="mt-2 inline-flex items-center gap-2 text-xs text-zk-text-tertiary transition-colors hover:text-zk-text-secondary"
              >
                <span className={`inline-flex size-3.5 items-center justify-center rounded border transition-colors ${isStudent ? "border-zk-accent bg-zk-accent" : "border-zk-border-strong"}`}>
                  {isStudent && <Check className="size-2.5 text-white" strokeWidth={3} />}
                </span>
                {isArabic ? "طالب (.edu)" : "I'm a student (.edu)"}
              </button>

              <ul className="mt-6 flex flex-col gap-3">
                <FeatureItem>{isArabic ? "محادثات غير محدودة" : "Unlimited conversations"}</FeatureItem>
                <FeatureItem>{isArabic ? "نماذج متميزة" : "Premium AI models"}</FeatureItem>
                <FeatureItem>{isArabic ? "تعليمات رئيسية لكل مساحة" : "Master prompt per space"}</FeatureItem>
                <FeatureItem>{isArabic ? "مستندات مشتركة مرفقة" : "Shared document embeds"}</FeatureItem>
                <FeatureItem>{isArabic ? "عربي + إنجليزي" : "Arabic + English"}</FeatureItem>
              </ul>

              <div className="mt-auto pt-6">
                <a
                  href={`https://app.chatzaki.com/pricing?auth=signup&plan=personal&interval=monthly&source=website_home_pricing`}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-zk-border-strong bg-zk-surface-hover py-3 text-sm font-medium text-zk-text transition-all duration-300 hover:-translate-y-0.5 hover:border-zk-text-ghost hover:bg-zk-surface-active"
                >
                  {isArabic ? "ابدأ الآن" : "Start now"}
                  <ArrowRight className="size-3.5" />
                </a>
              </div>
            </div>
          </Reveal>

          {/* ZAKI Agent card */}
          <Reveal delay={120}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-zk-border-accent bg-zk-surface p-7">
              <BorderBeam size={80} duration={6} />

              <div className="flex items-center gap-2">
                <span className="font-logo text-xl text-zk-accent">ZAKI</span>
                <span className="font-display text-xl font-bold text-zk-text">Agent</span>
                <span className="rounded-full bg-zk-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-zk-accent">
                  {isArabic ? "تجريبي" : "Beta"}
                </span>
              </div>

              <p className="mt-2 text-sm text-zk-text-secondary">
                {isArabic
                  ? "ذكاء شخصي مستمر بذاكرة وأتمتة وتنفيذ أدوات."
                  : "Persistent personal intelligence with memory, automation, and tool execution."}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-zk-text">{isArabic ? "مجاني" : "Free"}</span>
                <span className="text-sm text-zk-text-tertiary">{isArabic ? "أثناء البيتا" : "during beta"}</span>
              </div>

              <p className="mt-2 text-xs text-zk-text-tertiary">
                {isArabic ? "5 رسائل كل 24 ساعة" : "5 messages every 24 hours"}
              </p>

              <ul className="mt-6 flex flex-col gap-3">
                <FeatureItem>{isArabic ? "ذاكرة مستمرة وتحسين ذاتي" : "Memory & self-improvement"}</FeatureItem>
                <FeatureItem>{isArabic ? "3 أوضاع: سريع، متوازن، عميق" : "3 modes: Fast, Balanced, Deep"}</FeatureItem>
                <FeatureItem>{isArabic ? "أتمتة مجدولة (cron)" : "Scheduled automation (cron)"}</FeatureItem>
                <FeatureItem>{isArabic ? "خزنة أسرار مشفّرة" : "Encrypted secrets vault"}</FeatureItem>
                <FeatureItem>{isArabic ? "توجيه ذكي بين 7 مزوّدين" : "Smart routing across 7 providers"}</FeatureItem>
              </ul>

              <div className="mt-auto pt-6">
                <a href="https://app.chatzaki.com/?auth=signup&source=website_home_agent">
                  <ShimmerButton className="w-full">
                    {isArabic ? "جرّب البيتا" : "Try the beta"}
                    <ArrowRight className="size-3.5" />
                  </ShimmerButton>
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

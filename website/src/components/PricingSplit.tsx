import { useState } from "react";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Reveal } from "./Reveal";
import { submitWaitlist } from "../lib/waitlist";

function PricingStatStrip({
  stats,
}: {
  stats: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="mt-6 grid grid-cols-3 divide-x divide-line-strong/60 rounded-[14px] border border-line-strong/60 bg-chat-bg/60 rtl:divide-x-reverse">
      {stats.map((stat) => (
        <div key={stat.label} className="px-3 py-3 text-center">
          <p className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-chat-text">
            {stat.value}
          </p>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-chat-muted">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function PricingFeatureList({ items }: { items: string[] }) {
  return (
    <div className="mt-5 space-y-0 divide-y divide-line-strong/60">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-3 py-3 text-[13px]">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-chat-accent/10 text-chat-accent">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          <span className="text-chat-text/85">{item}</span>
        </div>
      ))}
    </div>
  );
}

function PricingSupportPanel({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 min-h-[142px] rounded-[14px] border border-line-strong/60 bg-chat-bg/60 p-4">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-chat-muted">
        {eyebrow}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

/* ── Inline email-only waitlist ──────────────────────── */
function InlineWaitlist({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    const res = await submitWaitlist({ email, locale, source: "website_home_waitlist" });
    setState(res.success ? "done" : "error");
  }

  if (state === "done") {
    return (
      <p className="flex items-center gap-2 rounded-pill border border-[rgba(38,103,74,0.20)] bg-[rgba(38,103,74,0.06)] px-4 py-3 text-sm text-[#3a9e6b]">
        <Check className="size-4" />
        {isArabic ? "تم تسجيلك في بيتا زكي. سنرسل لك التحديثات والوصول المبكر." : "You're on the ZAKI beta list. We'll send updates and early-access details."}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        type="email"
        required
        value={email}
        disabled={state === "submitting"}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={isArabic ? "بريدك الإلكتروني" : "you@example.com"}
        className="flex-1"
      />
      <Button type="submit" disabled={state === "submitting"} className="shrink-0 gap-1.5">
        {state === "submitting"
          ? isArabic ? "..." : "..."
          : isArabic ? "انضم" : "Join"}
        {state === "idle" && <ArrowRight className="size-3.5" />}
      </Button>
      {state === "error" && (
        <p className="absolute -bottom-7 text-xs text-chat-accent">
          {isArabic ? "تعذر تسجيل الطلب الآن. حاول مرة أخرى بعد قليل." : "Unable to register right now. Try again shortly."}
        </p>
      )}
    </form>
  );
}

/* ── Main component ──────────────────────────────────── */
export function PricingSplit({ locale, t }: { locale: Locale; t: WebsiteContent }) {
  const isArabic = locale === "ar";
  const [isStudent, setIsStudent] = useState(false);
  const plan = t.pricing.plans.find((p) => p.tier === "personal")!;
  const chatFeatureItems = [
    ...plan.features,
    isArabic
      ? "مساحات منظّمة للعربية والإنجليزية مع سياق أوضح لكل مشروع"
      : "Organized Arabic-English spaces with cleaner context for each project",
  ];
  const chatStats = [
    { value: isArabic ? "غير محدود" : "Unlimited", label: isArabic ? "دردشة" : "Chat" },
    { value: isArabic ? "مباشر" : "Live", label: isArabic ? "الحالة" : "State" },
    { value: isArabic ? "مدفوع" : "Paid", label: isArabic ? "النموذج" : "Model" },
  ];
  const betaStats = [
    { value: "5", label: isArabic ? "رسائل / يوم" : "Msgs / day" },
    { value: isArabic ? "مجاني" : "Free", label: isArabic ? "أثناء البيتا" : "During beta" },
    { value: isArabic ? "تجريبي" : "Experimental", label: isArabic ? "الحالة" : "State" },
  ];
  const cardClassName =
    "relative flex-1 overflow-hidden rounded-card border bg-chat-surface p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.03),0_24px_64px_rgba(17,10,6,0.10)] md:p-8";

  return (
    <section className="px-4 py-14 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="mb-8 max-w-[62ch]">
            <div className="mb-4 flex items-center gap-3">
              <img src="/assets/zaki-logo.png" alt="" className="size-8 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]" />
              <p className="font-mono-ui text-[11px] uppercase tracking-[0.28em] text-chat-accent">
                {isArabic ? "التسعير" : "Pricing"}
              </p>
            </div>
            <h2 className="font-display mt-3 text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-chat-text md:text-[48px]">
              {t.pricing.heading}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-chat-muted md:text-base">{t.pricing.subheading}</p>
          </div>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 items-stretch">
          {/* ─── Personal plan card ─── */}
          <Reveal className="flex">
            <div className={`${cardClassName} border-line-strong`}>
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="chat">{isArabic ? "مباشر" : "Live"}</Badge>
                    <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[36px]">
                      Spaces
                    </h3>
                  </div>
                  <div className="text-end">
                    <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-chat-muted">
                      {isArabic ? "شهريًا" : "Monthly"}
                    </p>
                    <p className="font-display mt-1 text-[36px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[42px]">
                      {isStudent ? "$8" : "$13"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[14px] leading-[1.75] text-chat-muted">
                  {isArabic
                    ? "للعمل اليومي، والكتابة الثنائية اللغة، والتنفيذ داخل مساحات منظمة لكل مشروع. هذا هو المنتج الذي قد يشير إليه التطبيق حاليًا باسم ZAKI Chat، لكنه على الموقع يُشرح بوضوح أكبر باسم Spaces."
                    : "For everyday work, bilingual writing, and execution inside organized workspaces for each project. This is the product the app may still call ZAKI Chat, but on the website we explain it more clearly as Spaces."}
                </p>

                <PricingStatStrip stats={chatStats} />
                <PricingFeatureList items={chatFeatureItems} />

                <PricingSupportPanel eyebrow={isArabic ? "خيار الخطة" : "Plan option"}>
                  <label className="flex cursor-pointer items-start gap-3 transition-colors hover:border-chat-accent/15">
                    <input
                      type="checkbox"
                      checked={isStudent}
                      onChange={(e) => setIsStudent(e.target.checked)}
                      className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-chat-accent"
                    />
                    <div>
                      <span className="text-[13px] font-medium text-chat-text">
                        {isArabic ? "أنا طالب" : "I'm a student"}
                        <span className="ms-2 font-mono-ui text-[11px] tracking-wider text-chat-accent">
                          {isArabic ? "← $8/شهر" : "→ $8/mo"}
                        </span>
                      </span>
                      <p className="mt-1 text-[11px] leading-[1.6] text-chat-muted">
                        {t.pricing.note}
                      </p>
                      <p className="mt-2 text-[11px] leading-[1.6] text-chat-muted/70">
                        {isArabic
                          ? "يمكنك البدء بالخطة الشخصية الآن أو التبديل إلى سعر الطالب عند التحقق."
                          : "Start on Personal now, or switch to the student rate once verification is complete."}
                      </p>
                    </div>
                  </label>
                </PricingSupportPanel>

                <div className="mt-auto pt-6">
                  <Button asChild variant="secondary" className="w-full text-[13px]">
                    <a href={`https://app.chatzaki.com/pricing?auth=signup&plan=${isStudent ? "student" : "personal"}&interval=monthly&source=website_pricing_card`}>
                      {isStudent
                        ? (isArabic ? "ابدأ كطالب" : "Start as Student")
                        : plan.cta}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ─── ZAKI Beta card ─── */}
          <Reveal delay={100} className="flex">
            <div className={`${cardClassName} border-chat-accent/15`}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-chat-accent/[0.03] to-transparent" />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="warning" pulse>
                      <Sparkles className="size-3" />
                      {isArabic ? "تجريبي — مفتوح" : "Experimental — open"}
                    </Badge>
                    <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[36px]">
                      ZAKI
                    </h3>
                  </div>
                  <div className="text-end">
                    <p className="text-[12px] font-medium text-chat-muted">
                      {isArabic ? "تجريبي" : "Experimental"}
                    </p>
                    <div className="mt-1">
                      <p className="font-display text-[36px] font-extrabold tracking-[-0.04em] text-chat-accent md:text-[42px]">
                        {isArabic ? "مجاني" : "Free"}
                      </p>
                      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-chat-muted">
                        {isArabic ? "أثناء البيتا" : "During beta"}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[14px] leading-[1.75] text-chat-muted">
                  {isArabic
                    ? "زكي هو البيتا العامة لذكاء شخصي مستمر. يحتفظ بالسياق بين الجلسات، يُظهر مراحل عمله، ويمنحك 5 رسائل كل 24 ساعة لتختبر الاتجاه قبل أن يتحول إلى منتج اشتراك كامل."
                    : "ZAKI is the public beta for persistent personal intelligence. It keeps context between sessions, shows its work phases, and gives you 5 messages every 24 hours to test the direction before it becomes a full subscription product."}
                </p>

                <PricingStatStrip stats={betaStats} />
                <PricingFeatureList items={t.pricing.botBeta.bullets} />

                <PricingSupportPanel eyebrow={isArabic ? "وصول مبكر" : "Early access"}>
                  <div className="relative mt-3">
                    <InlineWaitlist locale={locale} />
                  </div>
                  <p className="mt-3 text-[11px] leading-[1.6] text-chat-muted/70">
                    {isArabic
                      ? "بريدك يُستخدم فقط لتحديثات بيتا زكي والوصول المبكر. بدون رسائل دعائية."
                      : "Your email is only used for ZAKI beta updates and early-access communication. No marketing spam."}
                  </p>
                </PricingSupportPanel>

                <div className="mt-auto pt-6">
                  <Button asChild className="w-full text-[13px]">
                    <a href="/zaki-bot/#waitlist">
                      {isArabic ? "انضم إلى البيتا" : "Join the Beta"}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

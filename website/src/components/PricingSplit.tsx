import { useState } from "react";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Reveal } from "./Reveal";
import { submitWaitlist } from "../lib/waitlist";

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
        {isArabic ? "تم تسجيلك. سنتواصل معك." : "You're in. We'll reach out."}
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
          {isArabic ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Try again."}
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
            <div className="relative flex-1 overflow-hidden rounded-card border border-line-strong bg-chat-surface p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.03),0_24px_64px_rgba(17,10,6,0.10)] md:p-8">
              <div className="relative flex h-full flex-col">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="chat">{isArabic ? "مباشر" : "Live"}</Badge>
                    <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-chat-text md:text-[36px]">
                      ZAKI Chat
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
                  {plan.blurb}
                </p>

                {/* Features — compact mono-style list */}
                <div className="mt-6 space-y-0 divide-y divide-line-strong/60">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-3 py-3 text-[13px]">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-chat-accent/10 text-chat-accent">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                      <span className="text-chat-text/85">{f}</span>
                    </div>
                  ))}
                </div>

                {/* Student toggle */}
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[14px] border border-line-strong/60 bg-chat-bg/60 px-4 py-3 transition-colors hover:border-chat-accent/15">
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
                  </div>
                </label>

                {/* CTA */}
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
            <div className="relative flex-1 overflow-hidden rounded-card border border-chat-accent/15 bg-chat-surface p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.03),0_24px_64px_rgba(17,10,6,0.10)] md:p-8">
              
              {/* Subtle top glow */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-chat-accent/[0.03] to-transparent" />

              <div className="relative flex h-full flex-col">
                {/* Header */}
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
                    <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-chat-muted">
                      {isArabic ? "تجريبي" : "Experimental"}
                    </p>
                    <p className="font-display mt-1 text-[36px] font-extrabold tracking-[-0.04em] text-chat-accent md:text-[42px]">
                      {isArabic ? "مجاني" : "Free"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[14px] leading-[1.75] text-chat-muted">
                  {isArabic
                    ? "زكي يحتفظ بالسياق بين الجلسات، يُظهر مراحل عمله، ويحتفظ بذاكرة لكل مستخدم. البيتا محدودة بـ 5 رسائل كل 24 ساعة — كافية لاختبار الاتجاه، وليست كافية للاعتماد عليها بعد."
                    : "ZAKI keeps context between sessions, shows its work phases, and maintains per-user memory. The beta is limited to 5 messages every 24 hours — enough to test the direction, not enough to depend on yet."}
                </p>

                {/* Stats strip */}
                <div className="mt-6 grid grid-cols-3 divide-x divide-line-strong/60 rounded-[14px] border border-line-strong/60 bg-chat-bg/60 rtl:divide-x-reverse">
                  {[
                    { value: "5", label: isArabic ? "رسائل / يوم" : "Msgs / day" },
                    { value: isArabic ? "مجاني" : "Free", label: isArabic ? "أثناء البيتا" : "During beta" },
                    { value: isArabic ? "اشتراك" : "Paid", label: isArabic ? "بعد البيتا" : "Post-beta" },
                  ].map((stat) => (
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

                {/* Bullets */}
                <div className="mt-5 space-y-0 divide-y divide-line-strong/60">
                  {t.pricing.botBeta.bullets.map((b) => (
                    <div key={b} className="flex items-center gap-3 py-3 text-[13px]">
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-chat-accent/10 text-chat-accent">
                        <Check className="size-2.5" strokeWidth={3} />
                      </span>
                      <span className="text-chat-text/85">{b}</span>
                    </div>
                  ))}
                </div>

                {/* Email-only waitlist */}
                <div id="waitlist" className="relative mt-auto pt-6">
                  <InlineWaitlist locale={locale} />
                  <p className="mt-3 text-[11px] leading-[1.6] text-chat-muted/70">
                    {isArabic
                      ? "بريدك يُستخدم فقط لتحديثات بيتا زكي. بدون إزعاج."
                      : "Your email is only used for ZAKI beta updates. No spam."}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

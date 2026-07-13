import { useState } from "react";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import type { Locale, WebsiteContent } from "../lib/content";
import { appHandoffUrl } from "../lib/appHandoff";
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
    <div className="mt-6 grid grid-cols-3 divide-x divide-zk-border-strong/60 rounded-[14px] border border-zk-border-strong/60 bg-zk-bg/60 rtl:divide-x-reverse">
      {stats.map((stat) => (
        <div key={stat.label} className="px-3 py-3 text-center">
          <p className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-zk-text">
            {stat.value}
          </p>
          <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-zk-text-secondary">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function PricingFeatureList({ items }: { items: string[] }) {
  return (
    <div className="mt-5 space-y-0 divide-y divide-zk-border-strong/60">
      {items.map((item) => (
        <div key={item} className="flex items-center gap-3 py-3 text-[13px]">
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-zk-accent/10 text-zk-accent">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          <span className="text-zk-text/85">{item}</span>
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
    <div className="mt-5 min-h-[142px] rounded-[14px] border border-zk-border-strong/60 bg-zk-bg/60 p-4">
      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-zk-text-secondary">
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
      <p className="flex items-center gap-2 rounded-xl border border-zk-success/20 bg-zk-success/[0.06] px-4 py-3 text-sm text-zk-success">
        <Check className="size-4" />
        {isArabic ? "تم تسجيلك في تحديثات زكي. سنرسل لك التحديثات والوصول المبكر." : "You're on the ZAKI updates list. We'll send release and early-access details."}
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
        <p className="absolute -bottom-7 text-xs text-zk-accent">
          {isArabic ? "تعذر تسجيل الطلب الآن. حاول مرة أخرى بعد قليل." : "Unable to register right now. Try again shortly."}
        </p>
      )}
    </form>
  );
}

/* ── Main component ──────────────────────────────────── */
export function PricingSplit({ locale, t: _t }: { locale: Locale; t: WebsiteContent }) {
  const isArabic = locale === "ar";
  const chatFeatureItems = isArabic
    ? ["10 رسائل يوميًا للمستخدم المجهول", "بلا تسجيل للبدء", "بلا ذاكرة دائمة حتى تسجّل الدخول", "عربي وإنجليزي في نفس مساحة العمل"]
    : ["10 anonymous messages per day", "No signup required to start", "No durable memory until you sign in", "Arabic and English in the same work lane"];
  const agentFeatureItems = isArabic
    ? ["ذاكرة واستمرارية للحساب", "موافقات أدوات قبل الأفعال الحساسة", "متابعات وجلسات وسياق قابل للمراجعة", "Brain يعرض الذاكرة ومصدرها"]
    : ["Account memory and continuity", "Tool approvals before sensitive actions", "Follow-ups, sessions, and reviewable context", "Brain shows memory and provenance"];
  const futureFeatureItems = isArabic
    ? ["Learn يبقى وصولًا خاصًا", "Design يبقى قائمة انتظار", "Hire يبقى بيتا خاصة", "لا وعود عامة حتى تكتمل المسارات"]
    : ["Learn stays private access", "Design stays waitlist", "Hire stays private beta", "No public promises until flows are complete"];
  const chatStats = [
    { value: "$0", label: isArabic ? "للبدء" : "To start" },
    { value: "10", label: isArabic ? "رسائل / يوم" : "Msgs / day" },
    { value: isArabic ? "بلا ذاكرة" : "No memory", label: isArabic ? "مجهول" : "Anonymous" },
  ];
  const agentStats = [
    { value: "Agent", label: isArabic ? "السطح" : "Surface" },
    { value: "Brain", label: isArabic ? "الذاكرة" : "Memory" },
    { value: isArabic ? "حساب" : "Account", label: isArabic ? "مطلوب" : "Required" },
  ];
  const cardClassName =
    "relative flex-1 overflow-hidden rounded-2xl border bg-zk-surface p-6 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_16px_48px_rgba(17,10,6,0.06)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.03),0_24px_64px_rgba(17,10,6,0.10)] md:p-8";

  return (
    <section className="px-4 py-14 md:px-8 md:py-24">
      <div className="mx-auto max-w-[1240px]">
        <Reveal>
          <div className="mb-8 max-w-[62ch]">
            <div className="mb-4 flex items-center gap-3">
              <img src="/assets/zaki-logo.png" alt="" className="size-8 rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.08)]" />
              <p className="font-mono-ui text-[11px] uppercase tracking-[0.28em] text-zk-accent">
                {isArabic ? "الوصول" : "Access"}
              </p>
            </div>
            <h2 className="font-display mt-3 text-[32px] font-extrabold leading-[1.08] tracking-[-0.04em] text-zk-text md:text-[48px]">
              {isArabic ? "ابدأ مجانًا. فعّل الاستمرارية عندما يهم العمل." : "Start free. Turn on continuity when the work matters."}
            </h2>
            <p className="mt-4 text-[15px] leading-[1.8] text-zk-text-secondary md:text-base">
              {isArabic
                ? "الموقع لا يبيع مسارًا قديمًا. Chat هو المدخل المجاني، Agent هو سطح الاستمرارية، وLearn وHire بيتا خاصة وDesign قائمة انتظار."
                : "This site no longer sells the old ladder. Chat is the free entry point, Agent is the continuity surface, Learn and Hire stay private beta, and Design stays waitlist."}
            </p>
          </div>
        </Reveal>

        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {/* ─── Chat card ─── */}
          <Reveal className="flex">
            <div id="future-access" className={`${cardClassName} scroll-mt-20 border-zk-border-strong`}>
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="chat">{isArabic ? "مباشر" : "Live"}</Badge>
                    <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[36px]">
                      ZAKI Chat
                    </h3>
                  </div>
                  <div className="text-end">
                    <p className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-zk-text-secondary">
                      {isArabic ? "دخول" : "Entry"}
                    </p>
                    <p className="font-display mt-1 text-[36px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[42px]">
                      $0
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[14px] leading-[1.75] text-zk-text-secondary">
                  {isArabic
                    ? "ابدأ من دردشة مجانية وسريعة للمسودات والترجمة والبحث والتخطيط. تبقى بلا ذاكرة دائمة حتى تسجّل الدخول."
                    : "Start from free, fast chat for drafts, translation, research, and planning. It stays memory-free until you sign in."}
                </p>

                <PricingStatStrip stats={chatStats} />
                <PricingFeatureList items={chatFeatureItems} />

                <PricingSupportPanel eyebrow={isArabic ? "حد واضح" : "Clear boundary"}>
                  <p className="text-[12px] leading-6 text-zk-text-secondary">
                    {isArabic
                      ? "إذا أردت حفظ العمل أو استدعاء الذاكرة، انتقل إلى Agent بحسابك."
                      : "When the work should be saved or recalled, move into Agent with your account."}
                  </p>
                </PricingSupportPanel>

                <div className="mt-auto pt-6">
                  <Button asChild variant="secondary" className="w-full text-[13px]">
                    <a href={appHandoffUrl("/spaces", "website_pricing_chat", "chat")}>
                      {isArabic ? "ابدأ Chat" : "Start Chat"}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ─── Agent card ─── */}
          <Reveal delay={100} className="flex">
            <div className={`${cardClassName} border-zk-accent/15`}>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-zk-accent/[0.03] to-transparent" />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone="warning" pulse>
                      <Sparkles className="size-3" />
                      {isArabic ? "استمرارية" : "Continuity"}
                    </Badge>
                    <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[36px]">
                      ZAKI Agent
                    </h3>
                  </div>
                  <div className="text-end">
                    <p className="text-[12px] font-medium text-zk-text-secondary">
                      {isArabic ? "الحساب" : "Account"}
                    </p>
                    <div className="mt-1">
                      <p className="font-display text-[36px] font-extrabold tracking-[-0.04em] text-zk-accent md:text-[42px]">
                        Agent
                      </p>
                      <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-zk-text-secondary">
                        {isArabic ? "ذاكرة ومتابعة" : "Memory and follow-through"}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[14px] leading-[1.75] text-zk-text-secondary">
                  {isArabic
                    ? "Agent يحمل العمل عبر الجلسات. الذاكرة تظهر في Brain، والأدوات الحساسة تمر عبر موافقات واضحة."
                    : "Agent carries work across sessions. Memory is visible in Brain, and sensitive tools run through explicit approvals."}
                </p>

                <PricingStatStrip stats={agentStats} />
                <PricingFeatureList items={agentFeatureItems} />

                <PricingSupportPanel eyebrow={isArabic ? "الترقية" : "Upgrade"}>
                  <p className="text-[12px] leading-6 text-zk-text-secondary">
                    {isArabic
                      ? "استخدم Agent عندما تريد أن يستمر السياق وتظهر الذاكرة ويمكن مراجعة الأفعال."
                      : "Use Agent when context should persist, memory should be visible, and actions need review."}
                  </p>
                </PricingSupportPanel>

                <div className="mt-auto pt-6">
                  <Button asChild className="w-full text-[13px]">
                    <a href={appHandoffUrl("/agent", "website_pricing_agent", "agent")}>
                      {isArabic ? "افتح Agent" : "Open Agent"}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* ─── Future lanes card ─── */}
          <Reveal delay={160} className="flex">
            <div className={`${cardClassName} border-zk-border-strong`}>
              <div className="relative flex h-full flex-col">
                <Badge tone="warning">{isArabic ? "مقيّد" : "Gated"}</Badge>
                <h3 className="font-display mt-4 text-[28px] font-extrabold tracking-[-0.04em] text-zk-text md:text-[36px]">
                  {isArabic ? "المسارات القادمة" : "Future lanes"}
                </h3>
                <p className="mt-4 text-[14px] leading-[1.75] text-zk-text-secondary">
                  {isArabic
                    ? "Learn وHire يبقيان بيتا خاصة، وDesign قائمة انتظار، حتى تتفق الواجهة والصلاحيات والاختبارات."
                    : "Learn and Hire remain private beta, and Design remains waitlist, until UI, entitlement, and tests agree."}
                </p>
                <PricingFeatureList items={futureFeatureItems} />
                <PricingSupportPanel eyebrow={isArabic ? "تحديثات" : "Updates"}>
                  <div className="relative mt-3">
                    <InlineWaitlist locale={locale} />
                  </div>
                </PricingSupportPanel>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

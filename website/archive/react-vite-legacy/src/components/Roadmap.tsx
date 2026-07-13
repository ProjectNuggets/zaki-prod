import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { Locale } from "../lib/content";
import { Reveal } from "./Reveal";

type Status = "shipped" | "building" | "next";

const items: { title: { en: string; ar: string }; desc: { en: string; ar: string }; status: Status }[] = [
  {
    title: { en: "Chat, Agent, and Brain", ar: "Chat وAgent وBrain" },
    desc: { en: "The public path is live: start in Chat, continue in Agent, and inspect memory in Brain.", ar: "المسار العام متاح: ابدأ في Chat، تابع في Agent، وراجع الذاكرة في Brain." },
    status: "shipped",
  },
  {
    title: { en: "Settings as control plane", ar: "Settings لوحة التحكم" },
    desc: { en: "Billing, products, channels, secrets, provider readiness, browser devices, memory, and privacy route to Settings.", ar: "الدفع، المنتجات، القنوات، الأسرار، جاهزية المزودين، أجهزة المتصفح، الذاكرة، والخصوصية تعود إلى Settings." },
    status: "shipped",
  },
  {
    title: { en: "Channel hardening", ar: "تقوية القنوات" },
    desc: { en: "Telegram is the launch channel. Slack, Discord, Email, and WhatsApp wait for self-service connect, test, and revoke contracts.", ar: "Telegram هي قناة الإطلاق. Slack وDiscord وEmail وWhatsApp تنتظر عقود الربط والاختبار والإلغاء الذاتية." },
    status: "building",
  },
  {
    title: { en: "Learn and Career gated", ar: "Learn وCareer بوصول مقيد" },
    desc: { en: "These products stay gated until entitlement, memory, usage, UI, and E2E agree.", ar: "هذه المنتجات تبقى مقيدة حتى تتفق الصلاحيات والذاكرة والاستخدام والواجهة والاختبارات." },
    status: "building",
  },
  {
    title: { en: "Design waitlist", ar: "قائمة انتظار Design" },
    desc: { en: "Design remains early access until the service health, project flow, product registry, and tests are proven.", ar: "Design يبقى وصولًا مبكرًا حتى تثبت صحة الخدمة وتدفق المشاريع وسجل المنتجات والاختبارات." },
    status: "next",
  },
  {
    title: { en: "CLI, local app, and more extensions", ar: "CLI والتطبيق المحلي والمزيد من الإضافات" },
    desc: { en: "Future clients remain hidden from public launch copy until Developer Access and device/token management are complete.", ar: "العملاء القادمون يبقون خارج نسخة الإطلاق العامة حتى تكتمل Developer Access وإدارة الأجهزة والرموز." },
    status: "next",
  },
];

const statusConfig: Record<Status, { icon: typeof CheckCircle2; color: string; label: { en: string; ar: string } }> = {
  shipped: { icon: CheckCircle2, color: "text-zk-success", label: { en: "Shipped", ar: "تم" } },
  building: { icon: Loader2, color: "text-zk-warning", label: { en: "In progress", ar: "قيد البناء" } },
  next: { icon: Circle, color: "text-zk-text-tertiary", label: { en: "Next", ar: "التالي" } },
};

export function Roadmap({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <section className="px-5 py-24 md:px-8">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="font-mono-ui text-center text-xs uppercase tracking-[0.2em] text-zk-accent">
            {isArabic ? "ما نبنيه" : "What we're building"}
          </p>
          <h2 className="font-display mt-3 text-center text-3xl font-extrabold leading-tight tracking-[-0.03em] text-zk-text md:text-4xl">
            {isArabic ? "ما هو عام، وما هو مقيّد، وما ينتظر." : "What is public, what is gated, and what waits."}
          </h2>
        </Reveal>

        <div className="mt-12 flex flex-col gap-4">
          {items.map((item, i) => {
            const s = statusConfig[item.status];
            const Icon = s.icon;
            return (
              <Reveal key={i} delay={i * 60}>
                <div className="flex gap-4 rounded-xl border border-zk-border bg-zk-surface p-5 transition-colors hover:border-zk-border-strong">
                  <Icon className={`mt-0.5 size-5 shrink-0 ${s.color} ${item.status === "building" ? "animate-spin" : ""}`} strokeWidth={1.5} />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-zk-text">
                      {isArabic ? item.title.ar : item.title.en}
                    </h3>
                    <p className="mt-1 text-[13px] leading-6 text-zk-text-secondary">
                      {isArabic ? item.desc.ar : item.desc.en}
                    </p>
                  </div>
                  <span className={`shrink-0 self-start font-mono-ui text-[10px] uppercase tracking-wider ${s.color}`}>
                    {isArabic ? s.label.ar : s.label.en}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

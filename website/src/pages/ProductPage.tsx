import { ArrowRight, Brain, Check, Lock, MessageSquareText, PenTool, Sparkles } from "lucide-react";
import { SiteShell } from "../components/layout/SiteShell";
import { ProductCards } from "../components/ProductCards";
import { BuiltDifferent } from "../components/BuiltDifferent";
import { Roadmap } from "../components/Roadmap";
import { Reveal } from "../components/Reveal";
import type { Locale } from "../lib/content";
import { appHandoffUrl, productHandoffUrl } from "../lib/appHandoff";
import { V3ProductPage } from "../components/v3/V3Website";

const productRows = [
  {
    id: "chat",
    icon: MessageSquareText,
    title: "Chat / Spaces",
    status: "Public",
    body: "The free starting point for drafts, translation, research, and fast planning. Anonymous use stays memory-free until the user signs in.",
    href: productHandoffUrl("chat"),
    cta: "Start Chat",
  },
  {
    id: "agent",
    icon: Sparkles,
    title: "Agent",
    status: "Public",
    body: "The continuity surface: persistent work, reviewable sessions, explicit approvals, and account memory that can move with the user.",
    href: productHandoffUrl("agent"),
    cta: "Open Agent",
  },
  {
    id: "brain",
    icon: Brain,
    title: "Brain",
    status: "Public",
    body: "The memory control plane. Search, inspect provenance, and understand what ZAKI carries forward before expanding into deeper product lanes.",
    href: productHandoffUrl("brain"),
    cta: "Open Brain",
  },
  {
    id: "learn-hire",
    icon: Lock,
    title: "Learn + Career",
    status: "Private access",
    body: "Visible as direction, not general access. Learn and Career stay gated until entitlement, memory, usage, UI, and E2E all agree.",
    href: appHandoffUrl("/settings?section=products", "website_product_beta", "dashboard"),
    cta: "View access",
  },
  {
    id: "design",
    icon: PenTool,
    title: "Design",
    status: "Waitlist",
    body: "Design remains waitlist until service health, project flow, registry state, and tests prove it can be exposed truthfully.",
    href: appHandoffUrl("/design", "website_product_design_waitlist", "design_waitlist"),
    cta: "Join waitlist",
  },
];

export function ProductPage({ locale }: { locale: Locale }) {
  if (locale === "en") return <V3ProductPage />;

  const isArabic = locale === "ar";

  return (
    <SiteShell locale={locale} route="product">
      <section className="border-b border-zk-border px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <Reveal>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.28em] text-zk-accent">
              {isArabic ? "المنتج" : "Product"}
            </p>
            <h1 className="font-display mt-5 max-w-[12ch] text-[44px] font-extrabold leading-[0.94] tracking-[-0.05em] text-zk-text md:text-[74px]">
              {isArabic ? "الذكاء الذي لا يجعلك تبدأ من الصفر." : "The AI that doesn't make you start over."}
            </h1>
            <p className="mt-6 max-w-[62ch] text-base leading-8 text-zk-text-secondary">
              {isArabic
                ? "ZAKI V2 يبدأ من Chat، يحمل العمل في Agent، ويجعل الذاكرة مرئية في Brain. المسارات القادمة تبقى مقيّدة حتى تكتمل الحقيقة التشغيلية."
                : "ZAKI V2 starts in Chat, carries work through Agent, and makes memory visible in Brain. Future lanes stay gated until the operational truth is complete."}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="grid border border-zk-border-strong bg-zk-surface md:grid-cols-2">
              {[
                ["Public", "Chat, Agent, Brain"],
                ["Gated", "Learn, Career"],
                ["Waitlist", "Design"],
                ["Control", "Settings owns account configuration"],
              ].map(([label, value]) => (
                <div key={label} className="border-b border-e border-zk-border px-5 py-5 last:border-b-0 md:[&:nth-child(2n)]:border-e-0 md:[&:nth-last-child(-n+2)]:border-b-0">
                  <p className="font-mono-ui text-[10px] uppercase tracking-[0.22em] text-zk-text-tertiary">{label}</p>
                  <p className="mt-2 text-sm font-medium text-zk-text">{value}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-tertiary">
              {isArabic ? "لوحة المنتج الكاملة" : "Full palette"}
            </p>
            <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-0.04em] text-zk-text md:text-5xl">
              {isArabic ? "كل سطح له حالة واضحة." : "Every surface has a clear state."}
            </h2>
          </Reveal>

          <div className="mt-10 grid border border-zk-border-strong bg-zk-surface lg:grid-cols-5">
            {productRows.map((product) => (
              <a
                key={product.id}
                id={product.id}
                href={product.href}
                className="group flex min-h-[300px] flex-col border-b border-e border-zk-border p-5 transition-colors hover:bg-zk-surface-hover lg:border-b-0 lg:last:border-e-0"
              >
                <product.icon className="size-5 text-zk-accent" strokeWidth={1.5} />
                <p className="mt-8 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-zk-text-tertiary">{product.status}</p>
                <h3 className="mt-2 text-xl font-semibold text-zk-text">{product.title}</h3>
                <p className="mt-4 flex-1 text-sm leading-7 text-zk-text-secondary">{product.body}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-zk-accent">
                  {product.cta}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <ProductCards locale={locale} />
      <BuiltDifferent locale={locale} />
      <Roadmap locale={locale} />

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-4xl border-y border-zk-border-strong py-12">
          <Reveal>
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-accent">
                  {isArabic ? "ابدأ من الحقيقة" : "Start from the truth"}
                </p>
                <h2 className="font-display mt-3 text-3xl font-extrabold tracking-[-0.04em] text-zk-text md:text-4xl">
                  {isArabic ? "ابدأ مجانًا، ثم فعّل الاستمرارية." : "Start free, then turn on continuity."}
                </h2>
              </div>
              <a
                href={productHandoffUrl("chat")}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-zk-accent bg-zk-accent px-5 font-mono-ui text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-zk-accent-hover"
              >
                <Check className="size-4" />
                {isArabic ? "ابدأ Chat" : "Start Chat"}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

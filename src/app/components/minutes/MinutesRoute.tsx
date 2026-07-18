import { ArrowRight, Clock3, FileText, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ProductAccessGate } from "@/app/components/ProductAccessGate";
import { V2Badge, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";
import { useProductRegistry } from "@/queries/useProducts";
import { useAuthStore } from "@/stores";
import { MinutesPage } from "./MinutesPage";

function MinutesIntroduction() {
  const { t } = useTranslation();
  return <main className="min-h-full bg-[var(--v2-bg)] p-4 text-[var(--v2-ink-1)] md:p-8" data-product-id="minutes">
    <div className="mx-auto grid max-w-5xl gap-px bg-[var(--v2-hairline)] lg:grid-cols-[1.25fr_0.75fr]">
      <section className="bg-[var(--v2-bg)] p-7 md:p-12">
        <div className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--v2-accent)]"><Clock3 className="size-4" aria-hidden />{t("minutes.intro.kicker", { defaultValue: "ZAKI Minutes" })}</div>
        <h1 className="max-w-xl text-3xl font-semibold tracking-tight md:text-5xl">{t("minutes.intro.title", { defaultValue: "Your meetings, made reviewable" })}</h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--v2-ink-2)]">{t("minutes.intro.body", { defaultValue: "Minutes keeps consented meeting captures in a private, retention-bounded archive with speaker-attributed transcripts and concise summaries." })}</p>
        <Link className="v2-btn v2-btn--accent v2-btn--sm mt-7" to="/?next=%2Fminutes">{t("minutes.intro.signIn", { defaultValue: "Sign in to open Minutes" })}<ArrowRight className="size-3.5" aria-hidden /></Link>
      </section>
      <V2Panel className="rounded-none border-0 bg-[var(--v2-bg-raised)]">
        <V2PanelHead title={t("minutes.intro.policyTitle", { defaultValue: "Capture boundary" })} meta="READ ONLY" />
        <V2PanelBody className="space-y-5">
          <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-[var(--v2-accent)]" aria-hidden /><div><strong className="block text-sm">{t("minutes.intro.visibleBot", { defaultValue: "Visible capture" })}</strong><span className="text-xs text-[var(--v2-ink-3)]">{t("minutes.intro.visibleBotBody", { defaultValue: "Only attested ZAKI Notetaker meetings appear." })}</span></div></div>
          <div className="flex items-center gap-3"><FileText className="size-5 text-[var(--v2-accent)]" aria-hidden /><div><strong className="block text-sm">{t("minutes.intro.retention", { defaultValue: "Named retention" })}</strong><span className="text-xs text-[var(--v2-ink-3)]">{t("minutes.intro.retentionBody", { defaultValue: "Every transcript and summary shows its expiry." })}</span></div></div>
          <V2Badge tone="warn">{t("minutes.intro.authOnly", { defaultValue: "Authenticated access only" })}</V2Badge>
        </V2PanelBody>
      </V2Panel>
    </div>
  </main>;
}

export function MinutesRoute() {
  const token = useAuthStore((state) => state.token);
  const registry = useProductRegistry();
  const product = (registry.data?.data?.products ?? []).find((item) => item.productId === "minutes");
  if (!token) return <MinutesIntroduction />;
  if (registry.isLoading) return <div className="zaki-v2-loading min-h-screen" aria-label="Loading ZAKI Minutes" />;
  if (product?.state !== "enabled") return <ProductAccessGate productId="minutes" title="ZAKI Minutes" mode="coming_soon" />;
  return <MinutesPage />;
}

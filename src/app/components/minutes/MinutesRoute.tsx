import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProductAccessGate } from "@/app/components/ProductAccessGate";
import { V2Button, V2Panel, V2PanelBody } from "@/app/components/v2";
import { useProductRegistry } from "@/queries/useProducts";
import { useAuthStore } from "@/stores";
import { MinutesPage } from "./MinutesPage";

function MinutesAvailabilityFailure({ onRetry, reason }: { onRetry: () => void; reason: "registry" | "operational" }) {
  const { t } = useTranslation();
  const registryFailure = reason === "registry";
  return <main className="min-h-full bg-[var(--v2-bg)] p-4 text-[var(--v2-ink-1)] md:p-8" data-product-id="minutes">
    <V2Panel className="mx-auto max-w-2xl">
      <V2PanelBody className="space-y-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--v2-ink-2)]">{registryFailure ? t("minutes.registryErrorMeta", { defaultValue: "Access check failed" }) : t("minutes.operationalErrorMeta", { defaultValue: "Service unavailable" })}</p>
          <h1 className="mt-2 text-xl font-semibold">{registryFailure ? t("minutes.registryErrorTitle", { defaultValue: "Minutes access could not be checked" }) : t("minutes.operationalErrorTitle", { defaultValue: "Minutes is temporarily unavailable" })}</h1>
        </div>
        <p className="text-sm text-[var(--v2-ink-2)]">{registryFailure ? t("minutes.registryErrorBody", { defaultValue: "The product registry is temporarily unavailable. Try the access check again." }) : t("minutes.operationalErrorBody", { defaultValue: "Minutes is in maintenance or degraded mode. Try again when the read service is available." })}</p>
        <V2Button size="sm" onClick={onRetry}><RefreshCw className="size-3.5" aria-hidden />{t("minutes.retry", { defaultValue: "Try again" })}</V2Button>
      </V2PanelBody>
    </V2Panel>
  </main>;
}

export function MinutesRoute() {
  const token = useAuthStore((state) => state.token);
  const registry = useProductRegistry();
  const product = (registry.data?.data?.products ?? []).find((item) => item.productId === "minutes");
  if (!token) return <ProductAccessGate productId="minutes" title="ZAKI Minutes" mode="coming_soon" />;
  if (registry.isLoading) return <div className="zaki-v2-loading min-h-screen" aria-label="Loading ZAKI Minutes" />;
  if (registry.isError || (registry.data && !registry.data.response.ok)) return <MinutesAvailabilityFailure reason="registry" onRetry={() => void registry.refetch()} />;
  if (product?.state === "maintenance" || product?.state === "degraded") return <MinutesAvailabilityFailure reason="operational" onRetry={() => void registry.refetch()} />;
  if (product?.state !== "enabled" && product?.state !== "readOnly") return <ProductAccessGate productId="minutes" title="ZAKI Minutes" mode="coming_soon" />;
  return <MinutesPage controlsEnabled={product?.state === "enabled"} />;
}

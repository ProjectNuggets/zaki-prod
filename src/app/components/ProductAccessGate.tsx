import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, LockKeyhole, Palette } from "lucide-react";
import { useProductRegistry } from "@/queries/useProducts";
import { getDesignHealth } from "@/lib/designApi";
import type { ProductRegistryProductId } from "@/lib/api";
import { V2Badge, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";

type ProductGateMode = "private_beta" | "waitlist";

type ProductAccessGateProps = {
  productId: ProductRegistryProductId;
  title: string;
  mode: ProductGateMode;
  children?: ReactNode;
};

function modeCopy(mode: ProductGateMode) {
  if (mode === "waitlist") {
    return {
      badge: "Waitlist",
      heading: "Early access is not open yet",
      body:
        "This product is visible in the ZAKI family, but the public V1 app keeps it behind early access until the service is explicitly enabled.",
      action: "Open settings",
    };
  }
  return {
    badge: "Private beta",
    heading: "Private beta access",
    body:
      "This surface is production-plumbed but intentionally hidden from public V1 users while the beta cohort validates the workflow.",
    action: "Open settings",
  };
}

export function ProductAccessGate({
  productId,
  title,
  mode,
  children,
}: ProductAccessGateProps) {
  const { t } = useTranslation();
  const productRegistry = useProductRegistry();
  const product = productRegistry.data?.data?.products?.find(
    (item) => item.productId === productId
  );
  const designConfigured = productId === "design" && product?.state === "enabled";
  const designHealth = useQuery({
    queryKey: ["design", "health", "access-gate"],
    queryFn: getDesignHealth,
    enabled: designConfigured,
    retry: false,
    staleTime: 15_000,
  });

  const designAllowed =
    productId === "design" &&
    product?.state === "enabled" &&
    designHealth.data?.ok === true &&
    designHealth.data?.configured === true;

  if (designAllowed && children) return <>{children}</>;

  const copy = modeCopy(mode);
  const Icon = mode === "waitlist" ? Palette : FlaskConical;
  const status = productRegistry.isLoading
    ? t("productGate.status.checking", { defaultValue: "Checking access" })
    : product?.state
      ? t("productGate.status.state", {
          state: product.state,
          defaultValue: `State: ${product.state}`,
        })
      : t("productGate.status.hidden", { defaultValue: "Not exposed" });

  return (
    <section
      className="zaki-product-gate"
      data-testid={`product-gate-${productId}`}
      data-product-gate={mode}
      aria-labelledby={`product-gate-${productId}-title`}
    >
      <div className="zaki-product-gate__inner">
        <div className="zaki-product-gate__kicker">
          <Icon className="size-4" aria-hidden />
          <span>{title}</span>
        </div>
        <h1 id={`product-gate-${productId}-title`}>
          {t(`productGate.${mode}.heading`, { defaultValue: copy.heading })}
        </h1>
        <p>
          {t(`productGate.${mode}.body`, {
            product: title,
            defaultValue: copy.body,
          })}
        </p>
        <div className="zaki-product-gate__badges" aria-label="Product access state">
          <V2Badge tone={mode === "waitlist" ? "warn" : "accent"}>
            {t(`productGate.${mode}.badge`, { defaultValue: copy.badge })}
          </V2Badge>
          <V2Badge>{status}</V2Badge>
          {productId === "design" ? (
            <V2Badge tone={designHealth.data?.ok ? "success" : "default"}>
              {designHealth.isLoading
                ? t("productGate.design.checking", { defaultValue: "Design health pending" })
                : designHealth.data?.ok
                  ? t("productGate.design.ready", { defaultValue: "Design service ready" })
                  : t("productGate.design.notReady", { defaultValue: "Design service gated" })}
            </V2Badge>
          ) : null}
        </div>

        <V2Panel className="zaki-product-gate__panel">
          <V2PanelHead
            title={t("productGate.panel.title", { defaultValue: "Launch policy" })}
            meta={t("productGate.panel.meta", { defaultValue: "Public V1" })}
          />
          <V2PanelBody>
            <dl className="zaki-product-gate__facts">
              <div>
                <dt>{t("productGate.facts.public", { defaultValue: "Public surfaces" })}</dt>
                <dd>{t("productGate.facts.publicValue", { defaultValue: "Dashboard, Agent, Chat, Brain, Settings" })}</dd>
              </div>
              <div>
                <dt>{t("productGate.facts.memory", { defaultValue: "Memory boundary" })}</dt>
                <dd>{t("productGate.facts.memoryValue", { defaultValue: "Kept separate until explicitly launched" })}</dd>
              </div>
              <div>
                <dt>{t("productGate.facts.next", { defaultValue: "Next step" })}</dt>
                <dd>
                  {mode === "waitlist"
                    ? t("productGate.facts.waitlistValue", { defaultValue: "Join or manage early access in Settings." })
                    : t("productGate.facts.betaValue", { defaultValue: "Ask the operator for beta access." })}
                </dd>
              </div>
            </dl>
            <Link className="v2-btn v2-btn--accent v2-btn--sm" to="/settings#settings-products">
              <LockKeyhole className="size-3.5" aria-hidden />
              {t(`productGate.${mode}.action`, { defaultValue: copy.action })}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </V2PanelBody>
        </V2Panel>
      </div>
    </section>
  );
}

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, LockKeyhole } from "lucide-react";
import type { ProductRegistryProductId } from "@/lib/api";
import { V2Badge, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";

type ProductGateMode = "coming_soon";

type ProductAccessGateProps = {
  productId: ProductRegistryProductId;
  title: string;
  mode: ProductGateMode;
};

function modeCopy() {
  return {
    badge: "Coming soon",
    heading: "This product is coming soon",
    body:
      "This product is visible in the ZAKI family, but public V1 is focused on Dashboard, Agent, Chat, Brain, and Settings first.",
    action: "Open dashboard",
  };
}

export function ProductAccessGate({
  productId,
  title,
}: ProductAccessGateProps) {
  const { t } = useTranslation();
  const copy = modeCopy();
  const status = t("productGate.status.comingSoon", {
    defaultValue: "Launch state: coming soon",
  });

  return (
    <section
      className="zaki-product-gate"
      data-testid={`product-gate-${productId}`}
      data-product-gate="coming_soon"
      aria-labelledby={`product-gate-${productId}-title`}
    >
      <div className="zaki-product-gate__inner">
        <div className="zaki-product-gate__kicker">
          <Clock3 className="size-4" aria-hidden />
          <span>{title}</span>
        </div>
        <h1 id={`product-gate-${productId}-title`}>
          {t("productGate.comingSoon.heading", { defaultValue: copy.heading })}
        </h1>
        <p>
          {t("productGate.comingSoon.body", {
            product: title,
            defaultValue: copy.body,
          })}
        </p>
        <div className="zaki-product-gate__badges" aria-label="Product access state">
          <V2Badge tone="warn">
            {t("productGate.comingSoon.badge", { defaultValue: copy.badge })}
          </V2Badge>
          <V2Badge>{status}</V2Badge>
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
                  {t("productGate.facts.comingSoonValue", {
                    defaultValue: "Start today with Chat, Agent, or Brain from the dashboard.",
                  })}
                </dd>
              </div>
            </dl>
            <Link className="v2-btn v2-btn--accent v2-btn--sm" to="/">
              <LockKeyhole className="size-3.5" aria-hidden />
              {t("productGate.comingSoon.action", { defaultValue: copy.action })}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </V2PanelBody>
        </V2Panel>
      </div>
    </section>
  );
}

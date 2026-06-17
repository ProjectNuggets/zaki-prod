import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, LockKeyhole } from "lucide-react";
import type { ProductRegistryProductId } from "@/lib/api";
import {
  V2Badge,
  V2Panel,
  V2PanelBody,
  V2PanelHead,
  type V2BadgeTone,
} from "@/app/components/v2";

type ProductGateMode = "coming_soon" | "private_beta" | "waitlist";

type ProductAccessGateProps = {
  productId: ProductRegistryProductId;
  title: string;
  mode: ProductGateMode;
};

type ProductGateCopy = {
  badge: string;
  heading: string;
  body: string;
  status: string;
  next: string;
  action: string;
  tone: V2BadgeTone;
};

const MODE_KEYS: Record<ProductGateMode, "comingSoon" | "privateBeta" | "waitlist"> = {
  coming_soon: "comingSoon",
  private_beta: "privateBeta",
  waitlist: "waitlist",
};

function modeCopy(mode: ProductGateMode): ProductGateCopy {
  const copies: Record<ProductGateMode, ProductGateCopy> = {
    coming_soon: {
      badge: "Coming soon",
      heading: "This product is coming soon",
      body:
        "This product is visible in the ZAKI family, but public V1 is focused on Dashboard, Agent, Chat, Brain, and Settings first.",
      status: "Launch state: coming soon",
      next: "Start today with Chat, Agent, or Brain from the dashboard.",
      action: "Open dashboard",
      tone: "warn",
    },
    private_beta: {
      badge: "Private beta",
      heading: "This product is in private beta",
      body:
        "{{product}} is gated while route access, entitlement, memory boundaries, and signed-in E2E coverage are finalized together.",
      status: "Launch state: private beta",
      next: "Use Chat, Agent, or Brain today. Beta access stays gated until the full product contract is ready.",
      action: "Open dashboard",
      tone: "accent",
    },
    waitlist: {
      badge: "Waitlist",
      heading: "This product is on the waitlist",
      body:
        "{{product}} is visible as a future ZAKI surface, but it is not a public app product or paid plan yet.",
      status: "Launch state: waitlist",
      next: "Visit the product page for context, or start with Chat, Agent, or Brain today.",
      action: "Open dashboard",
      tone: "warn",
    },
  };
  return copies[mode];
}

export function ProductAccessGate({
  productId,
  title,
  mode,
}: ProductAccessGateProps) {
  const { t } = useTranslation();
  const copy = modeCopy(mode);
  const modeKey = MODE_KEYS[mode];
  const status = t(`productGate.status.${modeKey}`, {
    defaultValue: copy.status,
  });

  return (
    <section
      className="zaki-product-gate"
      data-testid={`product-gate-${productId}`}
      data-product-gate={mode}
      aria-labelledby={`product-gate-${productId}-title`}
    >
      <div className="zaki-product-gate__inner">
        <div className="zaki-product-gate__kicker">
          <Clock3 className="size-4" aria-hidden />
          <span>{title}</span>
        </div>
        <h1 id={`product-gate-${productId}-title`}>
          {t(`productGate.${modeKey}.heading`, { defaultValue: copy.heading })}
        </h1>
        <p>
          {t(`productGate.${modeKey}.body`, {
            product: title,
            defaultValue: copy.body,
          })}
        </p>
        <div className="zaki-product-gate__badges" aria-label="Product access state">
          <V2Badge tone={copy.tone}>
            {t(`productGate.${modeKey}.badge`, { defaultValue: copy.badge })}
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
                  {t(`productGate.facts.${modeKey}Value`, {
                    defaultValue: copy.next,
                  })}
                </dd>
              </div>
            </dl>
            <Link className="v2-btn v2-btn--accent v2-btn--sm" to="/">
              <LockKeyhole className="size-3.5" aria-hidden />
              {t(`productGate.${modeKey}.action`, { defaultValue: copy.action })}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </V2PanelBody>
        </V2Panel>
      </div>
    </section>
  );
}

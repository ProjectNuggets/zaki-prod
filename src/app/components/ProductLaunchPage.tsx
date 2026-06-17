import { Link } from "react-router-dom";
import { ArrowRight, Compass, Sparkles } from "lucide-react";
import { V2Badge, V2Panel, V2PanelBody, V2PanelHead } from "@/app/components/v2";

type ProductLaunchPageProps = {
  productId?: string | null;
  locale?: "en" | "ar";
};

type LaunchCopy = {
  id: string;
  heading: string;
  badge: string;
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  policy: string;
  next: string;
};

function normalizeProductId(productId?: string | null) {
  const key = String(productId || "").trim().toLowerCase();
  if (key === "learning") return "learn";
  if (key === "chat") return "spaces";
  if (key === "zaki-agent" || key === "zaki-bot") return "agent";
  return key || "product";
}

const LAUNCH_COPY: Record<string, LaunchCopy> = {
  agent: {
    id: "agent",
    heading: "ZAKI Agent",
    badge: "Public app",
    body:
      "Plan, execute, inspect tools, and carry work forward through the authenticated Agent workbench.",
    primaryLabel: "Choose Agent",
    primaryHref: "/agent?source=website_product_agent&intent=agent",
    secondaryLabel: "Compare plans",
    secondaryHref: "/pricing?source=website_product_agent&intent=plans",
    policy: "Available now",
    next: "Sign in to run Agent with account memory, approvals, and metered weekly credits.",
  },
  brain: {
    id: "brain",
    heading: "ZAKI Brain",
    badge: "Public app",
    body:
      "See what ZAKI knows, inspect memory scope, and manage account-level context from the Brain surface.",
    primaryLabel: "Open Brain",
    primaryHref: "/brain?source=website_product_brain&intent=memory",
    policy: "Available now",
    next: "Open Brain when you want memory visibility before continuing work.",
  },
  spaces: {
    id: "spaces",
    heading: "ZAKI Chat",
    badge: "Public app",
    body:
      "Use Chat for quick questions, drafting, translation, and lightweight thinking without setup.",
    primaryLabel: "Open Chat",
    primaryHref: "/spaces?source=website_product_spaces&intent=chat",
    policy: "Available now",
    next: "Start in Chat, then move durable work into Agent or Brain when needed.",
  },
  learn: {
    id: "learn",
    heading: "ZAKI Learn",
    badge: "Private access",
    body:
      "Learn is visible in the product family while learner state, entitlement, memory, and E2E coverage are finalized.",
    primaryLabel: "Open dashboard",
    primaryHref: "/?source=website_product_learn&intent=dashboard",
    policy: "Private access",
    next: "Use Chat or Agent for study work until Learn is opened as a complete product surface.",
  },
  hire: {
    id: "hire",
    heading: "ZAKI Career",
    badge: "Private access",
    body:
      "Career is gated while role targeting, CV positioning, application memory, and access controls are completed.",
    primaryLabel: "Open dashboard",
    primaryHref: "/?source=website_product_hire&intent=dashboard",
    policy: "Private access",
    next: "Use Chat for CV copy or Agent to plan the next step while Career stays gated.",
  },
  design: {
    id: "design",
    heading: "ZAKI Design",
    badge: "Waitlist",
    body:
      "Design is visible as a future product, but it is not sold or exposed as a public app surface yet.",
    primaryLabel: "Open dashboard",
    primaryHref: "/?source=website_product_design&intent=dashboard",
    policy: "Waitlist",
    next: "Use Chat or Agent to shape the brief while the Design service and project flow are finalized.",
  },
};

function getLaunchCopy(productId?: string | null): LaunchCopy {
  const key = normalizeProductId(productId);
  return (
    LAUNCH_COPY[key] || {
      id: key,
      heading: "ZAKI Product",
      badge: "Product family",
      body: "This product route is part of the ZAKI product family.",
      primaryLabel: "Open dashboard",
      primaryHref: "/?source=website_product_unknown&intent=dashboard",
      policy: "See dashboard",
      next: "Start from the dashboard to see currently available product surfaces.",
    }
  );
}

export function ProductLaunchPage({ productId, locale = "en" }: ProductLaunchPageProps) {
  const copy = getLaunchCopy(productId);
  const isArabic = locale === "ar";

  return (
    <section
      className="zaki-product-launch"
      data-product-id={copy.id}
      aria-labelledby={`product-launch-${copy.id}-title`}
    >
      <div className="zaki-product-launch__inner">
        <div className="zaki-product-launch__kicker">
          <Compass className="size-4" aria-hidden />
          <span>{isArabic ? "منتجات ZAKI" : "ZAKI product"}</span>
        </div>
        <h1 id={`product-launch-${copy.id}-title`}>{copy.heading}</h1>
        <p>{copy.body}</p>

        <div className="zaki-product-launch__badges" aria-label="Product launch state">
          <V2Badge tone={copy.id === "design" ? "warn" : "accent"}>{copy.badge}</V2Badge>
          <V2Badge>{copy.policy}</V2Badge>
        </div>

        <div className="zaki-product-launch__actions">
          <Link className="v2-btn v2-btn--accent v2-btn--sm" to={copy.primaryHref}>
            <Sparkles className="size-3.5" aria-hidden />
            {copy.primaryLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          {copy.secondaryHref ? (
            <Link className="v2-btn v2-btn--ghost v2-btn--sm" to={copy.secondaryHref}>
              {copy.secondaryLabel}
            </Link>
          ) : null}
        </div>

        <V2Panel className="zaki-product-launch__panel">
          <V2PanelHead title="Launch policy" meta="Public V1" />
          <V2PanelBody>
            <dl className="zaki-product-launch__facts">
              <div>
                <dt>State</dt>
                <dd>{copy.policy}</dd>
              </div>
              <div>
                <dt>Routing</dt>
                <dd>{copy.primaryLabel}</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>{copy.next}</dd>
              </div>
            </dl>
          </V2PanelBody>
        </V2Panel>
      </div>
    </section>
  );
}

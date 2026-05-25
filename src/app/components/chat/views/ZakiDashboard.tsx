import { useMemo, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  Database,
  Gauge,
  GraduationCap,
  MessageSquareText,
  PenTool,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  useAnonymousMeterStatus,
  useMeterStatus,
  useProductRegistry,
  useZakiSessions,
} from "@/queries";
import type {
  AgentSession,
  MeterStatusProduct,
  MeterWindowSnapshot,
  ProductOperationalState,
  ProductRegistryItem,
  ProductRegistryProductId,
} from "@/lib/api";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";

interface ZakiDashboardProps {
  onSendExample: (example: string) => void;
  onOpenMemoryImport?: () => void;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type DashboardProduct = {
  product: ProductRegistryItem;
  meterProduct: MeterStatusProduct | null;
};

type WindowStats = {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  remainingPercent: number;
};

type ActiveWorkRow = {
  id: string;
  time: string;
  level: "ok" | "warn" | "err" | "info";
  message: string;
  meta: string;
};

const PRODUCT_ORDER: ProductRegistryProductId[] = [
  "agent",
  "spaces",
  "brain",
  "learning",
  "hire",
  "design",
];

const MEMORY_SCOPE_ORDER = [
  "personal_brain",
  "workspace_memory",
  "learner_memory",
  "hire_memory",
  "design_memory",
  "session_memory",
] as const;

const PRODUCT_ICONS: Partial<Record<ProductRegistryProductId, LucideIcon>> = {
  agent: Sparkles,
  spaces: MessageSquareText,
  learning: GraduationCap,
  hire: BriefcaseBusiness,
  design: PenTool,
  brain: Brain,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(
    Math.max(0, Number(value))
  );
}

function formatReset(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(value?: string | number | null) {
  if (!value) return "—";
  const date =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWindowStats(window?: MeterWindowSnapshot | null): WindowStats {
  const limit = typeof window?.limit === "number" ? window.limit : null;
  const used = typeof window?.used === "number" ? window.used : null;
  const remaining =
    typeof window?.remaining === "number"
      ? window.remaining
      : limit != null && used != null
      ? Math.max(0, limit - used)
      : null;
  const remainingPercent =
    limit && remaining != null ? clamp((remaining / limit) * 100, 0, 100) : 0;
  return { limit, used, remaining, remainingPercent };
}

function formatWindowLabel(t: TranslateFn, window?: MeterWindowSnapshot | null) {
  if (!window) return t("zakiDashboard.meter.pending");
  if (typeof window.remaining === "number" && typeof window.limit === "number") {
    return t("zakiDashboard.meter.remainingOfLimit", {
      remaining: formatNumber(window.remaining),
      limit: formatNumber(window.limit),
    });
  }
  if (typeof window.used === "number" && typeof window.limit === "number") {
    return t("zakiDashboard.meter.usedOfLimit", {
      used: formatNumber(window.used),
      limit: formatNumber(window.limit),
    });
  }
  if (typeof window.used === "number") {
    return t("zakiDashboard.meter.usedUnits", {
      used: formatNumber(window.used),
    });
  }
  return t("zakiDashboard.meter.pending");
}

function getProductStateLabel(t: TranslateFn, state?: ProductOperationalState) {
  if (!state) return t("settingsModal.productsAccess.states.disabled");
  return t(`settingsModal.productsAccess.states.${state}`, {
    defaultValue: state,
  });
}

function getMemoryScopeLabel(t: TranslateFn, memoryScope?: string | null) {
  if (!memoryScope) return t("zakiDashboard.memory.pending");
  const keys: Record<string, string> = {
    personal_brain: "settingsModal.productsAccess.memoryScopes.personalBrain",
    workspace_memory: "settingsModal.productsAccess.memoryScopes.workspaceMemory",
    learner_memory: "settingsModal.productsAccess.memoryScopes.learnerMemory",
    hire_memory: "settingsModal.productsAccess.memoryScopes.hireMemory",
    design_memory: "settingsModal.productsAccess.memoryScopes.designMemory",
    session_memory: "settingsModal.productsAccess.memoryScopes.sessionMemory",
  };
  return keys[memoryScope] ? t(keys[memoryScope]) : memoryScope;
}

function getProductDescriptionKey(productId: ProductRegistryProductId) {
  return `zakiDashboard.products.descriptions.${productId}`;
}

function getProductName(t: TranslateFn, product: ProductRegistryItem) {
  return t(`zakiDashboard.products.names.${product.productId}`, {
    defaultValue: product.label,
  });
}

function getProductRoute(product: ProductRegistryItem) {
  if (product.productId === "agent") return product.route || "/agent";
  if (product.productId === "spaces") return "/spaces";
  if (product.productId === "learning") return "/learn";
  if (product.productId === "brain") return "/brain";
  return product.route || null;
}

function canOpenProduct(product: ProductRegistryItem) {
  return (
    product.state === "enabled" ||
    product.state === "degraded" ||
    product.state === "readOnly"
  );
}

function sortProducts(products: ProductRegistryItem[]) {
  return [...products].sort((a, b) => {
    const aIndex = PRODUCT_ORDER.indexOf(a.productId);
    const bIndex = PRODUCT_ORDER.indexOf(b.productId);
    if (aIndex !== -1 || bIndex !== -1) {
      const normalizedAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
      const normalizedBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
      return normalizedAIndex - normalizedBIndex;
    }
    return a.label.localeCompare(b.label);
  });
}

function getBadgeTone(state?: ProductOperationalState) {
  if (state === "enabled") return "zaki-dashboard-v2__badge--success";
  if (state === "degraded" || state === "maintenance") {
    return "zaki-dashboard-v2__badge--warn";
  }
  if (state === "readOnly") return "zaki-dashboard-v2__badge--accent";
  return "zaki-dashboard-v2__badge--muted";
}

function getProductTag(t: TranslateFn, product: ProductRegistryItem) {
  if (product.productId === "hire") return t("zakiDashboard.products.tags.privateBeta");
  if (product.productId === "design") return t("zakiDashboard.products.tags.waitlist");
  if (product.productId === "brain") return t("zakiDashboard.products.tags.controlPlane");
  if (product.state === "degraded") return t("zakiDashboard.products.tags.degraded");
  if (product.state === "readOnly") return t("zakiDashboard.products.tags.readOnly");
  if (product.state === "maintenance") return t("zakiDashboard.products.tags.maintenance");
  return t("zakiDashboard.products.tags.live");
}

function getInitials(name: string) {
  const tokens = name
    .split(/[\s@._-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const first = tokens[0]?.[0] || "Z";
  const second = tokens.length > 1 ? tokens[1]?.[0] : tokens[0]?.[1];
  return `${first || ""}${second || ""}`.toUpperCase();
}

function buildActiveWorkRows(
  t: TranslateFn,
  sessions: AgentSession[] | undefined,
): ActiveWorkRow[] {
  return (sessions ?? []).slice(0, 6).map((session) => {
    const title =
      session.title?.trim() ||
      session.session_key?.split(":").pop() ||
      t("zakiDashboard.activeWork.untitled");
    const pendingApprovals = Math.max(0, session.pending_approval_count ?? 0);
    const live = Boolean(session.live);
    const level: ActiveWorkRow["level"] = pendingApprovals > 0 ? "warn" : live ? "ok" : "info";
    const message =
      pendingApprovals > 0
        ? t("zakiDashboard.activeWork.pendingApproval", {
            title,
            count: pendingApprovals,
          })
        : live
        ? t("zakiDashboard.activeWork.liveSession", { title })
        : t("zakiDashboard.activeWork.recentSession", { title });
    const meta = t("zakiDashboard.activeWork.sessionMeta", {
      messages: formatNumber(session.message_count ?? 0),
      mode: session.mode || t("zakiDashboard.activeWork.noMode"),
    });
    return {
      id: session.session_key,
      time: formatTime(session.last_active),
      level,
      message,
      meta,
    };
  });
}

export function ZakiDashboard({
  onSendExample,
  onOpenMemoryImport,
}: ZakiDashboardProps) {
  const { i18n, t } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const { data: productRegistryResult, isLoading: productRegistryLoading } =
    useProductRegistry();
  const { data: meterStatusResult, isLoading: meterStatusLoading } =
    useMeterStatus();
  const {
    data: anonymousMeterStatusResult,
    isLoading: anonymousMeterStatusLoading,
  } = useAnonymousMeterStatus(!token);
  const { data: zakiSessions, isLoading: zakiSessionsLoading } = useZakiSessions(
    Boolean(token)
  );

  const productRegistry = productRegistryResult?.data;
  const meterStatus = token
    ? meterStatusResult?.data
    : anonymousMeterStatusResult?.data;
  const meterLoading = token ? meterStatusLoading : anonymousMeterStatusLoading;
  const displayName =
    user?.fullName?.trim() || user?.username?.trim() || t("home.guestName");
  const identityLabel =
    meterStatus?.identity?.type === "anonymous"
      ? t("zakiDashboard.identity.anonymous")
      : t("zakiDashboard.identity.signedIn");

  const dashboardProducts = useMemo<DashboardProduct[]>(() => {
    const products = productRegistry?.products ?? [];
    return sortProducts(
      products.filter((product) => {
        if (product.productKind === "client") return false;
        if (product.state === "hidden") return false;
        return product.visibleInSettings !== false;
      })
    ).map((product) => ({
      product,
      meterProduct: product.productId
        ? meterStatus?.products?.[product.productId] ?? null
        : null,
    }));
  }, [meterStatus?.products, productRegistry?.products]);

  const memoryScopes = useMemo(() => {
    const rows = new Map<string, { scope: string; products: string[] }>();
    for (const product of productRegistry?.products ?? []) {
      if (product.productKind === "client") continue;
      const scope = String(product.memoryScope || "").trim();
      if (!scope) continue;
      const row = rows.get(scope) || { scope, products: [] };
      row.products.push(getProductName(t, product));
      rows.set(scope, row);
    }
    return [...rows.values()].sort((a, b) => {
      const aIndex = MEMORY_SCOPE_ORDER.indexOf(
        a.scope as (typeof MEMORY_SCOPE_ORDER)[number]
      );
      const bIndex = MEMORY_SCOPE_ORDER.indexOf(
        b.scope as (typeof MEMORY_SCOPE_ORDER)[number]
      );
      if (aIndex !== -1 || bIndex !== -1) {
        const normalizedAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const normalizedBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
        return normalizedAIndex - normalizedBIndex;
      }
      return a.scope.localeCompare(b.scope);
    });
  }, [productRegistry?.products, t]);

  const activeWorkRows = useMemo(
    () => buildActiveWorkRows(t, zakiSessions),
    [t, zakiSessions]
  );

  const weeklyStats = getWindowStats(meterStatus?.weekly);
  const rollingStats = getWindowStats(meterStatus?.rolling);
  const heroTitle = t("zakiDashboard.hero.title", { name: displayName });
  const heroRemaining = meterLoading
    ? t("zakiDashboard.meter.loading")
    : t("zakiDashboard.hero.remaining", {
        remaining: formatNumber(weeklyStats.remaining),
      });
  const weeklyReset = formatReset(meterStatus?.weekly?.resetAt);
  const rollingReset = formatReset(meterStatus?.rolling?.resetAt);
  const productsAvailable = dashboardProducts.filter(({ product }) =>
    canOpenProduct(product)
  ).length;
  const liveAgentSession = zakiSessions?.find(
    (session) => session.live || (session.pending_approval_count ?? 0) > 0
  );
  const statusLabel =
    productRegistryLoading || meterLoading
      ? t("zakiDashboard.status.syncing")
      : t("zakiDashboard.status.online");
  const rollingTicksOn = clamp(
    Math.round((rollingStats.remainingPercent / 100) * 5),
    0,
    5
  );

  return (
    <section
      className={cn("zaki-dashboard-v2 zaki-scrollbar-fade", isRtl && "rtl")}
      dir={isRtl ? "rtl" : "ltr"}
      aria-labelledby="zaki-command-center-title"
      data-testid="zaki-command-center"
    >
      <div className="zaki-dashboard-v2__status" role="status" aria-live="polite">
        <span className="zaki-dashboard-v2__status-group">
          <span className="zaki-dashboard-v2__pip zaki-dashboard-v2__pip--success" />
          {statusLabel}
        </span>
        <span className="zaki-dashboard-v2__status-group">
          {t("zakiDashboard.status.plan")}
          <span className="zaki-dashboard-v2__status-value">
            {meterLoading
              ? t("zakiDashboard.meter.loading")
              : meterStatus?.plan?.label || t("zakiDashboard.meter.free")}
          </span>
        </span>
        <span className="zaki-dashboard-v2__status-group">
          {t("zakiDashboard.status.weeklyReset")}
          <span className="zaki-dashboard-v2__status-value">
            {weeklyReset || t("zakiDashboard.meter.resetPending")}
          </span>
        </span>
        <span className="zaki-dashboard-v2__status-group">
          {t("zakiDashboard.status.identity")}
          <span className="zaki-dashboard-v2__status-value">{identityLabel}</span>
        </span>
        {liveAgentSession ? (
          <span className="zaki-dashboard-v2__status-group zaki-dashboard-v2__live">
            <span className="zaki-dashboard-v2__pip zaki-dashboard-v2__pip--accent" />
            {t("zakiDashboard.status.agentLive", {
              id: liveAgentSession.session_key.split(":").pop() || "agent",
            })}
          </span>
        ) : null}
      </div>

      <div className="zaki-dashboard-v2__wrap">
        <section className="zaki-dashboard-v2__hero">
          <div>
            <div className="zaki-dashboard-v2__eyebrow">
              {t("zakiDashboard.eyebrow")}
            </div>
            <h1
              id="zaki-command-center-title"
              className="zaki-dashboard-v2__title"
              aria-label={`${heroTitle} ${heroRemaining}`}
            >
              {heroTitle}
              <br />
              <span className="zaki-dashboard-v2__accent">
                {heroRemaining}
              </span>
            </h1>
            <p className="zaki-dashboard-v2__subtitle">
              {t("zakiDashboard.subtitle")}
            </p>
            <div className="zaki-dashboard-v2__hero-actions">
              <button
                type="button"
                className="zaki-dashboard-v2__button zaki-dashboard-v2__button--accent"
                onClick={() => navigate("/agent")}
              >
                <Sparkles className="size-4" />
                {t("zakiDashboard.actions.openAgent")}
              </button>
              <button
                type="button"
                className="zaki-dashboard-v2__button"
                onClick={() => navigate("/spaces")}
              >
                <MessageSquareText className="size-4" />
                {t("zakiDashboard.actions.openChat")}
              </button>
              <button
                type="button"
                className="zaki-dashboard-v2__button"
                onClick={() =>
                  onSendExample(
                    t("zakiDashboard.agentPrompt", {
                      defaultValue:
                        "Look at my ZAKI products and help me choose the best next step.",
                    })
                  )
                }
              >
                <ArrowRight className="size-4" />
                {t("zakiDashboard.actions.askAgent")}
              </button>
            </div>
            <div className="zaki-dashboard-v2__tags">
              <span className="zaki-dashboard-v2__tag">
                {t("zakiDashboard.tags.plan")} ·{" "}
                <strong>{meterStatus?.plan?.label || t("zakiDashboard.meter.free")}</strong>
              </span>
              <span className="zaki-dashboard-v2__tag">
                {t("zakiDashboard.tags.products")} ·{" "}
                <strong>{productsAvailable}</strong>
              </span>
              <span className="zaki-dashboard-v2__tag">
                {t("zakiDashboard.tags.memory")} ·{" "}
                <strong>{memoryScopes.length}</strong>
              </span>
              <span className="zaki-dashboard-v2__tag zaki-dashboard-v2__tag--accent">
                {getInitials(displayName)}
              </span>
            </div>
          </div>

          <aside
            className="zaki-dashboard-v2__gauge"
            data-testid="zaki-dashboard-meter"
            aria-label={t("zakiDashboard.meter.label")}
          >
            <div className="zaki-dashboard-v2__gauge-head">
              <span className="zaki-dashboard-v2__label">
                {t("zakiDashboard.meter.weekly")}
              </span>
              <span className="zaki-dashboard-v2__label">
                {weeklyReset
                  ? t("zakiDashboard.meter.resets", { reset: weeklyReset })
                  : t("zakiDashboard.meter.resetPending")}
              </span>
            </div>
            <div className="zaki-dashboard-v2__gauge-number">
              <strong>{formatNumber(weeklyStats.remaining)}</strong>
              <span>
                / {formatNumber(weeklyStats.limit)} {t("zakiDashboard.meter.units")}
              </span>
            </div>
            <div
              className="zaki-dashboard-v2__bar"
              style={
                {
                  "--meter-percent": `${weeklyStats.remainingPercent}%`,
                } as CSSProperties
              }
            >
              <div className="zaki-dashboard-v2__bar-fill" />
            </div>
            <div className="zaki-dashboard-v2__gauge-foot">
              <span>
                {t("zakiDashboard.meter.used")} ·{" "}
                <strong>{formatNumber(weeklyStats.used)}</strong>
              </span>
              <span>
                {t("zakiDashboard.meter.remaining")} ·{" "}
                <strong>{formatNumber(weeklyStats.remaining)}</strong>
              </span>
            </div>
            <div className="zaki-dashboard-v2__burst">
              <div>
                <div className="zaki-dashboard-v2__label">
                  {t("zakiDashboard.meter.rolling", {
                    hours: meterStatus?.rolling?.windowHours ?? 5,
                  })}
                </div>
                <div
                  className="zaki-dashboard-v2__ticks"
                  aria-label={formatWindowLabel(t, meterStatus?.rolling)}
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "zaki-dashboard-v2__tick",
                        index < rollingTicksOn && "zaki-dashboard-v2__tick--on"
                      )}
                    />
                  ))}
                </div>
              </div>
              <span className="zaki-dashboard-v2__label">
                {rollingReset
                  ? t("zakiDashboard.meter.resets", { reset: rollingReset })
                  : formatWindowLabel(t, meterStatus?.rolling)}
              </span>
            </div>
          </aside>
        </section>

        <div className="zaki-dashboard-v2__section-head">
          <div>
            <h2 className="zaki-dashboard-v2__section-title">
              {t("zakiDashboard.products.title")}
            </h2>
            <div className="zaki-dashboard-v2__section-meta">
              {t("zakiDashboard.products.subtitle")}
            </div>
          </div>
          <div className="zaki-dashboard-v2__section-meta">
            {t("zakiDashboard.products.availableCount", {
              count: productsAvailable,
              total: dashboardProducts.length,
            })}
          </div>
        </div>

        <section
          className="zaki-dashboard-v2__products"
          data-testid="zaki-dashboard-products"
        >
          {productRegistryLoading ? (
            <div className="zaki-dashboard-v2__empty">
              {t("zakiDashboard.products.loading")}
            </div>
          ) : null}
          {!productRegistryLoading && dashboardProducts.length === 0 ? (
            <div className="zaki-dashboard-v2__empty">
              {t("zakiDashboard.products.empty")}
            </div>
          ) : null}
          {dashboardProducts.map(({ product, meterProduct }) => {
            const Icon = PRODUCT_ICONS[product.productId] ?? Sparkles;
            const route = getProductRoute(product);
            const isOpenable = Boolean(route && canOpenProduct(product));
            const productWeekly = formatWindowLabel(t, meterProduct?.weekly);
            const productName = getProductName(t, product);
            return (
              <article
                key={product.productId}
                className={cn(
                  "zaki-dashboard-v2__product",
                  product.productId === "agent" && "zaki-dashboard-v2__product--primary",
                  !isOpenable && "zaki-dashboard-v2__product--blocked"
                )}
                data-testid={`zaki-product-card-${product.productId}`}
              >
                <div className="zaki-dashboard-v2__product-head">
                  <span className="zaki-dashboard-v2__code">
                    {product.productId}
                  </span>
                  <span
                    className={cn(
                      "zaki-dashboard-v2__badge",
                      getBadgeTone(product.state)
                    )}
                  >
                    {getProductTag(t, product)}
                  </span>
                </div>

                <div>
                  <Icon className="mb-3 size-5 text-current" aria-hidden="true" />
                  <h3 className="zaki-dashboard-v2__product-title">
                    {productName}
                  </h3>
                </div>

                <p className="zaki-dashboard-v2__product-desc">
                  {t(getProductDescriptionKey(product.productId), {
                    defaultValue: product.entryPoint || product.label,
                  })}
                </p>

                <dl className="zaki-dashboard-v2__product-meta">
                  <div>
                    <dt>{t("zakiDashboard.products.usage")}</dt>
                    <dd>{productWeekly}</dd>
                  </div>
                  <div>
                    <dt>{t("zakiDashboard.products.memory")}</dt>
                    <dd>{getMemoryScopeLabel(t, product.memoryScope)}</dd>
                  </div>
                  <div>
                    <dt>{t("zakiDashboard.products.state")}</dt>
                    <dd>{getProductStateLabel(t, product.state)}</dd>
                  </div>
                  <div>
                    <dt>{t("zakiDashboard.products.surface")}</dt>
                    <dd>{product.entryPoint || route || product.productId}</dd>
                  </div>
                </dl>

                <div className="zaki-dashboard-v2__product-foot">
                  <button
                    type="button"
                    className="zaki-dashboard-v2__enter"
                    disabled={!isOpenable}
                    aria-label={
                      isOpenable
                        ? t("zakiDashboard.products.openAria", {
                            product: productName,
                          })
                        : t("zakiDashboard.products.notAvailableAria", {
                            product: productName,
                          })
                    }
                    onClick={() => {
                      if (route && isOpenable) navigate(route);
                    }}
                  >
                    {isOpenable
                      ? t("zakiDashboard.products.open")
                      : t("zakiDashboard.products.notAvailable")}
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <section className="zaki-dashboard-v2__row-grid">
          <div className="zaki-dashboard-v2__panel" data-testid="zaki-dashboard-active-work">
            <div className="zaki-dashboard-v2__panel-head">
              <span>{t("zakiDashboard.activeWork.title")}</span>
              <span>{t("zakiDashboard.activeWork.source")}</span>
            </div>
            {zakiSessionsLoading ? (
              <div className="zaki-dashboard-v2__empty">
                {t("zakiDashboard.activeWork.loading")}
              </div>
            ) : activeWorkRows.length > 0 ? (
              activeWorkRows.map((row) => (
                <div className="zaki-dashboard-v2__log-row" key={row.id}>
                  <span className="zaki-dashboard-v2__log-time">{row.time}</span>
                  <span
                    className={cn(
                      "zaki-dashboard-v2__log-level",
                      `zaki-dashboard-v2__log-level--${row.level}`
                    )}
                  >
                    {row.level}
                  </span>
                  <span>{row.message}</span>
                  <span className="zaki-dashboard-v2__log-meta">{row.meta}</span>
                </div>
              ))
            ) : (
              <div className="zaki-dashboard-v2__empty">
                {t("zakiDashboard.activeWork.empty")}
              </div>
            )}
          </div>

          <aside
            className="zaki-dashboard-v2__panel"
            data-testid="zaki-dashboard-memory"
          >
            <div className="zaki-dashboard-v2__panel-head">
              <span>{t("zakiDashboard.memory.title")}</span>
              <span>{t("zakiDashboard.memory.scopeCount", { count: memoryScopes.length })}</span>
            </div>
            {memoryScopes.length > 0 ? (
              memoryScopes.map((row, index) => (
                <div className="zaki-dashboard-v2__memory-row" key={row.scope}>
                  <span
                    className={cn(
                      "zaki-dashboard-v2__pip",
                      index === 0
                        ? "zaki-dashboard-v2__pip--accent"
                        : "zaki-dashboard-v2__pip--success"
                    )}
                  />
                  <div>
                    <div className="zaki-dashboard-v2__memory-name">
                      {getMemoryScopeLabel(t, row.scope)}
                    </div>
                    <div className="zaki-dashboard-v2__memory-sub">
                      {row.products.join(" · ")}
                    </div>
                  </div>
                  <div className="zaki-dashboard-v2__memory-count">
                    {row.products.length}
                    <span className="zaki-dashboard-v2__memory-unit">
                      {t("zakiDashboard.memory.productUnit")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="zaki-dashboard-v2__empty">
                {t("zakiDashboard.memory.loading")}
              </div>
            )}
            <div className="zaki-dashboard-v2__panel-actions">
              <button
                type="button"
                className="zaki-dashboard-v2__button zaki-dashboard-v2__button--primary"
                data-onboarding-id="zaki-dashboard-brain-entry"
                onClick={() => navigate("/brain")}
              >
                <Brain className="size-4" />
                {t("zakiDashboard.memory.open")}
              </button>
              {onOpenMemoryImport ? (
                <button
                  type="button"
                  className="zaki-dashboard-v2__button"
                  onClick={onOpenMemoryImport}
                >
                  <Upload className="size-4" />
                  {t("zakiDashboard.memory.import")}
                </button>
              ) : null}
            </div>
          </aside>
        </section>

        <section className="zaki-dashboard-v2__commercial">
          <div>
            <div className="zaki-dashboard-v2__commercial-title">
              {t("zakiDashboard.commercial.title")}
            </div>
            <p className="zaki-dashboard-v2__commercial-copy">
              {t("zakiDashboard.commercial.copy")}
            </p>
          </div>
          <div className="zaki-dashboard-v2__actions">
            <button
              type="button"
              className="zaki-dashboard-v2__button"
              onClick={() => navigate("/pricing")}
            >
              <Gauge className="size-4" />
              {t("zakiDashboard.commercial.plans")}
            </button>
            <button
              type="button"
              className="zaki-dashboard-v2__button zaki-dashboard-v2__button--accent"
              onClick={() => navigate("/brain")}
            >
              <Database className="size-4" />
              {t("zakiDashboard.commercial.memory")}
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

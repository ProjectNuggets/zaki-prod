import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  GraduationCap,
  MessageSquareText,
  PenTool,
  Sparkles,
  Upload,
  Wrench,
} from "lucide-react";
import {
  useAnonymousMeterStatus,
  useMeterStatus,
  useProductRegistry,
} from "@/queries";
import type {
  MeterStatusProduct,
  MeterWindowSnapshot,
  ProductOperationalState,
  ProductRegistryItem,
  ProductRegistryProductId,
} from "@/lib/api";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { CenterLogo } from "../../icons";

interface ZakiDashboardProps {
  onSendExample: (example: string) => void;
  onOpenMemoryImport?: () => void;
}

type DashboardProduct = {
  product: ProductRegistryItem;
  meterProduct: MeterStatusProduct | null;
};

const PRODUCT_ORDER: ProductRegistryProductId[] = [
  "agent",
  "spaces",
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

const STATE_TONE: Record<ProductOperationalState, string> = {
  enabled:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200",
  degraded:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200",
  readOnly:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
  maintenance:
    "border-zaki-brand/25 bg-zaki-brand/10 text-zaki-brand dark:border-[#ff9c86]/25 dark:bg-[#ff9c86]/10 dark:text-[#ffb39f]",
  disabled:
    "border-zaki-subtle bg-zaki-raised text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-muted",
  hidden:
    "border-zaki-subtle bg-zaki-raised text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-muted",
};

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

function formatWindowLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  window?: MeterWindowSnapshot | null
) {
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

function getProductStateLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  state?: ProductOperationalState
) {
  if (!state) return t("settingsModal.productsAccess.states.disabled");
  return t(`settingsModal.productsAccess.states.${state}`, { defaultValue: state });
}

function getMemoryScopeLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  memoryScope?: string | null
) {
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

function getProductRoute(product: ProductRegistryItem) {
  if (product.productId === "agent") {
    return product.route || "/agent";
  }
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

export function ZakiDashboard({
  onSendExample,
  onOpenMemoryImport,
}: ZakiDashboardProps) {
  const { i18n, t } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const { data: productRegistryResult, isLoading: productRegistryLoading } = useProductRegistry();
  const { data: meterStatusResult, isLoading: meterStatusLoading } = useMeterStatus();
  const { data: anonymousMeterStatusResult, isLoading: anonymousMeterStatusLoading } =
    useAnonymousMeterStatus(!token);

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
      products.filter(
        (product) =>
          product.productKind === "product" &&
          product.visibleInSettings !== false &&
          product.state !== "hidden"
      )
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
      row.products.push(product.label);
      rows.set(scope, row);
    }
    return [...rows.values()].sort((a, b) => {
      const aIndex = MEMORY_SCOPE_ORDER.indexOf(a.scope as (typeof MEMORY_SCOPE_ORDER)[number]);
      const bIndex = MEMORY_SCOPE_ORDER.indexOf(b.scope as (typeof MEMORY_SCOPE_ORDER)[number]);
      if (aIndex !== -1 || bIndex !== -1) {
        const normalizedAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const normalizedBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
        return normalizedAIndex - normalizedBIndex;
      }
      return a.scope.localeCompare(b.scope);
    });
  }, [productRegistry?.products]);

  const weeklyReset = formatReset(meterStatus?.weekly?.resetAt);
  const rollingReset = formatReset(meterStatus?.rolling?.resetAt);

  return (
    <section
      className={cn(
        "h-full w-full overflow-y-auto px-4 pb-44 pt-5 sm:px-6 lg:px-8",
        isRtl && "rtl"
      )}
      aria-labelledby="zaki-command-center-title"
      data-testid="zaki-command-center"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-zaki-subtle pb-5 dark:border-zaki-dark-border lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-zaki-lg border border-zaki-subtle bg-white text-zaki-brand dark:border-zaki-dark-border dark:bg-zaki-dark-card">
                <CenterLogo className="size-6" />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted">
                  {t("zakiDashboard.eyebrow")}
                </div>
                <h1
                  id="zaki-command-center-title"
                  className="mt-1 text-2xl font-semibold tracking-normal text-zaki-primary dark:text-zaki-dark-primary md:text-3xl"
                >
                  {t("zakiDashboard.title", { name: displayName })}
                </h1>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("zakiDashboard.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="zaki-btn zaki-btn-secondary"
              onClick={() =>
                onSendExample(
                  t("zakiDashboard.agentPrompt", {
                    defaultValue:
                      "Look at my ZAKI products and help me choose the best next step.",
                  })
                )
              }
            >
              <Sparkles className="size-4" />
              {t("zakiDashboard.actions.askAgent")}
            </button>
            <button
              type="button"
              className="zaki-btn zaki-btn-primary"
              onClick={() => navigate("/spaces")}
            >
              <MessageSquareText className="size-4" />
              {t("zakiDashboard.actions.openChat")}
            </button>
          </div>
        </header>

        <div
          className="grid gap-3 md:grid-cols-3"
          data-testid="zaki-dashboard-meter"
          aria-label={t("zakiDashboard.meter.label")}
        >
          <div className="rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 dark:border-zaki-dark-border dark:bg-zaki-dark-card">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-zaki-dark-muted">
              <Gauge className="size-4" />
              {t("zakiDashboard.meter.plan")}
            </div>
            <div className="mt-3 text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {meterLoading ? t("zakiDashboard.meter.loading") : meterStatus?.plan?.label || "Free"}
            </div>
            <div className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              {identityLabel}
            </div>
          </div>

          <div className="rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 dark:border-zaki-dark-border dark:bg-zaki-dark-card">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-zaki-dark-muted">
              <Database className="size-4" />
              {t("zakiDashboard.meter.weekly")}
            </div>
            <div className="mt-3 text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {meterLoading
                ? t("zakiDashboard.meter.loading")
                : formatWindowLabel(t, meterStatus?.weekly)}
            </div>
            <div className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              {weeklyReset
                ? t("zakiDashboard.meter.resets", { reset: weeklyReset })
                : t("zakiDashboard.meter.resetPending")}
            </div>
          </div>

          <div className="rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 dark:border-zaki-dark-border dark:bg-zaki-dark-card">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-zaki-dark-muted">
              <Clock3 className="size-4" />
              {t("zakiDashboard.meter.rolling", {
                hours: meterStatus?.rolling?.windowHours ?? 5,
              })}
            </div>
            <div className="mt-3 text-2xl font-semibold text-zaki-primary dark:text-zaki-dark-primary">
              {meterLoading
                ? t("zakiDashboard.meter.loading")
                : formatWindowLabel(t, meterStatus?.rolling)}
            </div>
            <div className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
              {rollingReset
                ? t("zakiDashboard.meter.resets", { reset: rollingReset })
                : t("zakiDashboard.meter.resetPending")}
            </div>
          </div>
        </div>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3" data-testid="zaki-dashboard-products">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                  {t("zakiDashboard.products.title")}
                </h2>
                <p className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                  {t("zakiDashboard.products.subtitle")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {productRegistryLoading ? (
                <div className="rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 text-sm text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-card dark:text-zaki-dark-muted md:col-span-2">
                  {t("zakiDashboard.products.loading")}
                </div>
              ) : null}
              {!productRegistryLoading && dashboardProducts.length === 0 ? (
                <div className="rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 text-sm text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-card dark:text-zaki-dark-muted md:col-span-2">
                  {t("zakiDashboard.products.empty")}
                </div>
              ) : null}
              {dashboardProducts.map(({ product, meterProduct }) => {
                const Icon = PRODUCT_ICONS[product.productId] ?? Sparkles;
                const route = getProductRoute(product);
                const isOpenable = Boolean(route && canOpenProduct(product));
                const productWeekly = formatWindowLabel(t, meterProduct?.weekly);
                return (
                  <article
                    key={product.productId}
                    className="flex min-h-[190px] flex-col justify-between rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 dark:border-zaki-dark-border dark:bg-zaki-dark-card"
                    data-testid={`zaki-product-card-${product.productId}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-zaki-md border border-zaki-subtle bg-zaki-raised text-zaki-primary dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-primary">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                              {product.label}
                            </h3>
                            <div className="mt-1 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                              {product.entryPoint || product.route || product.productId}
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            STATE_TONE[product.state]
                          )}
                        >
                          {getProductStateLabel(t, product.state)}
                        </span>
                      </div>
                      <p className="mt-4 min-h-[42px] text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
                        {t(getProductDescriptionKey(product.productId), {
                          defaultValue: product.entryPoint || product.label,
                        })}
                      </p>
                      <div className="mt-3 grid gap-2 text-xs text-zaki-muted dark:text-zaki-dark-muted">
                        <div className="flex items-center justify-between gap-2">
                          <span>{t("zakiDashboard.products.memory")}</span>
                          <span className="text-right font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                            {getMemoryScopeLabel(t, product.memoryScope)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span>{t("zakiDashboard.products.usage")}</span>
                          <span className="text-right font-medium text-zaki-secondary dark:text-zaki-dark-subtle">
                            {productWeekly}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-zaki-md px-3 text-sm font-semibold transition-colors",
                        isOpenable
                          ? "bg-zaki-primary text-white hover:bg-zaki-brand-hover"
                          : "cursor-not-allowed border border-zaki-subtle bg-zaki-raised text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-muted"
                      )}
                      disabled={!isOpenable}
                      onClick={() => {
                        if (route && isOpenable) navigate(route);
                      }}
                    >
                      {isOpenable
                        ? t("zakiDashboard.products.open")
                        : t("zakiDashboard.products.notAvailable")}
                      {isOpenable ? <ArrowRight className="size-4" /> : null}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-3">
            <section
              className="rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 dark:border-zaki-dark-border dark:bg-zaki-dark-card"
              data-testid="zaki-dashboard-memory"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                    {t("zakiDashboard.memory.title")}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                    {t("zakiDashboard.memory.subtitle")}
                  </p>
                </div>
                <Brain className="size-5 text-zaki-brand" />
              </div>
              <div className="mt-4 grid gap-2">
                {memoryScopes.length > 0 ? (
                  memoryScopes.map((row) => (
                    <div
                      key={row.scope}
                      className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 dark:border-zaki-dark-border dark:bg-zaki-dark-panel"
                    >
                      <div className="text-sm font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                        {getMemoryScopeLabel(t, row.scope)}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                        {row.products.join(" · ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-zaki-md border border-zaki-subtle bg-zaki-raised px-3 py-3 text-xs text-zaki-muted dark:border-zaki-dark-border dark:bg-zaki-dark-panel dark:text-zaki-dark-muted">
                    {t("zakiDashboard.memory.loading")}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="zaki-btn-sm zaki-btn-secondary mt-4 w-full justify-center"
                data-onboarding-id="zaki-dashboard-brain-entry"
                onClick={() => navigate("/brain")}
              >
                <Brain className="size-4" />
                {t("zakiDashboard.memory.open")}
              </button>
              {onOpenMemoryImport ? (
                <button
                  type="button"
                  className="zaki-btn-sm zaki-btn-ghost mt-2 w-full justify-center"
                  onClick={onOpenMemoryImport}
                >
                  <Upload className="size-4" />
                  {t("zakiDashboard.memory.import")}
                </button>
              ) : null}
            </section>

            <section className="rounded-zaki-lg border border-zaki-subtle bg-white px-4 py-4 dark:border-zaki-dark-border dark:bg-zaki-dark-card">
              <h2 className="text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                {t("zakiDashboard.readiness.title")}
              </h2>
              <p className="mt-1 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                {t("zakiDashboard.readiness.subtitle")}
              </p>
              <div className="mt-4 grid gap-2">
                {[
                  {
                    icon: CheckCircle2,
                    label: t("zakiDashboard.readiness.registry"),
                  },
                  {
                    icon: Gauge,
                    label: t("zakiDashboard.readiness.meter"),
                  },
                  {
                    icon: Wrench,
                    label: t("zakiDashboard.readiness.routing"),
                  },
                  {
                    icon: Database,
                    label: t("zakiDashboard.readiness.memory"),
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 text-xs font-medium text-zaki-secondary dark:text-zaki-dark-subtle"
                    >
                      <Icon className="size-4 text-zaki-brand" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </section>
  );
}

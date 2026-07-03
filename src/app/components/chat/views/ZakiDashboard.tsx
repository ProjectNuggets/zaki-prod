import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type SVGProps,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  BriefcaseBusiness,
  Clock3,
  Gauge,
  GraduationCap,
  LogIn,
  MessageSquareText,
  PenTool,
  Sparkles,
  X,
} from "lucide-react";
import {
  useAnonymousMeterStatus,
  useMeterStatus,
  useProductRegistry,
  useZakiSessions,
} from "@/queries";
import {
  V2Badge,
  V2Button,
  V2StatusStrip,
  type V2BadgeTone,
} from "@/app/components/v2";
import type {
  AgentSession,
  MeterAvailableNow,
  MeterWindowSnapshot,
} from "@/lib/api";
import { claimAnonymousSpacesWork } from "@/lib/api";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import {
  formatUsagePercentLabel,
  getRoundedUsagePercent,
  getUsagePercent,
  isUsageNearCap,
} from "@/lib/usageDisplay";
import { formatZakiSessionLabel } from "@/lib/zakiSessions";
import {
  buildAnonymousWorkTitle,
  readAnonymousWorkLedger,
  upsertAnonymousWorkItem,
  type AnonymousWorkItem,
  type AnonymousWorkProductId,
} from "@/lib/anonymousWork";
import { buildProductReturnTo, writePendingIntent } from "@/lib/pendingIntent";
import { useOnlineStatus } from "@/hooks";

interface ZakiDashboardProps {
  onSendExample: (example: string) => void;
  onOpenMemoryImport?: () => void;
  onOpenSession?: (sessionKey: string) => void;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type WindowStats = {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  usedPercent: number;
};

const COMMAND_PRODUCT_ORDER: AnonymousWorkProductId[] = [
  "agent",
  "spaces",
  "learning",
  "design",
  "hire",
];

const ANONYMOUS_COMMAND_PRODUCT_ORDER = COMMAND_PRODUCT_ORDER;
const SIGNED_IN_COMMAND_PRODUCT_ORDER = COMMAND_PRODUCT_ORDER;
const DASHBOARD_INTRO_DISMISSED_KEY = "zaki:dashboard-v2-intro-dismissed";
const MEMORY_BRIDGE_OFFER_KEY_PREFIX = "zaki:memory-bridge-offered";
const WEBSITE_HOME_URL = "https://chatzaki.com/";
const WEBSITE_PRODUCT_URL = "https://chatzaki.com/product";
const WEBSITE_PRICING_ROUTE = "/pricing";
const COMING_SOON_PRODUCT_IDS = new Set<AnonymousWorkProductId>([
  "design",
  "learning",
  "hire",
]);
const AUTH_REQUIRED_PRODUCT_IDS = new Set<AnonymousWorkProductId>([
  "agent",
  "brain",
]);

const COMMAND_TASK_KIND: Record<AnonymousWorkProductId, string> = {
  agent: "plan",
  brain: "map",
  learning: "study_plan",
  design: "brief",
  hire: "career_plan",
  spaces: "chat",
};

const COMMAND_PRODUCT_ICON: Record<AnonymousWorkProductId, LucideIcon> = {
  agent: Sparkles,
  brain: Brain,
  learning: GraduationCap,
  design: PenTool,
  hire: BriefcaseBusiness,
  spaces: MessageSquareText,
};

const SCRAMBLE_CHARS = "01/\\-_";

function isComingSoonProduct(productId: AnonymousWorkProductId) {
  return COMING_SOON_PRODUCT_IDS.has(productId);
}

function isAuthRequiredProduct(productId: AnonymousWorkProductId) {
  return AUTH_REQUIRED_PRODUCT_IDS.has(productId);
}

function formatReset(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function openMarketingWebsite() {
  window.open(WEBSITE_HOME_URL, "_blank", "noopener,noreferrer");
}

function openMarketingProductOverview() {
  window.open(WEBSITE_PRODUCT_URL, "_blank", "noopener,noreferrer");
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

function getMemoryBridgeOfferKey(user: unknown) {
  const record =
    typeof user === "object" && user !== null
      ? (user as Record<string, unknown>)
      : {};
  const raw =
    record.id ??
    record.userId ??
    record.username ??
    record.email ??
    "signed-in";
  return `${MEMORY_BRIDGE_OFFER_KEY_PREFIX}:${String(raw).trim() || "signed-in"}`;
}

function getSessionTitle(session: AgentSession) {
  return formatZakiSessionLabel({
    sessionKey: session.session_key,
    title: session.title,
    createdAt: session.created_at ?? session.last_active,
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
  const usedPercent = getUsagePercent({ used, limit });
  return { limit, used, remaining, usedPercent };
}

function isAvailabilityBlocked(availability?: MeterAvailableNow | null) {
  if (!availability) return false;
  if (availability.available === false) return true;
  const remaining =
    typeof availability.effectiveRemaining === "number"
      ? availability.effectiveRemaining
      : null;
  const required =
    typeof availability.requiredReserveUnits === "number"
      ? availability.requiredReserveUnits
      : null;
  return remaining != null && required != null && remaining < required;
}

function getCommandProductName(t: TranslateFn, productId: AnonymousWorkProductId) {
  return t(`zakiDashboard.products.names.${productId}`, {
    defaultValue:
      productId === "learning"
        ? "Learn"
        : productId === "spaces"
          ? "Chat"
          : productId === "hire"
            ? "Career"
          : productId[0]?.toUpperCase() + productId.slice(1),
  });
}

function getCommandProductVerb(
  t: TranslateFn,
  productId: AnonymousWorkProductId,
  signedIn: boolean
) {
  const fallback: Record<AnonymousWorkProductId, { signed: string; guest: string }> = {
    agent: { signed: "move", guest: "plan" },
    brain: { signed: "map", guest: "map" },
    learning: { signed: "learn", guest: "study" },
    design: { signed: "shape", guest: "shape" },
    hire: { signed: "advance", guest: "advance" },
    spaces: { signed: "chat", guest: "chat" },
  };
  return t(
    `zakiDashboard.command.verbs.${productId}.${signedIn ? "signed" : "guest"}`,
    {
      defaultValue: signedIn ? fallback[productId].signed : fallback[productId].guest,
    }
  );
}

function getCommandPlaceholder(
  t: TranslateFn,
  productId: AnonymousWorkProductId,
  signedIn: boolean
) {
  const fallback: Record<AnonymousWorkProductId, string | { signed: string; guest: string }> = {
    agent: {
      signed: "Describe the outcome, constraints, and where Agent should start.",
      guest: "Describe the outcome. Sign in to let Agent plan, use tools, and keep the run.",
    },
    brain: {
      signed: "Ask Brain to find a memory, connect facts, or clean up what ZAKI knows.",
      guest: "Write what you want ZAKI to remember; sign in to save it to Brain.",
    },
    spaces: "Ask a question, draft a reply, translate text, or compare options.",
    design: "Sketch the product, page, or brand direction you want to shape.",
    learning: "Name the topic and goal; ZAKI can make a study plan or explain the first step.",
    hire: "Paste a role, CV note, or career goal; ZAKI can shape the next move.",
  };
  const detail = fallback[productId];
  if (typeof detail === "string") {
    return t(`zakiDashboard.command.placeholders.${productId}`, {
      defaultValue: detail,
    });
  }
  return t(`zakiDashboard.command.placeholders.${productId}.${signedIn ? "signed" : "guest"}`, {
    defaultValue: signedIn ? detail.signed : detail.guest,
  });
}

function getCommandProductDetails(
  t: TranslateFn,
  productId: AnonymousWorkProductId,
  signedIn: boolean
) {
  const fallback: Record<
    AnonymousWorkProductId,
    { headline: string; note: string; accessTone: V2BadgeTone }
  > = {
    agent: {
      headline: signedIn
        ? "If you need a messy goal turned into action, use Agent."
        : "If you need Agent to carry work forward, sign in first.",
      note: signedIn
        ? "It can plan, ask approval, use files and browser control, then keep the run in your history."
        : "Tools, files, browser control, and durable memory are account-scoped.",
      accessTone: signedIn ? "success" : "accent",
    },
    brain: {
      headline: signedIn
        ? "If you need to see what ZAKI remembers, use Brain."
        : "If you need durable memory, sign in for Brain.",
      note: signedIn
        ? "Search the graph, inspect saved context, and refine account memory."
        : "The graph belongs to your account, not this browser session.",
      accessTone: signedIn ? "success" : "accent",
    },
    learning: {
      headline: "If you need study help today, use Chat or Agent.",
      note: "Learn stays gated until learner state and the beta path are ready.",
      accessTone: "warn",
    },
    design: {
      headline: "If you need a design brief today, use Chat or Agent.",
      note: "Design stays waitlisted until the project service is ready.",
      accessTone: "warn",
    },
    hire: {
      headline: "If you need CV or career planning today, use Chat or Agent.",
      note: "Career stays gated until the private workflow is ready.",
      accessTone: "warn",
    },
    spaces: {
      headline: "If you need a fast answer, draft, or translation, use Chat.",
      note: "No setup. Anonymous usage works until you choose to save.",
      accessTone: "success",
    },
  };
  const detail = fallback[productId];
  return {
    headline: t(
      isAuthRequiredProduct(productId)
        ? `zakiDashboard.command.details.${productId}.headline.${signedIn ? "signed" : "guest"}`
        : `zakiDashboard.command.details.${productId}.headline`,
      {
        defaultValue: detail.headline,
      }
    ),
    note: t(
      isAuthRequiredProduct(productId)
        ? `zakiDashboard.command.details.${productId}.note.${signedIn ? "signed" : "guest"}`
        : `zakiDashboard.command.details.${productId}.note`,
      {
        defaultValue: detail.note,
      }
    ),
    accessTone: detail.accessTone,
  };
}

function getCommandProductRoute(productId: AnonymousWorkProductId) {
  return buildProductReturnTo(productId);
}

function getCommandProductStateMarker(
  t: TranslateFn,
  productId: AnonymousWorkProductId,
  signedIn: boolean
) {
  if (isComingSoonProduct(productId)) {
    return t("zakiDashboard.command.markers.comingSoon", { defaultValue: "Coming soon" });
  }
  if (productId === "spaces") {
    return t("zakiDashboard.command.markers.free", { defaultValue: "Free" });
  }
  if (isAuthRequiredProduct(productId) && !signedIn) {
    return t("zakiDashboard.command.markers.signIn", { defaultValue: "Sign in" });
  }
  return t("zakiDashboard.command.markers.live", { defaultValue: "Live" });
}

function getCommandSubmitLabel(
  t: TranslateFn,
  productId: AnonymousWorkProductId,
  productName: string,
  signedIn: boolean
) {
  if (isComingSoonProduct(productId)) {
    return t("zakiDashboard.command.submitComingSoon", {
      product: productName,
      defaultValue: "{{product}} coming soon",
    });
  }
  if (productId === "spaces") {
    return t("zakiDashboard.command.submitChat", {
      defaultValue: "Start chat",
    });
  }
  if (isAuthRequiredProduct(productId) && !signedIn) {
    return t("zakiDashboard.command.submitSignIn", {
      product: productName,
      defaultValue: "Sign in for {{product}}",
    });
  }
  return t("zakiDashboard.command.submitOpen", {
    product: productName,
    defaultValue: "Continue in {{product}}",
  });
}

function ScrambleSignal({ value }: { value: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isScrambling, setIsScrambling] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(value);
      setIsScrambling(false);
      return undefined;
    }

    let frame = 0;
    const maxFrames = 14;
    setIsScrambling(true);

    const interval = window.setInterval(() => {
      frame += 1;
      const progress = frame / maxFrames;
      const nextValue = value
        .split("")
        .map((letter, index) => {
          if (letter === " ") return " ";
          if (index / Math.max(value.length, 1) < progress) return letter;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] || letter;
        })
        .join("");

      setDisplayValue(nextValue);
      if (frame >= maxFrames) {
        window.clearInterval(interval);
        setDisplayValue(value);
        setIsScrambling(false);
      }
    }, 32);

    return () => {
      window.clearInterval(interval);
      setDisplayValue(value);
      setIsScrambling(false);
    };
  }, [value]);

  return (
    <span
      className={cn(
        "zaki-dashboard-command__title-signal",
        isScrambling && "is-scrambling"
      )}
      data-scramble="//"
      aria-hidden="true"
    >
      {displayValue}
    </span>
  );
}

function WebsitePixelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      <path d="m1.52 7.62 28.96 0 0 22.85 1.52 0 0 -28.95 -1.52 0 0 4.57 -28.96 0 0 -4.57 -1.52 0 0 28.95 1.52 0 0 -22.85z" fill="currentColor" />
      <path d="M1.52 30.47h28.96V32H1.52Z" fill="currentColor" />
      <path d="M21.33 25.9h6.1v1.53h-6.1Z" fill="currentColor" />
      <path d="M21.33 22.85h6.1v1.53h-6.1Z" fill="currentColor" />
      <path d="M4.57 10.66v9.15h22.86v-9.15Zm21.33 7.62H15.24v-1.52h-1.53v1.52H6.09v-6.09h15.24v1.52h1.53v-1.52h3.04Z" fill="currentColor" />
      <path d="M18.29 13.71h3.04v1.52h-3.04Z" fill="currentColor" />
      <path d="M15.24 15.23h3.05v1.53h-3.05Z" fill="currentColor" />
      <path d="M4.57 25.9h12.19v1.53H4.57Z" fill="currentColor" />
      <path d="M4.57 22.85h12.19v1.53H4.57Z" fill="currentColor" />
      <path d="M9.14 3.04h1.53v1.53H9.14Z" fill="currentColor" />
      <path d="M7.62 13.71h3.05v3.05H7.62Z" fill="currentColor" />
      <path d="M6.09 3.04h1.53v1.53H6.09Z" fill="currentColor" />
      <path d="M3.05 3.04h1.52v1.53H3.05Z" fill="currentColor" />
      <path d="M1.52 0h28.96v1.52H1.52Z" fill="currentColor" />
    </svg>
  );
}

function ProductTaskStrip({
  t,
  productOrder,
  selectedProductId,
  signedIn,
  onSelect,
}: {
  t: TranslateFn;
  productOrder: AnonymousWorkProductId[];
  selectedProductId: AnonymousWorkProductId;
  signedIn: boolean;
  onSelect: (productId: AnonymousWorkProductId) => void;
}) {
  return (
    <div
      className="zaki-dashboard-command__strip"
      role="tablist"
      aria-label={t("zakiDashboard.command.productStrip", {
        defaultValue: "Choose product",
      })}
      data-testid="zaki-dashboard-command-strip"
    >
      {productOrder.map((productId) => {
        const Icon = COMMAND_PRODUCT_ICON[productId];
        const isSelected = selectedProductId === productId;
        const productName = getCommandProductName(t, productId);
        return (
          <button
            key={productId}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={productName}
            className={cn(
              "zaki-dashboard-command__product",
              isSelected && "zaki-dashboard-command__product--active",
              isComingSoonProduct(productId) && "zaki-dashboard-command__product--soon"
            )}
            onClick={() => onSelect(productId)}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="zaki-dashboard-command__product-name">{productName}</span>
            <span className="zaki-dashboard-command__product-marker">
              {getCommandProductStateMarker(t, productId, signedIn)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CreditMeter({
  t,
  loading,
  unavailable,
  weeklyStats,
  weeklyReset,
}: {
  t: TranslateFn;
  loading: boolean;
  unavailable: boolean;
  weeklyStats: WindowStats;
  weeklyReset: string | null;
}) {
  const roundedPercent = getRoundedUsagePercent(weeklyStats.usedPercent);
  const isUnavailable = unavailable && !loading;
  const usageShortLabel = loading
    ? t("zakiDashboard.meter.loading")
    : isUnavailable
    ? t("zakiControls.powerUser.usage.unavailable", {
        defaultValue: "Usage unavailable",
      })
    : t("zakiDashboard.meter.usageShort", {
        percent: roundedPercent,
        defaultValue: `${roundedPercent}%`,
      });
  const usageAriaLabel = loading
    ? t("zakiDashboard.meter.loading")
    : isUnavailable
    ? t("zakiControls.powerUser.usage.unavailable", {
        defaultValue: "Usage unavailable",
      })
    : t("zakiDashboard.meter.usagePercent", {
        percent: roundedPercent,
        defaultValue: formatUsagePercentLabel(weeklyStats.usedPercent),
      });
  const resetValue = weeklyReset
    ? t("zakiDashboard.meter.resetShort", {
        reset: weeklyReset,
        defaultValue: weeklyReset,
      })
    : t("zakiDashboard.meter.resetPendingShort", {
        defaultValue: "Pending",
      });
  const nearCap = !loading && !isUnavailable && isUsageNearCap(weeklyStats.usedPercent);
  return (
    <div
      className="zaki-dashboard-command__meter"
      data-testid="zaki-dashboard-command-meter"
      data-unavailable={isUnavailable ? "true" : undefined}
      aria-label={usageAriaLabel}
    >
      <div className="zaki-dashboard-command__meter-top">
        <span className="zaki-dashboard-command__meter-kicker">
          {t("zakiDashboard.command.weeklyFreeCredit", {
            defaultValue: "Usage",
          })}
        </span>
        <strong>{usageShortLabel}</strong>
        <small className="zaki-dashboard-command__meter-reset">
          <span>{t("zakiDashboard.meter.reset", { defaultValue: "Reset" })}</span>
          <b>{resetValue}</b>
        </small>
        {nearCap ? (
          <small className="zaki-dashboard-command__meter-nudge">
            {t("zakiDashboard.command.nearCapNudge", {
              percent: roundedPercent,
              defaultValue: `You're at ${roundedPercent}% this week — upgrade for more room.`,
            })}
          </small>
        ) : null}
      </div>
      <div
        className="zaki-dashboard-command__meter-track"
        data-unavailable={isUnavailable ? "true" : undefined}
        aria-label={usageAriaLabel}
      >
        <span
          style={isUnavailable ? undefined : { width: `${weeklyStats.usedPercent}%` }}
        />
      </div>
    </div>
  );
}

function ProductHintPanel({
  t,
  productId,
  signedIn,
}: {
  t: TranslateFn;
  productId: AnonymousWorkProductId;
  signedIn: boolean;
}) {
  const Icon = COMMAND_PRODUCT_ICON[productId];
  const productName = getCommandProductName(t, productId);
  const details = getCommandProductDetails(t, productId, signedIn);
  return (
    <section
      className="zaki-dashboard-command__hint"
      data-testid="zaki-dashboard-product-hint"
      aria-label={t("zakiDashboard.command.selectedProduct", {
        product: productName,
        defaultValue: "{{product}} overview",
      })}
    >
      <div className="zaki-dashboard-command__hint-name">
        <Icon className="size-4" aria-hidden="true" />
        <span>{productName}</span>
      </div>
      <div className="zaki-dashboard-command__hint-body">
        <strong>{details.headline}</strong>
        <span>{details.note}</span>
      </div>
      <V2Badge tone={details.accessTone}>
        {getCommandProductStateMarker(t, productId, signedIn)}
      </V2Badge>
    </section>
  );
}

function ActiveWorkInline({
  t,
  sessions,
  onOpenSession,
}: {
  t: TranslateFn;
  sessions: AgentSession[];
  onOpenSession?: (sessionKey: string) => void;
}) {
  const session = sessions[0];
  if (!session) return null;

  const title = getSessionTitle(session);
  const pendingCount = session.pending_approval_count ?? 0;
  const stateLabel =
    pendingCount > 0
      ? t("zakiDashboard.activeWork.pendingApprovalShort", {
          count: pendingCount,
          defaultValue: "{{count}} approval waiting",
        })
      : session.live
        ? t("zakiDashboard.activeWork.liveSessionShort", {
            defaultValue: "streaming",
          })
        : t("zakiDashboard.activeWork.recentSessionShort", {
            defaultValue: "recent",
          });
  const sessionMeta = t("zakiDashboard.activeWork.sessionMeta", {
    messages: session.message_count ?? 0,
    mode:
      session.mode ||
      t("zakiDashboard.activeWork.noMode", {
        defaultValue: "standard",
      }),
    defaultValue: "{{messages}} messages · {{mode}}",
  });

  return (
    <button
      type="button"
      className="zaki-dashboard-command__carry"
      onClick={() => onOpenSession?.(session.session_key)}
      aria-label={t("zakiDashboard.activeWork.openSessionAria", {
        title,
        defaultValue: "Open Agent session {{title}}",
      })}
    >
      <span className="zaki-dashboard-command__carry-kicker">
        {t("zakiDashboard.activeWork.carryOn", { defaultValue: "Carry on" })}
      </span>
      <span className="zaki-dashboard-command__carry-main">
        <strong>{title}</strong>
        <span>{stateLabel}</span>
      </span>
      <span className="zaki-dashboard-command__carry-meta">{sessionMeta}</span>
      <time>{formatTime(session.last_active)}</time>
    </button>
  );
}

function DashboardIntroModal({
  t,
  open,
  onClose,
  onStartWork,
  onVisitWebsite,
}: {
  t: TranslateFn;
  open: boolean;
  onClose: () => void;
  onStartWork: () => void;
  onVisitWebsite: () => void;
}) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const slides = [
    {
      id: "what",
      step: "01",
      title: t("zakiDashboard.intro.slides.what.title", {
        defaultValue: "An intelligence layer",
      }),
      body: t("zakiDashboard.intro.slides.what.body", {
        defaultValue:
          "ZAKI gives every task one surface: write the outcome once, then route it to Chat or Agent with memory underneath.",
      }),
      bullets: [
        t("zakiDashboard.intro.slides.what.bullets.command", {
          defaultValue: "Chat answers and drafts now.",
        }),
        t("zakiDashboard.intro.slides.what.bullets.route", {
          defaultValue: "Agent turns goals into supervised action.",
        }),
        t("zakiDashboard.intro.slides.what.bullets.keep", {
          defaultValue: "Brain makes durable memory visible and manageable.",
        }),
      ],
    },
    {
      id: "buy",
      step: "02",
      title: t("zakiDashboard.intro.slides.buy.title", {
        defaultValue: "The daily AI interface",
      }),
      body: t("zakiDashboard.intro.slides.buy.body", {
        defaultValue:
          "Use ZAKI for the small work and the serious work: decide, draft, research, plan, remember, and move.",
      }),
      bullets: [
        t("zakiDashboard.intro.slides.buy.bullets.guest", {
          defaultValue: "Start without setup when the task is simple.",
        }),
        t("zakiDashboard.intro.slides.buy.bullets.account", {
          defaultValue: "Sign in when work needs files, tools, memory, or history.",
        }),
        t("zakiDashboard.intro.slides.buy.bullets.plan", {
          defaultValue: "Usage stays visible before you hit a wall.",
        }),
      ],
    },
    {
      id: "palette",
      step: "03",
      title: t("zakiDashboard.intro.slides.palette.title", {
        defaultValue: "A second digital brain",
      }),
      body: t("zakiDashboard.intro.slides.palette.body", {
        defaultValue:
          "ZAKI is built to make AI cumulative: facts, decisions, preferences, projects, and active runs can carry forward.",
      }),
      bullets: [
        t("zakiDashboard.intro.slides.palette.bullets.chat", {
          defaultValue: "Brain makes memory inspectable, not hidden in chat.",
        }),
        t("zakiDashboard.intro.slides.palette.bullets.preview", {
          defaultValue: "Agent can use that context when you approve action.",
        }),
        t("zakiDashboard.intro.slides.palette.bullets.website", {
          defaultValue: "The website explains the product; this app is where work starts.",
        }),
      ],
    },
  ];
  const activeSlide = slides[activeSlideIndex] ?? slides[0]!;
  const isFirstSlide = activeSlideIndex === 0;
  const isLastSlide = activeSlideIndex === slides.length - 1;

  useEffect(() => {
    if (open) setActiveSlideIndex(0);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="zaki-dashboard-intro"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zaki-dashboard-intro-title"
      aria-describedby="zaki-dashboard-intro-slide"
      data-testid="zaki-dashboard-intro"
    >
      <div className="zaki-dashboard-intro__panel">
        <div className="zaki-dashboard-intro__head">
          <div>
            <span>{t("zakiDashboard.intro.kicker", { defaultValue: "First run" })}</span>
            <h2 id="zaki-dashboard-intro-title">
              {t("zakiDashboard.intro.title", {
                defaultValue: "ZAKI is the intelligence layer for everyday work.",
              })}
            </h2>
          </div>
          <button
            type="button"
            className="zaki-dashboard-intro__close"
            aria-label={t("common.close", { defaultValue: "Close" })}
            onClick={onClose}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <article
          id="zaki-dashboard-intro-slide"
          className="zaki-dashboard-intro__slide"
          data-testid="zaki-dashboard-intro-slide"
        >
          <span className="zaki-dashboard-intro__slide-kicker">{activeSlide.step}</span>
          <h3>{activeSlide.title}</h3>
          <p>{activeSlide.body}</p>
          <ul>
            {activeSlide.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </article>
        <div className="zaki-dashboard-intro__foot">
          <div className="zaki-dashboard-intro__dots" aria-label={t("zakiDashboard.intro.progress", { defaultValue: "Intro slides" })}>
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-current={index === activeSlideIndex ? "step" : undefined}
                aria-label={t("zakiDashboard.intro.goToSlide", {
                  index: index + 1,
                  defaultValue: "Go to slide {{index}}",
                })}
                onClick={() => setActiveSlideIndex(index)}
              >
                <span>{slide.step}</span>
              </button>
            ))}
          </div>
          <div className="zaki-dashboard-intro__actions">
            <V2Button
              type="button"
              variant="ghost"
              disabled={isFirstSlide}
              onClick={() => setActiveSlideIndex((current) => Math.max(0, current - 1))}
            >
              {t("zakiDashboard.intro.back", { defaultValue: "Back" })}
            </V2Button>
            {isLastSlide ? (
              <V2Button type="button" variant="ghost" onClick={onVisitWebsite}>
                <WebsitePixelIcon className="size-4" />
                {t("zakiDashboard.intro.visitWebsite", { defaultValue: "Visit website" })}
              </V2Button>
            ) : null}
            <V2Button
              type="button"
              onClick={
                isLastSlide
                  ? onStartWork
                  : () => setActiveSlideIndex((current) => Math.min(slides.length - 1, current + 1))
              }
            >
              {isLastSlide
                ? t("zakiDashboard.intro.startTyping", { defaultValue: "Enter dashboard" })
                : t("zakiDashboard.intro.next", { defaultValue: "Next" })}
            </V2Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReturningWorkStrip({
  t,
  items,
  claimed = false,
  claimError = null,
  onContinue,
  onSave,
}: {
  t: TranslateFn;
  items: AnonymousWorkItem[];
  claimed?: boolean;
  claimError?: string | null;
  onContinue: (item: AnonymousWorkItem) => void;
  onSave: (item?: AnonymousWorkItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="zaki-dashboard-command__ledger" data-testid="zaki-anonymous-work">
      <div className="zaki-dashboard-command__ledger-head">
        <div>
          <h2>
            {claimed
              ? t("zakiDashboard.anonymousWork.claimedTitle", {
                  defaultValue: "We kept your work",
                })
              : t("zakiDashboard.anonymousWork.title", {
                  defaultValue: "Continue what you started",
                })}
          </h2>
          <p>
            {claimed
              ? t("zakiDashboard.anonymousWork.claimedSubtitle", {
                  defaultValue: "Your recent browser work is available after sign-in.",
                })
              : t("zakiDashboard.anonymousWork.subtitle", {
                  defaultValue: "Saved in this browser only. Sign in to keep it across devices.",
                })}
          </p>
          {claimError ? (
            <p className="zaki-dashboard-command__ledger-error" role="status">
              {claimError}
            </p>
          ) : null}
        </div>
        {!claimed ? (
          <V2Button type="button" onClick={() => onSave(items[0])}>
            <LogIn className="size-4" aria-hidden="true" />
            {t("zakiDashboard.anonymousWork.save", {
              defaultValue: "Save this work",
            })}
          </V2Button>
        ) : null}
      </div>
      <div className="zaki-dashboard-command__ledger-list">
        {items.slice(0, 4).map((item) => (
          <button
            key={item.id}
            type="button"
            className="zaki-dashboard-command__ledger-row"
            onClick={() => onContinue(item)}
          >
            <span className="zaki-dashboard-command__ledger-product">
              {getCommandProductName(t, item.productId)}
            </span>
            <span className="zaki-dashboard-command__ledger-main">
              <strong>{item.title}</strong>
              <span>{item.prompt}</span>
            </span>
            <span className="zaki-dashboard-command__ledger-time">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {formatTime(item.updatedAt)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ZakiDashboard({
  onSendExample,
  onOpenMemoryImport,
  onOpenSession,
}: ZakiDashboardProps) {
  const { i18n, t } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const token = useAuthStore((state) => state.token);
  const authUser = useAuthStore((state) => state.user);
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<AnonymousWorkProductId>(
    token ? "agent" : "spaces"
  );
  const [commandText, setCommandText] = useState("");
  const [anonymousWorkItems, setAnonymousWorkItems] = useState<AnonymousWorkItem[]>([]);
  const [anonymousWorkClaimed, setAnonymousWorkClaimed] = useState(false);
  const [anonymousWorkClaimError, setAnonymousWorkClaimError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [memoryBridgeSeen, setMemoryBridgeSeen] = useState(false);
  const [titleSignalIndex, setTitleSignalIndex] = useState(0);
  const { isLoading: productRegistryLoading } = useProductRegistry();
  const {
    data: meterStatusResult,
    isLoading: meterStatusLoading,
    isError: meterStatusError,
  } = useMeterStatus();
  const {
    data: anonymousMeterStatusResult,
    isLoading: anonymousMeterStatusLoading,
    isError: anonymousMeterStatusError,
  } = useAnonymousMeterStatus(!token);
  const { data: zakiSessions } = useZakiSessions(
    Boolean(token)
  );

  const meterStatus = token
    ? meterStatusResult?.data
    : anonymousMeterStatusResult?.data;
  const meterLoading = token ? meterStatusLoading : anonymousMeterStatusLoading;
  const meterUnavailable = token ? meterStatusError : anonymousMeterStatusError;
  const identityLabel =
    meterStatus?.identity?.type === "anonymous"
      ? t("zakiDashboard.identity.anonymous")
      : t("zakiDashboard.identity.signedIn");

  const refreshAnonymousWork = useCallback(() => {
    const items = readAnonymousWorkLedger().items;
    setAnonymousWorkItems(items);
    setAnonymousWorkClaimed(Boolean(token && items.length > 0));
    if (!items.length || !token) {
      setAnonymousWorkClaimError(null);
    }
  }, [token]);

  useEffect(() => {
    setSelectedProductId((current) => {
      if (token && current === "spaces") return "agent";
      if (!token && current === "agent") return "spaces";
      return current || (token ? "agent" : "spaces");
    });
  }, [token]);

  useEffect(() => {
    refreshAnonymousWork();
    if (typeof window === "undefined") return;
    const handleRefresh = () => refreshAnonymousWork();
    window.addEventListener("storage", handleRefresh);
    window.addEventListener("focus", handleRefresh);
    window.addEventListener("zaki:anonymous-work-updated", handleRefresh);
    return () => {
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("zaki:anonymous-work-updated", handleRefresh);
    };
  }, [refreshAnonymousWork]);

  useEffect(() => {
    if (token || typeof window === "undefined") return;
    setShowIntro(window.localStorage.getItem(DASHBOARD_INTRO_DISMISSED_KEY) !== "1");
  }, [token]);

  const memoryBridgeOfferKey = getMemoryBridgeOfferKey(authUser);

  useEffect(() => {
    if (!token || typeof window === "undefined") {
      setMemoryBridgeSeen(false);
      return;
    }
    setMemoryBridgeSeen(window.localStorage.getItem(memoryBridgeOfferKey) === "1");
  }, [memoryBridgeOfferKey, token]);

  const weeklyStats = getWindowStats(meterStatus?.weekly);
  const weeklyReset = formatReset(meterStatus?.weekly?.resetAt);
  const rollingStats = getWindowStats(meterStatus?.rolling);
  const rollingUsagePercentRounded = getRoundedUsagePercent(rollingStats.usedPercent);
  const rollingWindowHours =
    typeof meterStatus?.rolling?.windowHours === "number" ? meterStatus.rolling.windowHours : 5;
  const rollingClearTime = formatTime(meterStatus?.rolling?.resetAt);
  const agentAvailability = meterStatus?.availableNow?.agent ?? null;
  const liveAgentSession = zakiSessions?.find(
    (session) => session.live || (session.pending_approval_count ?? 0) > 0
  );
  const recentAgentSessions = (zakiSessions ?? []).slice(0, 3);
  const statusLabel =
    !isOnline
      ? t("zakiDashboard.status.offline", { defaultValue: "Offline" })
      : productRegistryLoading || meterLoading
      ? t("zakiDashboard.status.syncing")
      : t("zakiDashboard.status.online");
  const selectedCommandName = getCommandProductName(t, selectedProductId);
  const selectedCommandRoute = getCommandProductRoute(selectedProductId);
  const selectedCommandPrompt = commandText.trim();
  const selectedProductComingSoon = isComingSoonProduct(selectedProductId);
  const selectedProductAuthRequired = isAuthRequiredProduct(selectedProductId);
  const selectedProductRequiresAuthBeforeRun = !token && selectedProductAuthRequired;
  const commandProductOrder = token
    ? SIGNED_IN_COMMAND_PRODUCT_ORDER
    : ANONYMOUS_COMMAND_PRODUCT_ORDER;
  const titleSignalWords = commandProductOrder.map((productId) =>
    getCommandProductVerb(t, productId, Boolean(token))
  );
  const selectedTitleSignal = getCommandProductVerb(
    t,
    selectedProductId,
    Boolean(token)
  );
  const titleSignal =
    selectedCommandPrompt.length > 0
      ? selectedTitleSignal
      : titleSignalWords[titleSignalIndex % titleSignalWords.length] || selectedTitleSignal;
  const showSaveWorkCta = !token && !selectedProductComingSoon && !selectedProductAuthRequired && (
    selectedCommandPrompt.length > 0 || anonymousWorkItems.length > 0
  );
  const agentCapacityBlocked =
    selectedProductId === "agent" && !meterLoading && !meterUnavailable && isAvailabilityBlocked(agentAvailability);
  const creditsExhausted =
    !meterLoading &&
    !meterUnavailable &&
    typeof weeklyStats.remaining === "number" &&
    weeklyStats.remaining <= 0;
  const commandBlockedByUsage =
    selectedProductRequiresAuthBeforeRun
      ? false
      : selectedProductId === "agent"
        ? agentCapacityBlocked
        : creditsExhausted;
  const isCommandSubmitDisabled =
    !isOnline ||
    selectedCommandPrompt.length === 0 ||
    (!selectedProductRequiresAuthBeforeRun && (meterLoading || commandBlockedByUsage));
  const commandHelperText = !isOnline
      ? t("zakiDashboard.command.offlineHelper", {
          defaultValue: "You are offline. We kept this draft here and will send when you reconnect.",
        })
    : selectedProductComingSoon || selectedProductRequiresAuthBeforeRun
      ? ""
    : selectedCommandPrompt && agentCapacityBlocked && agentAvailability?.constraint === "rolling"
      ? t("zakiDashboard.command.capacityWindowLow", {
          hours: rollingWindowHours,
          percent: rollingUsagePercentRounded,
          reset: rollingClearTime || t("zakiDashboard.meter.resetPending"),
          defaultValue: `${rollingWindowHours}h capacity window is ${rollingUsagePercentRounded}% used${
            rollingClearTime ? `; next room clears ${rollingClearTime}` : "."
          }`,
        })
    : selectedCommandPrompt && agentCapacityBlocked
      ? t("zakiDashboard.command.agentCreditsLow", {
          defaultValue: "Agent needs room.",
        })
    : selectedCommandPrompt
      ? t("zakiDashboard.command.creditHelper", {
          defaultValue: "Ready to send.",
        })
    : "";
  const introEyebrow = token
    ? t("zakiDashboard.command.signedEyebrow", {
        defaultValue: "Signed in · context and progress stay connected",
      })
    : t("zakiDashboard.command.guestEyebrow", {
        defaultValue: "Guest session · start without setup",
      });
  const introCopy = token
    ? t("zakiDashboard.command.signedCopy", {
        defaultValue:
          "Choose the lane. Name the outcome. ZAKI brings the right intelligence and carries it forward.",
      })
    : t("zakiDashboard.command.guestCopy", {
        defaultValue:
          "Start in Chat now. Sign in when the work needs Agent, files, memory, or history.",
      });
  const titlePrefix = token
    ? t("zakiDashboard.command.signedTitlePrefix", {
        defaultValue: "Let's ",
      })
    : t("zakiDashboard.command.guestTitlePrefix", {
        defaultValue: "Let's ",
      });

  useEffect(() => {
    setTitleSignalIndex(0);
  }, [token]);

  useEffect(() => {
    if (selectedCommandPrompt.length > 0 || titleSignalWords.length <= 1) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const interval = window.setInterval(() => {
      setTitleSignalIndex((current) => (current + 1) % titleSignalWords.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [selectedCommandPrompt.length, titleSignalWords.length]);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DASHBOARD_INTRO_DISMISSED_KEY, "1");
    }
  }, []);

  const openIntro = useCallback(() => {
    setShowIntro(true);
  }, []);

  const markMemoryBridgeSeen = useCallback(() => {
    setMemoryBridgeSeen(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(memoryBridgeOfferKey, "1");
    }
  }, [memoryBridgeOfferKey]);

  const openMemoryBridge = useCallback(() => {
    markMemoryBridgeSeen();
    onOpenMemoryImport?.();
  }, [markMemoryBridgeSeen, onOpenMemoryImport]);

  const writeDashboardIntent = useCallback(
    (productId: AnonymousWorkProductId, prompt: string, anonymousWorkId?: string | null) => {
      return writePendingIntent({
        productId,
        taskKind: COMMAND_TASK_KIND[productId],
        prompt,
        source: "dashboard",
        returnTo: getCommandProductRoute(productId),
        anonymousWorkId: anonymousWorkId ?? null,
      });
    },
    []
  );

  const persistAnonymousCommandDraft = useCallback(
    (productId: AnonymousWorkProductId, prompt: string) => {
      if (token || !prompt) return null;
      const draft = upsertAnonymousWorkItem({
        productId,
        taskKind: COMMAND_TASK_KIND[productId],
        prompt,
        route: productId === "spaces" ? "/spaces" : getCommandProductRoute(productId),
        title: buildAnonymousWorkTitle(prompt),
        meterRemaining: weeklyStats.remaining,
        status: "draft",
      });
      refreshAnonymousWork();
      return draft?.id ?? null;
    },
    [refreshAnonymousWork, token, weeklyStats.remaining]
  );

  const handleAuthEntry = useCallback(
    (mode: "login" | "signup") => {
      const prompt = commandText.trim();
      const existingWork = prompt ? null : anonymousWorkItems[0] ?? null;
      const productId =
        existingWork?.productId ??
        (isComingSoonProduct(selectedProductId) ? "spaces" : selectedProductId);
      const route = existingWork?.route || getCommandProductRoute(productId);
      const intentPrompt = isComingSoonProduct(selectedProductId)
        ? existingWork?.prompt || ""
        : prompt || existingWork?.prompt || "";
      const anonymousWorkId = prompt && !isComingSoonProduct(selectedProductId)
        ? persistAnonymousCommandDraft(productId, prompt)
        : existingWork?.id ?? null;

      if (intentPrompt) {
        writePendingIntent({
          productId,
          taskKind: COMMAND_TASK_KIND[productId],
          prompt: intentPrompt,
          source: "dashboard",
          returnTo: route,
          anonymousWorkId,
        });
      }

      const next = intentPrompt ? `&next=${encodeURIComponent(route)}` : "";
      navigate(`/?auth=${mode}${next}`);
    },
    [
      anonymousWorkItems,
      commandText,
      navigate,
      persistAnonymousCommandDraft,
      selectedProductId,
    ]
  );

  const startWorkFromIntro = useCallback(() => {
    dismissIntro();
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      commandInputRef.current?.focus();
    }, 0);
  }, [dismissIntro]);

  const handleCommandSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const prompt = commandText.trim();
      if (!prompt) return;
      if (isComingSoonProduct(selectedProductId)) return;

      const anonymousWorkId = persistAnonymousCommandDraft(selectedProductId, prompt);

      writeDashboardIntent(selectedProductId, prompt, anonymousWorkId);

      if (selectedProductId === "spaces") {
        onSendExample(prompt);
        setCommandText("");
        refreshAnonymousWork();
        return;
      }

      if (!token && isAuthRequiredProduct(selectedProductId)) {
        navigate(`/?auth=login&next=${encodeURIComponent(selectedCommandRoute)}`);
        return;
      }

      if (!token) {
        navigate(`/?auth=signup&next=${encodeURIComponent(selectedCommandRoute)}`);
        return;
      }

      if (selectedProductId === "brain") {
        navigate(`/brain?q=${encodeURIComponent(prompt)}`);
        return;
      }

      navigate(selectedCommandRoute);
    },
    [
      commandText,
      navigate,
      onSendExample,
      persistAnonymousCommandDraft,
      refreshAnonymousWork,
      selectedCommandRoute,
      selectedProductId,
      token,
      writeDashboardIntent,
    ]
  );

  const handleContinueAnonymousWork = useCallback(
    async (item: AnonymousWorkItem) => {
      setSelectedProductId(item.productId);
      setCommandText(item.prompt);
      writeDashboardIntent(item.productId, item.prompt, item.id);
      if (item.productId !== "spaces") {
        const route = item.route || getCommandProductRoute(item.productId);
        if (!token && isAuthRequiredProduct(item.productId)) {
          navigate(`/?auth=login&next=${encodeURIComponent(route)}`);
          return;
        }
        navigate(route);
        return;
      }
      if (item.productId === "spaces" && item.route.startsWith("/spaces")) {
        if (token) {
          try {
            const { response, data } = await claimAnonymousSpacesWork({
              workId: item.id,
              prompt: item.prompt,
              replyPreview: item.replyPreview,
              title: item.title,
              threadId: item.threadId,
              route: item.route,
            });
            if (response.ok && data?.success && data.route) {
              setAnonymousWorkClaimError(null);
              setAnonymousWorkClaimed(true);
              navigate(data.route);
              return;
            }
            setAnonymousWorkClaimed(true);
            setAnonymousWorkClaimError(
              data?.error ||
                t("zakiDashboard.anonymousWork.claimRetry", {
                  defaultValue: "Spaces setup is temporarily unavailable. Retry from this saved work.",
                })
            );
            return;
          } catch {
            setAnonymousWorkClaimed(true);
            setAnonymousWorkClaimError(
              t("zakiDashboard.anonymousWork.claimRetry", {
                defaultValue: "Spaces setup is temporarily unavailable. Retry from this saved work.",
              })
            );
            return;
          }
        }
        navigate(item.route);
      }
    },
    [navigate, t, token, writeDashboardIntent]
  );

  const handleSaveAnonymousWork = useCallback(
    (item?: AnonymousWorkItem) => {
      const productId = item?.productId ?? selectedProductId;
      const prompt = item?.prompt ?? commandText.trim();
      if (prompt) {
        writeDashboardIntent(productId, prompt, item?.id ?? null);
      }
      const mode = isAuthRequiredProduct(productId) ? "login" : "signup";
      navigate(`/?auth=${mode}&next=${encodeURIComponent(getCommandProductRoute(productId))}`);
    },
    [commandText, navigate, selectedProductId, writeDashboardIntent]
  );

  const commandSubmitLabel = getCommandSubmitLabel(
    t,
    selectedProductId,
    selectedCommandName,
    Boolean(token)
  );

  return (
    <section
      className={cn("zaki-dashboard-v2 zaki-scrollbar-fade", isRtl && "rtl")}
      dir={isRtl ? "rtl" : "ltr"}
      aria-labelledby="zaki-command-center-title"
      data-testid="zaki-command-center"
    >
      <V2StatusStrip
        aria-live="polite"
        items={[
          {
            id: "online",
            label: statusLabel,
            active: isOnline,
            tone: !isOnline ? "warn" : productRegistryLoading || meterLoading ? "warn" : "success",
          },
          {
            id: "plan",
            label: t("zakiDashboard.status.plan"),
            value: meterLoading
              ? t("zakiDashboard.meter.loading")
              : meterStatus?.plan?.label || t("zakiDashboard.meter.free"),
          },
          {
            id: "weekly-reset",
            label: t("zakiDashboard.status.weeklyReset"),
            value: weeklyReset || t("zakiDashboard.meter.resetPending"),
          },
          {
            id: "identity",
            label: t("zakiDashboard.status.identity"),
            value: identityLabel,
          },
          ...(liveAgentSession
            ? [
                {
                  id: "agent-live",
                  label: t("zakiDashboard.status.agentLive", {
                    id:
                      liveAgentSession.session_key.split(":").pop() ||
                      "agent",
                  }),
                  active: true,
                  tone: "accent" as const,
                },
              ]
            : []),
        ]}
      />

      <div className="zaki-dashboard-v2__wrap">
        <section className="zaki-dashboard-v2__entry">
          {!token || anonymousWorkClaimed ? (
            <ReturningWorkStrip
              t={t}
              items={anonymousWorkItems}
              claimed={anonymousWorkClaimed}
              claimError={anonymousWorkClaimError}
              onContinue={handleContinueAnonymousWork}
              onSave={handleSaveAnonymousWork}
            />
          ) : null}

          <div className="zaki-dashboard-command__greeting">
            <div className="zaki-dashboard-v2__eyebrow">{introEyebrow}</div>
            <h1
              id="zaki-command-center-title"
              className="zaki-dashboard-command__title"
              aria-label={`${titlePrefix}${titleSignal}.`}
            >
              <span>{titlePrefix}</span>
              <ScrambleSignal value={titleSignal} />
              <span>.</span>
            </h1>
            <p>{introCopy}</p>
            <div className="zaki-dashboard-command__entry-actions">
              <button type="button" onClick={openMarketingWebsite}>
                <WebsitePixelIcon className="zaki-dashboard-command__website-icon" />
                {t("zakiDashboard.entry.website", { defaultValue: "Website" })}
              </button>
              {token && onOpenMemoryImport ? (
                <button type="button" onClick={openMemoryBridge}>
                  <Brain className="zaki-dashboard-command__entry-icon" aria-hidden="true" />
                  {t("zakiDashboard.entry.importMemory", { defaultValue: "Import memory" })}
                </button>
              ) : null}
              {!token ? (
                <>
                  <button type="button" onClick={() => handleAuthEntry("login")}>
                    {t("zakiDashboard.entry.signIn", { defaultValue: "Sign in" })}
                  </button>
                  <button
                    type="button"
                    className="zaki-dashboard-command__entry-action--accent"
                    onClick={() => handleAuthEntry("signup")}
                  >
                    {t("zakiDashboard.entry.signUp", { defaultValue: "Sign up" })}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {token && onOpenMemoryImport && !memoryBridgeSeen ? (
            <section
              className="zaki-dashboard-command__memory-bridge"
              aria-label={t("zakiDashboard.memoryBridge.ariaLabel", {
                defaultValue: "Memory import",
              })}
            >
              <div>
                <span>
                  {t("zakiDashboard.memoryBridge.kicker", {
                    defaultValue: "Memory bridge",
                  })}
                </span>
                <strong>
                  {t("zakiDashboard.memoryBridge.title", {
                    defaultValue: "Bring your memory from ChatGPT/Claude",
                  })}
                </strong>
                <p>
                  {t("zakiDashboard.memoryBridge.copy", {
                    defaultValue:
                      "Paste a structured export once so ZAKI starts with the facts and preferences you already taught another assistant.",
                  })}
                </p>
              </div>
              <div>
                <button type="button" onClick={openMemoryBridge}>
                  {t("zakiDashboard.memoryBridge.action", {
                    defaultValue: "Bring your memory from ChatGPT/Claude",
                  })}
                </button>
                <button type="button" onClick={markMemoryBridgeSeen}>
                  {t("zakiDashboard.memoryBridge.dismiss", {
                    defaultValue: "Not now",
                  })}
                </button>
              </div>
            </section>
          ) : null}

          <form
            className="zaki-dashboard-command"
            data-testid="zaki-dashboard-command"
            onSubmit={handleCommandSubmit}
          >
            <ProductHintPanel
              t={t}
              productId={selectedProductId}
              signedIn={Boolean(token)}
            />

            <div className="zaki-dashboard-command__composer">
              <ProductTaskStrip
                t={t}
                productOrder={commandProductOrder}
                selectedProductId={selectedProductId}
                signedIn={Boolean(token)}
                onSelect={setSelectedProductId}
              />
              {token && recentAgentSessions.length > 0 ? (
                <ActiveWorkInline
                  t={t}
                  sessions={recentAgentSessions}
                  onOpenSession={onOpenSession}
                />
              ) : null}
              <label className="sr-only" htmlFor="zaki-dashboard-command-input">
                {t("zakiDashboard.command.inputLabel", {
                  defaultValue: "Describe what you want ZAKI to do",
                })}
              </label>
              <textarea
                id="zaki-dashboard-command-input"
                ref={commandInputRef}
                className="zaki-dashboard-command__textarea"
                rows={3}
                value={commandText}
                onChange={(event) => setCommandText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                    return;
                  }
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }}
                placeholder={getCommandPlaceholder(t, selectedProductId, Boolean(token))}
              />

              <div className="zaki-dashboard-command__foot">
                <CreditMeter
                  t={t}
                  loading={meterLoading}
                  unavailable={meterUnavailable}
                  weeklyStats={weeklyStats}
                  weeklyReset={weeklyReset}
                />
                <div className="zaki-dashboard-command__actions">
                  {commandHelperText ? (
                    <p className="zaki-dashboard-command__helper" role="status" aria-live="polite">
                      {commandHelperText}
                    </p>
                  ) : null}
                  {showSaveWorkCta ? (
                    <V2Button
                      type="button"
                      onClick={() => handleSaveAnonymousWork()}
                    >
                      <LogIn className="size-4" aria-hidden="true" />
                      {t("zakiDashboard.command.saveWork", {
                        defaultValue: "Save this work",
                      })}
                    </V2Button>
                  ) : null}
                  <V2Button
                    type="submit"
                    variant="accent"
                    className="zaki-dashboard-command__submit"
                    aria-label={commandSubmitLabel}
                    disabled={isCommandSubmitDisabled || selectedProductComingSoon}
                  >
                    <span className="zaki-dashboard-command__submit-label">
                      {commandSubmitLabel}
                    </span>
                    <span className="zaki-dashboard-command__submit-cue" aria-hidden="true">
                      ENTER
                    </span>
                  </V2Button>
                </div>
              </div>
            </div>

            {commandBlockedByUsage ? (
              <div
                className="zaki-dashboard-command__credit-guard"
                role="status"
                aria-live="polite"
              >
                <strong>
                  {agentCapacityBlocked && agentAvailability?.constraint === "rolling"
                    ? t("zakiDashboard.command.capacityWindowTitle", {
                        hours: rollingWindowHours,
                        percent: rollingUsagePercentRounded,
                        defaultValue: `${rollingWindowHours}h capacity window is ${rollingUsagePercentRounded}% used.`,
                      })
                    : t("zakiDashboard.command.creditsExhaustedTitle", {
                        defaultValue: "Weekly usage is full.",
                      })}
                </strong>
                <span>
                  {agentCapacityBlocked
                    ? t("zakiDashboard.command.capacityWindowCopy", {
                        hours: rollingWindowHours,
                        percent: rollingUsagePercentRounded,
                        reset: rollingClearTime || t("zakiDashboard.meter.resetPending"),
                        defaultValue: rollingClearTime
                          ? `Keep your prompt here. Recent Agent work leaves the ${rollingWindowHours}h window at ${rollingClearTime}.`
                          : "Keep your prompt here while recent Agent work leaves the rolling window.",
                      })
                    : t("zakiDashboard.command.creditsExhaustedCopy", {
                        defaultValue:
                          "Keep your prompt here, then sign up, wait for reset, or choose a plan with more room.",
                      })}
                </span>
                <div>
                  {!token ? (
                    <V2Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveAnonymousWork()}
                    >
                      <LogIn className="size-3.5" aria-hidden="true" />
                      {t("zakiDashboard.command.saveAndSignup", {
                        defaultValue: "Save and sign up",
                      })}
                    </V2Button>
                  ) : null}
                  <V2Button
                    type="button"
                    size="sm"
                    onClick={() => navigate(WEBSITE_PRICING_ROUTE)}
                  >
                    <Gauge className="size-3.5" aria-hidden="true" />
                    {t("zakiDashboard.command.viewPlans", {
                      defaultValue: "View plans",
                    })}
                  </V2Button>
                  <span className="zaki-dashboard-command__reset-choice">
                    {weeklyReset
                      ? t("zakiDashboard.command.waitForResetDate", {
                          reset: weeklyReset,
                          defaultValue: "Wait for reset {{reset}}",
                        })
                      : t("zakiDashboard.command.waitForReset", {
                          defaultValue: "Wait for reset",
                        })}
                  </span>
                </div>
              </div>
            ) : null}
          </form>

          <nav className="zaki-dashboard-command__links" aria-label="Dashboard links">
            <button type="button" onClick={openIntro}>
              <span aria-hidden="true">-&gt;</span>
              {t("zakiDashboard.links.howItWorks", { defaultValue: "How it works" })}
            </button>
            <button type="button" onClick={() => navigate(WEBSITE_PRICING_ROUTE)}>
              <span aria-hidden="true">-&gt;</span>
              {t("zakiDashboard.links.waysToBuy", { defaultValue: "Plans" })}
            </button>
            <button type="button" onClick={openMarketingProductOverview}>
              <span aria-hidden="true">-&gt;</span>
              {t("zakiDashboard.links.fullPalette", { defaultValue: "Product overview" })}
            </button>
          </nav>
        </section>

        <DashboardIntroModal
          t={t}
          open={showIntro}
          onClose={dismissIntro}
          onStartWork={startWorkFromIntro}
          onVisitWebsite={() => {
            dismissIntro();
            openMarketingWebsite();
          }}
        />
      </div>
    </section>
  );
}

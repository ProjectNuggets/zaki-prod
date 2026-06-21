import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
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
  Send,
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

const SCRAMBLE_CHARS = "01/\\-_";

const COMMAND_PRODUCT_ORDER: AnonymousWorkProductId[] = [
  "agent",
  "brain",
  "spaces",
  "design",
  "learning",
  "hire",
];

const ANONYMOUS_COMMAND_PRODUCT_ORDER: AnonymousWorkProductId[] = [
  "spaces",
  "agent",
  "brain",
  "design",
  "learning",
  "hire",
];

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

function getCommandProductHint(
  t: TranslateFn,
  productId: AnonymousWorkProductId,
  signedIn: boolean
) {
  const fallback: Record<AnonymousWorkProductId, string> = {
    agent: signedIn
      ? "Turn a goal into a plan ZAKI can carry forward with tools, files, browser control, and memory."
      : "Sign in to use Agent with tools, files, browser control, and durable memory.",
    brain: signedIn
      ? "Open your memory graph to inspect, connect, and refine saved context."
      : "Sign in to open Brain and save or read your memory graph.",
    learning: "Learn is coming soon. For now, use Chat for quick study help or Agent to plan a learning path.",
    design: "Design is coming soon. For now, use Chat to shape a brief or Agent to plan the design work.",
    hire: "Career is gated. For now, use Chat to improve CV copy or Agent to plan your next move.",
    spaces: "Ask now, draft quickly, or test the platform without setting anything up.",
  };
  const key = isAuthRequiredProduct(productId)
    ? `zakiDashboard.command.hints.${productId}.${signedIn ? "signed" : "guest"}`
    : `zakiDashboard.command.hints.${productId}`;
  return t(key, {
    defaultValue: fallback[productId],
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

function getCommandProductDetails(
  t: TranslateFn,
  productId: AnonymousWorkProductId,
  signedIn: boolean
) {
  const fallback: Record<
    AnonymousWorkProductId,
    { bestFor: string; memory: string; truth: string; accessTone: V2BadgeTone }
  > = {
    agent: {
      bestFor: "Turning a messy goal into a concrete plan, then executing when you allow it.",
      memory: signedIn
        ? "Personal Brain, files, browser lane, and session history."
        : "Account-scoped after sign-in.",
      truth: signedIn
        ? "Agent is live for signed-in accounts with usage and approval controls."
        : "Agent requires sign-in. Tools, files, browser control, and durable memory are account-scoped.",
      accessTone: signedIn ? "success" : "accent",
    },
    brain: {
      bestFor: "Making notes, preferences, decisions, and project facts visible instead of hidden in chat.",
      memory: signedIn
        ? "Saved personal memory graph."
        : "Account memory after sign-in.",
      truth: signedIn
        ? "Brain is live for signed-in accounts as the memory control plane."
        : "Brain requires sign-in because the graph is account memory.",
      accessTone: signedIn ? "success" : "accent",
    },
    learning: {
      bestFor: "Study plans, source walkthroughs, questions, weak spots, and guided practice.",
      memory: "Learner memory is not public yet.",
      truth: "Coming soon. Use Chat or Agent today; Learn will return when the learner state and beta path are ready.",
      accessTone: "warn",
    },
    design: {
      bestFor: "Product direction, page structure, brand systems, and design project generation.",
      memory: "Design project memory is not public yet.",
      truth: "Coming soon. Use Chat or Agent today; full Design opens after the service and project flow are ready.",
      accessTone: "warn",
    },
    hire: {
      bestFor: "Finding your next role, improving your CV, comparing fit, and preparing applications.",
      memory: "Career pipeline memory is not public yet.",
      truth: "Gated for private access. Use Chat or Agent today; Career opens when the private career flow is ready.",
      accessTone: "warn",
    },
    spaces: {
      bestFor: "Quick questions, drafting, translation, and thinking out loud. No setup.",
      memory: "This-browser session only until you sign in.",
      truth: "Chat runs now with free weekly usage. Sign in when you want to keep the work.",
      accessTone: "success",
    },
  };
  const detail = fallback[productId];
  return {
    bestFor: t(`zakiDashboard.command.details.${productId}.bestFor`, {
      defaultValue: detail.bestFor,
    }),
    memory: t(
      isAuthRequiredProduct(productId)
        ? `zakiDashboard.command.details.${productId}.memory.${signedIn ? "signed" : "guest"}`
        : `zakiDashboard.command.details.${productId}.memory`,
      {
        defaultValue: detail.memory,
      }
    ),
    truth: t(
      isAuthRequiredProduct(productId)
        ? `zakiDashboard.command.details.${productId}.truth.${signedIn ? "signed" : "guest"}`
        : `zakiDashboard.command.details.${productId}.truth`,
      {
        defaultValue: detail.truth,
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

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayValue(value);
      return;
    }

    let frame = 0;
    const maxFrames = 14;
    const interval = window.setInterval(() => {
      frame += 1;
      const progress = frame / maxFrames;
      const next = value
        .split("")
        .map((letter, index) => {
          if (letter === " ") return " ";
          if (index / Math.max(value.length, 1) < progress) return letter;
          return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)] || letter;
        })
        .join("");

      setDisplayValue(next);
      if (frame >= maxFrames) {
        window.clearInterval(interval);
        setDisplayValue(value);
      }
    }, 32);

    return () => window.clearInterval(interval);
  }, [value]);

  return (
    <span
      className="zaki-dashboard-command__title-signal"
      data-scramble="//"
      aria-hidden="true"
    >
      {displayValue}
    </span>
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
  weeklyStats,
  weeklyReset,
}: {
  t: TranslateFn;
  loading: boolean;
  weeklyStats: WindowStats;
  weeklyReset: string | null;
}) {
  const roundedPercent = getRoundedUsagePercent(weeklyStats.usedPercent);
  const usageLabel = loading
    ? t("zakiDashboard.meter.loading")
    : t("zakiDashboard.meter.usagePercent", {
        percent: roundedPercent,
        defaultValue: formatUsagePercentLabel(weeklyStats.usedPercent),
      });
  const nearCap = !loading && isUsageNearCap(weeklyStats.usedPercent);
  return (
    <div
      className="zaki-dashboard-command__meter"
      data-testid="zaki-dashboard-command-meter"
    >
      <div className="zaki-dashboard-command__meter-top">
        <span>
          {t("zakiDashboard.command.weeklyFreeCredit", {
            defaultValue: "Weekly usage",
          })}
        </span>
        <strong>
          <span>{usageLabel}</span>
        </strong>
        <small>
          {weeklyReset
            ? t("zakiDashboard.meter.resets", { reset: weeklyReset })
            : t("zakiDashboard.meter.resetPending")}
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
        aria-label={
          loading
            ? t("zakiDashboard.meter.loading")
            : t("zakiDashboard.meter.usagePercent", {
                percent: roundedPercent,
                defaultValue: formatUsagePercentLabel(weeklyStats.usedPercent),
              })
        }
      >
        <span
          style={{ width: `${weeklyStats.usedPercent}%` }}
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
      <div className="zaki-dashboard-command__hint-top">
        <div className="zaki-dashboard-command__hint-name">
          <Icon className="size-4" aria-hidden="true" />
          <h2>{productName}</h2>
        </div>
        <V2Badge tone={details.accessTone}>
          {getCommandProductStateMarker(t, productId, signedIn)}
        </V2Badge>
      </div>
      <div className="zaki-dashboard-command__hint-body">
        <p>{getCommandProductHint(t, productId, signedIn)}</p>
        <dl>
          <div>
            <dt>{t("zakiDashboard.command.bestFor", { defaultValue: "Best for" })}</dt>
            <dd>{details.bestFor}</dd>
          </div>
          <div>
            <dt>{t("zakiDashboard.command.memoryScope", { defaultValue: "Memory scope" })}</dt>
            <dd>{details.memory}</dd>
          </div>
        </dl>
        <div className="zaki-dashboard-command__truth">
          <span aria-hidden="true">-&gt;</span>
          <strong>{details.truth}</strong>
        </div>
      </div>
    </section>
  );
}

function DashboardIntroModal({
  t,
  open,
  onClose,
  onStartWork,
  onCreateAccount,
  onVisitWebsite,
}: {
  t: TranslateFn;
  open: boolean;
  onClose: () => void;
  onStartWork: () => void;
  onCreateAccount: () => void;
  onVisitWebsite: () => void;
}) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const slides = [
    {
      id: "what",
      step: "01",
      title: t("zakiDashboard.intro.slides.what.title", {
        defaultValue: "What is ZAKI?",
      }),
      body: t("zakiDashboard.intro.slides.what.body", {
        defaultValue:
          "One command center for Chat, Agent, Brain, and future products. Start with the outcome; ZAKI routes the work.",
      }),
      bullets: [
        t("zakiDashboard.intro.slides.what.bullets.command", {
          defaultValue: "Write the work once.",
        }),
        t("zakiDashboard.intro.slides.what.bullets.route", {
          defaultValue: "Choose the product lane above the prompt.",
        }),
        t("zakiDashboard.intro.slides.what.bullets.keep", {
          defaultValue: "Keep local drafts in this browser.",
        }),
      ],
    },
    {
      id: "buy",
      step: "02",
      title: t("zakiDashboard.intro.slides.buy.title", {
        defaultValue: "Activate the loop",
      }),
      body: t("zakiDashboard.intro.slides.buy.body", {
        defaultValue:
          "Guest usage lets you try now. Create an account when you want work, memory, files, and history to follow you.",
      }),
      bullets: [
        t("zakiDashboard.intro.slides.buy.bullets.guest", {
          defaultValue: "Guest: start immediately with weekly usage.",
        }),
        t("zakiDashboard.intro.slides.buy.bullets.account", {
          defaultValue: "Account: save work, memory, files, and history.",
        }),
        t("zakiDashboard.intro.slides.buy.bullets.plan", {
          defaultValue: "Plan: add capacity when your work grows.",
        }),
      ],
    },
    {
      id: "palette",
      step: "03",
      title: t("zakiDashboard.intro.slides.palette.title", {
        defaultValue: "Visit the website when you want the full story",
      }),
      body: t("zakiDashboard.intro.slides.palette.body", {
        defaultValue:
          "The app is the working surface. The website is the narrative layer for story, pricing, product pages, and public context.",
      }),
      bullets: [
        t("zakiDashboard.intro.slides.palette.bullets.chat", {
          defaultValue: "Chat, Agent, and Brain are the launch core.",
        }),
        t("zakiDashboard.intro.slides.palette.bullets.preview", {
          defaultValue: "Design, Learn, and Career start as truthful gates.",
        }),
        t("zakiDashboard.intro.slides.palette.bullets.website", {
          defaultValue: "Visit the website when you want the broader product story.",
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
                defaultValue: "Start the work first. Choose an account when it matters.",
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
          {activeSlide.id === "buy" ? (
            <div className="zaki-dashboard-intro__slide-actions">
              <V2Button type="button" onClick={onStartWork}>
                {t("zakiDashboard.intro.startFreeChat", {
                  defaultValue: "Start free chat",
                })}
              </V2Button>
              <V2Button type="button" variant="ghost" onClick={onCreateAccount}>
                {t("zakiDashboard.intro.createAccount", {
                  defaultValue: "Create account",
                })}
              </V2Button>
            </div>
          ) : null}
          {activeSlide.id === "palette" ? (
            <div className="zaki-dashboard-intro__slide-actions">
              <V2Button type="button" variant="ghost" onClick={onVisitWebsite}>
                {t("zakiDashboard.intro.openWebsite", {
                  defaultValue: "Open website",
                })}
              </V2Button>
            </div>
          ) : null}
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
  const { data: meterStatusResult, isLoading: meterStatusLoading } =
    useMeterStatus();
  const {
    data: anonymousMeterStatusResult,
    isLoading: anonymousMeterStatusLoading,
  } = useAnonymousMeterStatus(!token);
  const { data: zakiSessions } = useZakiSessions(
    Boolean(token)
  );

  const meterStatus = token
    ? meterStatusResult?.data
    : anonymousMeterStatusResult?.data;
  const meterLoading = token ? meterStatusLoading : anonymousMeterStatusLoading;
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
    selectedProductId === "agent" && !meterLoading && isAvailabilityBlocked(agentAvailability);
  const creditsExhausted =
    !meterLoading && typeof weeklyStats.remaining === "number" && weeklyStats.remaining <= 0;
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
  const commandHelperText = selectedProductComingSoon
    ? t("zakiDashboard.command.comingSoonHelper", {
        product: selectedCommandName,
        defaultValue: "{{product}} is coming soon. Pick Chat, Agent, or Brain to start now.",
      })
    : !isOnline
      ? t("zakiDashboard.command.offlineHelper", {
          defaultValue: "You are offline. We kept this draft here and will send when you reconnect.",
        })
    : selectedProductRequiresAuthBeforeRun && selectedCommandPrompt
      ? t("zakiDashboard.command.authRequiredPromptHelper", {
          product: selectedCommandName,
          defaultValue: "Sign in to continue in {{product}}. We'll keep this prompt through authentication.",
        })
    : selectedProductRequiresAuthBeforeRun
      ? t("zakiDashboard.command.authRequiredEmptyHelper", {
          product: selectedCommandName,
          defaultValue: "Sign in to use {{product}}.",
        })
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
          defaultValue: "Agent needs more weekly room before it can start.",
        })
    : selectedCommandPrompt
      ? t("zakiDashboard.command.creditHelper", {
          defaultValue: "Weekly usage updates when ZAKI responds.",
        })
    : t("zakiDashboard.command.emptyHelper", {
        defaultValue: "Type a prompt to start.",
      });
  const introEyebrow = token
    ? t("zakiDashboard.command.signedEyebrow", {
        defaultValue: "Signed in · your work can carry forward",
      })
    : t("zakiDashboard.command.guestEyebrow", {
        defaultValue: "Guest session · start without setup",
      });
  const introCopy = token
    ? t("zakiDashboard.command.signedCopy", {
        defaultValue:
          "Choose the kind of help you need, write the outcome once, and ZAKI will open the right workspace with your context intact.",
      })
    : t("zakiDashboard.command.guestCopy", {
        defaultValue:
          "Ask immediately with free weekly usage. This browser can remember drafts; sign in when you want work, memory, files, and history to follow you.",
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

  const createAccountFromIntro = useCallback(() => {
    dismissIntro();
    handleAuthEntry("signup");
  }, [dismissIntro, handleAuthEntry]);

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
                <span aria-hidden="true">?</span>
                {t("zakiDashboard.entry.website", { defaultValue: "Website" })}
              </button>
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

          {token && recentAgentSessions.length > 0 ? (
            <section
              className="zaki-dashboard-command__resume"
              aria-labelledby="zaki-dashboard-resume-title"
            >
              <div className="zaki-dashboard-command__resume-head">
                <div>
                  <span>
                    {t("zakiDashboard.activeWork.source", {
                      defaultValue: "Runtime",
                    })}
                  </span>
                  <h2 id="zaki-dashboard-resume-title">
                    {t("zakiDashboard.activeWork.title", {
                      defaultValue: "Active work · Agent",
                    })}
                  </h2>
                </div>
              </div>
              <div className="zaki-dashboard-command__resume-list">
                {recentAgentSessions.map((session) => {
                  const title = getSessionTitle(session);
                  const pendingCount = session.pending_approval_count ?? 0;
                  const stateLabel =
                    pendingCount > 0
                      ? t("zakiDashboard.activeWork.pendingApproval", {
                          title,
                          count: pendingCount,
                          defaultValue: "{{title}} · {{count}} approval waiting",
                        })
                      : session.live
                        ? t("zakiDashboard.activeWork.liveSession", {
                            title,
                            defaultValue: "{{title}} · streaming",
                          })
                        : t("zakiDashboard.activeWork.recentSession", {
                            title,
                            defaultValue: "{{title}} · recent",
                          });
                  return (
                    <button
                      key={session.session_key}
                      type="button"
                      className="zaki-dashboard-command__resume-row"
                      onClick={() => onOpenSession?.(session.session_key)}
                      aria-label={t("zakiDashboard.activeWork.openSessionAria", {
                        title,
                        defaultValue: "Open Agent session {{title}}",
                      })}
                    >
                      <span className="zaki-dashboard-command__resume-main">
                        <strong>{title}</strong>
                        <span>{stateLabel}</span>
                      </span>
                      <span className="zaki-dashboard-command__resume-meta">
                        {t("zakiDashboard.activeWork.sessionMeta", {
                          messages: session.message_count ?? 0,
                          mode:
                            session.mode ||
                            t("zakiDashboard.activeWork.noMode", {
                              defaultValue: "standard",
                            }),
                          defaultValue: "{{messages}} messages · {{mode}}",
                        })}
                      </span>
                      <time>{formatTime(session.last_active)}</time>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <form
            className="zaki-dashboard-command"
            data-testid="zaki-dashboard-command"
            onSubmit={handleCommandSubmit}
          >
            <ProductTaskStrip
              t={t}
              productOrder={commandProductOrder}
              selectedProductId={selectedProductId}
              signedIn={Boolean(token)}
              onSelect={setSelectedProductId}
            />

            <ProductHintPanel
              t={t}
              productId={selectedProductId}
              signedIn={Boolean(token)}
            />

            <div className="zaki-dashboard-command__composer">
              <label className="sr-only" htmlFor="zaki-dashboard-command-input">
                {t("zakiDashboard.command.inputLabel", {
                  defaultValue: "Describe what you want ZAKI to do",
                })}
              </label>
              <textarea
                id="zaki-dashboard-command-input"
                ref={commandInputRef}
                className="zaki-dashboard-command__textarea"
                rows={5}
                value={commandText}
                onChange={(event) => setCommandText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                    return;
                  }
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }}
                placeholder={t("zakiDashboard.command.placeholder", {
                  product: selectedCommandName,
                  defaultValue: "Ask {{product}} to start from your prompt...",
                })}
              />

              <div className="zaki-dashboard-command__foot">
                <CreditMeter
                  t={t}
                  loading={meterLoading}
                  weeklyStats={weeklyStats}
                  weeklyReset={weeklyReset}
                />
                <div className="zaki-dashboard-command__actions">
                  <p className="zaki-dashboard-command__helper" role="status" aria-live="polite">
                    {commandHelperText}
                  </p>
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
                    disabled={isCommandSubmitDisabled || selectedProductComingSoon}
                  >
                    <Send className="size-4" aria-hidden="true" />
                    {getCommandSubmitLabel(
                      t,
                      selectedProductId,
                      selectedCommandName,
                      Boolean(token)
                    )}
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
          onCreateAccount={createAccountFromIntro}
          onVisitWebsite={() => {
            dismissIntro();
            openMarketingWebsite();
          }}
        />
      </div>
    </section>
  );
}

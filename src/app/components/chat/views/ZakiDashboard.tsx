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
  Clock3,
  Gauge,
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
  MeterStatusResponse,
  MeterWindowSnapshot,
} from "@/lib/api";
import { claimAnonymousWork } from "@/lib/anonymousWorkClaim";
import { useAnonymousWorkClaimStore, useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import {
  estimateTurnsFromUnits,
  formatUnits,
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
import { AGENT_PLAN_ROUTE } from "@/lib/agentPlanPreview";
import { RELEASE_VISIBLE_SPOKES } from "@/lib/productRoutes";
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

const COMMAND_PRODUCT_ORDER: AnonymousWorkProductId[] = [...RELEASE_VISIBLE_SPOKES];

const ANONYMOUS_COMMAND_PRODUCT_ORDER = COMMAND_PRODUCT_ORDER;
const SIGNED_IN_COMMAND_PRODUCT_ORDER = COMMAND_PRODUCT_ORDER;
const DASHBOARD_INTRO_DISMISSED_KEY = "zaki:dashboard-v2-intro-dismissed";
const MEMORY_BRIDGE_OFFER_KEY_PREFIX = "zaki:memory-bridge-offered";
const WEBSITE_HOME_URL = "https://chatzaki.com/";
const WEBSITE_PRODUCT_URL = "https://chatzaki.com/product";
const WEBSITE_PRICING_ROUTE = "/pricing";
const COMING_SOON_PRODUCT_IDS = new Set<AnonymousWorkProductId>([
  "design",
  "minutes",
]);
// Lanes an anonymous visitor cannot even taste — submit sends them to auth instead of running.
//
// WP-F removed "agent" from this set. The spec's tier matrix (§D) promises "Agent: anonymous =
// preview only" and flow F7 is type -> preview plan -> Save and continue -> auth. Agent's submit
// used to read "Sign in for Agent" and run nothing at all, which meant the taste the whole funnel
// is built around never happened for the Agent lane. It now runs a plan PREVIEW (no tools, no
// execution — see AnonymousAgentPreview and the BFF's /api/anonymous/agent/preview).
//
// Brain stays: it is a real surface, and its anonymous story (F8) is a separate decision.
const AUTH_REQUIRED_PRODUCT_IDS = new Set<AnonymousWorkProductId>([
  "brain",
]);

/** The lane a coming-soon spoke falls back to, so the user is never stranded. */
const RECOVERY_PRODUCT_ID: AnonymousWorkProductId = "spaces";

const COMMAND_TASK_KIND: Record<AnonymousWorkProductId, string> = {
  agent: "plan",
  brain: "map",
  design: "brief",
  minutes: "meeting_notes",
  spaces: "chat",
};

const COMMAND_PRODUCT_ICON: Record<AnonymousWorkProductId, LucideIcon> = {
  agent: Sparkles,
  brain: Brain,
  design: PenTool,
  minutes: Clock3,
  spaces: MessageSquareText,
};

const SCRAMBLE_CHARS = "01/\\-_";

function isComingSoonProduct(productId: AnonymousWorkProductId) {
  return COMING_SOON_PRODUCT_IDS.has(productId);
}

function isAuthRequiredProduct(productId: AnonymousWorkProductId) {
  return AUTH_REQUIRED_PRODUCT_IDS.has(productId);
}

/**
 * Lanes whose i18n copy has distinct `signed` / `guest` variants (details.<id>.headline.signed
 * vs .guest). This is the SHAPE OF THE COPY — it is deliberately not the same question as
 * "is this lane auth-gated".
 *
 * These two used to be conflated: the key was picked with isAuthRequiredProduct(). When WP-F
 * un-gated Agent, that lookup silently fell back to `details.agent.headline` — an OBJECT, not a
 * string — and blanked the signed-in Agent copy too. Agent still has two voices (preview vs
 * workbench); it just is not a login wall any more. Keeping the concepts apart is what stops
 * an access-policy change from corrupting unrelated copy.
 */
const SIGNED_GUEST_COPY_PRODUCT_IDS = new Set<AnonymousWorkProductId>([
  "agent",
  "brain",
]);

function hasSignedGuestCopy(productId: AnonymousWorkProductId) {
  return SIGNED_GUEST_COPY_PRODUCT_IDS.has(productId);
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

function formatTimeOrNull(value?: string | number | null) {
  if (!value) return null;
  const date =
    typeof value === "number" ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value?: string | number | null) {
  return formatTimeOrNull(value) ?? "—";
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
    defaultValue: productId[0]?.toUpperCase() + productId.slice(1),
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
    design: { signed: "shape", guest: "shape" },
    minutes: { signed: "capture", guest: "capture" },
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
      guest: "Describe the outcome. ZAKI will show you the plan it would follow.",
    },
    brain: {
      signed: "Ask Brain to find a memory, connect facts, or clean up what ZAKI knows.",
      guest: "Write what you want ZAKI to remember; sign in to save it to Brain.",
    },
    spaces: "Ask a question, draft a reply, translate text, or compare options.",
    design: "Sketch the product, page, or brand direction you want to shape.",
    minutes: "Bring a meeting recording or notes; Minutes will turn them into decisions and follow-ups.",
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
        : "See the plan Agent would follow, before you sign up.",
      note: signedIn
        ? "It can plan, ask approval, use files and browser control, then keep the run in your history."
        : "You get the steps. Running them — tools, files, browser control — needs an account.",
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
    design: {
      headline: "If you need a design brief today, use Spaces or Agent.",
      note: "Design is coming soon while the project service is finalized.",
      accessTone: "warn",
    },
    minutes: {
      headline: "If you need meeting notes today, use Spaces or Agent.",
      note: "Minutes is coming soon while ingestion, privacy, and retention are finalized.",
      accessTone: "warn",
    },
    spaces: {
      headline: "If you need a fast answer, draft, or translation, use Spaces.",
      note: "No setup. Anonymous usage works until you choose to save.",
      accessTone: "success",
    },
  };
  const detail = fallback[productId];
  const variant = hasSignedGuestCopy(productId) ? `.${signedIn ? "signed" : "guest"}` : "";
  return {
    headline: t(`zakiDashboard.command.details.${productId}.headline${variant}`, {
      defaultValue: detail.headline,
    }),
    note: t(`zakiDashboard.command.details.${productId}.note${variant}`, {
      defaultValue: detail.note,
    }),
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
  // WP-F: a signed-out Agent is a PREVIEW, not "Live" and not a sign-in wall. Say so.
  if (productId === "agent" && !signedIn) {
    return t("zakiDashboard.command.markers.preview", { defaultValue: "Preview" });
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
      defaultValue: "Start in Spaces",
    });
  }
  // WP-F: this button used to read "Sign in for Agent" and ran nothing. It now runs the plan
  // preview — the promise it makes is the one the endpoint actually keeps.
  if (productId === "agent" && !signedIn) {
    return t("zakiDashboard.command.submitAgentPreview", {
      defaultValue: "Preview the plan",
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

// The enforced counter resets at a wall-clock instant, so name it exactly — "tomorrow"
// is not something a user can plan around (spec §C-state-8).
function formatEnforcedReset(resetAt?: string | null): string | null {
  if (!resetAt) return null;
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

function CreditMeter({
  t,
  anonymous,
  loading,
  unavailable,
  weeklyStats,
  weeklyReset,
  enforced,
}: {
  t: TranslateFn;
  anonymous: boolean;
  loading: boolean;
  unavailable: boolean;
  weeklyStats: WindowStats;
  weeklyReset: string | null;
  enforced?: MeterStatusResponse["enforced"];
}) {
  const roundedPercent = getRoundedUsagePercent(weeklyStats.usedPercent);

  // ── WP-B2: show the counter the backend ACTUALLY ENFORCES ──────────────────────
  //
  // An anonymous visitor's chat never debits the unit wallet — reserveSpacesMeterUnits
  // lets anonymous identities straight through. Their real gate is a daily prompt
  // counter. So rendering the wallet's "≈ 250 chats · 250 of 250 left" to an anon was
  // advertising an allowance that does not gate them and that they do not have.
  //
  // When the backend reports a non-wallet gate, that gate IS the meter.
  const enforcedCounter =
    enforced && enforced.kind !== "unit_wallet" && typeof enforced.limit === "number"
      ? enforced
      : null;
  // During a rolling deploy an older BFF may still return the obsolete anonymous unit
  // snapshot without the daily authority. Never resurrect that second meter as a fallback:
  // fail closed to an unavailable readout until the daily contract is present.
  const anonymousAuthorityUnavailable = anonymous && !loading && !enforcedCounter;
  const isUnavailable = (unavailable || anonymousAuthorityUnavailable) && !loading;

  if (enforcedCounter && !loading && !isUnavailable) {
    const limit = Number(enforcedCounter.limit) || 0;
    const remaining = Math.max(0, Number(enforcedCounter.remaining ?? 0));
    const used = Math.max(0, Math.min(limit, Number(enforcedCounter.used ?? limit - remaining)));
    const usedPercent = getUsagePercent({ used, limit });
    const roundedEnforcedPercent = getRoundedUsagePercent(usedPercent);
    const weekly = enforcedCounter.period === "week";
    const resetLabel = formatEnforcedReset(enforcedCounter.resetAt);

    const headline = weekly
      ? t("zakiDashboard.meter.enforcedWeekly", {
          remaining,
          limit,
          defaultValue: `${remaining} of ${limit} free chats left this week`,
        })
      : t("zakiDashboard.meter.enforcedDaily", {
          remaining,
          limit,
          defaultValue: `${remaining} of ${limit} free chats left today`,
        });
    const aria = weekly
      ? t("zakiDashboard.meter.enforcedWeeklyAria", {
          remaining,
          limit,
          defaultValue: `${remaining} of ${limit} free chats remaining this week.`,
        })
      : t("zakiDashboard.meter.enforcedDailyAria", {
          remaining,
          limit,
          defaultValue: `${remaining} of ${limit} free chats remaining today.`,
        });

    return (
      <div
        className="zaki-dashboard-command__meter"
        data-testid="zaki-dashboard-command-meter"
        // The meter's source of truth is now explicit: "enforced" means these numbers are
        // the gate that will actually deny the next turn — not wallet units that don't.
        data-meter-source="enforced"
        data-enforced-kind={enforcedCounter.kind}
        data-enforced-limit={String(limit)}
        data-enforced-remaining={String(remaining)}
        aria-label={aria}
      >
        <div className="zaki-dashboard-command__meter-top">
          <span className="zaki-dashboard-command__meter-kicker">
            {t("zakiDashboard.command.freeChats", { defaultValue: "Free chats" })}
          </span>
          <strong>{headline}</strong>
          <small className="zaki-dashboard-command__meter-remaining">
            {t("zakiDashboard.meter.enforcedUsed", {
              used,
              limit,
              defaultValue: `${used} of ${limit} used`,
            })}
          </small>
          <small className="zaki-dashboard-command__meter-reset">
            <span>{t("zakiDashboard.meter.reset", { defaultValue: "Reset" })}</span>
            <b>
              {resetLabel
                ? t("zakiDashboard.meter.resetShort", {
                    reset: resetLabel,
                    defaultValue: resetLabel,
                  })
                : t("zakiDashboard.meter.resetPendingShort", { defaultValue: "Pending" })}
            </b>
          </small>
          {isUsageNearCap(usedPercent) ? (
            <small className="zaki-dashboard-command__meter-nudge">
              {t("zakiDashboard.command.enforcedNearCapNudge", {
                remaining,
                defaultValue: `${remaining} free chats left — sign in to keep going.`,
              })}
            </small>
          ) : null}
        </div>
        <div className="zaki-dashboard-command__meter-track" aria-label={aria}>
          <span style={{ width: `${usedPercent}%` }} />
        </div>
        <span className="sr-only">{roundedEnforcedPercent}%</span>
      </div>
    );
  }
  // Prefer a concrete "≈ N agent runs · or M chats" readout over a bare percent whenever we have
  // real pooled-remaining numbers; fall back to the percent (or loading/unavailable) otherwise.
  const estimate =
    !loading && !isUnavailable ? estimateTurnsFromUnits(weeklyStats.remaining) : null;
  const hasNumbers = estimate !== null && typeof weeklyStats.limit === "number";
  const usageShortLabel = loading
    ? t("zakiDashboard.meter.loading")
    : isUnavailable
    ? t("zakiControls.powerUser.usage.unavailable", {
        defaultValue: "Usage unavailable",
      })
    : hasNumbers && estimate
    ? t("zakiDashboard.meter.runsHeadline", {
        agentRuns: estimate.agentRuns,
        chats: estimate.chats,
        defaultValue: `≈ ${estimate.agentRuns} agent runs · or ${estimate.chats} chats`,
      })
    : t("zakiDashboard.meter.usageShort", {
        percent: roundedPercent,
        defaultValue: `${roundedPercent}%`,
      });
  const remainingDetail =
    hasNumbers
      ? t("zakiDashboard.meter.remainingOfLimit", {
          remaining: formatUnits(weeklyStats.remaining),
          limit: formatUnits(weeklyStats.limit),
          defaultValue: `${formatUnits(weeklyStats.remaining)} of ${formatUnits(
            weeklyStats.limit
          )} left`,
        })
      : null;
  const usageAriaLabel = loading
    ? t("zakiDashboard.meter.loading")
    : isUnavailable
    ? t("zakiControls.powerUser.usage.unavailable", {
        defaultValue: "Usage unavailable",
      })
    : hasNumbers && estimate
    ? t("zakiDashboard.meter.usageRunsAria", {
        agentRuns: estimate.agentRuns,
        chats: estimate.chats,
        remaining: formatUnits(weeklyStats.remaining),
        limit: formatUnits(weeklyStats.limit),
        defaultValue: `About ${estimate.agentRuns} agent runs or ${estimate.chats} chats left — ${formatUnits(
          weeklyStats.remaining
        )} of ${formatUnits(weeklyStats.limit)} weekly usage remaining.`,
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
        {remainingDetail ? (
          <small className="zaki-dashboard-command__meter-remaining">
            {remainingDetail}
          </small>
        ) : null}
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
  claimedCount = 0,
  claimedRoute = null,
  claimError = null,
  showSaveCta = false,
  onContinue,
  onOpenClaimed,
  onSave,
}: {
  t: TranslateFn;
  items: AnonymousWorkItem[];
  /**
   * The server confirmed it imported the visitor's work. This is a FACT
   * reported by the claim response, never an inference from "we have a token
   * and the ledger is non-empty" — that inference was the lie this fixes.
   */
  claimed?: boolean;
  /** Message rows the server actually wrote. The copy quotes this number. */
  claimedCount?: number;
  claimedRoute?: string | null;
  claimError?: string | null;
  /** "Save this work" is a sign-in CTA — pointless for an already-signed-in user. */
  showSaveCta?: boolean;
  onContinue: (item: AnonymousWorkItem) => void;
  onOpenClaimed: () => void;
  onSave: (item?: AnonymousWorkItem) => void;
}) {
  // Kept work is consumed from the ledger, so the "we kept it" confirmation
  // stands on its own and points at the thread the work now lives in. It never
  // sits above a list of items that were NOT kept.
  if (claimed) {
    return (
      <div className="zaki-dashboard-command__ledger" data-testid="zaki-anonymous-work">
        <div className="zaki-dashboard-command__ledger-head">
          <div>
            <h2>
              {t("zakiDashboard.anonymousWork.claimedTitle", {
                defaultValue: "We kept your work",
              })}
            </h2>
            <p>
              {t("zakiDashboard.anonymousWork.claimedSubtitle", {
                count: claimedCount,
                defaultValue:
                  "Your signed-out conversation is now in your Space — {{count}} messages carried over.",
              })}
            </p>
          </div>
          {claimedRoute ? (
            <V2Button type="button" onClick={onOpenClaimed}>
              {t("zakiDashboard.anonymousWork.openClaimed", {
                defaultValue: "Open it",
              })}
            </V2Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="zaki-dashboard-command__ledger" data-testid="zaki-anonymous-work">
      <div className="zaki-dashboard-command__ledger-head">
        <div>
          <h2>
            {t("zakiDashboard.anonymousWork.title", {
              defaultValue: "Continue what you started",
            })}
          </h2>
          <p>
            {t("zakiDashboard.anonymousWork.subtitle", {
              defaultValue: "Saved in this browser only. Sign in to keep it across devices.",
            })}
          </p>
          {claimError ? (
            <p className="zaki-dashboard-command__ledger-error" role="status">
              {claimError}
            </p>
          ) : null}
        </div>
        {showSaveCta ? (
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
  // The claim outcome, as reported by the server. This used to be local state
  // set to `token && items.length > 0` — the product asserted "we kept your
  // work" without ever checking, and it was false every time. Nothing but a
  // server response that actually carried rows can turn this on now.
  const anonymousWorkClaimStatus = useAnonymousWorkClaimStore((state) => state.status);
  const anonymousWorkImportedCount = useAnonymousWorkClaimStore((state) => state.importedCount);
  const anonymousWorkClaimRoute = useAnonymousWorkClaimStore((state) => state.route);
  const anonymousWorkClaimError = useAnonymousWorkClaimStore((state) => state.error);
  const setAnonymousWorkClaiming = useAnonymousWorkClaimStore((state) => state.setClaiming);
  const setAnonymousWorkClaimResult = useAnonymousWorkClaimStore((state) => state.setResult);
  const anonymousWorkClaimed =
    anonymousWorkClaimStatus === "imported" && anonymousWorkImportedCount > 0;
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
    // Reads the ledger, and NOTHING else. It deliberately does not decide
    // whether the work was claimed: having a token and a non-empty ledger says
    // nothing about what the server imported. Only the claim response does.
    setAnonymousWorkItems(readAnonymousWorkLedger().items);
  }, []);

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
  const rollingClearTime = formatTimeOrNull(meterStatus?.rolling?.resetAt);
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
  // The unit wallet gates SIGNED-IN agent runs. Anonymous Spaces and Agent preview share the
  // daily allowance instead; never let obsolete anonymous wallet fields influence this decision.
  const agentCapacityBlocked =
    Boolean(token) &&
    selectedProductId === "agent" &&
    !meterLoading &&
    !meterUnavailable &&
    isAvailabilityBlocked(agentAvailability);
  const anonymousAllowance =
    !token && meterStatus?.enforced?.kind === "anonymous_daily_prompts"
      ? meterStatus.enforced
      : null;
  const allowanceRemaining = token
    ? weeklyStats.remaining
    : anonymousAllowance?.remaining;
  const allowanceReset = token
    ? weeklyReset
    : formatEnforcedReset(anonymousAllowance?.resetAt);
  const creditsExhausted =
    !meterLoading &&
    !meterUnavailable &&
    typeof allowanceRemaining === "number" &&
    allowanceRemaining <= 0;
  const commandBlockedByUsage =
    selectedProductRequiresAuthBeforeRun
      ? false
      : selectedProductId === "agent" && token
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
        defaultValue: "Signed in",
      })
    : t("zakiDashboard.command.guestEyebrow", {
        defaultValue: "Guest session",
      });
  const introCopy = token
    ? t("zakiDashboard.command.signedCopy", {
        defaultValue: "Name the outcome. ZAKI handles the rest.",
      })
    : t("zakiDashboard.command.guestCopy", {
        defaultValue:
          "Start in Chat now. Sign in when you need Agent, files, or memory.",
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
        anonymousHandoff: !token,
      });
    },
    [token]
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
        meterRemaining: allowanceRemaining,
        status: "draft",
      });
      refreshAnonymousWork();
      return draft?.id ?? null;
    },
    [allowanceRemaining, refreshAnonymousWork, token]
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
          anonymousHandoff: !token,
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
      token,
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

      // WP-F (F7) — an anonymous visitor selecting Agent gets the PLAN PREVIEW, not a login
      // wall. The intent written above carries their typed task across the navigation, so the
      // preview surface runs the words they actually typed.
      if (!token && selectedProductId === "agent") {
        navigate(AGENT_PLAN_ROUTE);
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

  /**
   * Recovery path for coming-soon lanes (Design/Minutes). Their submit is legitimately
   * disabled, so without this the user is stranded with a typed prompt and no way out.
   * Carries the prompt straight over into the canonical Spaces lane.
   */
  const handleContinueInSpaces = useCallback(() => {
    setSelectedProductId(RECOVERY_PRODUCT_ID);

    const prompt = commandText.trim();
    if (!prompt) {
      commandInputRef.current?.focus();
      return;
    }

    const anonymousWorkId = persistAnonymousCommandDraft(RECOVERY_PRODUCT_ID, prompt);
    writeDashboardIntent(RECOVERY_PRODUCT_ID, prompt, anonymousWorkId);
    onSendExample(prompt);
    setCommandText("");
    refreshAnonymousWork();
  }, [
    commandText,
    onSendExample,
    persistAnonymousCommandDraft,
    refreshAnonymousWork,
    writeDashboardIntent,
  ]);

  const handleContinueAnonymousWork = useCallback(
    async (item: AnonymousWorkItem) => {
      setSelectedProductId(item.productId);
      setCommandText(item.prompt);
      writeDashboardIntent(item.productId, item.prompt, item.id);
      if (item.productId !== "spaces") {
        const route = item.route || getCommandProductRoute(item.productId);
        // WP-F: a saved anonymous Agent item reopens the preview surface, which is anon-allowed.
        // Only the still-gated lanes (Brain) send an anonymous visitor to auth first.
        if (!token && isAuthRequiredProduct(item.productId)) {
          navigate(`/?auth=login&next=${encodeURIComponent(route)}`);
          return;
        }
        navigate(route);
        return;
      }
      if (item.productId === "spaces" && item.route.startsWith("/spaces")) {
        if (token) {
          // The same shared claim every other sign-in path runs. It consumes the
          // ledger item only once the server confirms the import, so a retry
          // after a failure re-claims the same work instead of losing it.
          setAnonymousWorkClaiming();
          const result = await claimAnonymousWork(item);
          setAnonymousWorkClaimResult(result);
          refreshAnonymousWork();

          if (result.status === "error") {
            // Stay put and surface the failure. It emphatically does NOT say
            // "we kept your work" — nothing was kept.
            return;
          }
          if (result.route) {
            navigate(result.route);
          }
          return;
        }
        navigate(item.route);
      }
    },
    [
      navigate,
      refreshAnonymousWork,
      setAnonymousWorkClaimResult,
      setAnonymousWorkClaiming,
      token,
      writeDashboardIntent,
    ]
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
            id: token ? "weekly-reset" : "daily-reset",
            label: token
              ? t("zakiDashboard.status.weeklyReset")
              : t("zakiDashboard.status.dailyReset", { defaultValue: "Daily reset" }),
            value: allowanceReset || t("zakiDashboard.meter.resetPending"),
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
          {/*
            Show saved work whenever there IS saved work, plus the kept
            confirmation once the server has actually imported something. What
            it must never do is treat "signed in with a non-empty ledger" as
            proof the work was kept — that was asserted, never verified, and it
            was false on every single claim.
          */}
          {anonymousWorkItems.length > 0 || anonymousWorkClaimed ? (
            <ReturningWorkStrip
              t={t}
              items={anonymousWorkItems}
              claimed={anonymousWorkClaimed}
              claimedCount={anonymousWorkImportedCount}
              claimedRoute={anonymousWorkClaimRoute}
              claimError={anonymousWorkClaimError}
              showSaveCta={!token}
              onContinue={handleContinueAnonymousWork}
              onOpenClaimed={() => {
                if (anonymousWorkClaimRoute) navigate(anonymousWorkClaimRoute);
              }}
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
                  anonymous={!token}
                  loading={meterLoading}
                  unavailable={meterUnavailable}
                  weeklyStats={weeklyStats}
                  weeklyReset={weeklyReset}
                  // WP-B2: for an anon this is the daily prompt counter that actually
                  // gates them; the wallet numbers above do not.
                  enforced={meterStatus?.enforced ?? null}
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
                  {selectedProductComingSoon ? (
                    <V2Button
                      type="button"
                      data-testid="zaki-dashboard-continue-in-spaces"
                      className="zaki-dashboard-command__recover"
                      onClick={handleContinueInSpaces}
                    >
                      <MessageSquareText className="size-4" aria-hidden="true" />
                      {t("zakiDashboard.command.continueInSpaces", {
                        defaultValue: "Continue in Spaces instead",
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
                    : !token
                      ? t("zakiDashboard.command.anonymousCreditsExhaustedTitle", {
                          defaultValue: "Free chats are used up for today.",
                        })
                      : t("zakiDashboard.command.creditsExhaustedTitle", {
                          defaultValue: "Weekly usage is full.",
                        })}
                </strong>
                <span>
                  {agentCapacityBlocked
                    ? rollingClearTime
                      ? t("zakiDashboard.command.capacityWindowCopy", {
                          reset: rollingClearTime,
                          defaultValue:
                            "Your draft stays saved here. More room opens at {{reset}}.",
                        })
                      : t("zakiDashboard.command.capacityWindowCopySoon", {
                          defaultValue:
                            "Your draft stays saved here. More room opens soon.",
                        })
                    : !token
                      ? t("zakiDashboard.command.anonymousCreditsExhaustedCopy", {
                          defaultValue:
                            "Your draft stays here. Sign in to keep going now, or wait for the daily reset.",
                        })
                      : t("zakiDashboard.command.creditsExhaustedCopy", {
                          defaultValue:
                            "Your draft stays saved here. Sign up, wait for the weekly reset, or pick a plan with more room.",
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
                    {allowanceReset
                      ? t("zakiDashboard.command.waitForResetDate", {
                          reset: allowanceReset,
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

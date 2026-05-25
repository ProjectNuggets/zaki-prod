// 2026-05-09 — Anchored onboarding tooltip primitive.
//
// Click-gated tour bubble. Anchors to a DOM element via a CSS selector
// (typically `[data-onboarding-id="..."]`), positions itself relative
// to the anchor, and exposes Next + Skip controls. The orchestrator
// composes these into stages.
//
// If the anchor is missing (panel not open, route different), the
// tooltip falls back to a centered card so the tour never gets stuck
// pointing at nothing.

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { V2Button } from "@/app/components/v2";

type Placement = "top" | "bottom" | "left" | "right";

interface OnboardingTooltipProps {
  open: boolean;
  /** CSS selector for the anchor. If null or unresolvable, the tooltip
   *  centers itself. */
  anchorSelector?: string | null;
  /** Preferred side relative to the anchor. Falls back to centered if
   *  the anchor isn't found. */
  placement?: Placement;
  title: string;
  body: string;
  /** "Step 2 of 5" style label. Optional. */
  stepLabel?: string;
  /** Primary CTA text. Defaults to "Got it". */
  nextLabel?: string;
  /** Skip CTA text. Defaults to "Skip tour". */
  skipLabel?: string;
  /** Got it / advance handler. */
  onNext: () => void;
  /** "Skip tour" handler — user has opted out of the entire tour. */
  onSkip: () => void;
  /** Optional X-icon dismiss handler. Defaults to onNext (treat the
   *  X as "got it for this step" rather than "skip the entire tour").
   *  Provide an explicit handler to differentiate. */
  onDismiss?: () => void;
  /** When true, dim the rest of the page so the anchor stands out. */
  spotlight?: boolean;
}

const TOOLTIP_OFFSET = 12;
const TOOLTIP_WIDTH = 320;

function resolveAnchorRect(selector: string | null | undefined): DOMRect | null {
  if (!selector || typeof document === "undefined") return null;
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return rect;
}

function computeTooltipStyle(
  rect: DOMRect | null,
  placement: Placement,
): React.CSSProperties {
  if (!rect) {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: `${TOOLTIP_WIDTH}px`,
    };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = 0;
  let left = 0;
  switch (placement) {
    case "top":
      top = rect.top - TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2;
      return {
        top: `${Math.max(8, top)}px`,
        left: `${Math.min(Math.max(8 + TOOLTIP_WIDTH / 2, left), vw - 8 - TOOLTIP_WIDTH / 2)}px`,
        transform: "translate(-50%, -100%)",
        width: `${TOOLTIP_WIDTH}px`,
      };
    case "bottom":
      top = rect.bottom + TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2;
      return {
        top: `${Math.min(top, vh - 8 - 200)}px`,
        left: `${Math.min(Math.max(8 + TOOLTIP_WIDTH / 2, left), vw - 8 - TOOLTIP_WIDTH / 2)}px`,
        transform: "translate(-50%, 0)",
        width: `${TOOLTIP_WIDTH}px`,
      };
    case "left":
      top = rect.top + rect.height / 2;
      left = rect.left - TOOLTIP_OFFSET;
      return {
        top: `${top}px`,
        left: `${Math.max(8 + TOOLTIP_WIDTH, left)}px`,
        transform: "translate(-100%, -50%)",
        width: `${TOOLTIP_WIDTH}px`,
      };
    case "right":
      top = rect.top + rect.height / 2;
      left = rect.right + TOOLTIP_OFFSET;
      return {
        top: `${top}px`,
        left: `${Math.min(left, vw - 8 - TOOLTIP_WIDTH)}px`,
        transform: "translate(0, -50%)",
        width: `${TOOLTIP_WIDTH}px`,
      };
  }
}

export function OnboardingTooltip({
  open,
  anchorSelector = null,
  placement = "bottom",
  title,
  body,
  stepLabel,
  nextLabel,
  skipLabel,
  onNext,
  onSkip,
  onDismiss,
  spotlight = false,
}: OnboardingTooltipProps) {
  const { t } = useTranslation();
  const [rect, setRect] = useState<DOMRect | null>(() =>
    resolveAnchorRect(anchorSelector),
  );

  useEffect(() => {
    if (!open) return;
    const update = () => setRect(resolveAnchorRect(anchorSelector));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // The anchor may not be in the DOM yet (slide-in panels, conditional
    // renders). Re-resolve a few times until we find it or give up.
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      const next = resolveAnchorRect(anchorSelector);
      if (next || attempts > 10) {
        if (next) setRect(next);
        window.clearInterval(id);
      }
    }, 200);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(id);
    };
  }, [open, anchorSelector]);

  if (!open) return null;

  const tooltipStyle = computeTooltipStyle(rect, placement);
  const resolvedNextLabel = nextLabel ?? t("onboarding.next", { defaultValue: "Got it" });
  const resolvedSkipLabel = skipLabel ?? t("onboarding.skipTour", { defaultValue: "Skip tour" });
  const resolvedDismissLabel = t("onboarding.dismissAria", { defaultValue: "Dismiss this step" });
  const resolvedDismissHandler = onDismiss ?? onNext;

  return (
    <div
      className="zaki-onboarding-v2"
      role="dialog"
      aria-modal="false"
      aria-label={title}
    >
      {spotlight && rect ? (
        <svg
          aria-hidden="true"
          className="zaki-onboarding-v2__spotlight"
        >
          <defs>
            <mask id="onboarding-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={Math.max(0, rect.left - 6)}
                y={Math.max(0, rect.top - 6)}
                width={rect.width + 12}
                height={rect.height + 12}
                rx={Math.min(6, rect.height / 2 + 6)}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            className="zaki-onboarding-v2__spotlight-fill"
            mask="url(#onboarding-spotlight-mask)"
          />
        </svg>
      ) : (
        <div className="zaki-onboarding-v2__overlay" />
      )}
      <div
        className="zaki-onboarding-v2__card"
        style={tooltipStyle}
      >
        <V2Button
          type="button"
          onClick={resolvedDismissHandler}
          className="zaki-onboarding-v2__close"
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={resolvedDismissLabel}
        >
          <X className="size-3.5" aria-hidden="true" />
        </V2Button>
        {stepLabel ? (
          <div className="zaki-onboarding-v2__step">
            {stepLabel}
          </div>
        ) : null}
        <h3>
          {title}
        </h3>
        <p>{body}</p>
        <div className="zaki-onboarding-v2__actions">
          <V2Button
            type="button"
            onClick={onSkip}
            variant="ghost"
            size="sm"
          >
            {resolvedSkipLabel}
          </V2Button>
          <V2Button
            type="button"
            onClick={onNext}
            variant="accent"
            size="sm"
          >
            {resolvedNextLabel}
          </V2Button>
        </div>
      </div>
    </div>
  );
}

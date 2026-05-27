// 2026-05-09 — Onboarding Tour orchestrator.
//
// Reads onboardingProgress, picks the next pending stage that's eligible
// to surface, and renders the appropriate tooltip. Click-gated: each
// stage is dismissed by the user via Next or Skip, never by action
// detection.
//
// Stages currently surfaced from this component:
//   - plus_menu: anchor on the composer plus button.
//   - compaction: anchor on the context meter when armed.
//   - brain_panel: anchor on the memory control in the dashboard or
//     sidebar (whichever is visible).
//
// The old welcome hero no longer renders because the signed-in root is
// now the commercial command center. ChatArea auto-completes that
// legacy stage so the remaining tour can still run.
// The first_message celebration is similarly inline in the chat thread.
// channels stage is wired when the BE lands.

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { OnboardingTooltip } from "./OnboardingTooltip";
import {
  ONBOARDING_STAGES,
  type OnboardingProgress,
  type OnboardingStageId,
} from "@/queries/useOnboardingProgress";

type StageConfig = {
  id: OnboardingStageId;
  anchorSelector: string;
  placement: "top" | "bottom" | "left" | "right";
  titleKey: string;
  bodyKey: string;
  defaultTitle: string;
  defaultBody: string;
  /** Whether the stage is gated on a runtime condition the orchestrator
   *  doesn't know about (e.g. compactArmed, brainCount > 0). The
   *  caller passes a map of these in `gates`. */
  gateKey?: string;
};

const STAGE_CONFIGS: StageConfig[] = [
  {
    id: "plus_menu",
    anchorSelector: '[data-onboarding-id="chat-controls-button"]',
    placement: "top",
    titleKey: "onboarding.tour.plusMenu.title",
    bodyKey: "onboarding.tour.plusMenu.body",
    defaultTitle: "More than just typing",
    defaultBody:
      "Tap the plus to schedule follow-ups, pin a memory to this thread, or switch ZAKI between Plan, Execute, and Review modes.",
    gateKey: "plusMenuEligible",
  },
  {
    id: "compaction",
    anchorSelector: '[data-testid="zaki-context-meter"][data-armed="true"]',
    placement: "top",
    titleKey: "onboarding.tour.compaction.title",
    bodyKey: "onboarding.tour.compaction.body",
    defaultTitle: "Conversation getting long?",
    defaultBody:
      "When the meter glows, click it to compact. ZAKI summarizes the back-and-forth so you can keep going without losing context.",
    gateKey: "compactionArmed",
  },
  {
    id: "brain_panel",
    anchorSelector: '[data-onboarding-id="zaki-dashboard-brain-entry"]',
    placement: "top",
    titleKey: "onboarding.tour.brainPanel.title",
    bodyKey: "onboarding.tour.brainPanel.body",
    defaultTitle: "ZAKI is learning about you",
    defaultBody:
      "Open your brain to see what ZAKI remembers. You can edit, pin, or forget anything.",
    // Compound gate: the user must have enough memories to make the
    // tooltip meaningful AND be on the dashboard where the anchor
    // exists. Otherwise the tooltip would mis-anchor inside a session.
    gateKey: "brainPanelEligible",
  },
];

interface OnboardingTourProps {
  progress: OnboardingProgress;
  setStage: (stage: OnboardingStageId, status: "done" | "skipped") => void;
  /** Stage-specific runtime gates. Only stages whose gate is true will
   *  surface (when `gateKey` is set on the config). */
  gates?: Record<string, boolean>;
}

export function OnboardingTour({
  progress,
  setStage,
  gates = {},
}: OnboardingTourProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  // Welcome is a legacy entry stage. ChatArea marks it done because the
  // dashboard no longer renders a welcome hero; keeping this guard avoids
  // surprising older localStorage states.
  const welcomeStatus = progress.welcome;

  // Pick the highest-priority pending + eligible stage.
  const activeStage = useMemo<StageConfig | null>(() => {
    if (welcomeStatus !== "done") return null;
    for (const id of ONBOARDING_STAGES) {
      const status = progress[id];
      if (status !== "pending") continue;
      const config = STAGE_CONFIGS.find((c) => c.id === id);
      if (!config) continue;
      if (config.gateKey && !gates[config.gateKey]) continue;
      return config;
    }
    return null;
  }, [progress, gates, welcomeStatus]);

  // When the active stage changes, reopen the tooltip (in case the user
  // re-entered the tour from the settings menu).
  useEffect(() => {
    setOpen(true);
  }, [activeStage?.id]);

  if (!activeStage) return null;

  return (
    <OnboardingTooltip
      open={open}
      anchorSelector={activeStage.anchorSelector}
      placement={activeStage.placement}
      title={t(activeStage.titleKey, { defaultValue: activeStage.defaultTitle })}
      body={t(activeStage.bodyKey, { defaultValue: activeStage.defaultBody })}
      spotlight
      onNext={() => {
        setOpen(false);
        setStage(activeStage.id, "done");
      }}
      onSkip={() => {
        setOpen(false);
        setStage(activeStage.id, "skipped");
      }}
    />
  );
}

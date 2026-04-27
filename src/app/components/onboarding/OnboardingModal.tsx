import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Brain,
  FolderPlus,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ModalShell } from "@/app/components/ui/ModalShell";

type MobileStep = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  icon: ComponentType<{ className?: string }>;
};

type GuidedTask = {
  id: string;
  label: string;
  short: string;
  openLabel?: string;
  openShort?: string;
  targetId?: string;
  secondaryTargetIds?: string[];
  fallbackTargetId?: string;
  unlockTargetIds?: string[];
  unlockSelectors?: string[];
  required?: boolean;
  completeWhenTargetVisible?: boolean;
};

type GuidedStep = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  tasks: GuidedTask[];
};

type TaskStatus = Record<string, boolean>;
type SpotlightRect = { top: number; left: number; width: number; height: number };
type ResolvedTarget = { el: HTMLElement; id: string };

interface OnboardingModalProps {
  isOpen: boolean;
  userName: string;
  onDismiss: () => void;
  onComplete: () => void;
  onCreateSpace: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
}

function keyFor(stepId: string, taskId: string) {
  return `${stepId}:${taskId}`;
}

function findTargets(task: GuidedTask, context?: { focusSpaceId?: string | null }) {
  if (typeof document === "undefined") return null;
  if (task.id === "thread_created" && context?.focusSpaceId) {
    const scoped = document.querySelector(
      `[data-onboarding-id="sidebar-space-new-thread"][data-onboarding-space-id="${context.focusSpaceId}"]`
    ) as HTMLElement | null;
    if (scoped) {
      return [{ el: scoped, id: "sidebar-space-new-thread" }];
    }
  }
  if (task.id === "thread_created" && !context?.focusSpaceId) {
    return null;
  }

  const primaryIds = [task.targetId, ...(task.secondaryTargetIds ?? [])].filter(Boolean) as string[];
  const primaryTargets: ResolvedTarget[] = [];
  for (const id of primaryIds) {
    const el = document.querySelector(`[data-onboarding-id="${id}"]`) as HTMLElement | null;
    if (el) {
      primaryTargets.push({ el, id });
    }
  }

  if (primaryTargets.length > 0) {
    return primaryTargets;
  }

  const fallbackIds = [task.fallbackTargetId].filter(Boolean) as string[];
  for (const id of fallbackIds) {
    const el = document.querySelector(`[data-onboarding-id="${id}"]`) as HTMLElement | null;
    if (el) {
      return [{ el, id }];
    }
  }
  return null;
}

function findVisibleTargets(ids: string[]) {
  if (typeof document === "undefined") return [];
  return ids
    .map((id) => {
      const el = document.querySelector(`[data-onboarding-id="${id}"]`) as HTMLElement | null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return { el, id };
    })
    .filter(Boolean) as ResolvedTarget[];
}

function hasVisibleSelector(selectors: string[]) {
  if (typeof document === "undefined") return false;
  return selectors.some((selector) => {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

export function OnboardingModal({
  isOpen,
  userName,
  onDismiss,
  onComplete,
  onCreateSpace,
  onOpenMemory,
  onOpenSettings,
}: OnboardingModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");
  const spotlightMaskId = useId();
  const [isDesktop, setIsDesktop] = useState(
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 768px)").matches
  );
  const [mobileStepIndex, setMobileStepIndex] = useState(0);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [taskIndexByStep, setTaskIndexByStep] = useState<Record<string, number>>({});
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({});
  const [showFinalScreen, setShowFinalScreen] = useState(false);
  const [spotlightRects, setSpotlightRects] = useState<SpotlightRect[]>([]);
  const [resolvedTargetId, setResolvedTargetId] = useState<string | null>(null);
  const [focusSpaceId, setFocusSpaceId] = useState<string | null>(null);
  const startChatting = () => {
    onComplete();
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        window.dispatchEvent(new Event("zaki:focus-composer"));
      }, 0);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const mobileSteps = useMemo<MobileStep[]>(
    () => [
      {
        id: "space",
        title: t("onboarding.steps.space.title"),
        body: t("onboarding.steps.space.body"),
        actionLabel: t("onboarding.steps.space.action"),
        onAction: onCreateSpace,
        icon: FolderPlus,
      },
      {
        id: "memory",
        title: t("onboarding.steps.memory.title"),
        body: t("onboarding.steps.memory.body"),
        actionLabel: t("onboarding.steps.memory.action"),
        onAction: onOpenMemory,
        icon: Brain,
      },
      {
        id: "settings",
        title: t("onboarding.steps.settings.title"),
        body: t("onboarding.steps.settings.body"),
        actionLabel: t("onboarding.steps.settings.action"),
        onAction: onOpenSettings,
        icon: Settings,
      },
    ],
    [onCreateSpace, onOpenMemory, onOpenSettings, t]
  );

  const guidedSteps = useMemo<GuidedStep[]>(
    () => [
      {
        id: "spaces_threads",
        title: t("onboarding.guided.categories.spacesThreads"),
        icon: FolderPlus,
        tasks: [
          {
            id: "space_scope_overview",
            label: t("onboarding.guided.tasks.spaceScopeOverview.label"),
            short: t("onboarding.guided.tasks.spaceScopeOverview.short"),
            openLabel: t("onboarding.guided.tasks.spaceScopeOverview.openLabel"),
            openShort: t("onboarding.guided.tasks.spaceScopeOverview.openShort"),
            targetId: "create-space-scope-space-note",
            secondaryTargetIds: [
              "create-space-scope-thread-note",
            ],
            fallbackTargetId: "sidebar-create-space",
            unlockTargetIds: [
              "create-space-scope-space-note",
              "create-space-scope-thread-note",
            ],
          },
          {
            id: "space_created",
            label: t("onboarding.guided.tasks.spaceCreated.label"),
            short: t("onboarding.guided.tasks.spaceCreated.short"),
            openLabel: t("onboarding.guided.tasks.spaceCreated.openLabel"),
            openShort: t("onboarding.guided.tasks.spaceCreated.openShort"),
            targetId: "create-space-name-input",
            secondaryTargetIds: ["create-space-submit"],
            fallbackTargetId: "sidebar-create-space",
          },
          {
            id: "thread_created",
            label: t("onboarding.guided.tasks.threadCreated.label"),
            short: t("onboarding.guided.tasks.threadCreated.short"),
            targetId: "sidebar-space-new-thread",
            fallbackTargetId: "sidebar-create-space",
          },
        ],
      },
      {
        id: "search_tools",
        title: t("onboarding.guided.categories.searchTools"),
        icon: Sparkles,
        tasks: [
          {
            id: "web_search_opened",
            label: t("onboarding.guided.tasks.webSearchOpened.label"),
            short: t("onboarding.guided.tasks.webSearchOpened.short"),
            targetId: "chat-web-search-button",
          },
          {
            id: "chat_controls_opened",
            label: t("onboarding.guided.tasks.chatControlsOpened.label"),
            short: t("onboarding.guided.tasks.chatControlsOpened.short"),
            targetId: "chat-controls-button",
            unlockSelectors: ['[data-onboarding-id="chat-controls-button"][aria-expanded="true"]'],
          },
          {
            id: "chat_tools_overview",
            label: t("onboarding.guided.tasks.queryModeExplained.label"),
            short: t("onboarding.guided.tasks.queryModeExplained.short"),
            targetId: "chat-control-query-mode",
            fallbackTargetId: "chat-controls-button",
          },
        ],
      },
      {
        id: "memory",
        title: t("onboarding.guided.categories.memory"),
        icon: Brain,
        tasks: [
          {
            id: "memory_toggle_overview",
            label: t("onboarding.guided.tasks.memoryToggleOverview.label"),
            short: t("onboarding.guided.tasks.memoryToggleOverview.short"),
            targetId: "chat-memory-mode-toggle",
          },
          {
            id: "memory_opened",
            label: t("onboarding.guided.tasks.memoryOpened.label"),
            short: t("onboarding.guided.tasks.memoryOpened.short"),
            targetId: "profile-menu-memory",
            fallbackTargetId: "profile-menu-trigger",
            unlockSelectors: ['[data-onboarding-id="memory-viewer-dialog"]'],
            unlockTargetIds: ["memory-viewer-dialog"],
          },
        ],
      },
    ],
    [t]
  );

  const currentGuidedStep = guidedSteps[guidedStepIndex] ?? guidedSteps[0]!;
  const currentGuidedTaskIndex = Math.min(
    taskIndexByStep[currentGuidedStep.id] ?? 0,
    Math.max(0, currentGuidedStep.tasks.length - 1)
  );
  const currentGuidedTask = currentGuidedStep.tasks[currentGuidedTaskIndex]!;
  const currentMobileStep = mobileSteps[mobileStepIndex] ?? mobileSteps[0]!;
  const currentGuidedStepRef = useRef(currentGuidedStep);
  const currentGuidedTaskRef = useRef(currentGuidedTask);
  const currentGuidedTaskIndexRef = useRef(currentGuidedTaskIndex);
  const taskStatusRef = useRef(taskStatus);
  const autoAdvancedForRef = useRef<string | null>(null);

  useEffect(() => {
    currentGuidedStepRef.current = currentGuidedStep;
    currentGuidedTaskRef.current = currentGuidedTask;
    currentGuidedTaskIndexRef.current = currentGuidedTaskIndex;
  }, [currentGuidedStep, currentGuidedTask, currentGuidedTaskIndex]);

  useEffect(() => {
    taskStatusRef.current = taskStatus;
  }, [taskStatus]);

  useEffect(() => {
    if (!isOpen) return;
    setMobileStepIndex(0);
    setGuidedStepIndex(0);
    setTaskIndexByStep({});
    setTaskStatus({});
    setShowFinalScreen(false);
    setSpotlightRects([]);
    setResolvedTargetId(null);
    setFocusSpaceId(null);
    autoAdvancedForRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onDismiss();
    };
    document.addEventListener("keydown", handleEscape, true);
    return () => document.removeEventListener("keydown", handleEscape, true);
  }, [isOpen, onDismiss]);

  const setTaskIndex = (stepId: string, nextIndex: number) => {
    setTaskIndexByStep((prev) => ({ ...prev, [stepId]: nextIndex }));
  };

  const isTaskDone = (stepId: string, taskId: string) =>
    Boolean(taskStatus[keyFor(stepId, taskId)]);

  const stepRequiredDone = (step: GuidedStep) =>
    step.tasks
      .filter((task) => task.required !== false)
      .every((task) => isTaskDone(step.id, task.id));

  const markDone = (stepId: string, taskId: string) => {
    const key = keyFor(stepId, taskId);
    if (taskStatusRef.current[key]) return;

    const nextStatus = { ...taskStatusRef.current, [key]: true };
    taskStatusRef.current = nextStatus;
    setTaskStatus(nextStatus);

    const activeStep = currentGuidedStepRef.current;
    const activeTask = currentGuidedTaskRef.current;
    const activeTaskIndex = currentGuidedTaskIndexRef.current;
    if (activeStep.id !== stepId || activeTask.id !== taskId) return;

    if (activeTaskIndex < activeStep.tasks.length - 1) {
      setTaskIndex(activeStep.id, activeTaskIndex + 1);
      return;
    }

    const requiredTasks = activeStep.tasks.filter((task) => task.required !== false);
    const requiredDoneCount = requiredTasks.filter((task) => nextStatus[keyFor(activeStep.id, task.id)]).length;
    if (requiredDoneCount < requiredTasks.length) return;

    const stepPosition = guidedSteps.findIndex((step) => step.id === activeStep.id);
    if (stepPosition >= 0 && stepPosition < guidedSteps.length - 1) {
      setGuidedStepIndex(stepPosition + 1);
      return;
    }
    setShowFinalScreen(true);
  };

  useEffect(() => {
    if (!isOpen || !isDesktop) return;

    const onSpaceSubmitted = () => {
      markDone("spaces_threads", "space_scope_overview");
      markDone("spaces_threads", "space_created");
    };
    const onSpaceCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id) setFocusSpaceId(detail.id);
      markDone("spaces_threads", "space_scope_overview");
      markDone("spaces_threads", "space_created");
    };
    const onThreadCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ spaceId?: string }>).detail;
      if (detail?.spaceId) setFocusSpaceId(detail.spaceId);
      markDone("spaces_threads", "thread_created");
    };
    const onMemoryOpened = () => markDone("memory", "memory_opened");
    const onMemoryModeChanged = () => markDone("memory", "memory_toggle_overview");
    const onWebSearchClicked = () => markDone("search_tools", "web_search_opened");
    const onChatControlsOpened = () => markDone("search_tools", "chat_controls_opened");

    window.addEventListener("zaki:onboarding-space-submit", onSpaceSubmitted);
    window.addEventListener("zaki:onboarding-space-created", onSpaceCreated);
    window.addEventListener("zaki:thread-created", onThreadCreated);
    window.addEventListener("zaki:onboarding-thread-created", onThreadCreated);
    window.addEventListener("zaki:onboarding-memory-opened", onMemoryOpened);
    window.addEventListener("zaki:onboarding-memory-mode-changed", onMemoryModeChanged);
    window.addEventListener("zaki:onboarding-web-search-clicked", onWebSearchClicked);
    window.addEventListener("zaki:onboarding-chat-controls-opened", onChatControlsOpened);

    return () => {
      window.removeEventListener("zaki:onboarding-space-submit", onSpaceSubmitted);
      window.removeEventListener("zaki:onboarding-space-created", onSpaceCreated);
      window.removeEventListener("zaki:thread-created", onThreadCreated);
      window.removeEventListener("zaki:onboarding-thread-created", onThreadCreated);
      window.removeEventListener("zaki:onboarding-memory-opened", onMemoryOpened);
      window.removeEventListener("zaki:onboarding-memory-mode-changed", onMemoryModeChanged);
      window.removeEventListener("zaki:onboarding-web-search-clicked", onWebSearchClicked);
      window.removeEventListener("zaki:onboarding-chat-controls-opened", onChatControlsOpened);
    };
  }, [isDesktop, isOpen, guidedSteps]);

  useEffect(() => {
    if (!isOpen || !isDesktop || showFinalScreen) return;
    const currentKey = keyFor(currentGuidedStep.id, currentGuidedTask.id);
    if (autoAdvancedForRef.current === currentKey) return;
    if (!isTaskDone(currentGuidedStep.id, currentGuidedTask.id)) return;
    autoAdvancedForRef.current = currentKey;

    if (currentGuidedTaskIndex < currentGuidedStep.tasks.length - 1) {
      setTaskIndex(currentGuidedStep.id, currentGuidedTaskIndex + 1);
      return;
    }

    if (stepRequiredDone(currentGuidedStep)) {
      if (guidedStepIndex < guidedSteps.length - 1) {
        setGuidedStepIndex(guidedStepIndex + 1);
      } else {
        setShowFinalScreen(true);
      }
    }
  }, [
    isDesktop,
    isOpen,
    showFinalScreen,
    currentGuidedStep,
    currentGuidedTask,
    currentGuidedTaskIndex,
    guidedStepIndex,
    guidedSteps,
    taskStatus,
  ]);

  useEffect(() => {
    if (!isOpen || !isDesktop || showFinalScreen) return;
    if (!currentGuidedTask.completeWhenTargetVisible) return;
    const result = findTargets(currentGuidedTask, { focusSpaceId });
    if (!result?.length) return;
    markDone(currentGuidedStep.id, currentGuidedTask.id);
  }, [isDesktop, isOpen, showFinalScreen, currentGuidedTask, currentGuidedStep.id, focusSpaceId]);

  useEffect(() => {
    if (!isOpen || !isDesktop || showFinalScreen) {
      setSpotlightRects([]);
      setResolvedTargetId(null);
      return;
    }

    const updateRect = () => {
      const result = findTargets(currentGuidedTask, { focusSpaceId });
      if (!result?.length) {
        setSpotlightRects([]);
        setResolvedTargetId(null);
        return;
      }
      const rects = result
        .map(({ el }) => el.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0)
        .map((rect) => ({
          top: Math.max(8, rect.top - 6),
          left: Math.max(8, rect.left - 6),
          width: rect.width + 12,
          height: rect.height + 12,
        }));
      if (!rects.length) {
        setSpotlightRects([]);
        setResolvedTargetId(null);
        return;
      }
      setResolvedTargetId(result[0]?.id ?? null);
      setSpotlightRects(rects);
    };

    updateRect();
    const onLayout = () => window.requestAnimationFrame(updateRect);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    const intervalId = window.setInterval(updateRect, 400);

    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.clearInterval(intervalId);
    };
  }, [isDesktop, isOpen, showFinalScreen, currentGuidedTask, focusSpaceId]);

  const currentStepRequiredTasks = currentGuidedStep.tasks.filter((task) => task.required !== false);
  const currentStepRequiredDoneCount = currentStepRequiredTasks.filter((task) =>
    isTaskDone(currentGuidedStep.id, task.id)
  ).length;
  const stepCompletionFraction = currentStepRequiredTasks.length
    ? currentStepRequiredDoneCount / currentStepRequiredTasks.length
    : 0;
  const currentStepRequiredDone = stepRequiredDone(currentGuidedStep);
  const atLastTask = currentGuidedTaskIndex >= currentGuidedStep.tasks.length - 1;
  const isCurrentTaskDone = isTaskDone(currentGuidedStep.id, currentGuidedTask.id);
  const controlsMenuPinnedTaskIds = new Set([
    "chat_tools_overview",
  ]);
  const coachmarkNextTaskIds = new Set([
    "space_scope_overview",
    "chat_tools_overview",
    "memory_toggle_overview",
  ]);
  const manualAdvanceTaskIds = new Set([
    "chat_tools_overview",
    "memory_toggle_overview",
  ]);
  const isManualAdvanceTask = manualAdvanceTaskIds.has(currentGuidedTask.id);
  const hasUnlockTargetsVisible =
    (currentGuidedTask.unlockTargetIds?.length ?? 0) > 0 &&
    findVisibleTargets(currentGuidedTask.unlockTargetIds ?? []).length > 0;
  const hasUnlockSelectorsVisible =
    (currentGuidedTask.unlockSelectors?.length ?? 0) > 0 &&
    hasVisibleSelector(currentGuidedTask.unlockSelectors ?? []);
  const canAdvanceCurrent =
    isManualAdvanceTask ||
    currentGuidedTask.required === false ||
    isCurrentTaskDone ||
    hasUnlockTargetsVisible ||
    hasUnlockSelectorsVisible;
  const canAdvanceAtLastTask =
    currentStepRequiredDone ||
    isManualAdvanceTask;
  const progress =
    guidedStepIndex === guidedSteps.length - 1 && atLastTask && canAdvanceAtLastTask
      ? 100
      : Math.round(((guidedStepIndex + stepCompletionFraction) / Math.max(1, guidedSteps.length)) * 100);
  const currentStepNumber = guidedStepIndex + 1;
  const currentTaskNumber = Math.min(currentGuidedTaskIndex + 1, currentGuidedStep.tasks.length);
  const isFallbackTargetResolved =
    resolvedTargetId !== null &&
    resolvedTargetId === currentGuidedTask.fallbackTargetId;
  const isActionRequiredState =
    currentGuidedTask.id === "space_scope_overview" &&
    isFallbackTargetResolved;
  const showCoachmarkNextButton =
    coachmarkNextTaskIds.has(currentGuidedTask.id) &&
    !isActionRequiredState;
  const coachmarkLabel = isFallbackTargetResolved && currentGuidedTask.openLabel
    ? currentGuidedTask.openLabel
    : currentGuidedTask.label;

  useEffect(() => {
    if (!isDesktop) return;
    const shouldPinControlsMenu =
      isOpen &&
      !showFinalScreen &&
      currentGuidedStep.id === "search_tools" &&
      controlsMenuPinnedTaskIds.has(currentGuidedTask.id);

    window.dispatchEvent(
      new CustomEvent("zaki:onboarding-controls-menu-state", {
        detail: {
          locked: shouldPinControlsMenu,
          forceOpen: shouldPinControlsMenu,
        },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("zaki:onboarding-controls-menu-state", {
          detail: {
            locked: false,
            forceOpen: false,
          },
        })
      );
    };
  }, [isDesktop, isOpen, showFinalScreen, currentGuidedStep.id, currentGuidedTask.id]);

  const coachmarkVisible = Boolean(isOpen && isDesktop && !showFinalScreen && spotlightRects.length > 0);
  const coachmarkText =
    isFallbackTargetResolved && currentGuidedTask.openShort
      ? currentGuidedTask.openShort
      : currentGuidedTask.short;

  const popupStyle = useMemo(() => {
    const primaryRect = spotlightRects[0];
    if (!primaryRect || typeof window === "undefined") return null;
    const padding = 12;
    const gap = 12;
    const estimatedHeight =
      currentGuidedTask.id === "space_scope_overview"
        ? 188
        : currentGuidedTask.id === "chat_tools_overview"
          ? 176
          : showCoachmarkNextButton
            ? 164
            : 124;
    const width = Math.min(300, window.innerWidth - 24);
    const minLeft = padding;
    const maxLeft = Math.max(padding, window.innerWidth - width - padding);
    const minTop = padding;
    const maxTop = Math.max(padding, window.innerHeight - estimatedHeight - padding);
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const clampLeft = (value: number) => clamp(value, minLeft, maxLeft);
    const clampTop = (value: number) => clamp(value, minTop, maxTop);
    const target = {
      left: primaryRect.left,
      top: primaryRect.top,
      right: primaryRect.left + primaryRect.width,
      bottom: primaryRect.top + primaryRect.height,
    };
    const targetMidX = target.left + primaryRect.width / 2;
    const targetMidY = target.top + primaryRect.height / 2;
    const placements = {
      right: { left: target.right + gap, top: targetMidY - estimatedHeight / 2 },
      left: { left: target.left - width - gap, top: targetMidY - estimatedHeight / 2 },
      below: { left: targetMidX - width / 2, top: target.bottom + gap },
      above: { left: targetMidX - width / 2, top: target.top - estimatedHeight - gap },
    } as const;
    const overlapsTarget = (left: number, top: number) => {
      const right = left + width;
      const bottom = top + estimatedHeight;
      return !(
        right <= target.left - 6 ||
        left >= target.right + 6 ||
        bottom <= target.top - 6 ||
        top >= target.bottom + 6
      );
    };
    const controlHeavyTask =
      currentGuidedTask.id === "memory_toggle_overview" ||
      controlsMenuPinnedTaskIds.has(currentGuidedTask.id);
    const prefersSidePlacement =
      currentGuidedTask.id === "space_scope_overview" ||
      currentGuidedTask.id === "space_created";
    const order = controlHeavyTask
      ? (["right", "left", "above", "below"] as const)
      : prefersSidePlacement
        ? (["right", "left", "below", "above"] as const)
      : (["below", "above", "right", "left"] as const);
    for (const pos of order) {
      const candidate = placements[pos];
      const left = clampLeft(candidate.left);
      const top = clampTop(candidate.top);
      if (!overlapsTarget(left, top)) {
        return { top, left, width };
      }
    }
    return { top: clampTop(placements.above.top), left: clampLeft(placements.above.left), width };
  }, [spotlightRects, showCoachmarkNextButton, currentGuidedTask.id, controlsMenuPinnedTaskIds]);

  const goToNextGuidedTask = () => {
    if (currentGuidedTask.required !== false) {
      const currentKey = keyFor(currentGuidedStep.id, currentGuidedTask.id);
      if (!taskStatusRef.current[currentKey]) {
        const nextStatus = { ...taskStatusRef.current, [currentKey]: true };
        taskStatusRef.current = nextStatus;
        setTaskStatus(nextStatus);
      }
    }

    if (currentGuidedTaskIndex < currentGuidedStep.tasks.length - 1) {
      let nextIndex = currentGuidedTaskIndex + 1;
      while (nextIndex < currentGuidedStep.tasks.length) {
        const nextTask = currentGuidedStep.tasks[nextIndex]!;
        if (nextTask.required === false) {
          const nextTarget = findTargets(nextTask, { focusSpaceId });
          if (!nextTarget?.length) {
            nextIndex += 1;
            continue;
          }
        }
        break;
      }
      if (nextIndex < currentGuidedStep.tasks.length) {
        setTaskIndex(currentGuidedStep.id, nextIndex);
        return;
      }
    }

    if (
      guidedStepIndex < guidedSteps.length - 1 &&
      stepRequiredDone(currentGuidedStep)
    ) {
      setGuidedStepIndex((prev) => prev + 1);
      return;
    }

    if (
      guidedStepIndex >= guidedSteps.length - 1 &&
      stepRequiredDone(currentGuidedStep)
    ) {
      setShowFinalScreen(true);
    }
  };

  const goToPrevGuidedTask = () => {
    if (currentGuidedTaskIndex > 0) {
      setTaskIndex(currentGuidedStep.id, currentGuidedTaskIndex - 1);
      return;
    }
    if (guidedStepIndex > 0) {
      const prevStep = guidedSteps[guidedStepIndex - 1]!;
      setGuidedStepIndex((prev) => prev - 1);
      setTaskIndex(prevStep.id, Math.max(0, prevStep.tasks.length - 1));
    }
  };

  if (!isOpen) return null;

  if (!isDesktop) {
    const Icon = currentMobileStep.icon;
    const isLastMobileStep = mobileStepIndex >= mobileSteps.length - 1;
    const titleId = "onboarding-modal-title";

    return (
      <ModalShell
        isOpen={isOpen}
        onClose={onDismiss}
        ariaLabelledBy={titleId}
        className="pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-zaki-2xl border border-zaki-strong bg-zaki-raised shadow-zaki-xl font-body dark:bg-[#141210] dark:border-[rgba(240,236,230,0.12)]"
        containerClassName="z-[70] items-end justify-end p-4 sm:p-6 pointer-events-none"
        backdropClassName="bg-transparent pointer-events-none"
        closeOnBackdrop={false}
        lockBodyScroll={false}
      >
        <div className="relative">
          <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-zaki-brand opacity-10 dark:opacity-20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-zaki-accent opacity-10 dark:opacity-20 blur-3xl" />
          <div className="relative border-b border-zaki dark:border-[rgba(240,236,230,0.08)] px-6 py-5">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-zaki-hover text-xs text-zaki-muted px-2.5 py-1 font-medium tracking-wide uppercase">
                <Sparkles className="size-3.5 text-zaki-brand" />
                {t("onboarding.eyebrow")}
              </span>
              <button
                type="button"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
                onClick={onDismiss}
                aria-label={t("onboarding.skip")}
              >
                <X className="size-4" />
              </button>
            </div>
            <h2 id={titleId} className="mt-3 font-display text-2xl font-bold tracking-tight text-zaki-primary">
              {t("onboarding.title", { userName })}
            </h2>
            <p className="mt-1 text-sm leading-[1.6] text-zaki-secondary">
              {t("onboarding.subtitle")}
            </p>
            <p className="mt-2 text-xs text-zaki-muted">
              {t("onboarding.softHint")}
            </p>
          </div>

          <div className="relative px-6 py-6">
            <div className="mb-5 flex gap-2">
              {mobileSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    index <= mobileStepIndex
                      ? "bg-zaki-brand"
                      : "bg-zaki-hover"
                  )}
                />
              ))}
            </div>

            <div className="rounded-zaki-md bg-zaki-hover border border-zaki p-3 flex items-start gap-3 dark:border-[rgba(240,236,230,0.08)]">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand">
                <Icon className="size-4" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold tracking-tight text-zaki-primary">
                  {currentMobileStep.title}
                </h3>
                <p className="mt-1 text-sm leading-[1.6] text-zaki-secondary">
                  {currentMobileStep.body}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover rounded-full px-4 py-2 text-sm font-medium transition-colors"
                onClick={onDismiss}
              >
                {t("onboarding.skip")}
              </button>
              <div className="flex items-center gap-2">
                {mobileStepIndex > 0 && (
                  <button
                    type="button"
                    className="text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover rounded-full px-4 py-2 text-sm font-medium transition-colors"
                    onClick={() => setMobileStepIndex((value) => value - 1)}
                  >
                    {t("onboarding.back")}
                  </button>
                )}
                <button
                  type="button"
                  className="inline-flex items-center bg-zaki-brand text-white rounded-full px-5 py-2 text-sm font-semibold shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover"
                  onClick={() => {
                    currentMobileStep.onAction();
                    if (isLastMobileStep) {
                      onComplete();
                      return;
                    }
                    setMobileStepIndex((value) => value + 1);
                  }}
                >
                  {isLastMobileStep ? t("onboarding.finish") : currentMobileStep.actionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalShell>
    );
  }

  if (showFinalScreen) {
    return (
      <div
        className={cn(
          "fixed bottom-4 z-[90] w-[min(292px,calc(100vw-1.5rem))] overflow-hidden rounded-zaki-xl border border-zaki-strong bg-zaki-raised shadow-zaki-xl backdrop-blur font-body dark:bg-[#141210] dark:border-[rgba(240,236,230,0.12)]",
          isRtl ? "left-4" : "right-4"
        )}
      >
        <div className="pointer-events-none absolute -top-10 right-4 size-24 rounded-full bg-zaki-brand/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-3 size-16 rounded-full bg-zaki-accent/10 blur-2xl" />
        <div className="relative border-b border-zaki px-3.5 py-3 dark:border-[rgba(240,236,230,0.08)]">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zaki-hover px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted">
            <Sparkles className="size-3 text-zaki-brand" />
            {t("onboarding.guided.completeBadge")}
          </div>
          <div className="mt-2 font-display text-sm font-bold tracking-tight text-zaki-primary">
            {t("onboarding.guided.completeTitle", { userName })}
          </div>
          <p className="mt-1.5 text-xs leading-[1.6] text-zaki-secondary">
            {t("onboarding.guided.completeBody")}
          </p>
          <ul
            className="mt-2.5 flex flex-col gap-1 text-[11px] leading-snug text-zaki-secondary"
            data-testid="onboarding-continuity-summary"
          >
            {[
              { key: "spaces_threads:space_created", label: isRtl ? "تم إنشاء مساحة" : "Space created" },
              { key: "spaces_threads:thread_created", label: isRtl ? "تم فتح محادثة" : "Thread ready" },
              { key: "memory:memory_opened", label: isRtl ? "الذاكرة مفتوحة" : "Memory connected" },
            ].map((item) => {
              const done = Boolean(taskStatus[item.key]);
              return (
                <li
                  key={item.key}
                  data-testid={`onboarding-continuity-${item.key.replace(":", "-")}`}
                  data-complete={done ? "true" : "false"}
                  className={cn(
                    "flex items-center gap-1.5",
                    done ? "text-zaki-primary" : "text-zaki-muted"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block size-1.5 rounded-full",
                      done ? "bg-emerald-500" : "bg-zaki-muted/40"
                    )}
                  />
                  {item.label}
                </li>
              );
            })}
          </ul>
          <div className="mt-2 inline-flex items-center rounded-full bg-zaki-hover px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zaki-muted">
            {t("onboarding.guided.optionalCloseout")}
          </div>
        </div>
        <div className="relative flex items-center justify-end gap-2 px-3.5 py-3">
          <button type="button" className="text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover rounded-full px-3 py-1.5 text-xs font-medium transition-colors" onClick={onDismiss}>
            {t("onboarding.guided.close")}
          </button>
          <button type="button" className="inline-flex items-center bg-zaki-brand text-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover" onClick={startChatting}>
            {t("onboarding.guided.startChatting")}
          </button>
        </div>
      </div>
    );
  }

  const GuidedIcon = currentGuidedStep.icon;

  return (
    <>
      {coachmarkVisible && spotlightRects.length > 0 && popupStyle && (
        <>
          <svg className="fixed inset-0 z-[80] pointer-events-none" aria-hidden="true" preserveAspectRatio="none">
            <defs>
              <mask id={spotlightMaskId}>
                <rect width="100%" height="100%" fill="white" />
                {spotlightRects.map((rect, index) => (
                  <rect
                    key={`${spotlightMaskId}-mask-${index}`}
                    x={rect.left}
                    y={rect.top}
                    width={rect.width}
                    height={rect.height}
                    rx="14"
                    ry="14"
                    fill="black"
                  />
                ))}
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(30,23,18,0.14)" mask={`url(#${spotlightMaskId})`} />
          </svg>
          {spotlightRects.map((rect, index) => (
            <div
              key={`${rect.left}-${rect.top}-${index}`}
              className="fixed z-[81] pointer-events-none rounded-xl border-[3px] border-zaki-brand shadow-[0_0_0_2px_rgba(255,252,247,0.96),0_0_20px_rgba(241,2,2,0.34),0_0_0_9999px_rgba(24,18,14,0.30)]"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
              aria-hidden="true"
            />
          ))}
          <div
            className="fixed z-[82] pointer-events-auto rounded-zaki-xl border border-zaki-strong bg-zaki-raised px-3.5 py-3 shadow-zaki-xl font-body dark:bg-[#141210] dark:border-[rgba(240,236,230,0.12)]"
            style={popupStyle}
            role="dialog"
            aria-label={t("onboarding.guided.hintAria")}
          >
            <div className="text-2xs font-semibold uppercase tracking-[0.14em] text-zaki-muted">
              {coachmarkLabel}
            </div>
            <div className="mt-1.5 text-xs leading-[1.6] text-zaki-primary">
              {coachmarkText}
            </div>
            {showCoachmarkNextButton ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center bg-zaki-brand text-white rounded-full px-4 py-1.5 text-xs font-semibold shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover disabled:opacity-60 disabled:translate-y-0"
                  onClick={goToNextGuidedTask}
                  disabled={!atLastTask ? !canAdvanceCurrent : !canAdvanceAtLastTask}
                >
                  {guidedStepIndex === guidedSteps.length - 1 && atLastTask
                    ? t("onboarding.guided.completeAction")
                    : t("onboarding.guided.next")}
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}

      <div
        className={cn(
          "fixed bottom-4 z-[90] w-[min(286px,calc(100vw-1.5rem))] overflow-hidden rounded-zaki-xl border border-zaki-strong bg-zaki-raised shadow-zaki-xl backdrop-blur font-body dark:bg-[#141210] dark:border-[rgba(240,236,230,0.12)]",
          isRtl ? "left-4" : "right-4"
        )}
      >
        <div className="border-b border-zaki px-3.5 py-3 dark:border-[rgba(240,236,230,0.08)]">
          <div className="flex items-start justify-between gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-zaki-hover px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted">
              <GuidedIcon className="size-3 text-zaki-brand" />
              {currentGuidedStep.title}
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex size-7 items-center justify-center rounded-full text-zaki-muted hover:bg-zaki-hover hover:text-zaki-primary transition-colors"
              aria-label={t("onboarding.guided.hideTutorial")}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="mt-2.5">
            <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-zaki-muted">
              <span>{t("onboarding.guided.stepSummary", { current: currentStepNumber, total: guidedSteps.length })}</span>
              <span>{t("onboarding.guided.progressComplete", { progress })}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zaki-hover">
              <div className="h-full bg-zaki-brand transition-[width] duration-300" style={{ width: `${Math.max(6, progress)}%` }} />
            </div>
          </div>
        </div>
        {coachmarkVisible ? (
          <div className="px-3.5 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zaki-muted">
              {t("onboarding.guided.taskSummary", {
                current: currentTaskNumber,
                total: currentGuidedStep.tasks.length,
              })}
            </div>
          </div>
        ) : (
          <div className="px-3.5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted">
              {coachmarkLabel}
            </div>
            <div className="mt-1.5 text-xs leading-[1.6] text-zaki-primary">
              {coachmarkText}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-zaki px-3.5 py-3 dark:border-[rgba(240,236,230,0.08)]">
          <button
            type="button"
            className="min-w-[76px] text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            onClick={goToPrevGuidedTask}
            disabled={guidedStepIndex === 0 && currentGuidedTaskIndex === 0}
          >
            {t("onboarding.guided.back")}
          </button>
          {coachmarkVisible && (showCoachmarkNextButton || isActionRequiredState) ? (
            <div className="min-w-[76px] text-right text-[10px] font-medium uppercase tracking-[0.14em] text-zaki-muted">
              {t("onboarding.guided.followHint")}
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center min-w-[76px] bg-zaki-brand text-white rounded-full px-3 py-1.5 text-xs font-semibold shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover disabled:opacity-60 disabled:translate-y-0 disabled:cursor-not-allowed"
              onClick={goToNextGuidedTask}
              disabled={!atLastTask ? !canAdvanceCurrent : !canAdvanceAtLastTask}
            >
              {guidedStepIndex === guidedSteps.length - 1 && atLastTask
                ? t("onboarding.guided.completeAction")
                : t("onboarding.guided.next")}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

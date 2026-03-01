import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Brain,
  CheckCircle2,
  FolderPlus,
  Settings,
  X,
} from "lucide-react";

type Task = {
  id: string;
  label: string;
  short: string;
  targetId?: string;
  fallbackTargetId?: string;
  required?: boolean;
  completeWhenTargetVisible?: boolean;
};

type TutorialStep = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  tasks: Task[];
};

type TaskStatus = Record<string, boolean>;
type SpotlightRect = { top: number; left: number; width: number; height: number };

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

function findTarget(task: Task, context?: { focusSpaceId?: string | null }) {
  if (typeof document === "undefined") return null;
  if (task.id === "thread_created" && context?.focusSpaceId) {
    const scoped = document.querySelector(
      `[data-onboarding-id="sidebar-space-new-thread"][data-onboarding-space-id="${context.focusSpaceId}"]`
    ) as HTMLElement | null;
    if (scoped) {
      return { el: scoped, id: "sidebar-space-new-thread" };
    }
  }
  const ids = [task.targetId, task.fallbackTargetId].filter(Boolean) as string[];
  for (const id of ids) {
    const el = document.querySelector(`[data-onboarding-id="${id}"]`) as HTMLElement | null;
    if (el) {
      return { el, id };
    }
  }
  return null;
}

export function OnboardingModal({
  isOpen,
  userName,
  onDismiss,
  onComplete,
  onCreateSpace: _onCreateSpace,
  onOpenMemory: _onOpenMemory,
  onOpenSettings: _onOpenSettings,
}: OnboardingModalProps) {
  const steps = useMemo<TutorialStep[]>(
    () => [
      {
        id: "spaces_threads",
        title: "Spaces + threads",
        icon: FolderPlus,
        tasks: [
          {
            id: "space_created",
            label: "Naming your space",
            short: "Give your space a name and description and click Create space.",
            targetId: "create-space-submit",
            fallbackTargetId: "sidebar-create-space",
          },
          {
            id: "thread_created",
            label: "Create a thread (new chat)",
            short: "Inside your space, click New chat. Each thread is a separate chat.",
            targetId: "sidebar-space-new-thread",
            fallbackTargetId: "sidebar-create-space",
          },
        ],
      },
      {
        id: "memory_layer",
        title: "Memory layer",
        icon: Brain,
        tasks: [
          {
            id: "web_search_opened",
            label: "web search",
            short: "click this button to invoke a web search in your chat",
            targetId: "chat-web-search-button",
          },
          {
            id: "chat_controls_opened",
            label: "open chat controls",
            short: "click the + button to view chat controls",
            targetId: "chat-controls-button",
          },
          {
            id: "query_mode_explained",
            label: "invoke query mode",
            short: "use this to limit answers to the context of your chats only",
            targetId: "chat-control-query-mode",
            fallbackTargetId: "chat-controls-button",
          },
          {
            id: "upload_files_explained",
            label: "upload images and files",
            short: "use this to upload any images or files to your threads",
            targetId: "chat-control-upload-file",
            fallbackTargetId: "chat-controls-button",
          },
          {
            id: "study_learn_explained",
            label: "invoke study and learn mode",
            short: "use this for interacting with your uploaded documents in a way that prioritizes understanding and deep exploration",
            targetId: "chat-control-study-learn",
            fallbackTargetId: "chat-controls-button",
          },
          {
            id: "generate_image_explained",
            label: "generate image",
            short: "use this to generate images in your threads",
            targetId: "chat-control-generate-image",
            fallbackTargetId: "chat-controls-button",
          },
          {
            id: "agent_mode_explained",
            label: "invoke agent mode",
            short: "use this to transform your chat into an active, autonomous assistant that can use tools to perform tasks",
            targetId: "chat-control-agent-mode",
            fallbackTargetId: "chat-controls-button",
          },
          {
            id: "memory_toggle_overview",
            label: "Memory Toggle",
            short:
              "use this to switch between manual memory (choose what your AI remembers about you) and automatic memory (your AI automatically remembers and saves your preferences)",
            targetId: "chat-memory-mode-toggle",
          },
          {
            id: "memory_profile_opened",
            label: "Open the profile menu",
            short: "Click your profile card in the bottom-left corner.",
            targetId: "profile-menu-trigger",
          },
          {
            id: "memory_opened",
            label: "Open Memory",
            short: "Use the profile menu (bottom-left), then click Memory.",
            targetId: "profile-menu-memory",
            fallbackTargetId: "profile-menu-trigger",
          },
          {
            id: "memory_panel_overview",
            label: "Your Memory",
            short:
              "use this control panel to manage and view your memories, and to resolve conflicts and inconsistencies",
            targetId: "memory-viewer-dialog",
          },
          {
            id: "memory_deleted",
            label: "Delete a memory (optional)",
            short: "In Memory, use the trash button on a saved memory.",
            targetId: "memory-delete-button",
            fallbackTargetId: "profile-menu-memory",
            required: false,
          },
        ],
      },
      {
        id: "settings_help",
        title: "Settings + help",
        icon: Settings,
        tasks: [
          {
            id: "how_to_use_refresher",
            label: "need a refresher?",
            short: "You can reopen this tutorial anytime from the profile menu using How to use.",
            targetId: "profile-menu-how-to-use",
            fallbackTargetId: "profile-menu-trigger",
          },
        ],
      },
    ],
    []
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [taskIndexByStep, setTaskIndexByStep] = useState<Record<string, number>>({});
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({});
  const [showFinalScreen, setShowFinalScreen] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [resolvedTargetId, setResolvedTargetId] = useState<string | null>(null);
  const [focusSpaceId, setFocusSpaceId] = useState<string | null>(null);

  const currentStep = steps[stepIndex] ?? steps[0]!;
  const currentTaskIndex = Math.min(
    taskIndexByStep[currentStep.id] ?? 0,
    Math.max(0, currentStep.tasks.length - 1)
  );
  const currentTask = currentStep.tasks[currentTaskIndex]!;

  const currentStepRef = useRef(currentStep);
  const currentTaskRef = useRef(currentTask);
  const currentTaskIndexRef = useRef(currentTaskIndex);
  const taskStatusRef = useRef(taskStatus);
  const autoAdvancedForRef = useRef<string | null>(null);

  useEffect(() => {
    currentStepRef.current = currentStep;
    currentTaskRef.current = currentTask;
    currentTaskIndexRef.current = currentTaskIndex;
  }, [currentStep, currentTask, currentTaskIndex]);

  useEffect(() => {
    taskStatusRef.current = taskStatus;
  }, [taskStatus]);

  const setTaskIndex = (stepId: string, nextIndex: number) => {
    setTaskIndexByStep((prev) => ({ ...prev, [stepId]: nextIndex }));
  };

  const isTaskDone = (stepId: string, taskId: string) =>
    Boolean(taskStatus[keyFor(stepId, taskId)]);

  const stepRequiredDone = (step: TutorialStep) =>
    step.tasks
      .filter((task) => task.required !== false)
      .every((task) => isTaskDone(step.id, task.id));

  const goToNextTask = () => {
    const allowAdvanceFromCurrentStepWithoutFullCompletion =
      (currentStep.id === "memory_layer" && currentTask.id === "memory_panel_overview") ||
      (currentStep.id === "settings_help" && currentTask.id === "how_to_use_refresher");
    if (currentTask.id === "memory_panel_overview") {
      window.dispatchEvent(new Event("zaki:close-memory"));
    }
    if (currentTask.required !== false) {
      const currentKey = keyFor(currentStep.id, currentTask.id);
      if (!taskStatusRef.current[currentKey]) {
        taskStatusRef.current[currentKey] = true;
        setTaskStatus((prev) => ({ ...prev, [currentKey]: true }));
      }
    }
    if (currentTaskIndex < currentStep.tasks.length - 1) {
      let nextIndex = currentTaskIndex + 1;
      while (nextIndex < currentStep.tasks.length) {
        const nextTask = currentStep.tasks[nextIndex]!;
        if (nextTask.required === false) {
          const nextTarget = findTarget(nextTask, { focusSpaceId });
          if (!nextTarget) {
            nextIndex += 1;
            continue;
          }
        }
        break;
      }
      if (nextIndex < currentStep.tasks.length) {
        setTaskIndex(currentStep.id, nextIndex);
        return;
      }
    }
    if (
      stepIndex < steps.length - 1 &&
      (stepRequiredDone(currentStep) || allowAdvanceFromCurrentStepWithoutFullCompletion)
    ) {
      setStepIndex((prev) => prev + 1);
      return;
    }
    if (
      stepIndex >= steps.length - 1 &&
      (stepRequiredDone(currentStep) || allowAdvanceFromCurrentStepWithoutFullCompletion)
    ) {
      onComplete();
    }
  };

  const goToPrevTask = () => {
    if (currentTaskIndex > 0) {
      setTaskIndex(currentStep.id, currentTaskIndex - 1);
      return;
    }
    if (stepIndex > 0) {
      const prevStep = steps[stepIndex - 1]!;
      setStepIndex((prev) => prev - 1);
      setTaskIndex(prevStep.id, Math.max(0, prevStep.tasks.length - 1));
    }
  };

  const markDone = (stepId: string, taskId: string) => {
    const key = keyFor(stepId, taskId);
    const alreadyDone = Boolean(taskStatusRef.current[key]);
    if (alreadyDone) return;

    setTaskStatus((prev) => ({ ...prev, [key]: true }));

    const activeStep = currentStepRef.current;
    const activeTask = currentTaskRef.current;
    const activeTaskIndex = currentTaskIndexRef.current;
    if (activeStep.id === stepId && activeTask.id === taskId) {
      if (activeTaskIndex < activeStep.tasks.length - 1) {
        setTaskIndex(activeStep.id, activeTaskIndex + 1);
      } else {
        const activeStepRequiredCount = activeStep.tasks.filter((task) => task.required !== false).length;
        const activeStepDoneCount =
          activeStep.tasks.filter((task) => task.required !== false).filter((task) => {
            if (task.id === taskId) return true;
            return Boolean(taskStatusRef.current[keyFor(activeStep.id, task.id)]);
          }).length;
        if (activeStepDoneCount >= activeStepRequiredCount) {
          const stepPos = steps.findIndex((step) => step.id === activeStep.id);
          if (stepPos >= 0 && stepPos < steps.length - 1) {
            setStepIndex(stepPos + 1);
          } else if (stepPos === steps.length - 1) {
            onComplete();
          }
        }
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    // Restart from scratch every time the user opens "How to use".
    setStepIndex(0);
    setTaskIndexByStep({});
    setTaskStatus({});
    setShowFinalScreen(false);
    setSpotlightRect(null);
    setResolvedTargetId(null);
    setFocusSpaceId(null);
    autoAdvancedForRef.current = null;
  }, [isOpen]);

  useEffect(() => {
    const onSpaceCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id) setFocusSpaceId(detail.id);
      markDone("spaces_threads", "space_created");
    };
    const onThreadCreated = (event: Event) => {
      const detail = (event as CustomEvent<{ spaceId?: string }>).detail;
      if (detail?.spaceId) setFocusSpaceId(detail.spaceId);
      markDone("spaces_threads", "thread_created");
    };
    const onProfileMenuOpened = () => {
      markDone("memory_layer", "memory_profile_opened");
      markDone("settings_help", "settings_profile_opened");
      markDone("settings_help", "settings_profile_reopened");
    };
    const onMemoryOpened = () => markDone("memory_layer", "memory_opened");
    const onMemoryModeChanged = () => markDone("memory_layer", "memory_mode_changed");
    const onMemoryDeleted = () => markDone("memory_layer", "memory_deleted");
    const onWebSearchClicked = () => markDone("memory_layer", "web_search_opened");
    const onChatControlsOpened = () => markDone("memory_layer", "chat_controls_opened");

    window.addEventListener("zaki:onboarding-space-created", onSpaceCreated);
    window.addEventListener("zaki:thread-created", onThreadCreated);
    window.addEventListener("zaki:onboarding-thread-created", onThreadCreated);
    window.addEventListener("zaki:onboarding-profile-menu-opened", onProfileMenuOpened);
    window.addEventListener("zaki:onboarding-memory-opened", onMemoryOpened);
    window.addEventListener("zaki:onboarding-memory-mode-changed", onMemoryModeChanged);
    window.addEventListener("zaki:onboarding-memory-deleted", onMemoryDeleted);
    window.addEventListener("zaki:onboarding-web-search-clicked", onWebSearchClicked);
    window.addEventListener("zaki:onboarding-chat-controls-opened", onChatControlsOpened);

    return () => {
      window.removeEventListener("zaki:onboarding-space-created", onSpaceCreated);
      window.removeEventListener("zaki:thread-created", onThreadCreated);
      window.removeEventListener("zaki:onboarding-thread-created", onThreadCreated);
      window.removeEventListener("zaki:onboarding-profile-menu-opened", onProfileMenuOpened);
      window.removeEventListener("zaki:onboarding-memory-opened", onMemoryOpened);
      window.removeEventListener("zaki:onboarding-memory-mode-changed", onMemoryModeChanged);
      window.removeEventListener("zaki:onboarding-memory-deleted", onMemoryDeleted);
      window.removeEventListener("zaki:onboarding-web-search-clicked", onWebSearchClicked);
      window.removeEventListener("zaki:onboarding-chat-controls-opened", onChatControlsOpened);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || showFinalScreen) return;
    const currentKey = keyFor(currentStep.id, currentTask.id);
    if (autoAdvancedForRef.current === currentKey) return;
    if (!isTaskDone(currentStep.id, currentTask.id)) return;
    autoAdvancedForRef.current = currentKey;

    if (currentTaskIndex < currentStep.tasks.length - 1) {
      setTaskIndex(currentStep.id, currentTaskIndex + 1);
      return;
    }
    if (stepRequiredDone(currentStep)) {
      if (stepIndex < steps.length - 1) {
        setStepIndex(stepIndex + 1);
      } else {
        onComplete();
      }
    }
  }, [isOpen, showFinalScreen, currentStep, currentTask, currentTaskIndex, stepIndex, taskStatus, steps]);

  useEffect(() => {
    if (!isOpen || showFinalScreen) return;
    if (!currentTask.completeWhenTargetVisible) return;
    const result = findTarget(currentTask, { focusSpaceId });
    if (!result) return;
    markDone(currentStep.id, currentTask.id);
  }, [isOpen, showFinalScreen, currentTask, currentStep.id, focusSpaceId]);

  useEffect(() => {
    if (!isOpen || showFinalScreen) {
      setSpotlightRect(null);
      setResolvedTargetId(null);
      return;
    }

    const updateRect = () => {
      const result = findTarget(currentTask, { focusSpaceId });
      if (!result) {
        setSpotlightRect(null);
        setResolvedTargetId(null);
        return;
      }
      const rect = result.el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        setSpotlightRect(null);
        setResolvedTargetId(null);
        return;
      }
      setResolvedTargetId(result.id);
      setSpotlightRect({
        top: Math.max(8, rect.top - 6),
        left: Math.max(8, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
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
  }, [isOpen, showFinalScreen, currentTask, focusSpaceId]);

  const requiredDoneTotal = steps.reduce(
    (sum, step) =>
      sum + step.tasks.filter((task) => task.required !== false && isTaskDone(step.id, task.id)).length,
    0
  );
  const requiredTotal = steps.reduce(
    (sum, step) => sum + step.tasks.filter((task) => task.required !== false).length,
    0
  );
  const progressRaw = requiredTotal ? Math.round((requiredDoneTotal / requiredTotal) * 100) : 0;

  const currentStepRequiredDone = stepRequiredDone(currentStep);
  const atLastTask = currentTaskIndex >= currentStep.tasks.length - 1;
  const isCurrentTaskDone = isTaskDone(currentStep.id, currentTask.id);
  const inlineCoachmarkTaskIds = new Set([
    "web_search_opened",
    "query_mode_explained",
    "upload_files_explained",
    "study_learn_explained",
    "generate_image_explained",
    "agent_mode_explained",
    "memory_toggle_overview",
    "memory_panel_overview",
    "how_to_use_refresher",
  ]);
  const manualAdvanceTaskIds = new Set([
    ...inlineCoachmarkTaskIds,
    "memory_toggle_overview",
    "memory_panel_overview",
    "how_to_use_refresher",
  ]);
  const controlsMenuPinnedTaskIds = new Set([
    "query_mode_explained",
    "upload_files_explained",
    "study_learn_explained",
    "generate_image_explained",
    "agent_mode_explained",
  ]);
  const isManualAdvanceTask = manualAdvanceTaskIds.has(currentTask.id);
  const canAdvanceCurrent = isManualAdvanceTask || currentTask.required === false || isCurrentTaskDone;
  const showCoachmarkNextButton =
    (currentStep.id === "memory_layer" || currentStep.id === "settings_help") &&
    inlineCoachmarkTaskIds.has(currentTask.id);
  const canAdvanceAtLastTask =
    currentStepRequiredDone ||
    (currentStep.id === "memory_layer" && currentTask.id === "memory_panel_overview") ||
    (currentStep.id === "settings_help" && currentTask.id === "how_to_use_refresher");
  const progress =
    stepIndex === steps.length - 1 && atLastTask && canAdvanceAtLastTask ? 100 : progressRaw;

  useEffect(() => {
    const shouldPinControlsMenu =
      isOpen &&
      !showFinalScreen &&
      currentStep.id === "memory_layer" &&
      controlsMenuPinnedTaskIds.has(currentTask.id);

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
  }, [isOpen, showFinalScreen, currentStep.id, currentTask.id]);

  const coachmarkVisible = Boolean(isOpen && !showFinalScreen && spotlightRect);
  const coachmarkText =
    currentTask.id === "space_created" && resolvedTargetId && resolvedTargetId !== currentTask.targetId
      ? "Open this first, spaces are used to organize chat threads."
      : currentTask.short;

  const popupStyle = useMemo(() => {
    if (!spotlightRect || typeof window === "undefined") return null;
    const padding = 12;
    const gap = 12;
    const estimatedHeight = showCoachmarkNextButton ? 152 : 118;
    const width = Math.min(300, window.innerWidth - 24);
    const minLeft = padding;
    const maxLeft = Math.max(padding, window.innerWidth - width - padding);
    const minTop = padding;
    const maxTop = Math.max(padding, window.innerHeight - estimatedHeight - padding);
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const clampLeft = (value: number) => clamp(value, minLeft, maxLeft);
    const clampTop = (value: number) => clamp(value, minTop, maxTop);
    const target = {
      left: spotlightRect.left,
      top: spotlightRect.top,
      right: spotlightRect.left + spotlightRect.width,
      bottom: spotlightRect.top + spotlightRect.height,
    };
    const targetMidX = target.left + spotlightRect.width / 2;
    const targetMidY = target.top + spotlightRect.height / 2;
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
      currentTask.id === "memory_toggle_overview" || controlsMenuPinnedTaskIds.has(currentTask.id);
    const order = controlHeavyTask
      ? (["right", "left", "above", "below"] as const)
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
  }, [spotlightRect, showCoachmarkNextButton, currentTask.id]);

  if (!isOpen) return null;

  if (showFinalScreen) {
    return (
      <div className="fixed bottom-4 right-4 z-[90] w-[min(340px,calc(100vw-1.5rem))] rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white/95 dark:bg-[#120e0b]/95 shadow-[0px_24px_64px_rgba(15,15,15,0.2)] backdrop-blur">
        <div className="px-4 py-4 border-b border-zaki-subtle dark:border-[#2e241b]">
          <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle dark:border-[#2e241b] px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#c9b8a4]">
            <CheckCircle2 className="size-3.5 text-zaki-success" />
            Complete
          </div>
          <div className="mt-2 text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">
            You’re ready, {userName}
          </div>
          <p className="mt-1 text-xs text-zaki-secondary dark:text-[#c9b8a4] leading-5">
            If you need a refresher, open the profile menu and use <strong>How to use</strong> to restart this onboarding anytime.
          </p>
        </div>
        <div className="px-4 py-3 flex items-center justify-end gap-2">
          <button type="button" className="zaki-btn-sm zaki-btn-ghost" onClick={onDismiss}>
            Close
          </button>
          <button type="button" className="zaki-btn-sm zaki-btn-primary" onClick={onComplete}>
            Finish tutorial
          </button>
        </div>
      </div>
    );
  }

  const preMemoryLayerTaskIds = new Set([
    "web_search_opened",
    "chat_controls_opened",
    "query_mode_explained",
    "upload_files_explained",
    "study_learn_explained",
    "generate_image_explained",
    "agent_mode_explained",
  ]);
  const showAsSpacesCategory =
    currentStep.id === "memory_layer" && preMemoryLayerTaskIds.has(currentTask.id);
  const categoryTitle = showAsSpacesCategory ? "Spaces + threads" : currentStep.title;
  const StepIcon = showAsSpacesCategory ? FolderPlus : currentStep.icon;

  return (
    <>
      {coachmarkVisible && spotlightRect && popupStyle && (
        <>
          <div className="fixed inset-0 z-[80] pointer-events-none bg-black/25 dark:bg-black/35" aria-hidden="true" />
          <div
            className="fixed z-[81] pointer-events-none rounded-xl border-[3px] border-[#ff8f2a] shadow-[0_0_0_2px_rgba(255,255,255,0.9),0_0_28px_rgba(255,143,42,0.85),0_0_0_9999px_rgba(14,10,7,0.55)] animate-pulse"
            style={{
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
            }}
            aria-hidden="true"
          />
          <div
            className="fixed z-[82] pointer-events-auto rounded-xl border border-[#f1c894] dark:border-[#7a5427] bg-white dark:bg-[#15110d] px-3 py-2 shadow-[0px_14px_32px_rgba(15,15,15,0.24)]"
            style={popupStyle}
            role="dialog"
            aria-label="Onboarding hint"
          >
            <div className="text-2xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-[#bca994]">
              {currentTask.label}
            </div>
            <div className="mt-1 text-xs text-zaki-primary dark:text-[#efe6d9] leading-5">
              {coachmarkText}
            </div>
            {showCoachmarkNextButton ? (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="zaki-btn-sm zaki-btn-primary disabled:opacity-60"
                  onClick={goToNextTask}
                  disabled={!atLastTask ? !canAdvanceCurrent : !canAdvanceAtLastTask}
                >
                  {stepIndex === steps.length - 1 && atLastTask ? "Complete" : "Next"}
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}

      <div className="fixed bottom-4 right-4 z-[90] w-[min(296px,calc(100vw-1.5rem))] rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white/95 dark:bg-[#120e0b]/95 backdrop-blur shadow-[0px_24px_64px_rgba(15,15,15,0.22)] overflow-hidden">
        <div className="px-4 py-3 border-b border-zaki-subtle dark:border-[#2e241b]">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle dark:border-[#2e241b] px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-[#c9b8a4]">
              <StepIcon className="size-3.5 text-zaki-brand" />
              {categoryTitle}
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex size-8 items-center justify-center rounded-lg text-zaki-muted hover:bg-zaki-hover dark:hover:bg-[#1d1611]"
              aria-label="Hide tutorial"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-2xs text-zaki-muted dark:text-[#c9b8a4] mb-1">
              <span>{progress}% complete</span>
              <span>{stepIndex + 1}/{steps.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-zaki-hover dark:bg-[#241a13] overflow-hidden">
              <div className="h-full bg-zaki-brand transition-[width] duration-300" style={{ width: `${Math.max(6, progress)}%` }} />
            </div>
          </div>
        </div>
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            className="zaki-btn-sm zaki-btn-ghost"
            onClick={goToPrevTask}
            disabled={stepIndex === 0 && currentTaskIndex === 0}
          >
            Back
          </button>
          <button
            type="button"
            className="zaki-btn-sm zaki-btn-primary disabled:opacity-60"
            onClick={goToNextTask}
            disabled={!atLastTask ? !canAdvanceCurrent : !canAdvanceAtLastTask}
          >
            {stepIndex === steps.length - 1 && atLastTask ? "Complete" : "Next"}
          </button>
        </div>
      </div>
    </>
  );
}

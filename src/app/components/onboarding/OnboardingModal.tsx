import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  Brain,
  CheckCircle2,
  Circle,
  FolderPlus,
  HelpCircle,
  Settings,
  Sparkles,
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
            label: "Create a custom space",
            short: "Click New space, fill the form, then create it.",
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
            id: "memory_mode_changed",
            label: "Change memory mode in chat",
            short: "Use the Memory mode control near the chat input (Auto or Manual).",
            targetId: "chat-memory-mode-toggle",
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
            id: "settings_profile_opened",
            label: "Open the profile menu",
            short: "Click your profile card in the bottom-left corner.",
            targetId: "profile-menu-trigger",
          },
          {
            id: "settings_opened",
            label: "Open Settings",
            short: "Use the profile menu (bottom-left), then click Settings.",
            targetId: "profile-menu-settings",
            fallbackTargetId: "profile-menu-trigger",
          },
          {
            id: "settings_profile_reopened",
            label: "Open the profile menu again",
            short: "Open it one more time so you can see where this walkthrough lives.",
            targetId: "profile-menu-trigger",
          },
          {
            id: "how_to_use_visible",
            label: "Find “How to use”",
            short: "This is where you can restart this onboarding anytime.",
            targetId: "profile-menu-how-to-use",
            fallbackTargetId: "profile-menu-trigger",
            completeWhenTargetVisible: true,
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
    if (currentTaskIndex < currentStep.tasks.length - 1) {
      setTaskIndex(currentStep.id, currentTaskIndex + 1);
      return;
    }
    if (stepIndex < steps.length - 1 && stepRequiredDone(currentStep)) {
      setStepIndex((prev) => prev + 1);
      return;
    }
    if (stepIndex >= steps.length - 1 && stepRequiredDone(currentStep)) {
      setShowFinalScreen(true);
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
            setShowFinalScreen(true);
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
    const onSettingsOpened = () => markDone("settings_help", "settings_opened");

    window.addEventListener("zaki:onboarding-space-created", onSpaceCreated);
    window.addEventListener("zaki:thread-created", onThreadCreated);
    window.addEventListener("zaki:onboarding-thread-created", onThreadCreated);
    window.addEventListener("zaki:onboarding-profile-menu-opened", onProfileMenuOpened);
    window.addEventListener("zaki:onboarding-memory-opened", onMemoryOpened);
    window.addEventListener("zaki:onboarding-memory-mode-changed", onMemoryModeChanged);
    window.addEventListener("zaki:onboarding-memory-deleted", onMemoryDeleted);
    window.addEventListener("zaki:onboarding-settings-opened", onSettingsOpened);

    return () => {
      window.removeEventListener("zaki:onboarding-space-created", onSpaceCreated);
      window.removeEventListener("zaki:thread-created", onThreadCreated);
      window.removeEventListener("zaki:onboarding-thread-created", onThreadCreated);
      window.removeEventListener("zaki:onboarding-profile-menu-opened", onProfileMenuOpened);
      window.removeEventListener("zaki:onboarding-memory-opened", onMemoryOpened);
      window.removeEventListener("zaki:onboarding-memory-mode-changed", onMemoryModeChanged);
      window.removeEventListener("zaki:onboarding-memory-deleted", onMemoryDeleted);
      window.removeEventListener("zaki:onboarding-settings-opened", onSettingsOpened);
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
        setShowFinalScreen(true);
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
  const progress = requiredTotal ? Math.round((requiredDoneTotal / requiredTotal) * 100) : 0;

  const currentStepRequiredDone = stepRequiredDone(currentStep);
  const atLastTask = currentTaskIndex >= currentStep.tasks.length - 1;
  const isCurrentTaskDone = isTaskDone(currentStep.id, currentTask.id);
  const canAdvanceCurrent = currentTask.required === false || isCurrentTaskDone;

  const coachmarkVisible = Boolean(isOpen && !showFinalScreen && spotlightRect);
  const coachmarkText =
    resolvedTargetId && resolvedTargetId !== currentTask.targetId
      ? "Open this first, then use the next highlighted control."
      : currentTask.short;

  const popupStyle = useMemo(() => {
    if (!spotlightRect || typeof window === "undefined") return null;
    const width = Math.min(300, window.innerWidth - 24);
    const preferBelow = spotlightRect.top < window.innerHeight * 0.55;
    let top = preferBelow
      ? spotlightRect.top + spotlightRect.height + 10
      : spotlightRect.top - 110;
    top = Math.max(12, Math.min(window.innerHeight - 120, top));
    let left = spotlightRect.left;
    left = Math.max(12, Math.min(window.innerWidth - width - 12, left));
    return { top, left, width };
  }, [spotlightRect]);

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

  const StepIcon = currentStep.icon;

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
              Try this
            </div>
            <div className="mt-1 text-xs text-zaki-primary dark:text-[#efe6d9] leading-5">
              {coachmarkText}
            </div>
          </div>
        </>
      )}

      <div className="fixed bottom-4 right-4 z-[90] w-[min(340px,calc(100vw-1.5rem))] rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-white/95 dark:bg-[#120e0b]/95 backdrop-blur shadow-[0px_24px_64px_rgba(15,15,15,0.22)] overflow-hidden">
        <div className="px-4 py-3 border-b border-zaki-subtle dark:border-[#2e241b]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle dark:border-[#2e241b] px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-[#c9b8a4]">
                <Sparkles className="size-3.5 text-zaki-brand" />
                How to use
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-zaki-primary dark:text-[#efe6d9]">
                <StepIcon className="size-4 text-zaki-brand" />
                {currentStep.title}
              </div>
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

        <div className="px-4 py-3 border-b border-zaki-subtle dark:border-[#2e241b]">
          <div className="grid gap-1">
            {steps.map((step, idx) => {
              const done = stepRequiredDone(step);
              const active = idx === stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    active ? "bg-zaki-hover dark:bg-[#1b1512]" : "hover:bg-zaki-hover/60 dark:hover:bg-[#1b1512]"
                  }`}
                  onClick={() => setStepIndex(idx)}
                >
                  {done ? (
                    <CheckCircle2 className="size-4 text-zaki-success shrink-0" />
                  ) : (
                    <Circle className="size-4 text-zaki-muted shrink-0" />
                  )}
                  <span className="text-xs text-zaki-primary dark:text-[#efe6d9]">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="text-2xs font-semibold uppercase tracking-[0.14em] text-zaki-muted dark:text-[#bca994]">
            Substep {currentTaskIndex + 1} / {currentStep.tasks.length}
          </div>
          <div className="mt-1 text-sm font-medium text-zaki-primary dark:text-[#efe6d9]">
            {currentTask.label}
            {currentTask.required === false ? (
              <span className="ml-1 text-[10px] uppercase tracking-[0.14em] text-zaki-muted">Optional</span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-zaki-secondary dark:text-[#c9b8a4] leading-5">
            {currentTask.short}
          </div>
          {!spotlightRect && (
            <div className="mt-2 text-2xs text-zaki-muted dark:text-[#bca994]">
              Tip: if the highlighted control is hidden, open the related menu/panel first.
            </div>
          )}

          <div className="mt-3 text-2xs text-zaki-muted dark:text-[#bca994]">
            Complete this action in the app to continue.
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              className="zaki-btn-sm zaki-btn-ghost"
              onClick={goToPrevTask}
              disabled={stepIndex === 0 && currentTaskIndex === 0}
            >
              Back
            </button>
            <div className="flex items-center gap-2">
              {currentTask.required === false && !isCurrentTaskDone && (
                <button
                  type="button"
                  className="zaki-btn-sm zaki-btn-ghost"
                  onClick={goToNextTask}
                >
                  Skip optional
                </button>
              )}
              <button
                type="button"
                className="zaki-btn-sm zaki-btn-primary disabled:opacity-60"
                onClick={goToNextTask}
                disabled={!atLastTask ? !canAdvanceCurrent : !currentStepRequiredDone}
              >
                {stepIndex === steps.length - 1 && atLastTask ? "Complete" : "Next"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-2xs text-zaki-muted dark:text-[#bca994]">
            <HelpCircle className="size-3.5" />
            You can reopen this anytime from the profile menu.
          </div>
        </div>
      </div>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Sparkles, FolderPlus, Brain, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModalShell } from "@/app/components/ui/ModalShell";

interface OnboardingModalProps {
  isOpen: boolean;
  userName: string;
  onClose: () => void;
  onCreateSpace: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
}

type Step = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  icon: ComponentType<{ className?: string }>;
};

export function OnboardingModal({
  isOpen,
  userName,
  onClose,
  onCreateSpace,
  onOpenMemory,
  onOpenSettings,
}: OnboardingModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = useMemo(
    () => [
      {
        id: "space",
        title: "Create your first space",
        body: "Spaces keep topics clean. Start with one workspace for your current project.",
        actionLabel: "Create a space",
        onAction: onCreateSpace,
        icon: FolderPlus,
      },
      {
        id: "memory",
        title: "Tune memory behavior",
        body: "Open Memory and review what ZAKI keeps. You stay in control of every memory.",
        actionLabel: "Open memory",
        onAction: onOpenMemory,
        icon: Brain,
      },
      {
        id: "settings",
        title: "Set your defaults",
        body: "Adjust language, theme, and profile to match how you work.",
        actionLabel: "Open settings",
        onAction: onOpenSettings,
        icon: Settings,
      },
    ],
    [onCreateSpace, onOpenMemory, onOpenSettings]
  );

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const current = steps[stepIndex]!;
  const Icon = current.icon;
  const isLastStep = stepIndex >= steps.length - 1;
  const titleId = "onboarding-modal-title";

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy={titleId}
      className="w-[680px] overflow-hidden rounded-[28px] border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#120e0b] shadow-[0px_36px_90px_rgba(15,15,15,0.22)] dark:shadow-[0px_44px_110px_rgba(0,0,0,0.62)]"
      containerClassName="z-[70]"
    >
      <div className="relative">
        <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-zaki-brand opacity-10 dark:opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-56 rounded-full bg-zaki-accent opacity-10 dark:opacity-20 blur-3xl" />
        <div className="relative border-b border-zaki-subtle dark:border-[#2e241b] bg-[linear-gradient(135deg,#fff7ee_0%,#f6ecdf_65%,#efe5d8_100%)] dark:bg-[linear-gradient(140deg,#21170f_0%,#18120d_58%,#120e0b_100%)] px-6 py-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/90 dark:bg-[#1a140f] border border-zaki-subtle dark:border-[#2e241b] px-3 py-1 text-2xs font-semibold uppercase tracking-[0.2em] text-zaki-muted dark:text-[#c9b8a4]">
            <Sparkles className="size-3.5 text-zaki-brand" />
            Welcome
          </div>
          <h2 id={titleId} className="mt-3 text-2xl font-semibold text-zaki-primary dark:text-[#efe6d9]">
            Let&apos;s set up your workspace, {userName}
          </h2>
          <p className="mt-1 text-sm text-zaki-secondary dark:text-[#c9b8a4]">
            3 quick steps to make ZAKI useful from day one.
          </p>
        </div>

        <div className="relative px-6 py-6">
          <div className="flex gap-2 mb-5">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  index <= stepIndex
                    ? "bg-zaki-brand dark:bg-[#e56a54]"
                    : "bg-zaki-sunken dark:bg-[#2b2119]"
                )}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-zaki-subtle dark:border-[#2e241b] bg-zaki-base dark:bg-[#16110d] px-4 py-4 shadow-[0px_10px_22px_rgba(15,15,15,0.04)] dark:shadow-[0px_14px_30px_rgba(0,0,0,0.3)]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl border border-zaki-subtle dark:border-[#2e241b] bg-white dark:bg-[#1d1611] p-2">
                <Icon className="size-5 text-zaki-brand" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zaki-primary dark:text-[#efe6d9]">{current.title}</h3>
                <p className="mt-1 text-sm text-zaki-secondary dark:text-[#c9b8a4]">{current.body}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="zaki-btn-sm zaki-btn-ghost"
              onClick={onClose}
            >
              Skip for now
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  className="zaki-btn-sm zaki-btn-secondary"
                  onClick={() => setStepIndex((value) => value - 1)}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                className="zaki-btn-sm zaki-btn-primary"
                onClick={() => {
                  current.onAction();
                  if (isLastStep) {
                    onClose();
                    return;
                  }
                  setStepIndex((value) => value + 1);
                }}
              >
                {isLastStep ? "Finish" : current.actionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

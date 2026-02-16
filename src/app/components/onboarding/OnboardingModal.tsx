import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { Sparkles, FolderPlus, Brain, Settings } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";

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
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
      <div className="absolute inset-0" onClick={onClose} role="button" aria-label="Close onboarding" />
      <div
        ref={modalRef}
        className="relative w-[680px] max-w-[calc(100%-2rem)] overflow-hidden rounded-[28px] border border-zaki-subtle bg-white shadow-[0px_36px_90px_rgba(15,15,15,0.22)]"
      >
        <div className="bg-[linear-gradient(135deg,#fff7ee_0%,#f6ecdf_65%,#efe5d8_100%)] px-6 py-5 border-b border-zaki-subtle">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-2xs font-semibold uppercase tracking-[0.2em] text-zaki-muted">
            <Sparkles className="size-3.5 text-zaki-brand" />
            Welcome
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-zaki-primary">
            Let&apos;s set up your workspace, {userName}
          </h2>
          <p className="mt-1 text-sm text-zaki-secondary">
            3 quick steps to make ZAKI useful from day one.
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="flex gap-2 mb-5">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  index <= stepIndex ? "bg-zaki-brand" : "bg-zaki-sunken"
                )}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-zaki-subtle bg-zaki-base px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl border border-zaki-subtle bg-white p-2">
                <Icon className="size-5 text-zaki-brand" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zaki-primary">{current.title}</h3>
                <p className="mt-1 text-sm text-zaki-secondary">{current.body}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-full px-3 py-2 text-xs text-zaki-muted hover:text-zaki-primary"
              onClick={onClose}
            >
              Skip for now
            </button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  className="rounded-full border border-zaki-subtle px-3 py-2 text-xs text-zaki-secondary hover:bg-zaki-hover"
                  onClick={() => setStepIndex((value) => value - 1)}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                className="rounded-full bg-zaki-brand px-4 py-2 text-xs text-white hover:bg-zaki-brand-hover"
                onClick={() => {
                  current.onAction();
                  if (stepIndex >= steps.length - 1) {
                    onClose();
                    return;
                  }
                  setStepIndex((value) => value + 1);
                }}
              >
                {stepIndex >= steps.length - 1 ? "Finish" : current.actionLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

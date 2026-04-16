import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Files, FolderTree, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ModalShell } from "@/app/components/ui/ModalShell";
import { cn } from "@/lib/utils";

type Props = {
  isOpen: boolean;
  userName: string;
  onDismiss: () => void;
  onComplete: () => void;
  onCreateSpace: () => void;
};

type Step = {
  id: "model" | "spaces";
  icon: typeof Sparkles;
  title: string;
  body: string;
  note: string;
};

export function SimpleOnboardingModal({
  isOpen,
  userName,
  onDismiss,
  onComplete,
  onCreateSpace,
}: Props) {
  const { t, i18n } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);
  const isRtl = i18n.language?.toLowerCase().startsWith("ar");

  const steps = useMemo<Step[]>(
    () => [
      {
        id: "model",
        icon: Sparkles,
        title: t("onboarding.simple.steps.model.title"),
        body: t("onboarding.simple.steps.model.body"),
        note: t("onboarding.simple.steps.model.note"),
      },
      {
        id: "spaces",
        icon: FolderTree,
        title: t("onboarding.simple.steps.spaces.title"),
        body: t("onboarding.simple.steps.spaces.body"),
        note: t("onboarding.simple.steps.spaces.note"),
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  const currentStep = steps[stepIndex] ?? steps[0]!;
  const isLastStep = stepIndex === steps.length - 1;
  const StepIcon = currentStep.icon;

  const handleClose = () => {
    setStepIndex(0);
    onDismiss();
  };

  const handleSkip = () => {
    setStepIndex(0);
    onComplete();
  };

  const handlePrimary = () => {
    if (!isLastStep) {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
      return;
    }
    setStepIndex(0);
    onComplete();
    onCreateSpace();
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel={t("onboarding.simple.title", { userName })}
      className="w-full max-w-[560px] overflow-hidden rounded-zaki-2xl border border-zaki-strong bg-zaki-raised shadow-zaki-xl font-body dark:bg-[#141210] dark:border-[rgba(240,236,230,0.12)]"
      containerClassName="items-start overflow-y-auto py-6 sm:items-center sm:py-4"
      backdropClassName="bg-[rgba(20,14,10,0.48)] backdrop-blur-[2px]"
    >
      <section dir={isRtl ? "rtl" : "ltr"} className="max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-zaki px-5 py-5 dark:border-[rgba(240,236,230,0.08)] sm:px-6">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full bg-zaki-hover text-xs text-zaki-muted px-2.5 py-1 font-medium tracking-wide uppercase">
              {t("onboarding.simple.eyebrow")}
            </span>
            <h2 className="mt-3 font-display text-[1.55rem] font-bold leading-tight tracking-tight text-zaki-primary">
              {t("onboarding.simple.title", { userName })}
            </h2>
            <p className="mt-2 max-w-[42ch] text-sm leading-[1.6] text-zaki-secondary">
              {t("onboarding.simple.subtitle")}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary"
            onClick={handleClose}
            aria-label={t("onboarding.simple.dismissAria")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand">
              <StepIcon className="size-5" />
            </span>
            <span className="inline-flex items-center rounded-full bg-zaki-hover text-xs text-zaki-muted px-2.5 py-1 font-medium tracking-wide uppercase">
              {t("onboarding.simple.progress", { current: stepIndex + 1, total: steps.length })}
            </span>
          </div>

          <div className="mt-5">
            <h3 className="font-display text-[1.28rem] font-bold leading-tight tracking-tight text-zaki-primary">
              {currentStep.title}
            </h3>
            <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-zaki-secondary">
              {currentStep.body}
            </p>
            <div className="mt-5 rounded-zaki-md bg-zaki-hover border border-zaki p-3 flex items-start gap-3 dark:border-[rgba(240,236,230,0.08)]">
              <div className={cn("flex items-start gap-3 w-full", isRtl && "flex-row-reverse")}>
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand">
                  <Files className="size-4" />
                </span>
                <p className={cn("text-sm leading-[1.6] text-zaki-secondary", isRtl ? "text-right" : "text-left")}>
                  {currentStep.note}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-zaki px-5 py-5 dark:border-[rgba(240,236,230,0.08)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                className="text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover rounded-full px-4 py-2 text-sm font-medium transition-colors"
                onClick={handleBack}
              >
                {t("onboarding.simple.back")}
              </button>
            ) : null}
            <button
              type="button"
              className="text-zaki-muted hover:text-zaki-primary hover:bg-zaki-hover rounded-full px-4 py-2 text-sm font-medium transition-colors"
              onClick={handleSkip}
            >
              {t("onboarding.simple.skip")}
            </button>
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 bg-zaki-brand text-white rounded-full px-5 py-2 text-sm font-semibold shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover w-full sm:w-auto"
            onClick={handlePrimary}
          >
            <span>
              {isLastStep
                ? t("onboarding.simple.createSpace")
                : t("onboarding.simple.next")}
            </span>
            {!isLastStep ? (
              <ArrowRight className={cn("size-4", isRtl && "rotate-180")} />
            ) : null}
          </button>
        </div>
      </section>
    </ModalShell>
  );
}

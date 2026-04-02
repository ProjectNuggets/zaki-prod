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
      className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-zaki-subtle bg-[linear-gradient(180deg,#fffdf9_0%,#f7f0e7_100%)] shadow-[0px_20px_60px_rgba(15,15,15,0.12)] dark:border-[#2d221a] dark:bg-[linear-gradient(180deg,#17120f_0%,#120e0b_100%)] dark:shadow-[0px_28px_60px_rgba(0,0,0,0.4)]"
      containerClassName="items-start overflow-y-auto py-6 sm:items-center sm:py-4"
      backdropClassName="bg-[rgba(20,14,10,0.48)] backdrop-blur-[2px]"
    >
      <section dir={isRtl ? "rtl" : "ltr"} className="max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-zaki-subtle/70 px-5 py-5 dark:border-[#2d221a] sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zaki-muted dark:text-zaki-dark-muted">
              {t("onboarding.simple.eyebrow")}
            </p>
            <h2 className="mt-2 text-[1.55rem] font-semibold leading-tight text-zaki-primary dark:text-zaki-dark-primary">
              {t("onboarding.simple.title", { userName })}
            </h2>
            <p className="mt-2 max-w-[42ch] text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
              {t("onboarding.simple.subtitle")}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl border border-zaki-subtle bg-white/75 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary dark:border-[#2d221a] dark:bg-[#17110d]/80 dark:text-zaki-dark-muted dark:hover:bg-[#211812] dark:hover:text-zaki-dark-primary"
            onClick={handleClose}
            aria-label={t("onboarding.simple.dismissAria")}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-6 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl border border-zaki-subtle bg-white/70 text-zaki-primary dark:border-[#2d221a] dark:bg-[#17110d]/75 dark:text-zaki-dark-primary">
              <StepIcon className="size-5" />
            </span>
            <div className="inline-flex items-center gap-2 rounded-full border border-zaki-subtle bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-[#2d221a] dark:bg-[#17110d]/75 dark:text-zaki-dark-muted">
              <span>{t("onboarding.simple.progress", { current: stepIndex + 1, total: steps.length })}</span>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-[1.28rem] font-semibold leading-tight text-zaki-primary dark:text-zaki-dark-primary">
              {currentStep.title}
            </h3>
            <p className="mt-3 max-w-[46ch] text-[15px] leading-7 text-zaki-secondary dark:text-zaki-dark-subtle">
              {currentStep.body}
            </p>
            <div className="mt-5 rounded-[20px] border border-zaki-subtle bg-white/72 px-4 py-3.5 dark:border-[#2d221a] dark:bg-[#17110d]/72">
              <div className={cn("flex items-start gap-3", isRtl && "flex-row-reverse")}>
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-zaki-brand/10 text-zaki-brand dark:bg-[#4b241b] dark:text-[#ffb6a4]">
                  <Files className="size-4" />
                </span>
                <p className={cn("text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle", isRtl ? "text-right" : "text-left")}>
                  {currentStep.note}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-zaki-subtle/70 px-5 py-5 dark:border-[#2d221a] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {stepIndex > 0 ? (
              <button
                type="button"
                className="zaki-btn zaki-btn-secondary h-10 px-4"
                onClick={handleBack}
              >
                {t("onboarding.simple.back")}
              </button>
            ) : null}
            <button
              type="button"
              className="zaki-btn zaki-btn-secondary h-10 px-4"
              onClick={handleSkip}
            >
              {t("onboarding.simple.skip")}
            </button>
          </div>

          <button
            type="button"
            className="zaki-btn zaki-btn-primary h-10 w-full px-4 sm:w-auto"
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

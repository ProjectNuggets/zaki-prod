import { forwardRef } from "react";
import { CenterLogo } from "../../icons";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle } from "lucide-react";

export const ReadyState = forwardRef<
  HTMLDivElement,
  {
    onStartChat?: () => void;
    onSelectExample?: (example: string) => void;
    activationProgress?: {
      firstMessageSent: boolean;
      firstMemorySaved: boolean;
      completed: boolean;
    };
  }
>(function ReadyState(
  { onStartChat, onSelectExample, activationProgress },
  ref
) {
  const { t } = useTranslation();
  const examples = t("empty.examples", { returnObjects: true }) as string[];
  const steps = [
    {
      key: "firstMessageSent",
      label: t("empty.activation.steps.firstMessage"),
      done: Boolean(activationProgress?.firstMessageSent),
    },
    {
      key: "firstMemorySaved",
      label: t("empty.activation.steps.firstMemory"),
      done: Boolean(activationProgress?.firstMemorySaved),
    },
  ];

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-16 pb-32">
      <div ref={ref} className="flex flex-col items-center gap-2 mb-6">
        <div className="scale-110">
          <CenterLogo />
        </div>
        <div className="text-zaki-primary dark:text-zaki-dark-primary text-sm font-medium">ZAKI</div>
        <h1 className="text-zaki-primary dark:text-zaki-dark-primary text-lg font-semibold">
          {t("empty.headline")}
        </h1>
        <div className="text-zaki-disabled dark:text-zaki-dark-muted text-sm text-center max-w-md">
          {t("empty.subtext")}
        </div>
        {!activationProgress?.completed ? (
          <div className="mt-4 w-full max-w-md rounded-2xl border border-zaki-subtle bg-white/95 px-4 py-3 shadow-[0_10px_20px_rgba(15,15,15,0.04)] dark:border-zaki-dark dark:bg-zaki-dark-card/90">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-zaki-muted dark:text-zaki-dark-muted text-center">
              {t("empty.activation.title")}
            </div>
            <div className="mt-2 space-y-2">
              {steps.map((step) => (
                <div key={step.key} className="flex items-center gap-2 text-sm text-zaki-secondary dark:text-zaki-dark-subtle">
                  {step.done ? (
                    <CheckCircle2 className="size-4 text-zaki-accent" />
                  ) : (
                    <Circle className="size-4 text-zaki-muted" />
                  )}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zaki-muted">
            {t("empty.ctaHelper")}
          </div>
          <button className="zaki-btn bg-zaki-accent text-white" onClick={onStartChat}>
            {t("empty.cta")}
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
            {examples.slice(0, 2).map((example) => (
              <button
                key={example}
                type="button"
                className="zaki-btn-sm border border-zaki-subtle bg-white text-zaki-secondary hover:bg-zaki-hover"
                onClick={() => onSelectExample?.(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

interface Props {
  onMigrate: () => void;
}

export function BrainEmptyState({ onMigrate }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="relative size-32 sm:size-40" aria-hidden="true">
        <div className="motion-safe:animate-pulse absolute inset-0 border border-zaki-brand/10" />
        <div className="absolute inset-4 border border-zaki-brand/20" />
        <div className="absolute inset-8 border border-zaki-brand/40" />
        <div className="absolute inset-[44%] bg-zaki-brand" />
      </div>

      <div className="max-w-md space-y-3">
        <h2 className="font-mono-ui text-2xl font-bold tracking-normal text-zaki-text">
          {t("brain.empty.title", { defaultValue: "Your brain starts here" })}
        </h2>
        <p className="text-sm leading-relaxed text-zaki-secondary">
          {t("brain.empty.body", {
            defaultValue:
              "ZAKI builds your brain as you talk. Every fact, preference, person, project — every conversation adds to a network you'll see grow over time.",
          })}
        </p>
      </div>

      <button
        type="button"
        onClick={onMigrate}
        className="inline-flex items-center gap-2 rounded-[2px] border border-zaki-brand/30 bg-zaki-brand px-5 py-2.5 font-mono-ui text-sm font-medium text-white transition-colors hover:bg-zaki-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand/40"
        data-testid="brain-empty-state-cta"
      >
        {t("brain.empty.cta", { defaultValue: "Start a conversation" })}
        <ArrowRight className="size-4" />
      </button>

      <p className="max-w-xs text-xs text-zaki-muted">
        {t("brain.empty.hint", {
          defaultValue:
            "After your first few exchanges, come back here to see your brain take shape.",
        })}
      </p>
    </div>
  );
}

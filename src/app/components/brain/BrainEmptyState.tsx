import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

interface Props {
  onMigrate: () => void;
}

// Audit (2026-05-08) — empty state revamp. Pre-this-commit was a bare
// Brain icon + title + understated link. The first time a user opens
// /brain with no memories should be a moment, not a placeholder.
//
// Visual seed: a single brand-red node with three concentric fading
// rings — echoes the brain canvas aesthetic ("your graph starts as one
// dot and radiates out"). The outer ring pulses subtly so the page
// feels alive. Pulse respects prefers-reduced-motion via Tailwind's
// motion-safe variant.
//
// Copy: explains the why, gives a concrete CTA ("Start a conversation"),
// and ends with a return-promise ("come back here to see your brain
// take shape"). Display font (Cabinet Grotesk per DESIGN.md) on the
// title to give the moment weight.
export function BrainEmptyState({ onMigrate }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="relative size-32 sm:size-40" aria-hidden="true">
        <div className="motion-safe:animate-pulse absolute inset-0 rounded-full border border-zaki-brand/10" />
        <div className="absolute inset-4 rounded-full border border-zaki-brand/20" />
        <div className="absolute inset-8 rounded-full border border-zaki-brand/40" />
        <div className="absolute inset-[44%] rounded-full bg-zaki-brand shadow-[0_0_28px_rgba(241,2,2,0.4)]" />
      </div>

      <div className="max-w-md space-y-3">
        <h2 className="font-display text-2xl font-bold tracking-tight text-zaki-text">
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
        className="inline-flex items-center gap-2 rounded-full bg-zaki-brand px-5 py-2.5 text-sm font-medium text-white shadow-zaki-md transition-all hover:-translate-y-0.5 hover:bg-zaki-brand-hover hover:shadow-zaki-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zaki-brand/40"
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

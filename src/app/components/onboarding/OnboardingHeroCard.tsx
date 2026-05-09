// 2026-05-09 — Onboarding Stage 1: first-run hero card.
//
// Surfaces above the composer on the ZAKI bot home for new users.
// Two CTAs:
//   - Primary: "Type your intro" — focuses the composer.
//   - Secondary: "Bring your memory from another assistant" — opens
//     MemoryImportSheet.
// Dismissible. Once dismissed (Got it / Skip / Import), Stage 1 is
// marked done and the next stage takes over.

import { useTranslation } from "react-i18next";
import { ArrowRight, Brain, MessageSquareQuote, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  userName: string;
  onTypeIntro: () => void;
  onOpenImport: () => void;
  onDismiss: () => void;
  isRtl?: boolean;
};

export function OnboardingHeroCard({
  userName,
  onTypeIntro,
  onOpenImport,
  onDismiss,
  isRtl = false,
}: Props) {
  const { t } = useTranslation();

  return (
    <section
      className={cn(
        "mx-auto mb-3 w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#e4d5c6] bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe6_100%)] shadow-[0px_16px_38px_rgba(15,15,15,0.06)] dark:border-[#33261d] dark:bg-[linear-gradient(180deg,#17120f_0%,#120e0b_100%)] dark:shadow-[0px_24px_48px_rgba(0,0,0,0.34)]",
      )}
      dir={isRtl ? "rtl" : "ltr"}
      data-onboarding-id="onboarding-hero"
    >
      <div className="flex items-start justify-between gap-4 px-5 py-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-white/75 px-3 py-1 dark:border-[#2c2118] dark:bg-[#17110d]/75">
              <MessageSquareQuote className="size-3.5" />
              {t("onboarding.hero.eyebrow", { defaultValue: "Welcome to ZAKI" })}
            </span>
          </div>

          <h3 className="mt-3 text-[1.18rem] font-semibold leading-tight text-zaki-primary dark:text-zaki-dark-primary">
            {t("onboarding.hero.title", {
              defaultValue: "Hi {{name}}. Let's get ZAKI to know you.",
              name: userName,
            })}
          </h3>
          <p className="mt-2 max-w-[60ch] text-[14px] leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
            {t("onboarding.hero.body", {
              defaultValue:
                "Tell ZAKI who you are and what you're working on, in your own words. The more context you share, the more useful ZAKI becomes.",
            })}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full bg-zaki-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-zaki-brand-hover"
              onClick={onTypeIntro}
            >
              {t("onboarding.hero.typeIntro", { defaultValue: "Type your intro" })}
              <ArrowRight className={cn("size-4", isRtl && "rotate-180")} />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-zaki-strong bg-white/70 px-3.5 py-2 text-sm font-medium text-zaki-secondary transition-colors hover:bg-zaki-hover hover:text-zaki-primary dark:border-[#2c2118] dark:bg-[#17110d]/75 dark:text-zaki-dark-subtle dark:hover:text-zaki-dark-primary"
              onClick={onOpenImport}
              data-onboarding-id="onboarding-hero-import"
            >
              <Brain className="size-3.5" />
              {t("onboarding.hero.importMemory", {
                defaultValue: "Bring memory from ChatGPT or Claude",
              })}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-zaki-subtle bg-white/70 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary dark:border-[#2c2118] dark:bg-[#17110d] dark:text-zaki-dark-muted dark:hover:bg-[#211812] dark:hover:text-zaki-dark-primary"
          aria-label={t("onboarding.hero.dismissAria", {
            defaultValue: "Dismiss",
          })}
          onClick={onDismiss}
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { Compass, FlaskConical, Sparkles, TimerReset, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY = "zaki_bot_experimental_notice_seen";

type Props = {
  active: boolean;
  className?: string;
};

export function ZakiExperimentalNotice({ active, className }: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY) === "1";
  });

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    setDismissed(
      window.sessionStorage.getItem(ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY) === "1"
    );
  }, [active]);

  if (!active || dismissed) return null;

  return (
    <section
      className={cn(
        "mx-auto mb-3 w-full max-w-3xl rounded-[24px] border border-[#ddc0a7] bg-[linear-gradient(180deg,#fff8f1_0%,#f7e7d5_100%)] p-4 shadow-[0px_16px_36px_rgba(15,15,15,0.08)] dark:border-[#3a2a1f] dark:bg-[linear-gradient(180deg,#1b140f_0%,#140f0b_100%)] dark:shadow-[0px_24px_48px_rgba(0,0,0,0.42)]",
        className
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-zaki-brand/20 bg-zaki-brand/10 text-zaki-brand dark:border-zaki-brand/25 dark:bg-zaki-brand/15">
          <FlaskConical className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1 rounded-full border border-zaki-accent/20 bg-zaki-accent/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zaki-accent dark:border-zaki-accent/20 dark:bg-zaki-accent/10">
                <Sparkles className="size-3" />
                {t("zakiExperimentalNotice.badge")}
              </div>
              <h3 className="mt-2 text-base font-semibold text-zaki-primary dark:text-zaki-dark-primary">
                {t("zakiExperimentalNotice.title")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
                {t("zakiExperimentalNotice.intro")}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex size-8 items-center justify-center rounded-xl border border-zaki-subtle bg-white/70 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary dark:border-[#2c2118] dark:bg-[#17110d] dark:text-zaki-dark-muted dark:hover:bg-[#211812] dark:hover:text-zaki-dark-primary"
              aria-label={t("zakiExperimentalNotice.dismissAria")}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.sessionStorage.setItem(
                    ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY,
                    "1"
                  );
                }
                setDismissed(true);
              }}
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[18px] border border-[#e8d4c0] bg-white/70 px-3.5 py-3 dark:border-[#32251b] dark:bg-[#18110d]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zaki-primary dark:text-zaki-dark-primary">
                <Compass className="size-3.5 text-zaki-brand" />
                {t("zakiExperimentalNotice.whyExperimentalTitle")}
              </div>
              <p className="mt-2 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                {t("zakiExperimentalNotice.whyExperimentalBody")}
              </p>
            </div>
            <div className="rounded-[18px] border border-[#e8d4c0] bg-white/70 px-3.5 py-3 dark:border-[#32251b] dark:bg-[#18110d]">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-zaki-primary dark:text-zaki-dark-primary">
                <TimerReset className="size-3.5 text-zaki-brand" />
                {t("zakiExperimentalNotice.expectationsTitle")}
              </div>
              <p className="mt-2 text-xs leading-5 text-zaki-muted dark:text-zaki-dark-muted">
                {t("zakiExperimentalNotice.expectationsBody")}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="zaki-btn zaki-btn-primary h-10 px-4"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.sessionStorage.setItem(
                    ZAKI_EXPERIMENTAL_NOTICE_SESSION_KEY,
                    "1"
                  );
                }
                setDismissed(true);
              }}
            >
              {t("zakiExperimentalNotice.actions.continue")}
            </button>
            <a
              className="zaki-btn zaki-btn-secondary h-10 px-4"
              href="https://www.chatzaki.com/zaki-bot/"
              target="_blank"
              rel="noreferrer"
            >
              {t("zakiExperimentalNotice.actions.learnMore")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { ArrowUpRight, FileCode2, X } from "lucide-react";
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
        "mx-auto mb-3 w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#e7d8c8] bg-[linear-gradient(180deg,#fffcf8_0%,#f7eee3_100%)] shadow-[0px_16px_34px_rgba(15,15,15,0.06)] dark:border-[#33261d] dark:bg-[linear-gradient(180deg,#17120f_0%,#120e0b_100%)] dark:shadow-[0px_24px_48px_rgba(0,0,0,0.34)]",
        className
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:border-[#2c2118] dark:bg-[#17110d]/75 dark:text-zaki-dark-muted">
            <FileCode2 className="size-3.5" />
            {t("zakiExperimentalNotice.eyebrow")}
          </div>
          <h3 className="mt-3 max-w-3xl text-[1.14rem] font-semibold leading-tight text-zaki-primary dark:text-zaki-dark-primary">
            {t("zakiExperimentalNotice.title")}
          </h3>
          <p className="mt-2 max-w-3xl text-[14px] leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
            {t("zakiExperimentalNotice.intro")}
          </p>

          <div className="mt-3 rounded-[18px] border border-[#eadfce] bg-white/50 px-4 py-2.5 font-mono text-[11.5px] leading-5.5 text-zaki-secondary dark:border-[#2f241c] dark:bg-[#17110d]/40 dark:text-zaki-dark-subtle">
            <div>{t("zakiExperimentalNotice.repo.branch")}</div>
            <div>{t("zakiExperimentalNotice.repo.origin")}</div>
            <div>{t("zakiExperimentalNotice.repo.benchmark")}</div>
            <div>{t("zakiExperimentalNotice.repo.goal")}</div>
          </div>

          <p className="mt-3 max-w-3xl text-[13.5px] leading-5.5 text-zaki-muted dark:text-zaki-dark-muted">
            {t("zakiExperimentalNotice.footer")}
          </p>

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
              <span>{t("zakiExperimentalNotice.actions.learnMore")}</span>
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-zaki-subtle bg-white/70 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary dark:border-[#2c2118] dark:bg-[#17110d] dark:text-zaki-dark-muted dark:hover:bg-[#211812] dark:hover:text-zaki-dark-primary"
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
    </section>
  );
}

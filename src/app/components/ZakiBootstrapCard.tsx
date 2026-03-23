import { useEffect, useState } from "react";
import { MessageSquareQuote, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const ZAKI_BOOTSTRAP_CARD_STORAGE_PREFIX = "zaki:bot-bootstrap:v1:";

export function getZakiBootstrapCardStorageKey(userId: string) {
  return `${ZAKI_BOOTSTRAP_CARD_STORAGE_PREFIX}${String(userId || "").trim().toLowerCase()}`;
}

export function hasSeenZakiBootstrapCard(userId: string) {
  if (typeof window === "undefined" || !userId) return false;
  return window.localStorage.getItem(getZakiBootstrapCardStorageKey(userId)) === "done";
}

type Props = {
  active: boolean;
  userId: string;
  onDismiss?: () => void;
  className?: string;
};

export function ZakiBootstrapCard({
  active,
  userId,
  onDismiss,
  className,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir?.() === "rtl" || i18n.language?.startsWith("ar");
  const [dismissed, setDismissed] = useState(() => hasSeenZakiBootstrapCard(userId));

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    setDismissed(hasSeenZakiBootstrapCard(userId));
  }, [active, userId]);

  if (!active || !userId || dismissed) return null;

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(getZakiBootstrapCardStorageKey(userId), "done");
    }
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <section
      className={cn(
        "mx-auto mb-3 w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#e4d5c6] bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe6_100%)] shadow-[0px_16px_38px_rgba(15,15,15,0.06)] dark:border-[#33261d] dark:bg-[linear-gradient(180deg,#17120f_0%,#120e0b_100%)] dark:shadow-[0px_24px_48px_rgba(0,0,0,0.34)]",
        className
      )}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-white/75 px-3 py-1 dark:border-[#2c2118] dark:bg-[#17110d]/75">
              <MessageSquareQuote className="size-3.5" />
              {t("zakiBootstrapCard.eyebrow")}
            </span>
          </div>

          <h3 className="mt-3 text-[1.12rem] font-semibold leading-tight text-zaki-primary dark:text-zaki-dark-primary">
            {t("zakiBootstrapCard.title")}
          </h3>

          <div className="mt-3 space-y-3.5">
            <div>
              <p className="text-[15px] font-semibold leading-7 text-zaki-primary dark:text-zaki-dark-primary">
                {t("zakiBootstrapCard.arabic.headline")}
              </p>
              <p className="mt-1.5 text-[14px] leading-6 text-zaki-secondary dark:text-zaki-dark-subtle">
                {t("zakiBootstrapCard.arabic.body")}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
                {t("zakiBootstrapCard.english.label")}
              </p>
              <p className="mt-1.5 text-[13.5px] leading-5.5 text-zaki-secondary dark:text-zaki-dark-subtle">
                {t("zakiBootstrapCard.english.body")}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="zaki-btn zaki-btn-primary h-10 px-4"
              onClick={handleDismiss}
            >
              {t("zakiBootstrapCard.actions.continue")}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-zaki-subtle bg-white/70 text-zaki-muted transition-colors hover:bg-zaki-hover hover:text-zaki-primary dark:border-[#2c2118] dark:bg-[#17110d] dark:text-zaki-dark-muted dark:hover:bg-[#211812] dark:hover:text-zaki-dark-primary"
          aria-label={t("zakiBootstrapCard.dismissAria")}
          onClick={handleDismiss}
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}

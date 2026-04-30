import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

interface Props {
  onDismiss?: () => void;
}

export function BrainSemanticDegradedBanner({ onDismiss }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 rounded-zaki-lg border border-amber-400/60 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <div className="font-semibold">{t("brain.degraded.title")}</div>
        <div className="mt-0.5 leading-relaxed opacity-90">{t("brain.degraded.body")}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
        >
          {t("common.dismiss")}
        </button>
      )}
    </div>
  );
}

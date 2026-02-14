import { forwardRef } from "react";
import { CenterLogo } from "../../icons";
import { useTranslation } from "react-i18next";

export const ReadyState = forwardRef<
  HTMLDivElement,
  { onStartChat?: () => void; onSelectExample?: (example: string) => void }
>(function ReadyState(
  { onStartChat, onSelectExample },
  ref
) {
  const { t } = useTranslation();
  const examples = t("empty.examples", { returnObjects: true }) as string[];
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

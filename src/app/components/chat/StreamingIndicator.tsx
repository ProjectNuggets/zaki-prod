import { CenterLogo } from "../icons";
import { useTranslation } from "react-i18next";

export function StreamingIndicator() {
  const { t } = useTranslation();
  return (
    <div className="flex gap-4 items-start">
      <div className="size-8 shrink-0 flex items-start justify-center pt-[6px]">
        <div className="scale-75">
          <CenterLogo />
        </div>
      </div>
      <div className="rounded-zaki-lg px-4 py-3 text-sm bg-transparent text-zaki-primary">
        <div className="flex items-center gap-2 text-zaki-muted">
          <span>{t("chat.thinking")}</span>
          <span className="flex gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 rounded-full bg-zaki-muted animate-bounce [animation-delay:-0.2s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zaki-muted animate-bounce [animation-delay:-0.1s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zaki-muted animate-bounce" />
          </span>
        </div>
      </div>
    </div>
  );
}

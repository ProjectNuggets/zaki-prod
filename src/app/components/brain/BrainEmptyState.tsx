import { useTranslation } from "react-i18next";
import { Brain } from "lucide-react";

interface Props {
  onMigrate: () => void;
}

export function BrainEmptyState({ onMigrate }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Brain className="size-12 text-zaki-muted" />
      <h2 className="text-base font-semibold text-zaki-text">{t("brain.empty.title")}</h2>
      <button
        type="button"
        onClick={onMigrate}
        className="text-sm text-zaki-muted underline-offset-4 hover:text-zaki-text hover:underline"
      >
        {t("brain.empty.cta")}
      </button>
    </div>
  );
}

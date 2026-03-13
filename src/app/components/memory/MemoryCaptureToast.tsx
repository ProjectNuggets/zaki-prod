import { Brain, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type MemoryToastTone = "saved" | "review" | "conflict";

interface MemoryCaptureToastProps {
  position: { left: number; width: number; bottom: number };
  tone: MemoryToastTone;
  savedCount: number;
  reviewCount: number;
  conflictCount: number;
  onUndo?: () => void;
  onReview?: () => void;
  onDismiss: () => void;
  processing?: boolean;
  undoError?: string | null;
  partialUndoCount?: number;
}

export function MemoryCaptureToast({
  position,
  tone,
  savedCount,
  reviewCount,
  conflictCount,
  onUndo,
  onReview,
  onDismiss,
  processing = false,
  undoError = null,
  partialUndoCount = 0,
}: MemoryCaptureToastProps) {
  const { t } = useTranslation();

  let title = t("memory.saved");
  if (tone === "saved") {
    title =
      savedCount > 1 ? t("memory.savedMultiple", { count: savedCount }) : t("memory.savedSingle");
  } else if (tone === "conflict") {
    title = t("memory.conflictNotice", { count: conflictCount });
  } else {
    title = t("memory.reviewNotice", { count: reviewCount });
  }

  const helper =
    undoError && partialUndoCount > 0
      ? t("memory.undoPartialError", { count: partialUndoCount })
      : undoError
        ? undoError
        : conflictCount > 0
          ? t("memory.reviewConflictsHelper", { count: conflictCount })
          : reviewCount > 0
            ? t("memory.reviewPendingHelper", { count: reviewCount })
            : t("memory.manageAnytime");

  return (
    <div
      className="fixed z-30"
      style={{
        left: position.left,
        width: position.width,
        bottom: position.bottom,
      }}
    >
      <div className="rounded-2xl border border-zaki-subtle bg-white/95 px-3 py-2 text-xs text-zaki-secondary shadow-[0px_10px_24px_rgba(15,15,15,0.08)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-zaki-primary">
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-zaki-hover text-zaki-brand">
                <Brain className="size-3" />
              </span>
              <span className="font-medium">{title}</span>
            </div>
            <p
              className={`mt-1 text-[11px] ${
                undoError ? "text-[#b74c3a] dark:text-[#f7b1a4]" : "text-zaki-muted"
              }`}
            >
              {helper}
            </p>
          </div>
          <button
            type="button"
            className="text-zaki-muted hover:text-zaki-primary"
            onClick={onDismiss}
            aria-label={t("memory.dismissAria")}
          >
            ×
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px]">
          {savedCount > 0 && onUndo ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-zaki-brand hover:underline disabled:opacity-50"
              onClick={onUndo}
              disabled={processing}
            >
              <Undo2 className="size-3" />
                  {undoError ? t("memory.undoRetry") : t("memory.undo")}
                </button>
              ) : null}
          {(reviewCount > 0 || conflictCount > 0) && onReview ? (
            <button
              type="button"
              className="font-medium text-zaki-brand hover:underline"
              onClick={onReview}
            >
              {t("memory.review")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

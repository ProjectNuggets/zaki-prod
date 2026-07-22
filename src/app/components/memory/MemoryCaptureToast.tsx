import { Brain, Undo2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type MemoryToastTone = "saved";

interface MemoryCaptureToastProps {
  position: { left: number; width: number; bottom: number };
  tone?: MemoryToastTone;
  savedCount: number;
  supersededCount?: number;
  onUndo?: () => void;
  onOpenMemory?: () => void;
  onDismiss: () => void;
  processing?: boolean;
  undoError?: string | null;
  partialUndoCount?: number;
}

export function MemoryCaptureToast({
  position,
  savedCount,
  supersededCount = 0,
  onUndo,
  onOpenMemory,
  onDismiss,
  processing = false,
  undoError = null,
  partialUndoCount = 0,
}: MemoryCaptureToastProps) {
  const { t } = useTranslation();

  // WP-MEM6: the import no longer routes through this toast. It is a sequence of ordinary agent
  // turns now, confirmed by ZAKI's own reply and the memory_store tool rows in the thread — so the
  // "import" variant (a centred modal claiming "I now remember N details") has been removed. This
  // component serves ordinary chat auto-capture only.
  const title =
    savedCount > 1
      ? t("memory.savedMultiple", { count: savedCount })
      : supersededCount > 0 && savedCount === 0
        ? t("memory.updatedSingle", { defaultValue: "Memory updated" })
        : t("memory.savedSingle");

  const helper =
    undoError && partialUndoCount > 0
      ? t("memory.undoPartialError", { count: partialUndoCount })
      : undoError
        ? undoError
        : t("memory.savedHelper");

  return (
    <div
      className="fixed z-30"
      style={{
        left: position.left,
        width: position.width,
        bottom: position.bottom,
      }}
    >
      <div className="border border-zaki-subtle bg-zaki-raised/95 px-3 py-2.5 font-mono text-xs text-zaki-secondary shadow-[0px_10px_24px_rgba(15,15,15,0.08)] backdrop-blur-sm dark:bg-[#141210]/95">
        <div className="min-w-0" role="status" aria-live="polite" aria-atomic="true">
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
          {onOpenMemory ? (
            <button
              type="button"
              className="font-medium text-zaki-brand hover:underline disabled:pointer-events-none disabled:opacity-50"
              onClick={onOpenMemory}
              disabled={processing}
            >
              {t("memory.open")}
            </button>
          ) : null}
          <button
            type="button"
            className="font-medium text-zaki-muted hover:text-zaki-primary hover:underline disabled:pointer-events-none disabled:opacity-40"
            onClick={onDismiss}
            disabled={processing}
          >
            {t("memory.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}

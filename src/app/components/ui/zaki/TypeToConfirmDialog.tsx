import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TypeToConfirmDialogProps {
  isOpen: boolean;
  title: string;
  body: string;
  /** The exact phrase the user must type to enable the confirm button */
  confirmPhrase: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Type-to-confirm destructive action dialog.
 * User must type the exact phrase (usually the resource name) before the
 * confirm button enables. Used for spaces and account deletion.
 */
export function TypeToConfirmDialog({
  isOpen,
  title,
  body,
  confirmPhrase,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isSubmitting,
}: TypeToConfirmDialogProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!isOpen) setValue("");
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = value.trim() === confirmPhrase.trim() && !isSubmitting;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      role="alertdialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className={cn(
          "w-full max-w-md rounded-zaki-2xl border border-zaki-strong bg-zaki-raised shadow-zaki-xl",
          "dark:bg-[#141210] dark:border-[rgba(240,236,230,0.12)]"
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-zaki dark:border-[rgba(240,236,230,0.06)]">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand">
              <AlertTriangle className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-zaki-primary text-lg tracking-[-0.02em]">
                {title}
              </h2>
              <p className="mt-1 text-sm text-zaki-secondary leading-relaxed">{body}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="shrink-0 size-8 rounded-full flex items-center justify-center text-zaki-muted hover:bg-zaki-hover hover:text-zaki-primary transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5">
          <label className="block text-xs font-medium text-zaki-secondary mb-2">
            Type <span className="font-mono-ui text-zaki-brand">{confirmPhrase}</span> to confirm
          </label>
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={isSubmitting}
            autoFocus
            className="w-full rounded-zaki-md border border-zaki-strong bg-zaki-hover px-3 py-2.5 text-sm text-zaki-primary font-mono-ui outline-none focus:border-zaki-brand focus:ring-2 focus:ring-zaki-brand/20 dark:bg-[#1a1714]"
            placeholder={confirmPhrase}
          />
        </div>

        <div className="flex items-center justify-end gap-2 p-5 pt-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-full border border-zaki-strong px-4 py-2 text-sm font-medium text-zaki-primary hover:bg-zaki-hover transition-colors disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-all",
              canConfirm
                ? "bg-zaki-brand text-white shadow-[0_8px_24px_rgba(241,2,2,0.25)] hover:-translate-y-0.5"
                : "bg-zaki-hover text-zaki-muted cursor-not-allowed"
            )}
          >
            {isSubmitting ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

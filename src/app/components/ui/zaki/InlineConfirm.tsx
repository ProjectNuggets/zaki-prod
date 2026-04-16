import { cn } from "@/lib/utils";

interface InlineConfirmProps {
  label?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "neutral";
  confirmLabel?: string;
  cancelLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Inline confirmation bar.
 * Shows "Delete? [Cancel] [Delete]" inline instead of opening a modal.
 * Used for threads, sessions, secrets, cron jobs, memories.
 */
export function InlineConfirm({
  label = "Are you sure?",
  onConfirm,
  onCancel,
  tone = "danger",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  disabled,
  className,
}: InlineConfirmProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-zaki-strong bg-zaki-raised px-3 py-1.5 dark:bg-[#1a1714]",
        className
      )}
      role="alertdialog"
    >
      <span className="text-xs font-medium text-zaki-secondary">{label}</span>
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className="rounded-full px-2.5 py-1 text-xs font-medium text-zaki-secondary hover:bg-zaki-hover hover:text-zaki-primary transition-colors disabled:opacity-60"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-60",
          tone === "danger"
            ? "bg-zaki-brand text-white hover:bg-zaki-brand-hover"
            : "bg-zaki-accent text-white hover:bg-zaki-accent-hover"
        )}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

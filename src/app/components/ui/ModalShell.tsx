import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  backdropClassName?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  role?: "dialog" | "alertdialog";
}

export function ModalShell({
  isOpen,
  onClose,
  children,
  className,
  containerClassName,
  backdropClassName,
  ariaLabel,
  ariaLabelledBy,
  closeOnBackdrop = true,
  closeOnEscape = true,
  role = "dialog",
}: ModalShellProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeOnEscape, isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        containerClassName
      )}
    >
      <div
        className={cn("zaki-modal-backdrop absolute inset-0", backdropClassName)}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : ariaLabel || "Dialog"}
        className={cn(
          "zaki-modal-panel relative w-[420px] max-w-[calc(100%-2rem)] rounded-zaki-2xl",
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

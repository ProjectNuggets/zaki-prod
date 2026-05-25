import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/app/components/ui/sheet";
import { cn } from "@/lib/utils";

interface SheetShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Width on desktop. Defaults to 420px. */
  width?: "sm" | "md" | "lg";
  /** Side the sheet opens from. Defaults to right. */
  side?: "left" | "right";
  description?: string;
  /** Fill the body container with tight padding - useful for lists. */
  padded?: boolean;
  className?: string;
}

const WIDTH_CLASSES: Record<NonNullable<SheetShellProps["width"]>, string> = {
  sm: "w-full sm:w-[380px] sm:max-w-[380px]",
  md: "w-full sm:w-[420px] sm:max-w-[420px]",
  lg: "w-full sm:w-[540px] sm:max-w-[540px]",
};

/**
 * Unified sheet container with sticky header, scroll body, optional footer.
 * Every settings sheet, panel, and side-drawer uses this shell.
 */
export function SheetShell({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  width = "md",
  side = "right",
  description,
  padded = true,
  className,
}: SheetShellProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={side}
        hideCloseButton
        className={cn(
          "zaki-v2-sheet p-0",
          WIDTH_CLASSES[width],
          className
        )}
      >
        <div className="flex h-full flex-col">
          <div className="zaki-v2-sheet__head sticky top-0 z-20 flex items-start justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {icon ? (
                <span className="zaki-v2-sheet__icon inline-flex size-9 shrink-0 items-center justify-center">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <SheetTitle className="zaki-v2-sheet__title truncate">
                  {title}
                </SheetTitle>
                {subtitle ? (
                  <p className="zaki-v2-sheet__subtitle mt-1">
                    {subtitle}
                  </p>
                ) : null}
                {description ? (
                  <SheetDescription className="sr-only">{description}</SheetDescription>
                ) : (
                  <SheetDescription className="sr-only">{title}</SheetDescription>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="zaki-v2-sheet__close shrink-0 size-8 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div
            className={cn(
              "zaki-v2-sheet__body flex-1 overflow-y-auto zaki-scrollbar-fade",
              padded && "px-5 py-4"
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="zaki-v2-sheet__footer sticky bottom-0 z-10 px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

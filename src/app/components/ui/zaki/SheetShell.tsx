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
  sm: "w-full sm:w-[380px]",
  md: "w-full sm:w-[420px]",
  lg: "w-full sm:w-[540px]",
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
        className={cn(
          "p-0 font-body text-zaki-primary border-zaki-strong bg-zaki-raised dark:bg-[#141210] dark:border-[rgba(240,236,230,0.08)]",
          WIDTH_CLASSES[width],
          className
        )}
      >
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-20 flex items-start justify-between gap-3 border-b border-zaki bg-zaki-raised px-5 py-4 dark:bg-[#141210] dark:border-[rgba(240,236,230,0.06)]">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {icon ? (
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-zaki-brand/10 text-zaki-brand">
                  {icon}
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <SheetTitle className="font-display text-base font-bold tracking-[-0.02em] text-zaki-primary truncate">
                  {title}
                </SheetTitle>
                {subtitle ? (
                  <p className="mt-0.5 text-xs text-zaki-secondary leading-relaxed">
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
              className="shrink-0 size-8 rounded-full flex items-center justify-center text-zaki-muted hover:bg-zaki-hover hover:text-zaki-primary transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div
            className={cn(
              "flex-1 overflow-y-auto zaki-scrollbar-fade",
              padded && "px-5 py-4"
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="sticky bottom-0 z-10 border-t border-zaki bg-zaki-raised/95 backdrop-blur px-5 py-3 dark:bg-[#141210]/95 dark:border-[rgba(240,236,230,0.06)]">
              {footer}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

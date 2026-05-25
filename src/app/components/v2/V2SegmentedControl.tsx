import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2SegmentedOption<T extends string> = {
  id: T;
  label: ReactNode;
  disabled?: boolean;
};

export type V2SegmentedControlProps<T extends string> = {
  value: T;
  options: readonly V2SegmentedOption<T>[];
  onChange?: (value: T) => void | Promise<void>;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
  fullWidth?: boolean;
};

export function V2SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  ariaLabel,
  className,
  fullWidth = false,
}: V2SegmentedControlProps<T>) {
  const style = fullWidth
    ? ({ "--v2-seg-count": options.length } as CSSProperties)
    : undefined;
  return (
    <div
      className={cn("v2-seg", fullWidth && "v2-seg--grid", className)}
      aria-label={ariaLabel}
      style={style}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={disabled || option.disabled || !onChange}
          aria-pressed={value === option.id}
          onClick={() => {
            if (value !== option.id) void onChange?.(option.id);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2TabOption<T extends string> = {
  id: T;
  label: ReactNode;
  count?: ReactNode;
  disabled?: boolean;
};

export type V2TabsProps<T extends string> = {
  value: T;
  options: readonly V2TabOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  fullWidth?: boolean;
};

export function V2Tabs<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  fullWidth = false,
}: V2TabsProps<T>) {
  const style = fullWidth
    ? ({ "--v2-tabs-count": options.length } as CSSProperties)
    : undefined;
  return (
    <div
      className={cn("v2-tabs", fullWidth && "v2-tabs--grid", className)}
      role="tablist"
      aria-label={ariaLabel}
      style={style}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          disabled={option.disabled}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          {option.count != null ? <span className="count">{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

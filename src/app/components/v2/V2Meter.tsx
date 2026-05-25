import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2MeterProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: number | null;
  valueLabel?: ReactNode;
  detail?: ReactNode;
};

export function V2Meter({
  label,
  value,
  valueLabel,
  detail,
  className,
  ...props
}: V2MeterProps) {
  const pct =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : 0;
  return (
    <div className={cn("v2-meter", className)} {...props}>
      <div className="v2-meter__head">
        <span>{label}</span>
        <strong>{valueLabel ?? `${Math.round(pct)}%`}</strong>
      </div>
      <div className="v2-meter__bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
      {detail != null ? <small>{detail}</small> : null}
    </div>
  );
}

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2UsageGaugeProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  used: number | null;
  limit: number | null;
  remaining?: ReactNode;
  reset?: ReactNode;
  unit?: ReactNode;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function V2UsageGauge({
  label,
  used,
  limit,
  remaining,
  reset,
  unit,
  className,
  ...props
}: V2UsageGaugeProps) {
  const hasLimit =
    typeof limit === "number" &&
    Number.isFinite(limit) &&
    limit > 0 &&
    typeof used === "number" &&
    Number.isFinite(used);
  const percent = hasLimit ? clampPercent((used / limit) * 100) : 0;
  const displayUsed = typeof used === "number" && Number.isFinite(used) ? used : 0;
  const displayLimit = typeof limit === "number" && Number.isFinite(limit) ? limit : null;

  return (
    <div
      className={cn("v2-usage-gauge", className)}
      style={{ "--v2-usage-percent": `${percent}%` } as CSSProperties}
      {...props}
    >
      <div className="v2-usage-gauge__head">
        <span>{label}</span>
        {reset != null ? <span>{reset}</span> : null}
      </div>
      <div className="v2-usage-gauge__number">
        <strong>{displayUsed.toLocaleString()}</strong>
        {displayLimit != null ? <span>/ {displayLimit.toLocaleString()}</span> : null}
        {unit != null ? <em>{unit}</em> : null}
      </div>
      <div className="v2-usage-gauge__bar" aria-hidden="true">
        <span />
      </div>
      {remaining != null ? <div className="v2-usage-gauge__foot">{remaining}</div> : null}
    </div>
  );
}

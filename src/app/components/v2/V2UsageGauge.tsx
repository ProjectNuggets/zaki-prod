import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  formatUsagePercentLabel,
  getRoundedUsagePercent,
  getUsagePercent,
} from "@/lib/usageDisplay";

export type V2UsageGaugeProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  used: number | null;
  limit: number | null;
  detail?: ReactNode;
  /**
   * @deprecated Usage surfaces no longer render raw remaining units. Pass
   * `detail` for unitless copy.
   */
  remaining?: ReactNode;
  reset?: ReactNode;
  usageLabel?: ReactNode;
  /**
   * @deprecated Usage surfaces keep raw unit labels internal.
   */
  unit?: ReactNode;
};

export function V2UsageGauge({
  label,
  used,
  limit,
  detail,
  reset,
  usageLabel,
  className,
  ...props
}: V2UsageGaugeProps) {
  const percent = getUsagePercent({ used, limit });
  const roundedPercent = getRoundedUsagePercent(percent);
  const percentLabel = usageLabel ?? formatUsagePercentLabel(roundedPercent);

  return (
    <div
      className={cn("v2-usage-gauge", className)}
      style={{ "--v2-usage-percent": `${percent}%` } as CSSProperties}
      aria-label={typeof percentLabel === "string" ? percentLabel : undefined}
      {...props}
    >
      <div className="v2-usage-gauge__head">
        <span>{label}</span>
        {reset != null ? <span>{reset}</span> : null}
      </div>
      <div className="v2-usage-gauge__number">
        <strong>{percentLabel}</strong>
      </div>
      <div className="v2-usage-gauge__bar" aria-hidden="true">
        <span />
      </div>
      {detail != null ? <div className="v2-usage-gauge__foot">{detail}</div> : null}
    </div>
  );
}

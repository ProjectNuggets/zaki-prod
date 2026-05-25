import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type V2MetricGridItem = {
  id: string;
  label: ReactNode;
  value: ReactNode;
};

export type V2MetricGridProps = {
  items: readonly V2MetricGridItem[];
  className?: string;
  columns?: 2 | 3 | 4;
};

export function V2MetricGrid({
  items,
  className,
  columns = 2,
}: V2MetricGridProps) {
  return (
    <dl className={cn("v2-metric-grid", `v2-metric-grid--${columns}`, className)}>
      {items.map((item) => (
        <div key={item.id}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

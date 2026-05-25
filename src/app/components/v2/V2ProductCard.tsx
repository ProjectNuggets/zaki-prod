import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { V2Badge, type V2BadgeTone } from "./V2Badge";

export type V2ProductCardMeta = {
  id: string;
  label: ReactNode;
  value: ReactNode;
};

export type V2ProductCardProps = {
  code: ReactNode;
  tag: ReactNode;
  tagTone?: V2BadgeTone;
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  meta: readonly V2ProductCardMeta[];
  actionLabel: ReactNode;
  actionDisabled?: boolean;
  actionAriaLabel?: string;
  onAction?: () => void;
  primary?: boolean;
  disabled?: boolean;
  testId?: string;
  actionProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick" | "disabled" | "children">;
};

export function V2ProductCard({
  code,
  tag,
  tagTone = "default",
  icon,
  title,
  description,
  meta,
  actionLabel,
  actionDisabled = false,
  actionAriaLabel,
  onAction,
  primary = false,
  disabled = false,
  testId,
  actionProps,
}: V2ProductCardProps) {
  return (
    <article
      className={cn(
        "v2-product-card",
        primary && "v2-product-card--primary",
        disabled && "v2-product-card--disabled"
      )}
      data-testid={testId}
      aria-disabled={disabled || undefined}
    >
      <div className="v2-product-card__head">
        <span className="v2-product-card__code">{code}</span>
        <V2Badge tone={tagTone}>{tag}</V2Badge>
      </div>

      <div>
        {icon != null ? <div className="v2-product-card__icon">{icon}</div> : null}
        <h3>{title}</h3>
      </div>

      <p>{description}</p>

      <dl>
        {meta.map((item) => (
          <div key={item.id}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="button"
        disabled={actionDisabled}
        aria-label={actionAriaLabel}
        onClick={onAction}
        {...actionProps}
      >
        {actionLabel}
        <ArrowRight className="size-3.5" aria-hidden />
      </button>
    </article>
  );
}

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type V2ButtonVariant = "default" | "primary" | "accent" | "ghost" | "danger";
export type V2ButtonSize = "sm" | "md" | "lg";

export type V2ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: V2ButtonVariant;
  size?: V2ButtonSize;
  iconOnly?: boolean;
};

export const V2Button = forwardRef<HTMLButtonElement, V2ButtonProps>(
  (
    {
      variant = "default",
      size = "md",
      iconOnly = false,
      className,
      type = "button",
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "v2-btn",
        variant !== "default" && `v2-btn--${variant}`,
        size !== "md" && `v2-btn--${size}`,
        iconOnly && "v2-btn--icon",
        className
      )}
      {...props}
    />
  )
);

V2Button.displayName = "V2Button";

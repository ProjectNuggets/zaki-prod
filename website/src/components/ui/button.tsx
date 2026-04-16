import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-zk-accent text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_12px_36px_rgba(241,2,2,0.25)] hover:-translate-y-0.5 hover:bg-zk-accent-hover hover:shadow-[0_1px_2px_rgba(0,0,0,0.12),0_18px_50px_rgba(241,2,2,0.32)] active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_8px_24px_rgba(241,2,2,0.20)]",
        secondary:
          "border border-zk-border-strong bg-white/[0.04] text-zk-text shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-zk-accent/20 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(17,10,6,0.06)] active:translate-y-0",
        ghost:
          "text-zk-text hover:bg-white/5",
        bot:
          "border border-zk-border-strong bg-white/[0.04] text-zk-text hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] hover:shadow-[0_8px_28px_rgba(241,2,2,0.10)] active:translate-y-0",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

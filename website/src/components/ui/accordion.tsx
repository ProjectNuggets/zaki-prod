import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "./utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: AccordionPrimitive.AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      className={cn(
        "overflow-hidden rounded-[22px] border border-line-strong bg-chat-surface px-5 transition-colors hover:bg-chat-surface-raised dark:border-line-dark-strong dark:bg-white/[0.03] dark:hover:bg-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header>
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-medium leading-7 text-current transition-colors",
          className
        )}
        {...props}
      >
        <span>{children}</span>
        <ChevronDown className="size-4 shrink-0 text-chat-muted transition-transform duration-300 group-data-[state=open]:rotate-180 dark:text-bot-muted" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      className={cn(
        "overflow-hidden text-sm leading-7 text-chat-muted data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down dark:text-bot-muted",
        className
      )}
      {...props}
    >
      <div className="pb-5">{children}</div>
    </AccordionPrimitive.Content>
  );
}

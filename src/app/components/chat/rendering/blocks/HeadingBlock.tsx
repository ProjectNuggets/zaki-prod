import { cn } from "@/lib/utils";
import { InlineTextRenderer } from "../InlineTextRenderer";
import type { HeadingBlock as HeadingBlockType } from "../types";

export function HeadingBlock({ block }: { block: HeadingBlockType }) {
  return (
    <div
      className={cn(
        "font-semibold tracking-[-0.01em] text-zaki-primary dark:text-zaki-dark-primary",
        block.level === 2 ? "text-[18px] leading-7" : "text-[15.5px] leading-6",
      )}
    >
      <InlineTextRenderer nodes={block.inlines} prose />
    </div>
  );
}

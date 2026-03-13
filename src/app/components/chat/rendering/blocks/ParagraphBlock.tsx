import { InlineTextRenderer } from "../InlineTextRenderer";
import type { ParagraphBlock as ParagraphBlockType } from "../types";

export function ParagraphBlock({ block }: { block: ParagraphBlockType }) {
  return (
    <p className="whitespace-pre-wrap text-[15px] leading-[1.68] text-zaki-primary dark:text-zaki-dark-primary [overflow-wrap:anywhere]">
      <InlineTextRenderer nodes={block.inlines} prose />
    </p>
  );
}

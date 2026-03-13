import { BlockRenderer } from "../BlockRenderer";
import type { BlockquoteBlock } from "../types";

export function QuoteBlock({ block }: { block: BlockquoteBlock }) {
  return (
    <blockquote className="rounded-[14px] border-l-2 border-[#d7b895] bg-[rgba(247,241,233,0.7)] px-4 py-3 text-zaki-secondary dark:border-[#73553e] dark:bg-[rgba(255,255,255,0.03)] dark:text-zaki-dark-subtle rtl:border-l-0 rtl:border-r-2">
      <div className="space-y-2.5">
        {block.blocks.map((child) => (
          <BlockRenderer key={child.id} block={child} nested />
        ))}
      </div>
    </blockquote>
  );
}

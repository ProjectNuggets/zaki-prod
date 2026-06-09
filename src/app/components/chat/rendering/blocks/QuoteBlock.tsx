import { BlockRenderer } from "../BlockRenderer";
import type { BlockquoteBlock } from "../types";

export function QuoteBlock({ block }: { block: BlockquoteBlock }) {
  return (
    <blockquote className="rounded-[14px] border-l-2 border-zaki-accent bg-zaki-sunken px-4 py-3 text-zaki-secondary dark:text-zaki-dark-subtle rtl:border-l-0 rtl:border-r-2">
      <div className="space-y-2.5">
        {block.blocks.map((child) => (
          <BlockRenderer key={child.id} block={child} nested />
        ))}
      </div>
    </blockquote>
  );
}

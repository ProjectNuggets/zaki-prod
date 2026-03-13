import { BlockRenderer } from "../BlockRenderer";
import type { BulletListBlock, MessageBlock, OrderedListBlock } from "../types";

function ItemBlocks({ blocks }: { blocks: MessageBlock[] }) {
  return (
    <div className="space-y-1.5">
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} nested />
      ))}
    </div>
  );
}

export function ListBlock({ block }: { block: BulletListBlock | OrderedListBlock }) {
  if (block.type === "ordered_list") {
    return (
      <ol className="space-y-2 pl-0 text-zaki-primary dark:text-zaki-dark-primary">
        {block.items.map((item, index) => (
          <li key={item.id} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-1.5">
            <span className="pt-0.5 text-right text-[13px] font-medium text-zaki-muted dark:text-zaki-dark-muted tabular-nums">
              {block.start + index}.
            </span>
            <ItemBlocks blocks={item.blocks} />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="space-y-2 pl-0 text-zaki-primary dark:text-zaki-dark-primary">
      {block.items.map((item) => (
        <li key={item.id} className="grid grid-cols-[0.85rem_minmax(0,1fr)] items-start gap-2">
          <span className="pt-[0.62rem] text-[10px] text-zaki-muted dark:text-zaki-dark-muted">•</span>
          <ItemBlocks blocks={item.blocks} />
        </li>
      ))}
    </ul>
  );
}

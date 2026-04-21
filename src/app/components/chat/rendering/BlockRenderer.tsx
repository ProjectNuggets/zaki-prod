import { memo } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./blocks/CodeBlock";
import { DownloadButtonBlock } from "./blocks/DownloadButtonBlock";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { ListBlock } from "./blocks/ListBlock";
import { ParagraphBlock } from "./blocks/ParagraphBlock";
import { QuoteBlock } from "./blocks/QuoteBlock";
import { TableBlock } from "./blocks/TableBlock";
import type { MessageBlock } from "./types";

type BlockRendererProps = { block: MessageBlock; nested?: boolean };

export const BlockRenderer = memo(
  function BlockRenderer({ block, nested = false }: BlockRendererProps) {
  switch (block.type) {
    case "paragraph":
      return <ParagraphBlock block={block} />;
    case "plain_text":
      return <p className="text-[15px] leading-[1.68] text-zaki-primary dark:text-zaki-dark-primary">{block.text}</p>;
    case "heading":
      return (
        <div className={cn(!nested && (block.level === 2 ? "pt-2" : "pt-1"))}>
          <HeadingBlock block={block} />
        </div>
      );
    case "bullet_list":
    case "ordered_list":
      return <ListBlock block={block} />;
    case "blockquote":
      return <QuoteBlock block={block} />;
    case "code_block":
    case "copy_prompt_block":
      return <CodeBlock block={block} />;
    case "thematic_break":
      return <hr className="border-t border-zaki-subtle/80 dark:border-zaki-dark" />;
    case "table":
      return <TableBlock block={block} />;
    case "image":
      return <ImageBlock block={block} />;
    case "download_button":
      return <DownloadButtonBlock block={block} />;
    case "saved_locally":
      return (
        <div
          data-testid="assistant-saved-locally"
          className="text-[11px] italic text-zaki-muted/70 dark:text-zaki-dark-muted/70"
        >
          saved locally
        </div>
      );
    case "callout":
      return (
        <div className="rounded-[14px] border border-zaki-subtle bg-[rgba(247,241,233,0.7)] px-4 py-3 dark:border-zaki-dark dark:bg-[rgba(255,255,255,0.03)]">
          {block.title ? (
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zaki-muted dark:text-zaki-dark-muted">
              {block.title}
            </div>
          ) : null}
          <div className="space-y-3">
            {block.blocks.map((child) => (
              <BlockRenderer key={child.id} block={child} nested />
            ))}
          </div>
        </div>
      );
    default:
      return null;
  }
  },
  (prev, next) => prev.block === next.block && prev.nested === next.nested,
);

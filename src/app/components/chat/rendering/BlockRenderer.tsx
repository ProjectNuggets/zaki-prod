import { memo } from "react";
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./blocks/CodeBlock";
import { DownloadButtonBlock } from "./blocks/DownloadButtonBlock";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { ListBlock } from "./blocks/ListBlock";
import { ParagraphBlock } from "./blocks/ParagraphBlock";
import { QuoteBlock } from "./blocks/QuoteBlock";
import { TableBlock } from "./blocks/TableBlock";
import { InlineTextRenderer } from "./InlineTextRenderer";
import type { InlineNode, MessageBlock } from "./types";

type BlockRendererProps = { block: MessageBlock; nested?: boolean };

function inlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text" || node.type === "inline_code") return node.text;
      if (node.type === "strong" || node.type === "emphasis" || node.type === "link") {
        return inlineText(node.children);
      }
      return "";
    })
    .join("");
}

function blockText(block: MessageBlock): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return inlineText(block.inlines);
    case "bullet_list":
    case "ordered_list":
      return block.items.map((item) => item.blocks.map(blockText).join("\n")).join("\n");
    case "blockquote":
      return block.blocks.map(blockText).join("\n");
    case "code_block":
      return block.code;
    case "copy_prompt_block":
      return block.text;
    case "table":
      return [
        block.caption || null,
        block.headers.map(inlineText).join("\t"),
        ...block.rows.map((row) => row.map(inlineText).join("\t")),
      ]
        .filter(Boolean)
        .join("\n");
    case "email":
      return emailDraftText(block);
    case "runtime_payload_suppressed":
      return `${block.title}\n${block.text}`;
    default:
      return "";
  }
}

function emailBodyText(block: Extract<MessageBlock, { type: "email" }>) {
  return block.body.map(blockText).filter(Boolean).join("\n\n").trim();
}

function emailDraftText(block: Extract<MessageBlock, { type: "email" }>) {
  const fields = block.fields.map((field) => `${field.label}: ${inlineText(field.inlines)}`);
  const attachments = block.attachments?.length
    ? [`Attachments: ${block.attachments.join(", ")}`]
    : [];
  return [...fields, ...attachments, "", emailBodyText(block)].join("\n").trim();
}

async function copyText(text: string) {
  if (!text.trim() || typeof navigator === "undefined" || !navigator.clipboard) return;
  await navigator.clipboard.writeText(text);
}

export const BlockRenderer = memo(
  function BlockRenderer({ block, nested = false }: BlockRendererProps) {
  switch (block.type) {
    case "paragraph":
      return <ParagraphBlock block={block} />;
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
    case "email":
      return (
        <section className="zaki-message-email" data-testid="message-email-draft" aria-label="Email draft">
          <div className="zaki-message-email__kicker">
            <span>Email draft</span>
            <span className="zaki-message-email__actions">
              <button
                type="button"
                onClick={() => void copyText(emailDraftText(block))}
                aria-label="Copy email draft"
              >
                <Copy className="size-3" aria-hidden />
                draft
              </button>
              <button
                type="button"
                onClick={() => void copyText(emailBodyText(block))}
                aria-label="Copy email body"
              >
                <Copy className="size-3" aria-hidden />
                body
              </button>
            </span>
          </div>
          <dl className="zaki-message-email__fields">
            {block.fields.map((field, index) => (
              <div key={`${field.label}-${index}`} className="zaki-message-email__field">
                <dt>{field.label}</dt>
                <dd>
                  <InlineTextRenderer nodes={field.inlines} prose />
                </dd>
              </div>
            ))}
          </dl>
          {block.body.length ? (
            <div className="zaki-message-email__body">
              {block.body.map((child) => (
                <BlockRenderer key={child.id} block={child} nested />
              ))}
            </div>
          ) : null}
          {block.attachments?.length ? (
            <div className="zaki-message-email__attachments" aria-label="Email attachments">
              <span>Attachments</span>
              {block.attachments.map((attachment) => (
                <code key={attachment}>{attachment}</code>
              ))}
            </div>
          ) : null}
        </section>
      );
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
    case "runtime_payload_suppressed":
      return (
        <div className="zaki-agent-runtime-suppressed" data-testid="agent-runtime-suppressed">
          <span>{block.title}</span>
          <p>{block.text}</p>
        </div>
      );
    default:
      return null;
  }
  },
  (prev, next) => prev.block === next.block && prev.nested === next.nested,
);

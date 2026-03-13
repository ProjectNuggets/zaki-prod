import type { CodeBlock, CopyPromptBlock, InlineNode, MessageBlock } from "./types";

export function nextIdFactory() {
  let index = 0;
  return (prefix: string) => `${prefix}-${index++}`;
}

export function sanitizeUrl(url: string | undefined): string | null {
  if (!url) return null;
  const safe = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(safe)) return safe;
  return null;
}

export function isMeaningfulInline(inlines: InlineNode[]) {
  return inlines.some((inline) => {
    if (inline.type === "text") return inline.text.trim().length > 0;
    if (inline.type === "inline_code") return inline.text.trim().length > 0;
    return true;
  });
}

export function normalizeTrailingFence(
  nextId: (prefix: string) => string,
  language: string | null,
  code: string,
): CodeBlock | CopyPromptBlock {
  const trimmedCode = code.replace(/\s+$/, "");
  const lowered = (language || "").toLowerCase();
  if (trimmedCode && ["bash", "sh", "shell", "zsh"].includes(lowered) && trimmedCode.split(/\r?\n/).length <= 4) {
    return {
      id: nextId("prompt"),
      type: "copy_prompt_block",
      label: language ? language.toUpperCase() : "COMMAND",
      text: trimmedCode,
      provisional: true,
    };
  }
  return {
    id: nextId("code"),
    type: "code_block",
    language,
    code: trimmedCode,
    provisional: true,
  };
}

export function coalesceBlocks(blocks: MessageBlock[]) {
  return blocks.reduce<MessageBlock[]>((acc, block) => {
    const previous = acc[acc.length - 1];
    if (block.type === "thematic_break" && previous?.type === "thematic_break") {
      return acc;
    }
    acc.push(block);
    return acc;
  }, []);
}

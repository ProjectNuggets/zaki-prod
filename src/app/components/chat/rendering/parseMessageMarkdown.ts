import { coalesceBlocks, isMeaningfulInline, nextIdFactory, normalizeTrailingFence, sanitizeUrl } from "./normalizeMessageAst";
import type { InlineNode, ListItemNode, MessageBlock, MessageDocument } from "./types";

function extractTrailingFence(
  text: string,
  nextId: (prefix: string) => string,
): { prefix: string; block: MessageBlock | null } {
  const fenceMatches = [...text.matchAll(/```([^\n`]*)/g)];
  if (fenceMatches.length % 2 === 0) return { prefix: text, block: null };
  const lastFence = fenceMatches[fenceMatches.length - 1];
  if (!lastFence || typeof lastFence.index !== "number") return { prefix: text, block: null };

  const prefix = text.slice(0, lastFence.index);
  const trailing = text.slice(lastFence.index);
  const firstNewline = trailing.indexOf("\n");
  const language = firstNewline === -1 ? trailing.slice(3).trim() : trailing.slice(3, firstNewline).trim();
  const code = firstNewline === -1 ? "" : trailing.slice(firstNewline + 1);
  return {
    prefix,
    block: normalizeTrailingFence(nextId, language || null, code),
  };
}

function isFence(line: string) {
  return /^```/.test(line.trim());
}

function isHeading(line: string) {
  return /^#{1,6}\s+/.test(line.trim());
}

function isBullet(line: string) {
  return /^\s*[-*+]\s+/.test(line);
}

function isOrdered(line: string) {
  return /^\s*\d+\.\s+/.test(line);
}

function isQuote(line: string) {
  return /^\s*>\s?/.test(line);
}

function isRule(line: string) {
  return /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line);
}

function isPotentialTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.includes("|") && !isFence(trimmed);
}

function isTableDivider(line: string) {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function looksLikeAutolinkBoundary(character: string | undefined) {
  return !character || /[\s(<{\[]/.test(character);
}

function trimAutolink(candidate: string) {
  let value = candidate;

  while (/[.,;:!?]$/.test(value)) {
    value = value.slice(0, -1);
  }

  while (
    value.endsWith(")") &&
    ((value.match(/\(/g)?.length || 0) < (value.match(/\)/g)?.length || 0))
  ) {
    value = value.slice(0, -1);
  }

  while (
    value.endsWith("]") &&
    ((value.match(/\[/g)?.length || 0) < (value.match(/\]/g)?.length || 0))
  ) {
    value = value.slice(0, -1);
  }

  return value;
}

function findAutolink(remaining: string): { index: number; raw: string; href: string } | null {
  const pattern = /(https?:\/\/[^\s<]+|mailto:[^\s<]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(remaining))) {
    const index = match.index;
    const raw = match[0] ?? "";
    const previous = index > 0 ? remaining[index - 1] : undefined;
    if (!looksLikeAutolinkBoundary(previous)) continue;

    const trimmed = trimAutolink(raw);
    const href = sanitizeUrl(trimmed.includes("@") && !/^mailto:/i.test(trimmed) ? `mailto:${trimmed}` : trimmed);
    if (!href) continue;

    return { index, raw: trimmed, href };
  }

  return null;
}

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const remaining = text.slice(cursor);

    if (remaining.startsWith("`")) {
      const close = remaining.indexOf("`", 1);
      if (close > 0) {
        nodes.push({ type: "inline_code", text: remaining.slice(1, close) });
        cursor += close + 1;
        continue;
      }
    }

    if (remaining.startsWith("**")) {
      const close = remaining.indexOf("**", 2);
      const inner = close > 1 ? remaining.slice(2, close) : "";
      if (close > 1 && inner.trim().length > 0) {
        nodes.push({ type: "strong", children: parseInline(inner) });
        cursor += close + 2;
        continue;
      }
    }

    if (remaining.startsWith("*")) {
      const close = remaining.indexOf("*", 1);
      const inner = close > 0 ? remaining.slice(1, close) : "";
      if (close > 0 && inner.trim().length > 0) {
        nodes.push({ type: "emphasis", children: parseInline(inner) });
        cursor += close + 1;
        continue;
      }
    }

    if (remaining.startsWith("[")) {
      const labelEnd = remaining.indexOf("]");
      const urlStart = remaining.indexOf("(", labelEnd);
      const urlEnd = remaining.indexOf(")", urlStart);
      if (labelEnd > 0 && urlStart === labelEnd + 1 && urlEnd > urlStart) {
        const href = sanitizeUrl(remaining.slice(urlStart + 1, urlEnd));
        const label = remaining.slice(1, labelEnd);
        if (href) {
          nodes.push({ type: "link", href, children: parseInline(label) });
        } else {
          nodes.push({ type: "text", text: remaining.slice(0, urlEnd + 1) });
        }
        cursor += urlEnd + 1;
        continue;
      }
    }

    const autolink = findAutolink(remaining);
    if (autolink?.index === 0) {
      nodes.push({ type: "link", href: autolink.href, children: [{ type: "text", text: autolink.raw }] });
      cursor += autolink.raw.length;
      continue;
    }

    const nextSpecial = remaining.search(/(`|\*\*|\*|\[)/);
    const nextAutolink = autolink?.index ?? -1;
    const nextBoundary =
      nextSpecial === -1
        ? nextAutolink
        : nextAutolink === -1
          ? nextSpecial
          : Math.min(nextSpecial, nextAutolink);

    if (nextBoundary === -1) {
      nodes.push({ type: "text", text: remaining });
      break;
    }

    if (nextBoundary > 0) {
      nodes.push({ type: "text", text: remaining.slice(0, nextBoundary) });
      cursor += nextBoundary;
      continue;
    }

    nodes.push({ type: "text", text: remaining[0] ?? "" });
    cursor += 1;
  }

  return nodes.filter((node) => node.type !== "text" || node.text.length > 0);
}

function splitTableCells(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => parseInline(cell.trim()));
}

function consumeParagraph(lines: string[], start: number, nextId: (prefix: string) => string): { next: number; block: MessageBlock | null } {
  const collected: string[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) break;
    if (isHeading(line) || isBullet(line) || isOrdered(line) || isQuote(line) || isRule(line) || isFence(line)) break;
    if (isPotentialTableLine(line) && index + 1 < lines.length && isTableDivider(lines[index + 1] ?? "")) break;
    collected.push(line.trim());
    index += 1;
  }

  const inlines = parseInline(collected.join("\n"));
  if (!isMeaningfulInline(inlines)) {
    return { next: index, block: null };
  }

  return {
    next: index,
    block: {
      id: nextId("p"),
      type: "paragraph",
      inlines,
    },
  };
}

function consumeList(
  lines: string[],
  start: number,
  nextId: (prefix: string) => string,
  ordered: boolean,
): { next: number; block: MessageBlock | null } {
  const items: ListItemNode[] = [];
  let index = start;
  const matcher = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;

  while (index < lines.length && matcher.test(lines[index] ?? "")) {
    const contentLines = [(lines[index] ?? "").replace(matcher, "").trim()];
    let lookahead = index + 1;
    while (
      lookahead < lines.length &&
      (lines[lookahead] ?? "").trim() &&
      !matcher.test(lines[lookahead] ?? "") &&
      !isHeading(lines[lookahead] ?? "") &&
      !isQuote(lines[lookahead] ?? "") &&
      !isRule(lines[lookahead] ?? "") &&
      !isFence(lines[lookahead] ?? "")
    ) {
      contentLines.push((lines[lookahead] ?? "").trim());
      lookahead += 1;
    }
    const paragraph = {
      id: nextId("p"),
      type: "paragraph" as const,
      inlines: parseInline(contentLines.join("\n")),
    };
    items.push({
      id: nextId("li"),
      blocks: paragraph.inlines.length ? [paragraph] : [],
    });
    index = lookahead;
  }

  if (items.length === 0) return { next: start, block: null };
  return {
    next: index,
    block: ordered
      ? {
          id: nextId("list"),
          type: "ordered_list",
          start: Number((lines[start] ?? "").match(/^\s*(\d+)\./)?.[1] || "1"),
          items,
        }
      : {
          id: nextId("list"),
          type: "bullet_list",
          items,
        },
  };
}

function consumeQuote(lines: string[], start: number, nextId: (prefix: string) => string): { next: number; block: MessageBlock | null } {
  const quoteLines: string[] = [];
  let index = start;

  while (index < lines.length && isQuote(lines[index] ?? "")) {
    quoteLines.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
    index += 1;
  }

  const nested = parseBlocks(quoteLines, nextId);
  return {
    next: index,
    block: nested.length
      ? {
          id: nextId("quote"),
          type: "blockquote",
          blocks: nested,
        }
      : null,
  };
}

function consumeCode(lines: string[], start: number, nextId: (prefix: string) => string): { next: number; block: MessageBlock | null } {
  const language = (lines[start] ?? "").trim().replace(/^```/, "").trim() || null;
  const body: string[] = [];
  let index = start + 1;

  while (index < lines.length && !isFence(lines[index] ?? "")) {
    body.push(lines[index] ?? "");
    index += 1;
  }

  const normalized = normalizeTrailingFence(nextId, language, body.join("\n"));
  normalized.provisional = index >= lines.length;
  return {
    next: index >= lines.length ? index : index + 1,
    block: normalized,
  };
}

function consumeTable(lines: string[], start: number, nextId: (prefix: string) => string): { next: number; block: MessageBlock | null } {
  if (start + 1 >= lines.length || !isTableDivider(lines[start + 1] ?? "")) {
    return { next: start, block: null };
  }

  const headers = splitTableCells(lines[start] ?? "");
  if (headers.length < 2) {
    return { next: start, block: null };
  }
  const rows: InlineNode[][][] = [];
  let index = start + 2;

  while (index < lines.length && isPotentialTableLine(lines[index] ?? "")) {
    const cells = splitTableCells(lines[index] ?? "");
    if (cells.length < 2) break;
    rows.push(cells);
    index += 1;
  }

  return {
    next: index,
    block: {
      id: nextId("table"),
      type: "table",
      headers,
      rows,
    },
  };
}

const EMAIL_HEADER_RE = /^\s*(to|from|cc|bcc|subject|reply-to):\s*(.*)$/i;

function normalizeEmailHeaderLabel(label: string) {
  const lowered = label.trim().toLowerCase();
  if (lowered === "cc") return "CC";
  if (lowered === "bcc") return "BCC";
  if (lowered === "reply-to") return "Reply-To";
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

function consumeEmailDraft(lines: string[], start: number, nextId: (prefix: string) => string): { next: number; block: MessageBlock | null } {
  const fields: Array<{ label: string; inlines: InlineNode[]; key: string }> = [];
  let index = start;

  while (index < lines.length) {
    const match = (lines[index] ?? "").match(EMAIL_HEADER_RE);
    if (!match) break;
    const key = String(match[1] || "").trim().toLowerCase();
    const value = String(match[2] || "").trim();
    fields.push({
      key,
      label: normalizeEmailHeaderLabel(key),
      inlines: parseInline(value),
    });
    index += 1;
  }

  const hasRecipient = fields.some((field) => ["to", "cc", "bcc"].includes(field.key));
  const hasSubject = fields.some((field) => field.key === "subject");
  if (fields.length < 2 || !hasSubject || !hasRecipient) {
    return { next: start, block: null };
  }

  if (index < lines.length && !(lines[index] ?? "").trim()) {
    index += 1;
  }

  const bodyLines: string[] = [];
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (isRule(line)) break;
    bodyLines.push(line);
    index += 1;
  }

  return {
    next: index,
    block: {
      id: nextId("email"),
      type: "email",
      fields: fields.map(({ label, inlines }) => ({ label, inlines })),
      body: parseBlocks(bodyLines, nextId),
    },
  };
}

function parseBlocks(lines: string[], nextId: (prefix: string) => string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isFence(line)) {
      const { next, block } = consumeCode(lines, index, nextId);
      if (block) blocks.push(block);
      index = next;
      continue;
    }

    const table = consumeTable(lines, index, nextId);
    if (table.block) {
      blocks.push(table.block);
      index = table.next;
      continue;
    }

    const email = consumeEmailDraft(lines, index, nextId);
    if (email.block) {
      blocks.push(email.block);
      index = email.next;
      continue;
    }

    if (isHeading(line)) {
      const depth = line.match(/^(#{1,6})\s+/)?.[1]?.length || 2;
      blocks.push({
        id: nextId("h"),
        type: "heading",
        level: depth <= 2 ? 2 : 3,
        inlines: parseInline(line.replace(/^#{1,6}\s+/, "").trim()),
      });
      index += 1;
      continue;
    }

    if (isRule(line)) {
      blocks.push({
        id: nextId("hr"),
        type: "thematic_break",
      });
      index += 1;
      continue;
    }

    if (isQuote(line)) {
      const { next, block } = consumeQuote(lines, index, nextId);
      if (block) blocks.push(block);
      index = next;
      continue;
    }

    if (isOrdered(line)) {
      const { next, block } = consumeList(lines, index, nextId, true);
      if (block) blocks.push(block);
      index = next;
      continue;
    }

    if (isBullet(line)) {
      const { next, block } = consumeList(lines, index, nextId, false);
      if (block) blocks.push(block);
      index = next;
      continue;
    }

    const paragraph = consumeParagraph(lines, index, nextId);
    if (paragraph.block) blocks.push(paragraph.block);
    index = Math.max(paragraph.next, index + 1);
  }

  return coalesceBlocks(blocks);
}

export function parseMessageMarkdown(content: string, options?: { streaming?: boolean }): MessageDocument {
  const text = String(content || "");
  if (!text.trim()) return { blocks: [] };

  const nextId = nextIdFactory();
  const { prefix, block } = options?.streaming ? extractTrailingFence(text, nextId) : { prefix: text, block: null };
  const document: MessageDocument = {
    blocks: parseBlocks(prefix.split(/\r?\n/), nextId),
  };
  if (block) document.blocks.push(block);
  return document;
}

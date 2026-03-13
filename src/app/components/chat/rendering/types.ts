export type MessageDocument = {
  blocks: MessageBlock[];
};

type BlockBase = {
  id: string;
};

export type MessageBlock =
  | ParagraphBlock
  | HeadingBlock
  | BulletListBlock
  | OrderedListBlock
  | BlockquoteBlock
  | CodeBlock
  | ThematicBreakBlock
  | TableBlock
  | CalloutBlock
  | CopyPromptBlock
  | PlainTextBlock;

export type ParagraphBlock = BlockBase & {
  type: "paragraph";
  inlines: InlineNode[];
};

export type HeadingBlock = BlockBase & {
  type: "heading";
  level: 2 | 3;
  inlines: InlineNode[];
};

export type BulletListBlock = BlockBase & {
  type: "bullet_list";
  items: ListItemNode[];
};

export type OrderedListBlock = BlockBase & {
  type: "ordered_list";
  start: number;
  items: ListItemNode[];
};

export type ListItemNode = {
  id: string;
  blocks: MessageBlock[];
};

export type BlockquoteBlock = BlockBase & {
  type: "blockquote";
  blocks: MessageBlock[];
};

export type CodeBlock = BlockBase & {
  type: "code_block";
  language: string | null;
  code: string;
  provisional?: boolean;
};

export type TableBlock = BlockBase & {
  type: "table";
  headers: InlineNode[][];
  rows: InlineNode[][][];
};

export type ThematicBreakBlock = BlockBase & {
  type: "thematic_break";
};

export type PlainTextBlock = BlockBase & {
  type: "plain_text";
  text: string;
};

export type CalloutBlock = BlockBase & {
  type: "callout";
  tone: "neutral" | "tip" | "note";
  title?: string | null;
  blocks: MessageBlock[];
};

export type CopyPromptBlock = BlockBase & {
  type: "copy_prompt_block";
  label?: string | null;
  text: string;
  provisional?: boolean;
};

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "emphasis"; children: InlineNode[] }
  | { type: "inline_code"; text: string }
  | { type: "link"; href: string; children: InlineNode[] };

const TOOL_MARKUP_BLOCK =
  /<\s*tool[\s_-]*(?:call|result)\b[^>]*>[\s\S]*?<\s*\/\s*tool[\s_-]*(?:call|result)\s*>/gi;
const TOOL_MARKUP_PARTIAL = /<\s*tool[\s_-]*(?:call|result)\b[\s\S]*$/gi;
const TOOL_MARKUP_TAG = /<\s*\/?\s*tool[\s_-]*(?:call|result)\b[^>]*>/gi;
const BROKEN_TOOL_MARKUP_TAG =
  /(?:^|[\s([{])(?:[(/\\]*\s*)?(?:t?ool|tool)[\s_-]*(?:call|result)\s*>/gi;

export function stripToolCallMarkup(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(TOOL_MARKUP_BLOCK, "")
    .replace(TOOL_MARKUP_PARTIAL, "")
    .replace(TOOL_MARKUP_TAG, "")
    .replace(BROKEN_TOOL_MARKUP_TAG, " ")
    .trim();
}

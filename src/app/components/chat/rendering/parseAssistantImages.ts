import { parseMessageMarkdown } from "./parseMessageMarkdown";
import type { MessageBlock } from "./types";

// SVG intentionally excluded — can carry inline script.
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)(?:\?[^\s]*)?$/i;
const TOGETHER_HOST_RE = /^https:\/\/api\.together\.xyz\//i;
const TOGETHER_S3_HOST_RE = /^https:\/\/together-ai-uploaded-user-images\.s3\.us-east-2\.amazonaws\.com\//i;
const MARKDOWN_IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
const SAVED_LINE_RE = /^\s*Saved:\s*\/workspace\/images\/\S+\s*$/i;
const DOWNLOAD_LINE_RE = /^\s*Download:\s*(https?:\/\/\S+)\s*$/i;
const BARE_IMAGE_LINE_RE = /^\s*(https?:\/\/\S+)\s*$/i;
const FENCE_RE = /^\s*```/;
// Workspace-saved media sentinels emitted by the agent. We hide the absolute
// filesystem path from the user: [IMAGE:/abs/...] collapses to a "saved
// locally" indicator, [AUDIO:...] and [VOICE:...] disappear silently.
const IMAGE_SENTINEL_GLOBAL_RE = /\[IMAGE:[^\]\n]+\]/g;
const AUDIO_SENTINEL_GLOBAL_RE = /\[(?:AUDIO|VOICE):[^\]\n]+\]/g;

function isImageUrl(url: string): boolean {
  if (TOGETHER_HOST_RE.test(url)) return true;
  if (TOGETHER_S3_HOST_RE.test(url)) return true;
  return IMAGE_EXT_RE.test(url);
}

// Isolate markdown image tokens onto their own lines so they can be hoisted
// out of prose into standalone blocks — but only outside fenced code blocks,
// where `![...](...)` must be preserved verbatim.
function splitAroundMarkdownImages(text: string): string {
  const lines = text.split(/\r?\n/);
  let inFence = false;
  const out: string[] = [];
  for (const line of lines) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    out.push(line.replace(MARKDOWN_IMAGE_RE, (match) => `\n${match}\n`));
  }
  return out.join("\n");
}

type PreBlock =
  | { kind: "markdown"; text: string }
  | { kind: "image"; url: string; alt: string }
  | { kind: "download"; url: string }
  | { kind: "saved" };

function classifyLines(content: string): PreBlock[] {
  const normalized = splitAroundMarkdownImages(content);
  const lines = normalized.split(/\r?\n/);
  const out: PreBlock[] = [];
  const seen = new Set<string>();
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n");
    if (text.trim()) out.push({ kind: "markdown", text });
    buffer = [];
  };

  for (const rawLine of lines) {
    let line = rawLine;

    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      buffer.push(line);
      continue;
    }
    if (inFence) {
      buffer.push(line);
      continue;
    }

    // Strip [AUDIO:/path] / [VOICE:/path] sentinels silently (web auto-TTS
    // isn't shipped; if they leak, never expose the filesystem path).
    line = line.replace(AUDIO_SENTINEL_GLOBAL_RE, "");

    // [IMAGE:/abs/workspace/path] — workspace-saved image with no URL. Hide
    // the path and show the same discreet "saved locally" indicator we use
    // for the "Saved:" text line.
    let sawImageSentinel = false;
    line = line.replace(IMAGE_SENTINEL_GLOBAL_RE, () => {
      sawImageSentinel = true;
      return "";
    });
    if (sawImageSentinel && !line.trim()) {
      flush();
      out.push({ kind: "saved" });
      continue;
    }

    const trimmed = line.trim();
    const mdMatch = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)\s*$/.exec(trimmed);
    if (mdMatch) {
      flush();
      const url = mdMatch[2] ?? "";
      const alt = mdMatch[1] ?? "generated image";
      if (url) {
        seen.add(url);
        out.push({ kind: "image", url, alt });
      }
      continue;
    }

    if (SAVED_LINE_RE.test(line)) {
      flush();
      out.push({ kind: "saved" });
      continue;
    }

    const downloadMatch = DOWNLOAD_LINE_RE.exec(line);
    if (downloadMatch) {
      const url = downloadMatch[1] ?? "";
      if (url && seen.has(url)) {
        flush();
        out.push({ kind: "download", url });
        continue;
      }
    }

    const bareMatch = BARE_IMAGE_LINE_RE.exec(line);
    if (bareMatch) {
      const url = bareMatch[1] ?? "";
      if (url && isImageUrl(url)) {
        if (seen.has(url)) {
          // Already rendered above — drop the duplicate bare URL.
          flush();
          continue;
        }
        flush();
        seen.add(url);
        out.push({ kind: "image", url, alt: "generated image" });
        continue;
      }
    }

    buffer.push(line);
  }
  flush();

  return out;
}

export function parseAssistantContent(
  content: string,
  options?: { streaming?: boolean },
): MessageBlock[] {
  const text = String(content || "");
  if (!text.trim()) return [];

  const pre = classifyLines(text);
  const blocks: MessageBlock[] = [];
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}-${counter++}`;

  for (const item of pre) {
    if (item.kind === "markdown") {
      const doc = parseMessageMarkdown(item.text, options);
      for (const block of doc.blocks) {
        blocks.push({ ...block, id: nextId(block.type) });
      }
    } else if (item.kind === "image") {
      blocks.push({
        id: nextId("img"),
        type: "image",
        url: item.url,
        alt: item.alt,
      });
    } else if (item.kind === "download") {
      blocks.push({ id: nextId("dl"), type: "download_button", url: item.url });
    } else if (item.kind === "saved") {
      blocks.push({ id: nextId("saved"), type: "saved_locally" });
    }
  }

  return blocks;
}

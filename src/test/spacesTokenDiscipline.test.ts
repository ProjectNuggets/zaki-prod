/**
 * @jest-environment node
 */
import fs from "fs";
import path from "path";

/**
 * DESIGN.md product law: "No hardcoded hex colors in components unless
 * explicitly documented." This guard enforces it for the Chat/Spaces spoke.
 *
 * The single documented exception is src/styles/spaces-classic.css (the pattern
 * retune + curated swatch palette) — a stylesheet, not a component, and not in
 * this list. Component code must reference the V2 (--v2-) and zaki- tokens, or
 * the swatch vars from spaceSwatches.ts (which holds var() names, no literals).
 */

const SRC = path.resolve(__dirname, "..");

const FILES = [
  "app/components/chat/views/SpacesView.tsx",
  "app/components/chat/views/SpaceDetailView.tsx",
  "app/components/chat/views/ZakiHomeView.tsx",
  "app/components/chat/EmptyState.tsx",
  "app/components/chat/views/ReadyState.tsx",
  "app/components/chat/modals/CreateSpaceModal.tsx",
  "app/components/chat/modals/EditInstructionsModal.tsx",
  "app/components/chat/QuickReplyChips.tsx",
  "app/components/chat/rendering/InlineTextRenderer.tsx",
  "app/components/chat/rendering/BlockRenderer.tsx",
  "app/components/chat/rendering/blocks/QuoteBlock.tsx",
  "app/components/chat/rendering/blocks/TableBlock.tsx",
  "app/components/chat/rendering/blocks/CodeBlock.tsx",
  "app/components/chat/rendering/blocks/DownloadButtonBlock.tsx",
  "app/components/sidebar/SpaceSettingsSheet.tsx",
  "app/components/sidebar/ProfileMenu.tsx",
  "app/components/sidebar/ZakiSessionList.tsx",
  "app/components/sidebar/DeleteConfirmModal.tsx",
  // Sidebar.tsx is large and shared across spokes; tracked separately so its
  // remaining cleanup can land in its own step without blocking the others.
  "app/components/Sidebar.tsx",
];

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const RGBA = /\brgba?\(/;

function offendingLines(src: string): string[] {
  const out: string[] = [];
  src.split("\n").forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, ""); // strip line comments
    if (HEX.test(code) || RGBA.test(code)) {
      out.push(`${i + 1}: ${line.trim()}`);
    }
  });
  return out;
}

describe("Spaces token discipline (DESIGN.md: no hardcoded hex in components)", () => {
  for (const rel of FILES) {
    it(`${rel} has no hardcoded color literals`, () => {
      const file = path.join(SRC, rel);
      const src = fs.readFileSync(file, "utf8");
      expect(offendingLines(src)).toEqual([]);
    });
  }
});

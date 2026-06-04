import { describe, expect, it } from "@jest/globals";
import { parseMessageMarkdown } from "./parseMessageMarkdown";

describe("parseMessageMarkdown", () => {
  it("creates autolinks for plain URLs and trims trailing punctuation", () => {
    const document = parseMessageMarkdown("Open https://example.com/docs.");
    const paragraph = document.blocks[0];
    expect(paragraph).toMatchObject({ type: "paragraph" });
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("expected paragraph block");
    }
    expect(paragraph.inlines).toMatchObject([
      { type: "text", text: "Open " },
      {
        type: "link",
        href: "https://example.com/docs",
        children: [{ type: "text", text: "https://example.com/docs" }],
      },
      { type: "text", text: "." },
    ]);
  });

  it("keeps URLs inside inline code as code, not links", () => {
    const document = parseMessageMarkdown("Use `https://example.com` as input.");
    const paragraph = document.blocks[0];
    expect(paragraph).toMatchObject({ type: "paragraph" });
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("expected paragraph block");
    }
    expect(paragraph.inlines).toEqual([
      { type: "text", text: "Use " },
      { type: "inline_code", text: "https://example.com" },
      { type: "text", text: " as input." },
    ]);
  });

  it("creates mail links for plain email addresses", () => {
    const document = parseMessageMarkdown("Email alaa@example.com for access.");
    const paragraph = document.blocks[0];
    expect(paragraph).toMatchObject({ type: "paragraph" });
    if (!paragraph || paragraph.type !== "paragraph") {
      throw new Error("expected paragraph block");
    }
    expect(paragraph.inlines).toMatchObject([
      { type: "text", text: "Email " },
      {
        type: "link",
        href: "mailto:alaa@example.com",
        children: [{ type: "text", text: "alaa@example.com" }],
      },
      { type: "text", text: " for access." },
    ]);
  });

  it("downgrades h1 and deep headings into the supported heading scale", () => {
    const document = parseMessageMarkdown("# Title\n\n#### Deep");
    const headings = document.blocks.filter((block) => block.type === "heading");
    expect(headings).toHaveLength(2);
    expect(headings[0]).toMatchObject({ level: 2 });
    expect(headings[1]).toMatchObject({ level: 3 });
  });

  it("keeps explicit markdown tables as table blocks", () => {
    const document = parseMessageMarkdown("| A | B |\n| --- | --- |\n| 1 | 2 |");
    expect(document.blocks.some((block) => block.type === "table")).toBe(true);
  });

  it("renders draft email headers as an email block", () => {
    const document = parseMessageMarkdown(
      "To: alaa@example.com\nSubject: Launch update\n\nHi Alaa,\n\nThe report is attached.",
    );
    const email = document.blocks[0];
    expect(email).toMatchObject({ type: "email" });
    if (!email || email.type !== "email") {
      throw new Error("expected email block");
    }
    expect(email.fields.map((field) => field.label)).toEqual(["To", "Subject"]);
    expect(email.body.length).toBeGreaterThan(0);
  });

  it("creates a provisional code block while a fenced block is still incomplete during streaming", () => {
    const document = parseMessageMarkdown("Before\n\n```bash\nnpm run dev", { streaming: true });
    const lastBlock = document.blocks[document.blocks.length - 1];
    expect(lastBlock).toMatchObject({
      type: "copy_prompt_block",
      provisional: true,
      text: "npm run dev",
    });
  });

  it("uses unique block IDs when a provisional trailing fence is appended during streaming", () => {
    const document = parseMessageMarkdown("Intro\n\n## Steps\n\n```bash\nnpm run dev", { streaming: true });
    const ids = document.blocks.map((block) => block.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not misclassify prose with pipes as a table", () => {
    const document = parseMessageMarkdown("Use a | b | c in prose\nwithout a divider.");
    expect(document.blocks.some((block) => block.type === "table")).toBe(false);
  });
});

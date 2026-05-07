import {
  learningNotebookExportFilename,
  learningNotebookMarkdown,
  learningNotebookRecordExportFilename,
  learningNotebookRecordMarkdown,
} from "./learningNotebookExport";

describe("learning notebook Markdown export", () => {
  it("exports notebook metadata and saved record content", () => {
    const markdown = learningNotebookMarkdown(
      {
        id: "nb-1",
        name: "Newton Notes",
        description: "Classical mechanics study notes.",
        updated_at: "2026-05-07T10:00:00.000Z",
      },
      [
        {
          id: "rec-1",
          title: "Momentum lesson",
          type: "chat",
          summary: "Explains conservation of momentum.",
          user_query: "Teach me momentum.",
          output: "Momentum is conserved in a closed system.",
          metadata: { source: "chat" },
          created_at: "2026-05-07T09:00:00.000Z",
        },
      ],
    );

    expect(markdown).toContain("# Newton Notes");
    expect(markdown).toContain("Classical mechanics study notes.");
    expect(markdown).toContain("Records: 1");
    expect(markdown).toContain("## Momentum lesson");
    expect(markdown).toContain("- Type: chat");
    expect(markdown).toContain("### Summary");
    expect(markdown).toContain("Explains conservation of momentum.");
    expect(markdown).toContain("### Query");
    expect(markdown).toContain("Teach me momentum.");
    expect(markdown).toContain("### Output");
    expect(markdown).toContain("Momentum is conserved in a closed system.");
  });

  it("uses safe filenames for notebooks and records", () => {
    const notebook = { name: "Physics / Week 1: Forces?" };
    const record = { title: "Q&A: mass * acceleration" };

    expect(learningNotebookExportFilename(notebook)).toBe("Physics-Week-1-Forces.md");
    expect(learningNotebookRecordExportFilename(notebook, record, 0)).toBe(
      "Physics-Week-1-Forces-QA-mass-acceleration.md",
    );
  });

  it("preserves empty records as explicit Markdown", () => {
    expect(learningNotebookRecordMarkdown({ title: "Empty" }, 0)).toContain("_No output saved._");
    expect(learningNotebookMarkdown({ title: "Empty notebook" })).toContain("_No records saved._");
  });
});

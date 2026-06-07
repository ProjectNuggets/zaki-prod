import { describe, expect, it } from "@jest/globals";
import { normalizeAssistantDisplayText } from "./agentReplyPresentation";
import { parseAssistantContent } from "./parseAssistantImages";

describe("Agent reply presentation", () => {
  it("suppresses standalone runtime JSON in Agent replies", () => {
    const blocks = parseAssistantContent(
      '{"eventType":"tool_result","tool":"shell","output_preview":"secret output"}',
      { agentReply: true },
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "runtime_payload_suppressed",
      title: "No final reply",
    });
  });

  it("suppresses fenced runtime JSON without hiding normal fenced JSON", () => {
    const runtimeBlocks = parseAssistantContent(
      '```json\n{"type":"tool_result","tool":"file_read","output_preview":"raw"}\n```',
      { agentReply: true },
    );
    const normalBlocks = parseAssistantContent(
      '```json\n{"status":"ok","items":[1,2]}\n```',
      { agentReply: true },
    );

    expect(runtimeBlocks[0]).toMatchObject({ type: "runtime_payload_suppressed" });
    expect(normalBlocks[0]).toMatchObject({ type: "code_block", language: "json" });
  });

  it("removes embedded tool-result JSON while preserving surrounding prose", () => {
    const display = normalizeAssistantDisplayText(
      'I created the report.\n{"type":"tool_result","tool":"file_write","output_preview":"raw"}\nThe document is ready.',
      { agentReply: true },
    );

    expect(display).toBe("I created the report.\n\nThe document is ready.");
    expect(display).not.toContain("tool_result");
    expect(display).not.toContain("output_preview");
  });

  it("suppresses runtime arrays and tool_result-key payloads before table detection", () => {
    const runtimeArray = parseAssistantContent(
      JSON.stringify([
        { eventType: "tool_result", tool: "shell", output_preview: "raw" },
        { eventType: "tool_result", tool: "browser", output_preview: "raw" },
      ]),
      { agentReply: true },
    );
    const toolResultKey = parseAssistantContent(
      JSON.stringify({
        tool_result: { output: "raw" },
        tool: "shell",
      }),
      { agentReply: true },
    );

    expect(runtimeArray[0]).toMatchObject({ type: "runtime_payload_suppressed" });
    expect(toolResultKey[0]).toMatchObject({ type: "runtime_payload_suppressed" });
  });

  it("preserves generic JSON arrays instead of turning them into tables", () => {
    const content = '[{"name":"Personal","price":"$13"},{"name":"Student","price":"$8"}]';
    const display = normalizeAssistantDisplayText(content, { agentReply: true });
    const blocks = parseAssistantContent(content, { agentReply: true });

    expect(display).toBe(content);
    expect(blocks[0]).toMatchObject({ type: "paragraph" });
  });

  it("converts recognized email JSON into an email block", () => {
    const blocks = parseAssistantContent(
      JSON.stringify({
        type: "email_draft",
        to: ["alaa@example.com"],
        cc: "ops@example.com",
        subject: "Launch update",
        body: "Hi Alaa,\n\nThe report is attached.",
        attachments: [{ name: "launch.pdf" }],
      }),
      { agentReply: true },
    );

    expect(blocks[0]).toMatchObject({
      type: "email",
      attachments: ["launch.pdf"],
    });
    if (blocks[0]?.type !== "email") throw new Error("expected email block");
    expect(blocks[0].fields.map((field) => field.label)).toEqual(["To", "CC", "Subject"]);
  });

  it("converts recognized table JSON into a table block with caption", () => {
    const blocks = parseAssistantContent(
      JSON.stringify({
        type: "table",
        caption: "Plan options",
        columns: ["Plan", "Price"],
        rows: [
          ["Personal", "$13"],
          ["Student", "$8"],
        ],
      }),
      { agentReply: true },
    );

    expect(blocks[0]).toMatchObject({
      type: "table",
      caption: "Plan options",
    });
  });

  it("does not flash partial runtime JSON while streaming", () => {
    const blocks = parseAssistantContent('```json\n{"type":"tool_result","tool":', {
      agentReply: true,
      streaming: true,
    });

    expect(blocks[0]).toMatchObject({ type: "runtime_payload_suppressed" });
  });

  it("does not flash partial runtime JSON after prose while streaming", () => {
    const display = normalizeAssistantDisplayText(
      'The report is ready.\n{"eventType":"tool_result","tool":"shell"',
      { agentReply: true, streaming: true },
    );

    expect(display).toBe("The report is ready.");
  });
});

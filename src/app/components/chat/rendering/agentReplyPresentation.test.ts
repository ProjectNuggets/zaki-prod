import { describe, expect, it } from "@jest/globals";
import {
  isInternalAgentReplyContent,
  normalizeAssistantDisplayText,
} from "./agentReplyPresentation";
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

  it("suppresses compact gateway tool preview JSON from Agent replies", () => {
    const content = JSON.stringify({
      tool: "web_search",
      status: "ok",
      partial: false,
      original_bytes: 2024,
      shown_bytes: 2024,
      result_hash: "ec1462c0aa4d1909",
      content_preview: "Results for: personal AI agents market 2025 2026",
    });
    const blocks = parseAssistantContent(content, { agentReply: true });
    const display = normalizeAssistantDisplayText(content, { agentReply: true });

    expect(blocks[0]).toMatchObject({ type: "runtime_payload_suppressed" });
    expect(display).toBe("");
    expect(isInternalAgentReplyContent(content)).toBe(true);
  });

  it("removes embedded compact gateway JSON while preserving the final answer", () => {
    const content = [
      "I now have enough market data.",
      JSON.stringify({
        tool: "artifact_create",
        status: "error",
        partial: false,
        original_bytes: 47,
        shown_bytes: 47,
        result_hash: "73d8519bda4904f7",
        content_preview: "Approval required. Use /approve allow-once|deny",
      }),
      "Done — your report is live in the side panel.",
    ].join("\n\n");
    const display = normalizeAssistantDisplayText(content, { agentReply: true });

    expect(display).toContain("I now have enough market data.");
    expect(display).toContain("Done — your report is live in the side panel.");
    expect(display).not.toContain("artifact_create");
    expect(display).not.toContain("content_preview");
    expect(display).not.toContain("/approve");
  });

  it("suppresses approved tool execution observations", () => {
    const observation =
      "[Approved tool execution: id=1 tool=artifact_create status=succeeded] Output: Created artifact 'Personal AI Agent Market Report' (id=abc, kind=markdown, version=1, url=/api/v1/users/1/artifacts/abc)\nContinue your reasoning based on this tool result. Produce the next step for the user.";
    const content = `${observation}\n\nDone — your report is live in the side panel.`;
    const display = normalizeAssistantDisplayText(content, { agentReply: true });

    expect(normalizeAssistantDisplayText(observation, { agentReply: true })).toBe("");
    expect(isInternalAgentReplyContent(observation)).toBe(true);
    expect(display).toBe("Done — your report is live in the side panel.");
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

  it("strips master-prompt scaffold from a rendered agent reply", () => {
    const leaked =
      "Here is your plan.\n\n## Brain Architecture\nLayer 0 — Working memory.\n\n" +
      "[[ZAKI_MEMORY_CONTEXT_V2]]private[[/ZAKI_MEMORY_CONTEXT_V2]]";
    const blocks = parseAssistantContent(leaked, { agentReply: true });
    const text = JSON.stringify(blocks);
    expect(text).toContain("Here is your plan.");
    expect(text).not.toMatch(/Brain Architecture/);
    expect(text).not.toMatch(/Layer 0/);
    expect(text).not.toMatch(/ZAKI_MEMORY_CONTEXT/);
    expect(text).not.toContain("private");
  });
});

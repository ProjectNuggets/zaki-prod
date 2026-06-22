import { describe, expect, it } from "@jest/globals";
import {
  buildAgentInspectorPanelModel,
  isAgentArtifactEntry,
  isAgentBrowserEntry,
  isAgentCronEntry,
  isAgentSourceEntry,
} from "./AgentInspectorPanelModel";
import type { NullalisTranscriptEntry } from "./BotStatusRail";

function entry(overrides: Partial<NullalisTranscriptEntry>): NullalisTranscriptEntry {
  return {
    id: "entry",
    kind: "status",
    text: "event",
    timestamp: 1,
    ...overrides,
  };
}

describe("AgentInspectorPanelModel", () => {
  it("routes concrete source evidence to Sources", () => {
    const memory = entry({
      id: "memory",
      intent: "memory",
      text: "Fetched durable graph memory for this user.",
    });
    const context = entry({
      id: "context",
      intent: "context",
      tool: "retrieve_context",
      text: "Loaded retrieved context.",
      timestamp: 3,
    });
    const web = entry({
      id: "web",
      kind: "tool",
      tool: "web_search",
      resultSummary: "Used https://example.com/research as a source.",
      timestamp: 4,
    });
    const readFile = entry({
      id: "read-file",
      kind: "tool",
      tool: "read_file",
      text: "Read project spec.",
      files: ["docs/spec.md"],
      timestamp: 2,
    });

    expect(isAgentSourceEntry(memory)).toBe(true);
    expect(isAgentSourceEntry(context)).toBe(true);
    expect(isAgentSourceEntry(web)).toBe(true);
    expect(isAgentSourceEntry(readFile)).toBe(true);
    expect(isAgentArtifactEntry(readFile)).toBe(false);

    const model = buildAgentInspectorPanelModel([memory, context, web, readFile]);
    expect(model.sources.map((event) => event.id)).toEqual(["web", "context", "read-file", "memory"]);
    expect(model.sources.map((event) => event.category)).toEqual(["web", "retrieval", "file", "memory"]);
  });

  it("does not route source-ish trace or generic context wording to Sources", () => {
    const trace = entry({
      id: "trace",
      kind: "status",
      text: "Read context, search sources, then continue.",
    });
    const genericContext = entry({
      id: "context-status",
      kind: "tool",
      intent: "context",
      text: "Gathering context",
    });
    const runtimeInfo = entry({
      id: "runtime-info",
      kind: "tool",
      intent: "context",
      tool: "runtime_info",
      resultSummary: "Runtime info completed.",
    });

    expect(isAgentSourceEntry(trace)).toBe(false);
    expect(isAgentSourceEntry(genericContext)).toBe(false);
    expect(isAgentSourceEntry(runtimeInfo)).toBe(false);
    expect(buildAgentInspectorPanelModel([trace, genericContext, runtimeInfo]).sources).toHaveLength(0);
  });

  it("keeps artifacts out of Sources even when files are present", () => {
    const artifact = entry({
      id: "artifact",
      kind: "tool",
      intent: "file",
      phase: "artifact_event",
      tool: "artifact",
      text: "Artifact created: Launch brief",
      files: ["launch-brief.md"],
    });

    expect(isAgentArtifactEntry(artifact)).toBe(true);
    expect(isAgentSourceEntry(artifact)).toBe(false);

    const model = buildAgentInspectorPanelModel([artifact]);
    expect(model.artifacts).toHaveLength(1);
    expect(model.artifacts[0]).toMatchObject({
      label: "artifact",
      summary: "Artifact created: Launch brief",
      files: ["launch-brief.md"],
    });
    expect(model.sources).toHaveLength(0);
  });

  it("uses strict browser tool signals and ignores ordinary page copy", () => {
    const browser = entry({
      id: "browser",
      kind: "tool",
      tool: "browser_navigate",
      text: "Opened the checkout page.",
    });
    const pageCopy = entry({
      id: "copy",
      kind: "narration",
      text: "Drafted homepage page copy.",
    });
    const genericBrowserCopy = entry({
      id: "generic-browser",
      kind: "status",
      text: "Navigate the browser, take a screenshot, then mention the extension.",
    });

    expect(isAgentBrowserEntry(browser)).toBe(true);
    for (const tool of [
      "browser",
      "browser.open",
      "browser_open",
      "browser_click",
      "browser_new_session",
      "browser_navigate",
      "browser_snapshot",
      "browser_exec",
      "browser_close_session",
      "browser_take_screenshot",
      "playwright_screenshot",
      "mcp__playwright__browser_navigate",
      "extension_click",
    ]) {
      expect(isAgentBrowserEntry(entry({ kind: "tool", tool }))).toBe(true);
    }
    expect(isAgentBrowserEntry(entry({ phase: "browser_frame" }))).toBe(true);
    expect(isAgentBrowserEntry(pageCopy)).toBe(false);
    expect(isAgentBrowserEntry(genericBrowserCopy)).toBe(false);
    expect(isAgentBrowserEntry(entry({ kind: "tool", tool: "web_fetch" }))).toBe(false);
    expect(isAgentBrowserEntry(entry({ kind: "tool", tool: "web_search" }))).toBe(false);
  });

  it("routes only strict schedule signals to Cron", () => {
    const spawned = entry({
      id: "spawned",
      kind: "task",
      phase: "tool_only_turn",
      text: "4 tools ran · 2 background tasks spawned",
      resultState: "running",
    });
    const scheduled = entry({
      id: "scheduled",
      kind: "tool",
      text: "Scheduled weekly automation run.",
      timestamp: 2,
    });
    const scheduleTool = entry({
      id: "schedule-tool",
      kind: "tool",
      tool: "schedule",
      text: "Created reminder.",
      timestamp: 4,
    });
    const cronTool = entry({
      id: "cron-tool",
      kind: "tool",
      tool: "cron_list",
      text: "Listed scheduler jobs.",
      timestamp: 5,
    });
    const completion = entry({
      id: "completion",
      kind: "task",
      phase: "subagent_completion",
      text: "Completed subagent: research finished",
      timestamp: 3,
    });

    expect(isAgentCronEntry(spawned)).toBe(false);
    expect(isAgentCronEntry(scheduled)).toBe(true);
    expect(isAgentCronEntry(scheduleTool)).toBe(true);
    expect(isAgentCronEntry(cronTool)).toBe(true);
    expect(isAgentCronEntry(completion)).toBe(false);

    const model = buildAgentInspectorPanelModel([spawned, scheduled, completion, scheduleTool, cronTool]);
    expect(model.cron.map((event) => event.id)).toEqual(["cron-tool", "schedule-tool", "scheduled"]);
  });

  it("never surfaces master-prompt scaffold in source chips", () => {
    const model = buildAgentInspectorPanelModel([
      entry({
        id: "leak-1",
        kind: "tool",
        intent: "context",
        text: "## Brain Architecture\nLayer 0 — Working memory.",
        activityLabel: "## Brain Architecture",
      }),
    ]);
    const blob = JSON.stringify(model.sources);
    expect(blob).not.toMatch(/Brain Architecture/);
    expect(blob).not.toMatch(/Layer 0/);
  });
});

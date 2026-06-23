import { describe, expect, it } from "@jest/globals";
import {
  buildAgentInspectorPanelModel,
  isAgentArtifactEntry,
  isAgentCronEntry,
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
  it("routes artifact events to Artifacts", () => {
    const artifact = entry({
      id: "artifact",
      kind: "tool",
      phase: "artifact_event",
      tool: "artifact",
      text: "Artifact created: Launch brief",
      files: ["launch-brief.md"],
      resultSummary: "Created a launch brief for review.",
    });

    expect(isAgentArtifactEntry(artifact)).toBe(true);
    expect(buildAgentInspectorPanelModel([artifact]).artifacts[0]).toMatchObject({
      id: "artifact",
      category: "artifact",
      label: "artifact",
      summary: "Created a launch brief for review.",
      files: ["launch-brief.md"],
    });
  });

  it("routes only schedule signals to Schedules activity", () => {
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
    const browserText = entry({
      id: "browser-text",
      kind: "tool",
      tool: "web_search",
      text: "browser screenshot navigate",
      resultSummary: "web search result",
      timestamp: 6,
    });

    expect(isAgentCronEntry(spawned)).toBe(false);
    expect(isAgentCronEntry(scheduled)).toBe(true);
    expect(isAgentCronEntry(scheduleTool)).toBe(true);
    expect(isAgentCronEntry(cronTool)).toBe(true);

    expect(
      buildAgentInspectorPanelModel([
        spawned,
        scheduled,
        scheduleTool,
        cronTool,
        browserText,
      ]).cron.map((event) => event.id)
    ).toEqual(["cron-tool", "schedule-tool", "scheduled"]);
  });

  it("does not route source-only runtime events into remaining panels", () => {
    const model = buildAgentInspectorPanelModel([
      entry({
        id: "source",
        kind: "tool",
        intent: "context",
        tool: "read_file",
        text: "Read source file.",
        files: ["docs/ui-handoff.md"],
      }),
      entry({
        id: "web",
        kind: "tool",
        tool: "web_search",
        resultSummary: "Relevant source: https://example.com/research",
      }),
      entry({
        id: "file-write",
        kind: "tool",
        tool: "write_file",
        text: "Wrote report.md",
      }),
    ]);

    expect(model.artifacts).toHaveLength(0);
    expect(model.cron).toHaveLength(0);
  });
});

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
  it("routes memory and read-like events to Evidence", () => {
    const memory = entry({
      id: "memory",
      intent: "memory",
      text: "Fetched durable graph memory for this user.",
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
    expect(isAgentSourceEntry(readFile)).toBe(true);
    expect(isAgentArtifactEntry(readFile)).toBe(false);

    const model = buildAgentInspectorPanelModel([memory, readFile]);
    expect(model.sources.map((event) => event.id)).toEqual(["read-file", "memory"]);
  });

  it("keeps artifacts out of Evidence even when files are present", () => {
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

  it("uses precise browser terms and ignores ordinary page copy", () => {
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

    expect(isAgentBrowserEntry(browser)).toBe(true);
    for (const tool of [
      "browser_new_session",
      "browser_navigate",
      "browser_snapshot",
      "browser_exec",
      "browser_close_session",
    ]) {
      expect(isAgentBrowserEntry(entry({ kind: "tool", tool }))).toBe(true);
    }
    expect(isAgentBrowserEntry(pageCopy)).toBe(false);
  });

  it("routes tool-only and scheduled work to Cron", () => {
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
    const completion = entry({
      id: "completion",
      kind: "task",
      phase: "subagent_completion",
      text: "Completed subagent: research finished",
      timestamp: 3,
    });

    expect(isAgentCronEntry(spawned)).toBe(true);
    expect(isAgentCronEntry(scheduled)).toBe(true);
    expect(isAgentCronEntry(completion)).toBe(true);

    const model = buildAgentInspectorPanelModel([spawned, scheduled, completion]);
    expect(model.cron.map((event) => event.id)).toEqual(["completion", "scheduled", "spawned"]);
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

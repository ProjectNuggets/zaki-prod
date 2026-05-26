import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AgentInspectorRail, type AgentInspectorRailProps } from "./AgentInspectorRail";

function renderRail(overrides: Partial<AgentInspectorRailProps> = {}) {
  const props: AgentInspectorRailProps = {
    mode: "execute",
    isStreaming: false,
    live: false,
    lastChannel: null,
    sandbox: null,
    tasks: [],
    transcriptEntries: [],
    narrationFrame: null,
    approvalRequest: null,
    contextGaugeData: null,
    usageSummary: null,
    quotaInfo: null,
    ...overrides,
  };

  return render(<AgentInspectorRail {...props} />);
}

describe("AgentInspectorRail", () => {
  it("renders the V6 execution rail as six MECE tabs", () => {
    renderRail({
      tasks: [
        {
          taskId: "task-1",
          status: "running",
          description: "Map the agent surface",
          progressPct: 40,
          updatedAt: 1,
        },
      ],
    });

    const tablist = screen.getByRole("tablist", { name: "Agent panels" });
    expect(within(tablist).getAllByRole("tab")).toHaveLength(6);
    for (const label of ["Plan", "Cron", "Sources", "Artifacts", "Browser", "Trace"]) {
      expect(within(tablist).getByRole("tab", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
    expect(within(tablist).getByRole("tab", { name: /Plan/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("Map the agent surface")).toBeInTheDocument();
  });

  it("surfaces memory and context evidence in the Sources tab", () => {
    const onOpenMemory = jest.fn();
    renderRail({
      onOpenMemory,
      transcriptEntries: [
        {
          id: "memory-1",
          kind: "tool",
          intent: "memory",
          text: "Fetched durable graph memory for this user.",
          timestamp: 1,
        },
      ],
      contextGaugeData: {
        tokenCount: 2_000,
        contextMax: 8_000,
      },
      quotaInfo: {
        limit: 5,
        remaining: 3,
      },
    });

    fireEvent.click(screen.getByRole("tab", { name: /Sources/i }));

    expect(screen.getByText("Context window")).toBeInTheDocument();
    expect(screen.getByText("Fetched durable graph memory for this user.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open memory graph" }));
    expect(onOpenMemory).toHaveBeenCalledTimes(1);
  });

  it("separates artifact activity and opens the artifact manager", () => {
    const onOpenArtifacts = jest.fn();
    renderRail({
      artifactCount: 1,
      onOpenArtifacts,
      transcriptEntries: [
        {
          id: "artifact-1",
          kind: "tool",
          intent: "file",
          text: "Created launch brief.",
          timestamp: 1,
          files: ["launch-brief.md"],
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Artifacts/i }));

    expect(screen.getByText("Artifact activity captured")).toBeInTheDocument();
    expect(screen.getByText("launch-brief.md")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open artifacts manager" }));
    expect(onOpenArtifacts).toHaveBeenCalledTimes(1);
  });

  it("keeps browser control in its own panel", () => {
    const onOpenBrowser = jest.fn();
    renderRail({
      onOpenBrowser,
      sandbox: {
        enabled: true,
        backend: "playwright",
      } as AgentInspectorRailProps["sandbox"],
      transcriptEntries: [
        {
          id: "browser-1",
          kind: "tool",
          intent: "tool",
          tool: "browser.open",
          text: "Opened the checkout page.",
          timestamp: 1,
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: /Browser/i }));

    expect(screen.getByText("Browser activity detected")).toBeInTheDocument();
    expect(screen.getAllByText("playwright")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Open browser controls" }));
    expect(onOpenBrowser).toHaveBeenCalledTimes(1);
  });
});

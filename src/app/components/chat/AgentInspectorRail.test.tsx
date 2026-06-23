import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AgentInspectorRail, type AgentInspectorRailProps } from "./AgentInspectorRail";

jest.mock("@/lib/api", () => ({
  createAgentCron: jest.fn(),
  deleteAgentCron: jest.fn(),
  downloadAgentExportFile: jest.fn(),
  exportAgentArtifact: jest.fn(),
  normalizeAgentArtifactShareUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  normalizeAgentExportDownloadUrl: (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null,
  revokeAgentArtifactShare: jest.fn(),
  shareAgentArtifact: jest.fn(),
  updateAgentCron: jest.fn(),
}));

const api = jest.requireMock("@/lib/api") as {
  createAgentCron: jest.Mock;
  deleteAgentCron: jest.Mock;
  downloadAgentExportFile: jest.Mock;
  exportAgentArtifact: jest.Mock;
  revokeAgentArtifactShare: jest.Mock;
  shareAgentArtifact: jest.Mock;
  updateAgentCron: jest.Mock;
};

function renderRail(overrides: Partial<AgentInspectorRailProps> = {}) {
  const props: AgentInspectorRailProps = {
    transcriptEntries: [],
    ...overrides,
  };

  return render(<AgentInspectorRail {...props} />);
}

describe("AgentInspectorRail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.exportAgentArtifact.mockResolvedValue({
      response: { ok: true },
      data: { download_url: "/api/agent/exports/artifact.pdf" },
    });
    api.downloadAgentExportFile.mockResolvedValue({ filename: "artifact.pdf", bytes: 12 });
    api.shareAgentArtifact.mockResolvedValue({
      response: { ok: true },
      data: { public_url: "https://share.local/artifact" },
    });
    api.revokeAgentArtifactShare.mockResolvedValue({
      response: { ok: true },
      data: { ok: true },
    });
    api.createAgentCron.mockResolvedValue({
      response: { ok: true },
      data: { job: { id: "cron-new" } },
    });
    api.deleteAgentCron.mockResolvedValue({
      response: { ok: true },
      data: { ok: true },
    });
    api.updateAgentCron.mockResolvedValue({
      response: { ok: true },
      data: { job: { id: "cron-updated" } },
    });
  });

  it("renders only Artifacts and Schedules, with Artifacts selected by default", () => {
    const onClose = jest.fn();
    renderRail({ onClose });

    const tablist = screen.getByRole("tablist", { name: "Agent panels" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(within(tablist).getByRole("tab", { name: /Artifacts/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(within(tablist).getByRole("tab", { name: /Schedules/i })).toBeInTheDocument();
    expect(within(tablist).queryByRole("tab", { name: /Plan/i })).not.toBeInTheDocument();
    expect(within(tablist).queryByRole("tab", { name: /Sources/i })).not.toBeInTheDocument();
    expect(within(tablist).queryByRole("tab", { name: /Browser/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide right agent panel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("falls deleted tab requests back to Artifacts and still honors Schedules", () => {
    const { rerender } = renderRail({
      tabRequest: { tab: "browser" as never, id: 1 },
    });

    expect(screen.getByRole("tab", { name: /Artifacts/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    rerender(<AgentInspectorRail transcriptEntries={[]} tabRequest={{ tab: "cron", id: 2 }} />);
    expect(screen.getByRole("tab", { name: /Schedules/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    rerender(
      <AgentInspectorRail
        transcriptEntries={[]}
        tabRequest={{ tab: "evidence" as never, id: 3 }}
      />
    );
    expect(screen.getByRole("tab", { name: /Artifacts/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("renders stored session artifacts as compact rows with delivery controls behind Details", async () => {
    const onOpenArtifact = jest.fn();
    renderRail({
      onOpenArtifact,
      artifacts: [
        {
          id: "artifact-1",
          title: "Research report",
          type: "document",
          version: 3,
          updatedAt: Date.parse("2026-06-22T12:00:00Z"),
        },
      ],
    });

    const row = screen.getByTestId("agent-artifact-row");
    expect(row).toHaveTextContent("Research report");
    expect(row).toHaveTextContent("document");
    expect(within(row).getByRole("button", { name: /Open Research report/i })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Show details/i })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Share/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /PDF/i })).not.toBeInTheDocument();

    fireEvent.click(within(row).getByRole("button", { name: /Show details/i }));
    expect(await within(row).findByRole("button", { name: /Share/i })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Download PDF/i })).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /PPT/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /DOCX/i })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /HTML/i })).not.toBeInTheDocument();

    fireEvent.click(within(row).getByRole("button", { name: /Open Research report/i }));
    expect(onOpenArtifact).toHaveBeenCalledWith(expect.objectContaining({ id: "artifact-1" }));
  });

  it("keeps provisional artifact events in Syncing and does not show recent-scope artifacts", () => {
    renderRail({
      artifactsScope: "recent",
      artifacts: [
        {
          id: "old-artifact",
          title: "Old global artifact",
          type: "document",
          version: 1,
          updatedAt: Date.now(),
        },
      ],
      transcriptEntries: [
        {
          id: "artifact-event-1",
          kind: "tool",
          phase: "artifact_event",
          tool: "artifact",
          text: "Syncing new report",
          resultSummary: "Writing report artifact",
          files: ["report.pdf"],
          timestamp: 1,
        },
      ],
    });

    expect(screen.queryByText("Old global artifact")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-artifact-syncing")).toHaveTextContent("report.pdf");
    expect(screen.getByTestId("agent-artifact-syncing")).toHaveTextContent("Writing report artifact");
  });

  it("renders cron-backed schedules with runtime enrichment and actions", () => {
    renderRail({
      tabRequest: { tab: "cron", id: 1 },
      cronJobs: [
        {
          id: "cron-1",
          name: "",
          schedule: "0 12 * * *",
          prompt: "Prepare the scheduled report now. Report specification: unread messages. Read HEARTBEAT.md. Do not call create/update scheduled jobs.",
          status: "scheduled",
          enabled: true,
          paused: false,
          nextRunAt: Date.parse("2026-06-22T12:00:00Z"),
          lastRunAt: null,
          lastStatus: null,
          failureCount: 0,
        },
      ],
      jobs: [
        {
          id: "cron-1",
          title: "Runtime row",
          prompt: "Prepare the scheduled report now. Report specification: unread messages.",
          status: "running",
          schedule: "0 12 * * *",
          nextRunAt: Date.parse("2026-06-22T12:00:00Z"),
          lastRunAt: Date.parse("2026-06-21T12:00:00Z"),
          createdAt: null,
          lastStatus: "ok",
          failureCount: 0,
        },
      ],
    });

    const row = screen.getByTestId("agent-schedule-list");
    expect(row).toHaveTextContent("Scheduled report");
    expect(row).toHaveTextContent("Every day at 12:00");
    expect(row).toHaveTextContent("running");
    expect(row).toHaveTextContent("unread messages");
    expect(row).not.toHaveTextContent("HEARTBEAT.md");
    expect(within(row).getByRole("button", { name: "Details" })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Pause/i })).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /Delete/i })).toBeInTheDocument();
  });

  it("does not create schedule rows from unmatched runtime jobs or generic browser events", () => {
    renderRail({
      tabRequest: { tab: "cron", id: 1 },
      jobs: [
        {
          id: "job-only",
          title: "Runtime-only job",
          status: "scheduled",
          schedule: "0 9 * * *",
          nextRunAt: null,
          lastRunAt: null,
          createdAt: null,
        },
      ],
      transcriptEntries: [
        {
          id: "browser-text",
          kind: "tool",
          tool: "web_search",
          text: "browser screenshot navigate",
          resultSummary: "web search result",
          timestamp: 1,
        },
      ],
    });

    expect(screen.queryByText("Runtime-only job")).not.toBeInTheDocument();
    expect(screen.getByText("No scheduled work yet.")).toBeInTheDocument();
  });

  it("creates schedules from quick choices and advanced cron", async () => {
    const onCronChanged = jest.fn();
    renderRail({
      tabRequest: { tab: "cron", id: 1 },
      onCronChanged,
    });

    fireEvent.click(screen.getByRole("button", { name: /Create schedule/i }));
    fireEvent.change(screen.getByPlaceholderText("What should ZAKI do on this schedule?"), {
      target: { value: "Send the weekly brief." },
    });
    fireEvent.click(within(screen.getByTestId("agent-cron-form")).getByRole("button", { name: "Create schedule" }));

    await waitFor(() => {
      expect(api.createAgentCron).toHaveBeenCalledWith(
        expect.objectContaining({
          expression: expect.any(String),
          prompt: "Send the weekly brief.",
          job_type: "agent",
        })
      );
    });
    expect(onCronChanged).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Create schedule/i }));
    fireEvent.click(screen.getByRole("button", { name: "Advanced cron" }));
    fireEvent.change(screen.getByLabelText("Cron expression"), {
      target: { value: "0 9 * * 1" },
    });
    fireEvent.change(screen.getByPlaceholderText("What should ZAKI do on this schedule?"), {
      target: { value: "Monday brief." },
    });
    fireEvent.click(within(screen.getByTestId("agent-cron-form")).getByRole("button", { name: "Create schedule" }));

    await waitFor(() => {
      expect(api.createAgentCron).toHaveBeenLastCalledWith(
        expect.objectContaining({
          expression: "0 9 * * 1",
          prompt: "Monday brief.",
        })
      );
    });
  });

  it("renders soft empty and unavailable states", () => {
    const { rerender } = renderRail();
    expect(screen.getByText("No artifacts in this session yet.")).toBeInTheDocument();

    rerender(
      <AgentInspectorRail
        transcriptEntries={[]}
        tabRequest={{ tab: "cron", id: 1 }}
        cronError="offline"
      />
    );
    expect(screen.getByText(/Schedules are unavailable right now/i)).toBeInTheDocument();
  });
});

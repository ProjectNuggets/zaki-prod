import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import {
  ApprovalRequiredCard,
  NarrationStatusLine,
  NullalisWorklog,
  TaskChecklist,
  UsageCostFooter,
} from "./NullalisRuntimeWidgets";

describe("NullalisRuntimeWidgets", () => {
  it("renders a live narration status line", () => {
    render(
      <NarrationStatusLine
        isStreaming
        frame={{
          id: "n1",
          phase: "tool_start",
          label: "Running bash...",
          tool: "bash",
          timestamp: Date.now(),
        }}
      />
    );

    expect(screen.getByText("Running bash...")).toBeInTheDocument();
  });

  it("renders a full live worklog with current action and chronological feed", () => {
    render(
      <NullalisWorklog
        isStreaming
        entryCount={3}
        frame={null}
        entries={[
          {
            id: "e1",
            kind: "narration",
            text: "Checking context and memory",
            timestamp: Date.now() - 2000,
            phase: "thinking",
            source: "reasoning_summary",
          },
          {
            id: "e2",
            kind: "tool",
            text: "Using bash",
            timestamp: Date.now() - 1000,
            phase: "tool_start",
            tool: "bash",
            source: "tool",
          },
          {
            id: "e3",
            kind: "tool",
            text: "bash completed · 120ms",
            timestamp: Date.now(),
            phase: "tool_done",
            tool: "bash",
            durationMs: 120,
            files: ["src/app/components/ChatArea.tsx"],
            status: "done",
            source: "tool",
          },
        ]}
      />
    );

    expect(screen.getByText(/Working for/)).toBeInTheDocument();
    expect(screen.getByText("bash completed · 120ms")).toBeInTheDocument();
    expect(screen.getByText("Checking context and memory")).toBeInTheDocument();
    expect(screen.getByText("Using bash")).toBeInTheDocument();
    expect(screen.getByText("src/app/components/ChatArea.tsx")).toBeInTheDocument();
  });

  it("renders a compact worklog handoff", () => {
    render(
      <NullalisWorklog
        compact
        isStreaming={false}
        entryCount={7}
        frame={null}
        entries={[
          {
            id: "e1",
            kind: "transition",
            text: "Finalized the response",
            timestamp: Date.now() - 1000,
            status: "done",
            source: "done",
          },
        ]}
      />
    );

    expect(screen.getByText(/Worked for/)).toBeInTheDocument();
    expect(screen.getByText(/7 steps/)).toBeInTheDocument();
    expect(screen.getByText("Finalized the response")).toBeInTheDocument();
  });

  it("renders task checklist statuses and running progress", () => {
    render(
      <TaskChecklist
        tasks={[
          {
            taskId: "t1",
            status: "queued",
            description: "Analyze requirements",
            updatedAt: 1,
          },
          {
            taskId: "t2",
            status: "running",
            description: "Build component",
            progressPct: 50,
            updatedAt: 2,
          },
          {
            taskId: "t3",
            status: "blocked",
            description: "Wait for approval",
            updatedAt: 3,
          },
          {
            taskId: "t4",
            status: "done",
            description: "Write tests",
            updatedAt: 4,
          },
        ]}
      />
    );

    expect(screen.getByText("Task Plan")).toBeInTheDocument();
    expect(screen.getByText("Build component")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("blocked")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
  });

  it("renders approval cards with disabled controls", () => {
    render(
      <ApprovalRequiredCard
        request={{
          id: "a1",
          tool: "write_file",
          reason: "mutating operation",
          riskLevel: "high",
          timestamp: Date.now(),
        }}
      />
    );

    expect(screen.getByText("Approval required for write_file")).toBeInTheDocument();
    expect(screen.getByText("Risk: high")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve (not wired)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deny (not wired)" })).toBeDisabled();
  });

  it("formats usage and cost", () => {
    render(<UsageCostFooter usage={{ usageTokens: 1500, costUsd: 0.003 }} />);

    expect(screen.getByText("1,500 tokens · $0.003")).toBeInTheDocument();
  });
});

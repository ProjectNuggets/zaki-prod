import "@testing-library/jest-dom";
import "@/i18n";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AgentPlanPanel } from "./AgentPlanPanel";

jest.mock("@/lib/api", () => ({
  fetchAgentSessionPlan: jest.fn(),
  fetchAgentSessionTodos: jest.fn(),
}));

const api = jest.requireMock("@/lib/api") as {
  fetchAgentSessionPlan: jest.Mock;
  fetchAgentSessionTodos: jest.Mock;
};

describe("AgentPlanPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.fetchAgentSessionPlan.mockResolvedValue({
      response: { ok: true },
      data: { active: false, plan: null },
    });
    api.fetchAgentSessionTodos.mockResolvedValue({
      response: { ok: true },
      data: { lists: [], current_list_id: null },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads the proxied session resources and renders their soft-empty payload honestly", async () => {
    render(
      <AgentPlanPanel
        sessionKey="42:release"
        transcriptEntries={[]}
        tasks={[]}
        isStreaming={false}
        isOnline
      />
    );

    expect(screen.getByText("Loading run plan…")).toBeInTheDocument();
    expect(await screen.findByText("No run plan yet.")).toBeInTheDocument();
    expect(screen.getByText("Plans appear when Agent breaks work into multiple steps.")).toBeInTheDocument();
    expect(api.fetchAgentSessionPlan).toHaveBeenCalledWith(
      "42:release",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(api.fetchAgentSessionTodos).toHaveBeenCalledWith(
      "42:release",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("renders a failed live step inline and confirms a visible continuation retry", async () => {
    const onRetryStep = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    render(
      <AgentPlanPanel
        sessionKey="42:release"
        transcriptEntries={[
          {
            id: "step-1",
            kind: "task",
            source: "progress",
            phase: "plan_step",
            text: "Step 1/2: Inspect the release",
            timestamp: 1,
            stepIndex: 0,
            stepTotal: 2,
            resultState: "running",
          },
          {
            id: "failure-1",
            kind: "status",
            source: "progress",
            phase: "error_recovery",
            text: "invalid_session_key",
            timestamp: 2,
            stepIndex: 0,
            stepTotal: 2,
            tool: "shell",
            resultState: "failed",
          },
        ]}
        tasks={[]}
        isStreaming={false}
        isOnline
        onRetryStep={onRetryStep}
      />
    );

    const row = await screen.findByTestId("agent-plan-step-1");
    expect(row).toHaveAttribute("data-state", "failed");
    expect(row).toHaveTextContent("Inspect the release");
    expect(row).toHaveTextContent("shell");
    expect(row).toHaveTextContent("This step did not finish.");
    expect(row).not.toHaveTextContent("invalid_session_key");

    fireEvent.click(within(row).getByRole("button", { name: "Retry from here" }));
    expect(within(row).getByText(/starts a new visible Agent turn/i)).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Start retry" }));

    await waitFor(() => {
      expect(onRetryStep).toHaveBeenCalledWith(
        expect.objectContaining({ index: 1, title: "Inspect the release", tool: "shell" })
      );
    });
  });

  it("keeps a rejected retry visible after volatile live plan state is replaced", async () => {
    let rejectRetry!: (reason?: unknown) => void;
    const onRetryStep = jest.fn<() => Promise<void>>().mockImplementation(
      () => new Promise((_, reject) => { rejectRetry = reject; })
    );
    const props = {
      sessionKey: "42:release",
      tasks: [],
      isStreaming: false,
      isOnline: true,
      onRetryStep,
    };
    const failedEntries = [
      {
        id: "step-1",
        kind: "task" as const,
        source: "progress" as const,
        phase: "plan_step",
        text: "Step 1/1: Run release checks",
        timestamp: 1,
        stepIndex: 0,
        stepTotal: 1,
        resultState: "running",
      },
      {
        id: "failure-1",
        kind: "status" as const,
        source: "progress" as const,
        phase: "error_recovery",
        text: "Release checks failed",
        timestamp: 2,
        stepIndex: 0,
        stepTotal: 1,
        resultState: "failed",
      },
    ];
    const view = render(<AgentPlanPanel {...props} transcriptEntries={failedEntries} />);
    const row = await screen.findByTestId("agent-plan-step-1");

    fireEvent.click(within(row).getByRole("button", { name: "Retry from here" }));
    fireEvent.click(within(row).getByRole("button", { name: "Start retry" }));
    view.rerender(
      <AgentPlanPanel
        {...props}
        transcriptEntries={[
          {
            id: "retry-step-1",
            kind: "task",
            source: "progress",
            phase: "plan_step",
            text: "Step 1/1: Start a replacement run",
            timestamp: 3,
            stepIndex: 0,
            stepTotal: 1,
            resultState: "running",
          },
        ]}
        isStreaming
      />
    );

    await act(async () => {
      rejectRetry(new Error("Retry rejected"));
      await Promise.resolve();
    });

    expect(screen.getByText("Retry did not complete. The failed step remains unchanged.")).toBeInTheDocument();
    expect(screen.getByText("Run release checks")).toBeInTheDocument();
  });

  it("never renders raw endpoint errors", async () => {
    api.fetchAgentSessionPlan.mockResolvedValue({
      response: { ok: false, status: 400 },
      data: { error: "invalid_session_key" },
    });
    api.fetchAgentSessionTodos.mockResolvedValue({
      response: { ok: false, status: 400 },
      data: { error: "invalid_session_key" },
    });

    render(
      <AgentPlanPanel
        sessionKey="42:release"
        transcriptEntries={[]}
        tasks={[]}
        isStreaming={false}
        isOnline
      />
    );

    expect(await screen.findByText("Run plan unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("invalid_session_key")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh plan" })).toBeInTheDocument();
  });

  it("does not mislabel a failed plan read as idle when todos are empty", async () => {
    api.fetchAgentSessionPlan.mockResolvedValue({
      response: { ok: false, status: 503 },
      data: { error: "agent_unavailable" },
    });
    api.fetchAgentSessionTodos.mockResolvedValue({
      response: { ok: true, status: 200 },
      data: { lists: [], current_list_id: null },
    });

    render(
      <AgentPlanPanel
        sessionKey="42:release"
        transcriptEntries={[]}
        tasks={[]}
        isStreaming={false}
        isOnline
      />
    );

    expect(await screen.findByText("Run plan unavailable.")).toBeInTheDocument();
    expect(screen.queryByText("No run plan yet.")).not.toBeInTheDocument();
  });

  it("keeps polling single-flight when the plan endpoint is slower than the interval", async () => {
    jest.useFakeTimers();
    let resolvePlan!: (value: unknown) => void;
    let resolveTodos!: (value: unknown) => void;
    api.fetchAgentSessionPlan.mockImplementation(
      () => new Promise((resolve) => { resolvePlan = resolve; })
    );
    api.fetchAgentSessionTodos.mockImplementation(
      () => new Promise((resolve) => { resolveTodos = resolve; })
    );

    render(
      <AgentPlanPanel
        sessionKey="42:release"
        transcriptEntries={[]}
        tasks={[]}
        isStreaming
        isOnline
      />
    );

    expect(api.fetchAgentSessionPlan).toHaveBeenCalledTimes(1);
    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(api.fetchAgentSessionPlan).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePlan({ response: { ok: true }, data: { active: false, plan: null } });
      resolveTodos({ response: { ok: true }, data: { lists: [], current_list_id: null } });
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(5_000);
      await Promise.resolve();
    });
    expect(api.fetchAgentSessionPlan).toHaveBeenCalledTimes(2);
  });

  it("aborts stalled reads and allows a fresh manual refresh", async () => {
    jest.useFakeTimers();
    let planSignal: AbortSignal | undefined;
    let todosSignal: AbortSignal | undefined;
    const stallUntilAborted = (capture: (signal: AbortSignal | undefined) => void) =>
      (_sessionKey: string, options?: { signal?: AbortSignal }) => {
        capture(options?.signal);
        return new Promise((_, reject) => {
          options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      };
    api.fetchAgentSessionPlan.mockImplementation(stallUntilAborted((signal) => { planSignal = signal; }));
    api.fetchAgentSessionTodos.mockImplementation(stallUntilAborted((signal) => { todosSignal = signal; }));

    render(
      <AgentPlanPanel
        sessionKey="42:release"
        transcriptEntries={[]}
        tasks={[]}
        isStreaming={false}
        isOnline
      />
    );
    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(planSignal?.aborted).toBe(true);
    expect(todosSignal?.aborted).toBe(true);
    expect(screen.getByText("Run plan unavailable.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh plan" }));
    expect(api.fetchAgentSessionPlan).toHaveBeenCalledTimes(2);
    expect(api.fetchAgentSessionTodos).toHaveBeenCalledTimes(2);
  });

  it("aborts the active reads when the session changes or the panel unmounts", async () => {
    const signals: AbortSignal[] = [];
    const stallUntilAborted = (_sessionKey: string, options?: { signal?: AbortSignal }) => {
      if (options?.signal) signals.push(options.signal);
      return new Promise((_, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      });
    };
    api.fetchAgentSessionPlan.mockImplementation(stallUntilAborted);
    api.fetchAgentSessionTodos.mockImplementation(stallUntilAborted);
    const props = { transcriptEntries: [], tasks: [], isStreaming: false, isOnline: true };
    const view = render(<AgentPlanPanel {...props} sessionKey="42:first" />);

    view.rerender(<AgentPlanPanel {...props} sessionKey="42:second" />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(signals.slice(0, 2).every((signal) => signal.aborted)).toBe(true);

    const currentSignals = signals.slice(2);
    view.unmount();
    expect(currentSignals).toHaveLength(2);
    expect(currentSignals.every((signal) => signal.aborted)).toBe(true);
  });

  it("stops polling reads the BFF identifies as unsupported upstream", async () => {
    jest.useFakeTimers();
    const unsupportedHeaders = new Headers({ "X-Zaki-Agent-Read-Support": "unsupported" });
    api.fetchAgentSessionPlan.mockResolvedValue({
      response: { ok: true, headers: unsupportedHeaders },
      data: { active: false, plan: null },
    });
    api.fetchAgentSessionTodos.mockResolvedValue({
      response: { ok: true, headers: unsupportedHeaders },
      data: { lists: [], current_list_id: null },
    });

    render(
      <AgentPlanPanel
        sessionKey="42:release"
        transcriptEntries={[]}
        tasks={[]}
        isStreaming
        isOnline
      />
    );
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    await act(async () => {
      jest.advanceTimersByTime(120_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(api.fetchAgentSessionPlan).toHaveBeenCalledTimes(1);
    expect(api.fetchAgentSessionTodos).toHaveBeenCalledTimes(1);
  });

  it("starts a fresh bounded polling budget for each run in the same session", async () => {
    jest.useFakeTimers();
    const props = {
      sessionKey: "42:release",
      transcriptEntries: [],
      tasks: [],
      isOnline: true,
    };
    const view = render(<AgentPlanPanel {...props} isStreaming={false} />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    view.rerender(<AgentPlanPanel {...props} isStreaming />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    for (let index = 0; index < 24; index += 1) {
      await act(async () => {
        jest.advanceTimersByTime(5_000);
        await Promise.resolve();
        await Promise.resolve();
      });
    }
    const callsAfterFirstRun = api.fetchAgentSessionPlan.mock.calls.length;

    view.rerender(<AgentPlanPanel {...props} isStreaming={false} />);
    view.rerender(<AgentPlanPanel {...props} isStreaming />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(api.fetchAgentSessionPlan).toHaveBeenCalledTimes(callsAfterFirstRun + 1);
  });

  it("disables retry until the current run finishes or the connection returns", async () => {
    render(
      <AgentPlanPanel
        sessionKey="42:release"
        transcriptEntries={[
          {
            id: "step-1",
            kind: "task",
            source: "progress",
            phase: "plan_step",
            text: "Step 1/1: Run checks",
            timestamp: 1,
            stepIndex: 0,
            stepTotal: 1,
          },
          {
            id: "failure-1",
            kind: "status",
            source: "progress",
            phase: "error_recovery",
            text: "Check failed",
            timestamp: 2,
            stepIndex: 0,
            stepTotal: 1,
            resultState: "failed",
          },
        ]}
        tasks={[]}
        isStreaming
        isOnline={false}
        onRetryStep={jest.fn()}
      />
    );

    const retry = within(await screen.findByTestId("agent-plan-step-1")).getByRole("button", {
      name: "Retry from here",
    });
    expect(retry).toBeDisabled();
  });
});

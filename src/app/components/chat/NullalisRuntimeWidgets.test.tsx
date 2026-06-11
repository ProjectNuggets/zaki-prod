import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApprovalRequiredCard, ContextGauge } from "./NullalisRuntimeWidgets";
import type { NullalisApprovalRequest } from "./BotStatusRail";

const translations: Record<string, string> = {
  "zakiControls.approval.title": "Approval required for {{tool}}",
  "zakiControls.approval.defaultReason": "ZAKI requested approval before continuing.",
  "zakiControls.approval.riskLabel": "Risk:",
  "zakiControls.approval.approveAria": "Approve {{tool}} action",
  "zakiControls.approval.modifyAria": "Modify {{tool}} action",
  "zakiControls.approval.denyAria": "Deny {{tool}} action",
  "zakiControls.approval.kicker": "Approval gate",
  "zakiControls.approval.approveBtn": "Approve",
  "zakiControls.approval.modifyBtn": "Modify",
  "zakiControls.approval.denyBtn": "Deny",
  "zakiControls.approval.decidedApproved": "Approved. ZAKI is continuing...",
  "zakiControls.approval.decidedModified": "Revision requested",
  "zakiControls.approval.decidedDenied": "Denied",
  "zakiControls.approval.timer": "{{seconds}}s to decide",
  "zakiControls.approval.timerElapsed": "Decision overdue",
  "zakiControls.approval.approvingState": "Approving...",
  "zakiControls.approval.retrying": "Agent restarting — retrying your approval...",
  "zakiControls.approval.retryBtn": "Retry approval",
  "zakiControls.approval.retryAria": "Retry approval for {{tool}}",
  "zakiControls.approval.resolveFailed": "Approval could not be resolved. Try again.",
  "contextGauge.label": "Context",
  "contextGauge.messageCount": "{{count}} messages",
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const template = translations[key] ?? String(options?.defaultValue ?? key);
      return template.replace(/{{(\w+)}}/g, (_, token) => String(options?.[token] ?? ""));
    },
  }),
}));

const request: NullalisApprovalRequest = {
  id: "approval-1",
  tool: "extension_click",
  reason: "supervised_mutating_requires_approval",
  riskLevel: "high",
  timestamp: 1_000_000,
  inputPreview: '{ selector: "#send" }',
  effectPreview: "Clicks the send button in the active tab.",
  command: "extension.click #send",
  files: ["active-tab"],
};

describe("ApprovalRequiredCard", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the V2 approval gate with a 60 second decision timer", () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);

    render(<ApprovalRequiredCard request={request} />);

    expect(screen.getByText("Approval gate")).toBeInTheDocument();
    expect(screen.getByText("Approval required for extension_click")).toBeInTheDocument();
    expect(screen.getByText("60s to decide")).toBeInTheDocument();
    expect(screen.getByText("Clicks the send button in the active tab.")).toBeInTheDocument();
    expect(screen.getByText('{ selector: "#send" }')).toBeInTheDocument();
    expect(screen.getByText("extension.click #send")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(screen.getByText("30s to decide")).toBeInTheDocument();
  });

  it("supports the modify action as an explicit callback", async () => {
    const onModify = jest.fn(async () => {});

    render(<ApprovalRequiredCard request={request} onModify={onModify} />);

    fireEvent.click(screen.getByRole("button", { name: "Modify extension_click action" }));

    await waitFor(() => {
      expect(onModify).toHaveBeenCalledWith("approval-1", request);
    });
    expect(screen.getByText(/Revision requested/)).toBeInTheDocument();
  });

  it("keeps an approved card visible as a continuation state while the backend resumes", async () => {
    let resolveApproval: (() => void) | null = null;
    const onApprove = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveApproval = resolve;
        })
    );

    render(<ApprovalRequiredCard request={request} onApprove={onApprove} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve extension_click action" }));

    expect(onApprove).toHaveBeenCalledWith("approval-1", request);
    expect(screen.getByText(/Approved\. ZAKI is continuing/)).toBeInTheDocument();

    await act(async () => {
      resolveApproval?.();
    });
  });

  it("renders a retrying state + Retry-approval button when approve hits a connection-class outage", async () => {
    const onApprove = jest.fn(async () => {
      const error = new Error("agent_unreachable") as Error & { retryable?: boolean };
      error.retryable = true;
      throw error;
    });

    render(<ApprovalRequiredCard request={request} onApprove={onApprove} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve extension_click action" }));

    // The click is NOT lost: instead of a hard error the card shows a retrying
    // banner and a one-click Retry-approval affordance.
    await waitFor(() => {
      expect(screen.getByText(/Agent restarting — retrying your approval/)).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Approval could not be resolved. Try again.")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry approval for extension_click" })
    ).toBeInTheDocument();
    // The standard action row is replaced by the retry affordance.
    expect(
      screen.queryByRole("button", { name: "Deny extension_click action" })
    ).not.toBeInTheDocument();
  });

  it("re-POSTs the SAME approval via the Retry button and clears the retrying state on success", async () => {
    const onApprove = jest
      .fn()
      .mockImplementationOnce(async () => {
        const error = new Error("agent_unreachable") as Error & { retryable?: boolean };
        error.retryable = true;
        throw error;
      })
      .mockImplementationOnce(async () => {});

    render(<ApprovalRequiredCard request={request} onApprove={onApprove} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve extension_click action" }));
    const retryButton = await screen.findByRole("button", {
      name: "Retry approval for extension_click",
    });

    await act(async () => {
      fireEvent.click(retryButton);
    });

    // Retry re-invokes onApprove with the identical request id (stable
    // approval_id) — never a different/new approval.
    expect(onApprove).toHaveBeenCalledTimes(2);
    expect(onApprove).toHaveBeenNthCalledWith(2, "approval-1", request);
    // On success the card flips back to the approved continuation state.
    await waitFor(() => {
      expect(screen.getByText(/Approved\. ZAKI is continuing/)).toBeInTheDocument();
    });
  });

  it("treats a non-retryable approve failure as a hard error, not a retry", async () => {
    const onApprove = jest.fn(async () => {
      throw new Error("approval_500");
    });

    render(<ApprovalRequiredCard request={request} onApprove={onApprove} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve extension_click action" }));

    await waitFor(() => {
      expect(
        screen.getByText("Approval could not be resolved. Try again.")
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Agent restarting/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry approval for extension_click" })
    ).not.toBeInTheDocument();
  });
});

describe("ContextGauge", () => {
  it("uses backend context_pressure_percent as the display pressure", () => {
    render(
      <ContextGauge
        data={{
          tokenCount: 10_000,
          contextMax: 100_000,
          pressurePercent: 42,
          messageCount: 12,
        }}
      />
    );

    expect(
      screen.getByRole("progressbar", {
        name: "Context window 10,000 of 100,000 tokens, 42 percent used",
      })
    ).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("10,000 / 100,000 (42%)")).toBeInTheDocument();
  });

  it("renders pressure-only context samples without token totals", () => {
    render(
      <ContextGauge
        data={{
          pressurePercent: 21,
          messageCount: 3,
        }}
      />
    );

    expect(
      screen.getByRole("progressbar", {
        name: "Context pressure 21 percent",
      })
    ).toHaveAttribute("aria-valuenow", "21");
    expect(screen.getByText("21%")).toBeInTheDocument();
  });

  it("renders unknown instead of deriving pressure from token counts", () => {
    render(
      <ContextGauge
        data={{
          tokenCount: 10_000,
          contextMax: 100_000,
          messageCount: 12,
        }}
      />
    );

    expect(
      screen.getByRole("progressbar", {
        name: "Context pressure unknown",
      })
    ).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("labels fallback context samples and runtime continuity metadata honestly", () => {
    render(
      <ContextGauge
        data={{
          tokenCount: 101_000,
          contextMax: 200_000,
          pressurePercent: 50.5,
          source: "diagnostics_fallback",
          confidence: "fallback",
          compactionThresholdTokens: 160_000,
          tokenCompactionTriggered: true,
          lastTurn: {
            autoCompactionEvents: 2,
            durableContinuityRefreshed: true,
            memoryContextInjected: true,
          },
        }}
      />
    );

    expect(screen.getByText("diagnostics fallback")).toBeInTheDocument();
    expect(screen.getByText("compact @ 160,000 tokens")).toBeInTheDocument();
    expect(screen.getByText("token trigger")).toBeInTheDocument();
    expect(screen.getByText("2 compactions")).toBeInTheDocument();
  });
});

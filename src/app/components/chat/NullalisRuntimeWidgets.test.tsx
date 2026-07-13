import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApprovalRequiredCard, TaskChecklist } from "./NullalisRuntimeWidgets";
import type { NullalisApprovalRequest, NullalisTaskItem } from "./BotStatusRail";

const translations: Record<string, string> = {
  "zakiControls.approval.title": "Approval required for {{tool}}",
  "zakiControls.approval.defaultReason": "Supervised mode paused before this action. Review the details, then approve once or deny.",
  "zakiControls.approval.riskLabel": "Risk:",
  "zakiControls.approval.riskBadge": "Risk · {{risk}}",
  "zakiControls.approval.risk.low": "low",
  "zakiControls.approval.risk.medium": "medium",
  "zakiControls.approval.risk.high": "high",
  "zakiControls.approval.risk.critical": "critical",
  "zakiControls.approval.risk.unknown": "unknown",
  "zakiControls.approval.approveAria": "Approve {{tool}} action",
  "zakiControls.approval.approveSessionAria": "Allow {{tool}} for this session",
  "zakiControls.approval.modifyAria": "Modify {{tool}} action",
  "zakiControls.approval.denyAria": "Deny {{tool}} action",
  "zakiControls.approval.kicker": "Approval required",
  "zakiControls.approval.approveBtn": "Approve once",
  "zakiControls.approval.approveSessionBtn": "Allow for this session",
  "zakiControls.approval.modifyBtn": "Modify",
  "zakiControls.approval.denyBtn": "Deny",
  "zakiControls.approval.intent.shell": "Run a shell command",
  "zakiControls.approval.intent.browser": "Control the browser",
  "zakiControls.approval.intent.external": "Send something outside this chat",
  "zakiControls.approval.intent.spend": "Use a billing or spending action",
  "zakiControls.approval.intent.file": "Change or share a file",
  "zakiControls.approval.intent.tool": "Run a gated tool action",
  "zakiControls.approval.explain.external": "Supervised mode pauses before ZAKI posts or sends anything outside this thread.",
  "zakiControls.approval.explain.browser": "Supervised mode pauses before ZAKI acts in a browser session.",
  "zakiControls.approval.explain.spend": "Review the amount, destination, and account before approving.",
  "zakiControls.approval.explain.file": "Review the target and effect before ZAKI changes or shares files.",
  "zakiControls.approval.whatPreview": "What",
  "zakiControls.approval.paramsPreview": "Params",
  "zakiControls.approval.hiddenValue": "Hidden",
  "zakiControls.approval.previewAria": "Approval preview",
  "zakiControls.approval.toolLabel": "Tool",
  "zakiControls.approval.destinationLabel": "Target",
  "zakiControls.approval.idLabel": "ID",
  "zakiControls.approval.decidedApproved": "Approved. ZAKI is continuing...",
  "zakiControls.approval.decidedModified": "Revision requested",
  "zakiControls.approval.decidedDenied": "Denied",
  "zakiControls.approval.timer": "{{seconds}}s to decide",
  "zakiControls.approval.timerElapsed": "Decision overdue",
  "zakiControls.approval.approvingState": "Approving...",
  "zakiControls.approval.retrying": "Agent restarting — retrying your approval...",
  "zakiControls.approval.retryBtn": "Retry approval",
  "zakiControls.approval.retrySessionBtn": "Retry session approval",
  "zakiControls.approval.retryAria": "Retry approval for {{tool}}",
  "zakiControls.approval.retrySessionAria": "Retry session approval for {{tool}}",
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

describe("TaskChecklist", () => {
  it("opens when a running task arrives after the initial render", async () => {
    const runningTask: NullalisTaskItem = {
      taskId: "task-background-1",
      status: "running",
      description: "Waiting for delegated research result",
      progressPct: 55,
      updatedAt: Date.now(),
    };
    const { container, rerender } = render(<TaskChecklist tasks={[]} />);

    rerender(<TaskChecklist tasks={[runningTask]} />);

    await waitFor(() => expect(container.querySelector("details")).toHaveAttribute("open"));
    expect(screen.getByText("Waiting for delegated research result")).toBeVisible();
    expect(screen.getByText("55%")).toBeVisible();
  });
});

describe("ApprovalRequiredCard", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the durable approval gate with NO countdown timer", () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);

    render(<ApprovalRequiredCard request={request} />);

    expect(screen.getByText("Approval required")).toBeInTheDocument();
    expect(screen.getByText("Control the browser")).toBeInTheDocument();
    expect(screen.getByText("Risk · high")).toBeInTheDocument();
    expect(screen.getByText("Supervised mode pauses before ZAKI acts in a browser session.")).toBeInTheDocument();
    expect(screen.getByText("Clicks the send button in the active tab.")).toBeInTheDocument();
    expect(screen.getByText('{ selector: "#send" }')).toBeInTheDocument();
    expect(screen.getByText("extension.click #send")).toBeInTheDocument();
    expect(screen.getByText("Tool · extension_click")).toBeInTheDocument();
    expect(screen.getByText("Target · active-tab")).toBeInTheDocument();

    // The card is durable: it shows NO decision countdown and NO "expired"
    // copy. The approval stays pinned until approve/deny — never a timer.
    expect(screen.queryByText(/to decide/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Decision overdue/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Approval expired/)).not.toBeInTheDocument();

    // Advancing wall-clock time must NEVER introduce a countdown or change
    // the card (no setInterval ticking a timer).
    act(() => {
      jest.advanceTimersByTime(120_000);
    });

    expect(screen.queryByText(/to decide/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Decision overdue/)).not.toBeInTheDocument();
  });

  it("renders a human intent and key params from the engine payload without exposing sensitive values", () => {
    render(
      <ApprovalRequiredCard
        request={{
          ...request,
          id: "approval-params",
          approvalId: "apr-9",
          tool: "telegram.send_message",
          reason: "supervised_mutating_requires_approval",
          riskLevel: "low",
          intent: "Send the launch brief to Engineering Standup",
          effectPreview: null,
          inputPreview: null,
          command: null,
          files: [],
          params: {
            group: "Engineering Standup",
            text: "Launch brief ready.",
            api_key: "sk-live-secret",
          },
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "Send the launch brief to Engineering Standup" })).toBeInTheDocument();
    expect(screen.getByText("Risk · low")).toBeInTheDocument();
    expect(screen.getByText("group")).toBeInTheDocument();
    expect(screen.getAllByText("Engineering Standup")[0]).toBeInTheDocument();
    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("Launch brief ready.")).toBeInTheDocument();
    expect(screen.getByText("api key")).toBeInTheDocument();
    expect(screen.getByText("Hidden")).toBeInTheDocument();
    expect(screen.queryByText("sk-live-secret")).not.toBeInTheDocument();
    expect(screen.getByText("Tool · telegram.send_message")).toBeInTheDocument();
    expect(screen.getByText("Target · Engineering Standup")).toBeInTheDocument();
    expect(screen.getByText("ID · apr-9")).toBeInTheDocument();
  });

  it("redacts sensitive nested params and raw input previews", () => {
    const { container } = render(
      <ApprovalRequiredCard
        request={{
          ...request,
          id: "approval-nested-secrets",
          tool: "browser.fetch",
          reason: "supervised_mutating_requires_approval",
          riskLevel: "medium",
          intent: "Fetch the account status page",
          effectPreview: null,
          command: null,
          files: [],
          params: {
            url: "https://example.com/account",
            headers: {
              Authorization: "Bearer nested-secret-token",
              "x-api-key": "sk-nested-secret",
            },
            body: {
              password: "plain-password",
            },
          },
          inputPreview:
            '{"authorization":"Bearer preview-secret-token","password":"preview-password"}',
        }}
      />
    );

    const rendered = container.textContent || "";
    expect(rendered).toContain("https://example.com/account");
    expect(rendered).toContain("Hidden");
    expect(rendered).not.toContain("nested-secret-token");
    expect(rendered).not.toContain("sk-nested-secret");
    expect(rendered).not.toContain("plain-password");
    expect(rendered).not.toContain("preview-secret-token");
    expect(rendered).not.toContain("preview-password");
  });

  it("shows the session approval action only when the engine marks it safe", async () => {
    const onApproveForSession = jest.fn(async () => {});
    const { rerender } = render(
      <ApprovalRequiredCard
        request={{ ...request, allowForSessionSafe: false }}
        onApprove={async () => {}}
        onApproveForSession={onApproveForSession}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Allow extension_click for this session" })
    ).not.toBeInTheDocument();

    const safeRequest = { ...request, allowForSessionSafe: true };
    rerender(
      <ApprovalRequiredCard
        request={safeRequest}
        onApprove={async () => {}}
        onApproveForSession={onApproveForSession}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Allow extension_click for this session" }));

    await waitFor(() => {
      expect(onApproveForSession).toHaveBeenCalledWith("approval-1", safeRequest);
    });
    expect(screen.getByText(/Approved\. ZAKI is continuing/)).toBeInTheDocument();
  });

  it("never auto-dismisses or disables actions off a past expiresAt", () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);

    // expires_at is always null server-side, but even a stale/past expiresAt
    // string must NOT expire the card client-side: no countdown, no disabled
    // actions, card stays pinned and fully actionable until approve/deny.
    const expiredRequest: NullalisApprovalRequest = {
      ...request,
      expiresAt: new Date(0).toISOString(),
    };

    render(<ApprovalRequiredCard request={expiredRequest} onApprove={async () => {}} onDeny={async () => {}} />);

    act(() => {
      jest.advanceTimersByTime(120_000);
    });

    // Card is still present and the actions are still enabled.
    expect(screen.getByText("Control the browser")).toBeInTheDocument();
    expect(screen.queryByText(/Approval expired/)).not.toBeInTheDocument();
    expect(screen.queryByText(/to decide/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve extension_click action" })
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Deny extension_click action" })
    ).toBeEnabled();
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

  it("renders a retrying state + Retry-approval button when approve hits a connection-class outage, but keeps Deny/Modify available so the user can pivot", async () => {
    const onApprove = jest.fn(async () => {
      const error = new Error("agent_unreachable") as Error & { retryable?: boolean };
      error.retryable = true;
      throw error;
    });
    const onModify = jest.fn(async () => {});
    const onDeny = jest.fn(async () => {});

    render(
      <ApprovalRequiredCard
        request={request}
        onApprove={onApprove}
        onModify={onModify}
        onDeny={onDeny}
      />
    );

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
    // Wave A (P1-12 follow-up / MINOR): Deny + Modify must STILL be available so the
    // user is never stuck on Retry alone if the agent stays unreachable.
    const denyBtn = screen.getByRole("button", { name: "Deny extension_click action" });
    expect(denyBtn).toBeInTheDocument();
    expect(denyBtn).not.toBeDisabled();
    const modifyBtn = screen.getByRole("button", { name: "Modify extension_click action" });
    expect(modifyBtn).toBeInTheDocument();
    expect(modifyBtn).not.toBeDisabled();

    // And the user can actually pivot to Deny from the retrying state.
    await act(async () => {
      fireEvent.click(denyBtn);
    });
    expect(onDeny).toHaveBeenCalledWith("approval-1", request);
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

  it("does NOT show the approve-only retry UX when a DENY hits a connection-class outage", async () => {
    // A deny POST that hits a retryable 502 must NOT render the retrying
    // banner: its only button re-POSTs an APPROVE, which would invert the
    // user's intent and silently convert a denial into an approval. The full
    // action row must stay available so the user can re-decide (re-deny).
    const onDeny = jest.fn(async () => {
      const error = new Error("agent_unreachable") as Error & { retryable?: boolean };
      error.retryable = true;
      throw error;
    });

    render(<ApprovalRequiredCard request={request} onDeny={onDeny} />);

    fireEvent.click(screen.getByRole("button", { name: "Deny extension_click action" }));

    await waitFor(() => {
      expect(
        screen.getByText("Approval could not be resolved. Try again.")
      ).toBeInTheDocument();
    });
    // No retrying banner and no approve-only retry button.
    expect(screen.queryByText(/Agent restarting/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry approval for extension_click" })
    ).not.toBeInTheDocument();
    // The full action row stays available so the user can re-deny.
    expect(
      screen.getByRole("button", { name: "Deny extension_click action" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve extension_click action" })
    ).toBeInTheDocument();
  });

  it("does NOT show the approve-only retry UX when a MODIFY hits a connection-class outage", async () => {
    const onModify = jest.fn(async () => {
      const error = new Error("agent_unreachable") as Error & { retryable?: boolean };
      error.retryable = true;
      throw error;
    });

    render(<ApprovalRequiredCard request={request} onModify={onModify} />);

    fireEvent.click(screen.getByRole("button", { name: "Modify extension_click action" }));

    await waitFor(() => {
      expect(
        screen.getByText("Approval could not be resolved. Try again.")
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/Agent restarting/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry approval for extension_click" })
    ).not.toBeInTheDocument();
    // The full action row stays available so the user can re-decide.
    expect(
      screen.getByRole("button", { name: "Modify extension_click action" })
    ).toBeInTheDocument();
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

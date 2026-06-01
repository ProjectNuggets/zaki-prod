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
  "zakiControls.approval.decidedApproved": "Approved",
  "zakiControls.approval.decidedModified": "Revision requested",
  "zakiControls.approval.decidedDenied": "Denied",
  "zakiControls.approval.timer": "{{seconds}}s to decide",
  "zakiControls.approval.timerElapsed": "Decision overdue",
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
});

describe("ContextGauge", () => {
  it("uses backend context_pressure_percent as the display pressure", () => {
    render(
      <ContextGauge
        data={{
          tokenCount: 10_000,
          contextMax: 100_000,
          context_pressure_percent: 42,
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
          context_pressure_percent: 21,
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

  it("labels fallback context samples and runtime continuity metadata honestly", () => {
    render(
      <ContextGauge
        data={{
          tokenCount: 101_000,
          contextMax: 200_000,
          context_pressure_percent: 50.5,
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

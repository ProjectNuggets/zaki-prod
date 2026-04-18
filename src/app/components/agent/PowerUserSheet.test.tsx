import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PowerUserSheet, deriveSoftLimitState } from "./PowerUserSheet";
import type { NullalisApprovalRequest } from "@/app/components/chat/BotStatusRail";

jest.mock("@/lib/api", () => ({
  fetchUsageQuota: jest.fn(),
  fetchContextDiagnostics: jest.fn(),
  fetchMemoryDoctor: jest.fn(),
}));

const fetchUsageQuotaMock = jest.requireMock("@/lib/api").fetchUsageQuota as jest.Mock;
const fetchContextDiagnosticsMock = jest.requireMock("@/lib/api")
  .fetchContextDiagnostics as jest.Mock;
const fetchMemoryDoctorMock = jest.requireMock("@/lib/api")
  .fetchMemoryDoctor as jest.Mock;

beforeEach(() => {
  fetchContextDiagnosticsMock.mockResolvedValue({
    response: { ok: true },
    data: { active: false, reason: "no_active_session" },
  });
  fetchMemoryDoctorMock.mockResolvedValue({
    response: { ok: true },
    data: { active: false, reason: "no_active_session" },
  });
});

describe("PowerUserSheet", () => {
  it("opens on Approvals tab by default and is visible (not hidden behind advanced)", () => {
    render(<PowerUserSheet isOpen onClose={() => {}} />);
    expect(screen.getByTestId("power-user-tab-approvals")).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByTestId("power-user-approvals")).toBeInTheDocument();
  });

  it("renders a badge count when approvals are pending", () => {
    const pending: NullalisApprovalRequest[] = [
      { id: "a1", tool: "send_email", reason: "Needs your ok", riskLevel: "high", timestamp: 1 },
      { id: "a2", tool: "delete", reason: "Destructive", riskLevel: "critical", timestamp: 2 },
    ];
    render(<PowerUserSheet isOpen onClose={() => {}} pendingApprovals={pending} />);
    const tab = screen.getByTestId("power-user-tab-approvals");
    expect(tab.textContent).toContain("2");
    expect(screen.getAllByTestId("power-user-approval-item")).toHaveLength(2);
  });

  it("switches to Context and Memory doctor tabs on click", () => {
    render(<PowerUserSheet isOpen onClose={() => {}} />);
    fireEvent.click(screen.getByTestId("power-user-tab-context"));
    expect(screen.getByTestId("power-user-context")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("power-user-tab-memory_doctor"));
    expect(screen.getByTestId("power-user-memory-doctor")).toBeInTheDocument();
  });

  it("invokes onApproveRequest with true when Approve is clicked", () => {
    const onApprove = jest.fn<(id: string, approved: boolean) => Promise<void>>();
    onApprove.mockResolvedValue(undefined);
    const pending: NullalisApprovalRequest[] = [
      { id: "req-1", tool: "send_email", reason: "ok?", riskLevel: "high", timestamp: 1 },
    ];
    render(
      <PowerUserSheet
        isOpen
        onClose={() => {}}
        pendingApprovals={pending}
        onApproveRequest={onApprove}
      />
    );
    fireEvent.click(screen.getByText("Approve"));
    expect(onApprove).toHaveBeenCalledWith("req-1", true);
  });

  it("invokes onApproveRequest with false when Deny is clicked", () => {
    const onApprove = jest.fn<(id: string, approved: boolean) => Promise<void>>();
    onApprove.mockResolvedValue(undefined);
    const pending: NullalisApprovalRequest[] = [
      { id: "req-1", tool: "send_email", reason: "ok?", riskLevel: "high", timestamp: 1 },
    ];
    render(
      <PowerUserSheet
        isOpen
        onClose={() => {}}
        pendingApprovals={pending}
        onApproveRequest={onApprove}
      />
    );
    fireEvent.click(screen.getByText("Deny"));
    expect(onApprove).toHaveBeenCalledWith("req-1", false);
  });

  it("renders context diagnostics empty state when no active session", async () => {
    await act(async () => {
      render(
        <PowerUserSheet isOpen onClose={() => {}} initialTab="context" />
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("power-user-context")).toHaveAttribute(
        "data-state",
        "inactive"
      );
    });
    expect(
      screen.getByText(/Start a conversation to see context diagnostics/i)
    ).toBeInTheDocument();
  });

  it("renders real context diagnostics report from BFF", async () => {
    fetchContextDiagnosticsMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        active: true,
        report: {
          model: "moonshotai/Kimi-K2.5",
          history_messages: 43,
          token_estimate: 12430,
          context_window_tokens: 128000,
          context_pressure_percent: 9.7,
          history_trim_limit_messages: 80,
          token_compaction_threshold: 96000,
          token_compaction_triggered: false,
          tools: 14,
          roles: { system: 1, user: 10, assistant: 20, tool: 12 },
          memory: { hot: 5, warm: 12, cold: 40 },
        },
      },
    });
    await act(async () => {
      render(
        <PowerUserSheet isOpen onClose={() => {}} initialTab="context" />
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("power-user-context")).toBeInTheDocument();
      expect(screen.getByText("moonshotai/Kimi-K2.5")).toBeInTheDocument();
    });
    expect(screen.getByText(/10%/)).toBeInTheDocument();
    expect(
      screen.getByTestId("power-user-context-section-memory")
    ).toBeInTheDocument();
  });

  it("renders memory-doctor report text when backend returns it", async () => {
    fetchMemoryDoctorMock.mockResolvedValueOnce({
      response: { ok: true },
      data: {
        active: true,
        runtime: true,
        report_text: "Memory Doctor Report\n====================\nStatus: OK\n",
      },
    });
    await act(async () => {
      render(
        <PowerUserSheet
          isOpen
          onClose={() => {}}
          initialTab="memory_doctor"
        />
      );
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("power-user-memory-doctor-report")
      ).toHaveTextContent(/Memory Doctor Report/);
    });
  });

  it("derives soft-limit state at 70% (warning) and 90% (near_limit)", () => {
    expect(deriveSoftLimitState(0, 10, false)).toBe("normal");
    expect(deriveSoftLimitState(7, 10, false)).toBe("warning");
    expect(deriveSoftLimitState(9, 10, false)).toBe("near_limit");
    expect(deriveSoftLimitState(10, 10, false)).toBe("near_limit");
    expect(deriveSoftLimitState(100, null, true)).toBe("unlimited");
  });

  it("fetches usage quota when Usage tab is shown and marks near-limit state", async () => {
    fetchUsageQuotaMock.mockImplementation((surface: string) => {
      if (surface === "app_chat") {
        return Promise.resolve({
          response: { ok: true },
          data: { unlimited: false, limit: 10, used: 9, remaining: 1, resetAt: "2026-04-19T00:00:00Z" },
        });
      }
      return Promise.resolve({
        response: { ok: true },
        data: { unlimited: false, limit: 10, used: 2, remaining: 8, resetAt: "2026-04-19T00:00:00Z" },
      });
    });
    await act(async () => {
      render(<PowerUserSheet isOpen onClose={() => {}} initialTab="usage" />);
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("power-user-usage-surface-app_chat")
      ).toHaveAttribute("data-soft-limit-state", "near_limit");
    });
    expect(
      screen.getByTestId("power-user-usage-surface-zaki_bot")
    ).toHaveAttribute("data-soft-limit-state", "normal");
  });
});

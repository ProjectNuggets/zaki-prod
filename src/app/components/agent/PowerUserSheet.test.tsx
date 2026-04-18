import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { PowerUserSheet } from "./PowerUserSheet";
import type { NullalisApprovalRequest } from "@/app/components/chat/BotStatusRail";

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

  it("renders context and memory-health snapshots read-only", () => {
    render(
      <PowerUserSheet
        isOpen
        onClose={() => {}}
        initialTab="context"
        contextSnapshot={{
          turnsInContext: 12,
          usedTokens: 4200,
          totalTokens: 8192,
          usagePct: 51,
          compactedTurns: 3,
          providerFallbackCount: 1,
        }}
      />
    );
    expect(screen.getByTestId("power-user-context")).toBeInTheDocument();
    expect(screen.getByText(/51%/)).toBeInTheDocument();
  });
});

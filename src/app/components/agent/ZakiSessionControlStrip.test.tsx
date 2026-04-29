import "@testing-library/jest-dom";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { ZakiSessionControlStrip } from "./ZakiSessionControlStrip";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "zakiControls.strip.approvals") {
        return `${String(options?.count ?? 0)} waiting`;
      }
      if (key === "zakiControls.sandbox.activeWithBackend") {
        return `Shell sandboxed (${String(options?.backend ?? "")})`;
      }
      return key;
    },
  }),
}));

describe("ZakiSessionControlStrip", () => {
  it("renders mode buttons and opens controls when approvals are pending", () => {
    const onChangeMode = jest.fn();
    const onOpenControls = jest.fn();

    render(
      <ZakiSessionControlStrip
        active
        mode="execute"
        onChangeMode={onChangeMode}
        approvalCount={2}
        channelLabel="Telegram"
        contextPressurePercent={61}
        contextPressureState="warning"
        sandbox={{ enabled: true, backend: "bubblewrap" }}
        onOpenControls={onOpenControls}
      />
    );

    fireEvent.click(screen.getByTestId("zaki-session-mode-plan"));
    expect(onChangeMode).toHaveBeenCalledWith("plan");

    expect(screen.getByTestId("zaki-session-approval-badge")).toHaveTextContent("2 waiting");
    fireEvent.click(screen.getByTestId("zaki-session-open-controls"));
    expect(onOpenControls).toHaveBeenCalled();
    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText(/61%/)).toBeInTheDocument();
    expect(screen.getByText(/Shell sandboxed/)).toBeInTheDocument();
  });

  it("hides optional badges when no approval or channel exists", () => {
    render(
      <ZakiSessionControlStrip
        active
        mode="plan"
        onChangeMode={() => {}}
        approvalCount={0}
        channelLabel={null}
        contextPressurePercent={null}
        contextPressureState={null}
        sandbox={null}
        onOpenControls={() => {}}
      />
    );

    expect(screen.queryByTestId("zaki-session-approval-badge")).not.toBeInTheDocument();
    expect(screen.queryByText("Telegram")).not.toBeInTheDocument();
  });
});

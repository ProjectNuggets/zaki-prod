import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import { InputArea } from "./InputArea";

const navigateMock = jest.fn();
let entitlementsData = {
  data: {
    plan: { tier: "free", status: "inactive" },
    access: { active: false },
    effective: { tier: "free", status: "inactive", source: "free", premium: false },
  },
};

jest.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

jest.mock("@/queries", () => ({
  useEntitlements: () => ({
    data: entitlementsData,
  }),
  useBrainSearch: () => ({
    data: null,
    isLoading: false,
  }),
  useCheckout: () => ({
    mutateAsync: jest.fn(),
  }),
  useBillingPortal: () => ({
    mutateAsync: jest.fn(),
  }),
  useBrainSearch: () => ({
    data: null,
    isLoading: false,
  }),
}));

jest.mock("@/queries/useBrainSearch", () => ({
  useBrainSearch: () => ({
    data: null,
    isLoading: false,
  }),
}));

jest.mock("@/queries/useBrainSearch", () => ({
  useBrainSearch: () => ({
    data: null,
    isLoading: false,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { returnObjects?: boolean }) =>
      options?.returnObjects ? ["Ask anything", "Draft something"] : key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("InputArea primary action button", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    entitlementsData = {
      data: {
        plan: { tier: "free", status: "inactive" },
        access: { active: false },
        effective: { tier: "free", status: "inactive", source: "free", premium: false },
      },
    };
  });

  it("sends when not streaming and does not call stop", () => {
    const onSend = jest.fn();
    const onStop = jest.fn();
    const setAttachments = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={setAttachments}
        isSending={false}
        onStop={onStop}
      />
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "hello zaki" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith("hello zaki", []);
    expect(onStop).not.toHaveBeenCalled();
  });

  it("turns into stop mode only while streaming", () => {
    const onSend = jest.fn();
    const onStop = jest.fn();
    const setAttachments = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={setAttachments}
        isSending
        onStop={onStop}
      />
    );

    const stopButton = screen.getByRole("button", { name: "input.stopAria" });
    fireEvent.click(stopButton);

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("renders a qualitative quota badge without numeric counters", () => {
    render(
      <InputArea
        onSend={jest.fn()}
        attachments={[]}
        setAttachments={jest.fn()}
        quotaBadge={{ label: "Limited free usage", tone: "warning" }}
        zakiBotMode
      />
    );

    expect(screen.getByText("Limited free usage")).toBeInTheDocument();
    expect(screen.queryByText("0/10")).not.toBeInTheDocument();
  });

  it("shows manage access for active access-code users instead of upgrade", () => {
    entitlementsData = {
      data: {
        plan: { tier: "free", status: "inactive" },
        access: { active: true },
        effective: { tier: "personal", status: "active", source: "access_code", premium: true },
      },
    };

    render(
      <InputArea
        onSend={jest.fn()}
        attachments={[]}
        setAttachments={jest.fn()}
      />
    );

    expect(screen.getByText("input.accessLabel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "input.manageAccessCta" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "input.upgradeCta" })).not.toBeInTheDocument();
  });

  it("selects a slash command instead of sending when the palette is open", () => {
    const onSend = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={jest.fn()}
      />,
    );

    const composer = screen.getByRole("combobox");
    fireEvent.change(composer, { target: { value: "/he" } });

    expect(screen.getByTestId("slash-command-palette")).toBeInTheDocument();
    fireEvent.keyDown(composer, { key: "Enter" });

    expect(onSend).not.toHaveBeenCalled();
    expect((composer as HTMLTextAreaElement).value).toBe("/health");
  });

  it("shows ZAKI mode actions inside the plus menu and calls the mode change handler", () => {
    const onZakiModeChange = jest.fn();

    render(
      <InputArea
        onSend={jest.fn()}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiMode="review"
        onZakiModeChange={onZakiModeChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "input.menu.addOptions" }));
    expect(screen.getByTestId("zaki-composer-upload")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("zaki-composer-mode-plan"));

    expect(onZakiModeChange).toHaveBeenCalledWith("plan");
    expect(screen.getByTestId("zaki-mode-hint")).toBeInTheDocument();
  });

  it("shows the context meter when ZAKI has known or pending context pressure", () => {
    const { rerender } = render(
      <InputArea
        onSend={jest.fn()}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiContextPressurePercent={0}
      />
    );

    expect(screen.getByTestId("zaki-context-meter")).toBeInTheDocument();

    rerender(
      <InputArea
        onSend={jest.fn()}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiContextPressurePercent={61}
      />
    );

    expect(screen.getByTestId("zaki-context-meter")).toBeInTheDocument();
  });
});

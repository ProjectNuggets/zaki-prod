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

  it("shows ZAKI turn controls inline and keeps file actions in the plus menu", () => {
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

    expect(screen.getByTestId("zaki-turn-controls")).toBeInTheDocument();
    expect(screen.queryByTestId("zaki-composer-control-strip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("zaki-mode-hint")).not.toBeInTheDocument();

    const modeToggle = screen.getByTestId("zaki-composer-mode");
    expect(modeToggle).toHaveAttribute("data-mode", "review");
    fireEvent.click(modeToggle);
    expect(onZakiModeChange).toHaveBeenCalledWith("execute");

    fireEvent.click(screen.getByRole("button", { name: "input.menu.addOptions" }));
    expect(screen.getByTestId("zaki-composer-upload")).toBeInTheDocument();
  });

  it("surfaces only mode, autonomy, and reasoning as composer turn controls", () => {
    const onZakiModeChange = jest.fn();

    render(
      <InputArea
        onSend={jest.fn()}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiMode="review"
        onZakiModeChange={onZakiModeChange}
        zakiApprovalCount={2}
        zakiSandboxLabel="playwright"
        zakiArtifactCount={3}
        agentUserId="tester@example.com"
      />
    );

    expect(screen.getByTestId("zaki-turn-controls")).toBeInTheDocument();
    expect(screen.getByTestId("zaki-composer-mode")).toHaveTextContent("review");
    expect(screen.getByTestId("zaki-composer-mode")).toHaveAttribute("data-mode", "review");
    expect(screen.queryByTestId("zaki-composer-open-approvals")).not.toBeInTheDocument();
    expect(screen.queryByTestId("zaki-composer-open-browser")).not.toBeInTheDocument();
    expect(screen.queryByTestId("zaki-composer-open-output")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "input.voice.tapToRecord" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("zaki-composer-mode"));
    expect(onZakiModeChange).toHaveBeenCalledWith("execute");

    const reasoning = screen.getByTestId("zaki-composer-reasoning");
    expect(reasoning).toHaveTextContent("high");
    // "superpowers" is appended last in ZAKI_REASONING_ORDER; high → superpowers on one click.
    fireEvent.click(reasoning);
    expect(reasoning).toHaveTextContent("⚡ Superpowers");
    // One more click wraps back to "low".
    fireEvent.click(reasoning);
    expect(reasoning).toHaveTextContent("low");

    const autonomy = screen.getByTestId("zaki-composer-autonomy");
    expect(autonomy).toHaveTextContent("supervised");
    fireEvent.click(autonomy);
    expect(autonomy).toHaveTextContent("full");

    fireEvent.click(screen.getByRole("button", { name: "input.menu.addOptions" }));
    fireEvent.click(screen.getByTestId("zaki-composer-pin-context"));
    expect(screen.getAllByText("pinContext.title").length).toBeGreaterThan(0);
  });

  it("drafts a polished artifact request from the ZAKI plus menu", () => {
    const onSend = jest.fn();
    const onZakiModeChange = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiMode="plan"
        onZakiModeChange={onZakiModeChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "input.menu.addOptions" }));
    expect(screen.getByTestId("zaki-artifact-preset-document")).toBeInTheDocument();
    expect(screen.getByTestId("zaki-artifact-preset-deck")).toBeInTheDocument();
    expect(screen.getByTestId("zaki-artifact-preset-sheet")).toBeInTheDocument();
    expect(screen.getByTestId("zaki-artifact-preset-page")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("zaki-artifact-preset-deck"));

    const composer = screen.getByRole("combobox") as HTMLTextAreaElement;
    expect(composer.value).toContain("Create a polished, share-ready presentation artifact.");
    expect(composer.value).toContain("Format: PPTX-ready slide deck artifact");
    expect(composer.value).toContain("Narrative arc:");
    expect(composer.value).toContain("Title slide with the decision or thesis");
    expect(composer.value).toContain("Do not leave bracket placeholders in the artifact.");
    expect(composer.value).toContain("Make it ready to export and present without another cleanup pass.");
    expect(onZakiModeChange).toHaveBeenCalledWith("execute");
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.queryByTestId("zaki-composer-menu")).not.toBeInTheDocument();
  });

  it("sends ZAKI turn options with the message payload", () => {
    const onSend = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiMode="review"
        onZakiModeChange={jest.fn()}
      />
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "inspect the browser lane" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    expect(onSend).toHaveBeenCalledWith("inspect the browser lane", [], {
      zaki: {
        mode: "review",
        autonomy: "supervised",
        assistant_mode: "deep",
        reasoning_effort: "high",
      },
    });
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

import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { transcribeAudio } from "@/lib/api";
import { InputArea } from "./InputArea";

const navigateMock = jest.fn();
const mockTranscribeAudio = jest.mocked(transcribeAudio);
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

jest.mock("@/lib/productTelemetry", () => ({
  trackProductEvent: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  ...jest.requireActual("@/lib/api"),
  transcribeAudio: jest.fn(),
}));

describe("InputArea primary action button", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    mockTranscribeAudio.mockReset();
    jest.mocked(toast.error).mockReset();
    jest.mocked(toast.info).mockReset();
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
    expect(screen.getByTestId("voice-dictate-button")).toHaveAccessibleName(
      "input.voice.tapToRecord"
    );

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
    expect(autonomy).toHaveTextContent("supervised");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    const confirm = screen.getByRole("button", {
      name: "input.zaki.autonomyConfirm.confirm",
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("FULL"), {
      target: { value: "FULL" },
    });
    fireEvent.click(confirm);
    expect(autonomy).toHaveTextContent("full");

    fireEvent.click(screen.getByRole("button", { name: "input.menu.addOptions" }));
    fireEvent.click(screen.getByTestId("zaki-composer-pin-context"));
    expect(screen.getAllByText("pinContext.title").length).toBeGreaterThan(0);
  });

  it("names unsupported voice capture instead of blaming microphone permissions", () => {
    const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    const mediaRecorderDescriptor = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: undefined,
    });

    try {
      render(
        <InputArea
          onSend={jest.fn()}
          attachments={[]}
          setAttachments={jest.fn()}
          zakiBotMode
        />
      );

      fireEvent.click(screen.getByTestId("voice-dictate-button"));
      expect(toast.error).toHaveBeenCalledWith("input.voice.errorNoBrowser");
    } finally {
      if (mediaDevicesDescriptor) {
        Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "mediaDevices");
      }
      if (mediaRecorderDescriptor) {
        Object.defineProperty(globalThis, "MediaRecorder", mediaRecorderDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "MediaRecorder");
      }
    }
  });

  it("releases the microphone when recorder setup is unsupported", async () => {
    const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    const mediaRecorderDescriptor = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
    const stopTrack = jest.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;

    class UnsupportedMediaRecorder {
      static isTypeSupported() {
        return false;
      }

      constructor() {
        const error = new Error("No supported recording codec");
        error.name = "NotSupportedError";
        throw error;
      }
    }

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: UnsupportedMediaRecorder,
    });

    try {
      render(
        <InputArea
          onSend={jest.fn()}
          attachments={[]}
          setAttachments={jest.fn()}
          zakiBotMode
        />
      );

      fireEvent.click(screen.getByTestId("voice-dictate-button"));

      await waitFor(() => expect(stopTrack).toHaveBeenCalledTimes(1));
      expect(toast.error).toHaveBeenCalledWith("input.voice.errorNoBrowser");
      expect(toast.error).not.toHaveBeenCalledWith("input.voice.errorMicAccess");
    } finally {
      if (mediaDevicesDescriptor) {
        Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "mediaDevices");
      }
      if (mediaRecorderDescriptor) {
        Object.defineProperty(globalThis, "MediaRecorder", mediaRecorderDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "MediaRecorder");
      }
    }
  });

  it("rejects a raw Opus default recording rather than mislabeling it as Ogg", async () => {
    const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    const mediaRecorderDescriptor = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
    const stopTrack = jest.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;

    class RawOpusMediaRecorder {
      static isTypeSupported() {
        return false;
      }

      mimeType = "audio/opus";
    }

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: RawOpusMediaRecorder,
    });

    try {
      render(
        <InputArea
          onSend={jest.fn()}
          attachments={[]}
          setAttachments={jest.fn()}
          zakiBotMode
        />
      );

      fireEvent.click(screen.getByTestId("voice-dictate-button"));

      await waitFor(() => expect(stopTrack).toHaveBeenCalledTimes(1));
      expect(toast.error).toHaveBeenCalledWith("input.voice.errorNoBrowser");
      expect(mockTranscribeAudio).not.toHaveBeenCalled();
    } finally {
      if (mediaDevicesDescriptor) {
        Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "mediaDevices");
      }
      if (mediaRecorderDescriptor) {
        Object.defineProperty(globalThis, "MediaRecorder", mediaRecorderDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "MediaRecorder");
      }
    }
  });

  it("cancels active dictation when a typed Agent turn starts streaming", async () => {
    const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    const mediaRecorderDescriptor = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
    const blobArrayBufferDescriptor = Object.getOwnPropertyDescriptor(Blob.prototype, "arrayBuffer");
    const readCapturedAudio = jest.fn(async () => new Uint8Array([1, 2, 3]).buffer);
    const stopTrack = jest.fn();
    const stopRecorder = jest.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;

    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      state: "inactive" | "recording" = "inactive";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;

      start() {
        this.state = "recording";
      }

      stop() {
        stopRecorder();
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["captured audio"], { type: "audio/webm" }) });
        this.onstop?.();
      }
    }

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: FakeMediaRecorder,
    });
    Object.defineProperty(Blob.prototype, "arrayBuffer", {
      configurable: true,
      value: readCapturedAudio,
    });

    const onSend = jest.fn();
    try {
      const { rerender } = render(
        <InputArea
          onSend={onSend}
          attachments={[]}
          setAttachments={jest.fn()}
          zakiBotMode
          isSending={false}
        />
      );

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "send this draft" } });
      fireEvent.click(screen.getByTestId("voice-dictate-button"));
      await waitFor(() =>
        expect(screen.getByTestId("voice-dictate-button")).toHaveAttribute("data-recording", "true")
      );

      fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));
      expect(onSend).toHaveBeenCalledTimes(1);

      rerender(
        <InputArea
          onSend={onSend}
          attachments={[]}
          setAttachments={jest.fn()}
          zakiBotMode
          isSending
        />
      );

      await waitFor(() => expect(stopRecorder).toHaveBeenCalledTimes(1));
      expect(stopTrack).toHaveBeenCalledTimes(1);
      expect(readCapturedAudio).not.toHaveBeenCalled();
      expect(mockTranscribeAudio).not.toHaveBeenCalled();
    } finally {
      if (mediaDevicesDescriptor) {
        Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "mediaDevices");
      }
      if (mediaRecorderDescriptor) {
        Object.defineProperty(globalThis, "MediaRecorder", mediaRecorderDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "MediaRecorder");
      }
      if (blobArrayBufferDescriptor) {
        Object.defineProperty(Blob.prototype, "arrayBuffer", blobArrayBufferDescriptor);
      } else {
        Reflect.deleteProperty(Blob.prototype, "arrayBuffer");
      }
    }
  });

  it("releases a late microphone permission grant after a typed Agent send", async () => {
    const mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
    const mediaRecorderDescriptor = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
    const stopTrack = jest.fn();
    const mediaRecorderCreated = jest.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    let resolveMicrophoneRequest!: (stream: MediaStream) => void;

    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      state: "inactive" | "recording" = "inactive";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;

      constructor() {
        mediaRecorderCreated();
      }

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        this.onstop?.();
      }
    }

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: jest.fn(
          () => new Promise<MediaStream>((resolve) => { resolveMicrophoneRequest = resolve; })
        ),
      },
    });
    Object.defineProperty(globalThis, "MediaRecorder", {
      configurable: true,
      value: FakeMediaRecorder,
    });

    const onSend = jest.fn();
    try {
      render(
        <InputArea
          onSend={onSend}
          attachments={[]}
          setAttachments={jest.fn()}
          zakiBotMode
          isSending={false}
        />
      );

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "send this draft" } });
      fireEvent.click(screen.getByTestId("voice-dictate-button"));

      fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));
      expect(onSend).toHaveBeenCalledTimes(1);
      resolveMicrophoneRequest(stream);

      await waitFor(() => expect(stopTrack).toHaveBeenCalledTimes(1));
      expect(mediaRecorderCreated).not.toHaveBeenCalled();
    } finally {
      if (mediaDevicesDescriptor) {
        Object.defineProperty(navigator, "mediaDevices", mediaDevicesDescriptor);
      } else {
        Reflect.deleteProperty(navigator, "mediaDevices");
      }
      if (mediaRecorderDescriptor) {
        Object.defineProperty(globalThis, "MediaRecorder", mediaRecorderDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, "MediaRecorder");
      }
    }
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
    expect(onZakiModeChange).not.toHaveBeenCalled();
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
        autonomy: "supervised",
        reasoning_effort: "high",
      },
    });
  });

  it("uses saved Agent defaults for the first ZAKI send", () => {
    const onSend = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiMode="execute"
        zakiDefaultAutonomy="read_only"
        zakiDefaultReasoningEffort="low"
      />
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "start from my defaults" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    expect(onSend).toHaveBeenCalledWith("start from my defaults", [], {
      zaki: {
        autonomy: "read_only",
        reasoning_effort: "low",
      },
    });
  });

  it("lets per-turn composer chips override saved Agent defaults", () => {
    const onSend = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiMode="execute"
        zakiDefaultAutonomy="full"
        zakiDefaultReasoningEffort="high"
      />
    );

    fireEvent.click(screen.getByTestId("zaki-composer-reasoning"));
    expect(screen.getByTestId("zaki-composer-reasoning")).toHaveTextContent("⚡ Superpowers");
    fireEvent.click(screen.getByTestId("zaki-composer-autonomy"));
    expect(screen.getByTestId("zaki-composer-autonomy")).toHaveTextContent("read-only");

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "override this turn" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    expect(onSend).toHaveBeenCalledWith("override this turn", [], {
      zaki: {
        autonomy: "read_only",
        reasoning_effort: "superpowers",
      },
    });
  });

  it("resets composer chip overrides to saved Agent defaults after a ZAKI send", () => {
    const onSend = jest.fn();

    render(
      <InputArea
        onSend={onSend}
        attachments={[]}
        setAttachments={jest.fn()}
        zakiBotMode
        zakiMode="execute"
        zakiDefaultAutonomy="full"
        zakiDefaultReasoningEffort="high"
      />
    );

    fireEvent.click(screen.getByTestId("zaki-composer-reasoning"));
    fireEvent.click(screen.getByTestId("zaki-composer-autonomy"));

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "one turn override" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    expect(onSend).toHaveBeenLastCalledWith("one turn override", [], {
      zaki: {
        autonomy: "read_only",
        reasoning_effort: "superpowers",
      },
    });

    expect(screen.getByTestId("zaki-composer-reasoning")).toHaveTextContent("high");
    expect(screen.getByTestId("zaki-composer-autonomy")).toHaveTextContent("full");

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "use defaults again" },
    });
    fireEvent.click(screen.getByRole("button", { name: "input.sendAria" }));

    expect(onSend).toHaveBeenLastCalledWith("use defaults again", [], {
      zaki: {
        autonomy: "full",
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

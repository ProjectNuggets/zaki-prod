import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MinutesApiError } from "@/lib/minutesApi";
import { MinutesControls } from "./MinutesControls";

const mockControl = jest.fn();
const mockConsent = jest.fn();
const mockCapture = jest.fn();
const mockCaptureStatus = jest.fn();
const mockStop = jest.fn();
const mockForget = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

jest.mock("@/lib/minutesApi", () => ({
  MinutesApiError: class MinutesApiError extends Error {
    constructor(
      public status: number,
      public code: string,
      message: string,
      public retryable = false,
    ) {
      super(message);
    }
  },
  getMinutesControl: (...args: unknown[]) => mockControl(...args),
  saveMinutesConsent: (...args: unknown[]) => mockConsent(...args),
  requestMinutesCapture: (...args: unknown[]) => mockCapture(...args),
  getMinutesCaptureStatus: (...args: unknown[]) => mockCaptureStatus(...args),
  stopMinutesCapture: (...args: unknown[]) => mockStop(...args),
  forgetMinutesMeeting: (...args: unknown[]) => mockForget(...args),
}));

const AVAILABLE = {
  available: true as const,
  policy: {
    capture_notice_policy_version: "minutes-capture-consent-v1",
    retention: { audio_days: 0, transcript_days: 30, summary_days: 30 },
  },
};

function renderControls({ meetings = [], onForgot = jest.fn() }: {
  meetings?: Array<{ id: string; title: string }>;
  onForgot?: (meetingId: string) => void;
} = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MinutesControls meetings={meetings} onForgot={onForgot} />
    </QueryClientProvider>
  );
  return { onForgot };
}

describe("MinutesControls", () => {
  beforeEach(() => {
    mockControl.mockReset().mockResolvedValue(AVAILABLE);
    mockConsent.mockReset().mockResolvedValue({ state: "ready", policyVersion: "minutes-capture-consent-v1" });
    mockCapture.mockReset().mockResolvedValue({ captureId: "capture-01", meetingId: "meeting-01", state: "requested" });
    mockCaptureStatus.mockReset();
    mockStop.mockReset();
    mockForget.mockReset().mockResolvedValue({
      status: "completed",
      receiptId: "receipt-01",
      erasedAt: "2026-07-19T10:00:00.000Z",
      counts: { meetingRows: 1, transcriptRows: 1, summaryRows: 1, recordingObjects: 0 },
    });
  });

  test("does not hint at a capture bot while the default-false BFF gate is closed", async () => {
    mockControl.mockRejectedValue(new MinutesApiError(404, "minutes_control_disabled", "not enabled"));
    renderControls();

    await waitFor(() => expect(mockControl).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("heading", { name: "Minutes controls" })).not.toBeInTheDocument();
    expect(screen.queryByText("Capture and deletion controls are not ready. Your retained archive was not changed.")).not.toBeInTheDocument();
  });

  test("requires consent before a visible-bot capture request and keeps the browser payload bounded", async () => {
    renderControls();

    expect(await screen.findByRole("heading", { name: "Minutes controls" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Allow ZAKI Minutes to request a visible capture bot." }));
    fireEvent.click(screen.getByRole("button", { name: "Save consent" }));

    await waitFor(() => expect(mockConsent).toHaveBeenCalled());
    expect(mockConsent.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      captureEnabled: true,
      agentReadEnabled: false,
      retention: AVAILABLE.policy.retention,
      idempotencyKey: expect.stringMatching(/^minutes-consent-/),
    }));
    expect(await screen.findByRole("heading", { name: "Request a visible bot" })).toBeInTheDocument();
    expect(screen.getByText(/ZAKI Notetaker must be visibly present/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Meeting URL"), { target: { value: "https://meet.google.com/abc-defg-hij" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "I confirm the bot will be visible and attendees will be told before capture starts." }));
    fireEvent.click(screen.getByRole("button", { name: "Request capture" }));

    await waitFor(() => expect(mockCapture).toHaveBeenCalled());
    expect(mockCapture.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      platform: "google_meet",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      visibleBotAttested: true,
      idempotencyKey: expect.stringMatching(/^minutes-capture-/),
    }));
    expect(await screen.findByText("Capture requested")).toBeInTheDocument();
  });

  test("hides the capture form after a saved consent disables capture", async () => {
    renderControls();

    expect(await screen.findByRole("heading", { name: "Minutes controls" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Allow ZAKI Minutes to request a visible capture bot." }));
    fireEvent.click(screen.getByRole("button", { name: "Save consent" }));
    expect(await screen.findByRole("heading", { name: "Request a visible bot" })).toBeInTheDocument();

    mockConsent.mockResolvedValueOnce({ state: "disabled", policyVersion: "minutes-capture-consent-v1" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Allow ZAKI Minutes to request a visible capture bot." }));
    fireEvent.click(screen.getByRole("button", { name: "Save consent" }));

    await waitFor(() => expect(mockConsent).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("heading", { name: "Request a visible bot" })).not.toBeInTheDocument();
    expect(screen.getByText("Enable capture consent to request a meeting bot.")).toBeInTheDocument();
  });

  test("uses an explicit confirmation and a safe receipt for retained-meeting deletion", async () => {
    const { onForgot } = renderControls({ meetings: [{ id: "meeting-01", title: "Launch review" }] });

    expect(await screen.findByRole("heading", { name: "Forget retained meetings" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Forget" }));
    expect(screen.getByText("Forget permanently?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Forget" }));

    await waitFor(() => expect(mockForget).toHaveBeenCalled());
    expect(mockForget.mock.calls[0]?.slice(0, 2)).toEqual([
      "meeting-01",
      expect.stringMatching(/^minutes-forget-/),
    ]);
    expect(await screen.findByText("Deletion receipt recorded.")).toBeInTheDocument();
    expect(onForgot).toHaveBeenCalledWith("meeting-01");
  });

  test("offers a retry without revealing an upstream control error", async () => {
    mockControl.mockRejectedValue(new MinutesApiError(503, "minutes_control_unavailable", "private upstream detail", true));
    renderControls();

    expect(await screen.findByRole("heading", { name: "Minutes controls are unavailable" })).toBeInTheDocument();
    expect(screen.queryByText("private upstream detail")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(mockControl).toHaveBeenCalledTimes(2));
  });
});

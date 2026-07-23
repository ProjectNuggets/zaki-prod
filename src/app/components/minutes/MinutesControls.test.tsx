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
const mockCalConn = jest.fn();
const mockCalAutojoin = jest.fn();
const mockCalConnect = jest.fn();
const mockCalDisconnect = jest.fn();
const mockCalSave = jest.fn();

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
  getCalendarConnection: (...args: unknown[]) => mockCalConn(...args),
  getCalendarAutojoin: (...args: unknown[]) => mockCalAutojoin(...args),
  startCalendarConnect: (...args: unknown[]) => mockCalConnect(...args),
  disconnectCalendar: (...args: unknown[]) => mockCalDisconnect(...args),
  saveCalendarAutojoin: (...args: unknown[]) => mockCalSave(...args),
}));

const AVAILABLE = {
  available: true as const,
  policy: {
    capture_notice_policy_version: "minutes-capture-consent-v1",
    retention: { audio_days: 0, transcript_days: 30, summary_days: 30 },
  },
  consent: { capture_enabled: false, agent_read_enabled: false },
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
    // Default the calendar card INVISIBLE (dark 404), so the pre-existing tests are
    // unaffected; the calendar suite overrides these per test.
    mockCalConn.mockReset().mockRejectedValue(new MinutesApiError(404, "not_found", "not enabled"));
    mockCalAutojoin.mockReset().mockRejectedValue(new MinutesApiError(404, "not_found", "not enabled"));
    mockCalConnect.mockReset();
    mockCalDisconnect.mockReset();
    mockCalSave.mockReset();
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
    // Platform is detected from the link, not a picker — before a URL is typed it reads "From the link".
    expect(screen.getByText("From the link")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Platform" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Meeting URL"), { target: { value: "https://meet.google.com/abc-defg-hij" } });
    expect(screen.getByText("Google Meet")).toBeInTheDocument();
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

  test("detects Microsoft Teams from the pasted link and sends platform=teams", async () => {
    renderControls();
    expect(await screen.findByRole("heading", { name: "Minutes controls" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Allow ZAKI Minutes to request a visible capture bot." }));
    fireEvent.click(screen.getByRole("button", { name: "Save consent" }));
    expect(await screen.findByRole("heading", { name: "Request a visible bot" })).toBeInTheDocument();

    // An unrecognized link blocks the request; a Teams link is detected and sent as teams.
    fireEvent.change(screen.getByLabelText("Meeting URL"), { target: { value: "https://example.com/not-a-meeting" } });
    expect(screen.getByText("Paste a Google Meet or Microsoft Teams meeting link.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request capture" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Meeting URL"), { target: { value: "https://teams.microsoft.com/l/meetup-join/19%3ameeting_x%40thread.v2/0" } });
    expect(screen.getByText("Microsoft Teams")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "I confirm the bot will be visible and attendees will be told before capture starts." }));
    fireEvent.click(screen.getByRole("button", { name: "Request capture" }));

    await waitFor(() => expect(mockCapture).toHaveBeenCalled());
    expect(mockCapture.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      platform: "teams",
      meetingUrl: "https://teams.microsoft.com/l/meetup-join/19%3ameeting_x%40thread.v2/0",
    }));
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

  test("the Forever preset sends the platform max symmetrically and never touches audio", async () => {
    renderControls();

    expect(await screen.findByRole("heading", { name: "Minutes controls" })).toBeInTheDocument();
    // Seeded at 30/30 → the "30 days" preset is selected, not a Custom option.
    const keep = screen.getByRole("combobox", { name: "Keep each meeting for" });
    expect((keep as HTMLSelectElement).value).toBe("30");
    expect(screen.queryByRole("option", { name: /^Custom/ })).not.toBeInTheDocument();

    fireEvent.change(keep, { target: { value: "3650" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Allow ZAKI Minutes to request a visible capture bot." }));
    fireEvent.click(screen.getByRole("button", { name: "Save consent" }));

    await waitFor(() => expect(mockConsent).toHaveBeenCalled());
    // Forever = 3650 for BOTH transcript and summary (symmetric, so the engine's
    // summary <= transcript check can never 422); audio stays at its seeded 0.
    expect(mockConsent.mock.calls[0]?.[0]?.retention).toEqual({ audio_days: 0, transcript_days: 3650, summary_days: 3650 });
  });

  test("renders the saved consent checked and opens the capture form without a re-save", async () => {
    mockControl.mockResolvedValue({ ...AVAILABLE, consent: { capture_enabled: true, agent_read_enabled: true } });
    renderControls();

    expect(await screen.findByRole("heading", { name: "Minutes controls" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Allow ZAKI Minutes to request a visible capture bot." })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Allow my ZAKI agent to read retained Minutes items." })).toBeChecked();
    // Saved capture consent unlocks the capture form on load — the footgun was
    // that this stayed locked until the user re-checked and re-saved.
    expect(screen.getByRole("heading", { name: "Request a visible bot" })).toBeInTheDocument();
  });

  test("an off-preset saved policy is surfaced as Custom, not snapped onto a preset", async () => {
    mockControl.mockResolvedValue({
      ...AVAILABLE,
      policy: { ...AVAILABLE.policy, retention: { audio_days: 0, transcript_days: 45, summary_days: 45 } },
    });
    renderControls();

    expect(await screen.findByRole("heading", { name: "Minutes controls" })).toBeInTheDocument();
    const keep = screen.getByRole("combobox", { name: "Keep each meeting for" });
    expect((keep as HTMLSelectElement).value).toBe("45");
    expect(screen.getByRole("option", { name: "Custom (45 days)" })).toBeInTheDocument();
  });
});

const CONNECTED_AUTOJOIN = {
  enabled: false,
  joinScope: "accepted" as const,
  consentVersion: "2026-07-23.calendar-autojoin-consent.v1",
  hasConsent: false,
  isCurrent: true,
  requiresReconsent: false,
  consentedAt: null,
};

describe("CalendarAutojoin", () => {
  beforeEach(() => {
    mockControl.mockReset().mockResolvedValue(AVAILABLE);
    mockConsent.mockReset().mockResolvedValue({ state: "ready", policyVersion: "minutes-capture-consent-v1" });
    mockCapture.mockReset();
    mockCaptureStatus.mockReset();
    mockStop.mockReset();
    mockForget.mockReset();
    mockCalConn.mockReset();
    mockCalAutojoin.mockReset();
    mockCalConnect.mockReset();
    mockCalDisconnect.mockReset();
    mockCalSave.mockReset();
  });
  // jsdom's window.location is non-configurable (can't stub) and .assign is a
  // read-only no-op — so navigation is asserted via the API call, and the callback
  // URL is driven through the real history API (which DOES update location.search).
  afterEach(() => { window.history.replaceState(null, "", "/"); });

  test("stays invisible when the calendar feature is dark (404)", async () => {
    mockCalConn.mockRejectedValue(new MinutesApiError(404, "not_found", "not enabled"));
    renderControls();
    expect(await screen.findByRole("heading", { name: "Minutes controls" })).toBeInTheDocument();
    await waitFor(() => expect(mockCalConn).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Calendar auto-join" })).not.toBeInTheDocument();
  });

  test("hides the whole card if the autojoin route goes dark (404) even while connected", async () => {
    mockCalConn.mockResolvedValue({ connected: true, status: "active" });
    mockCalAutojoin.mockRejectedValue(new MinutesApiError(404, "not_found", "not enabled"));
    renderControls();
    expect(await screen.findByRole("heading", { name: "Minutes controls" })).toBeInTheDocument();
    // Dark-invisible contract: once the autojoin 404 lands, a 404 from EITHER route
    // hides the whole card — never a stray "unavailable" error.
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Calendar auto-join" })).not.toBeInTheDocument());
    expect(screen.queryByText("Auto-join settings are unavailable.")).not.toBeInTheDocument();
  });

  test("not connected → Connect starts the OAuth flow with the current page as returnTo", async () => {
    mockCalConn.mockResolvedValue({ connected: false });
    mockCalConnect.mockResolvedValue({ authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth?x=1" });
    renderControls();

    const connectBtn = await screen.findByRole("button", { name: "Connect Google Calendar" });
    fireEvent.click(connectBtn);
    // returnTo is the current page (jsdom default "/") so the callback lands back here;
    // on success the component navigates the top window to the returned authorize URL.
    await waitFor(() => expect(mockCalConnect).toHaveBeenCalledWith("/"));
  });

  test("a dead grant (invalid_grant) shows a reconnect prompt", async () => {
    mockCalConn.mockResolvedValue({ connected: false, status: "invalid_grant" });
    renderControls();
    expect(await screen.findByText("Your Google Calendar access ended. Reconnect to keep auto-join working.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconnect Google Calendar" })).toBeInTheDocument();
  });

  test("connected → saving sends the chosen scope and standing-consent flag", async () => {
    mockCalConn.mockResolvedValue({ connected: true, status: "active", scopes: ["calendar.events.readonly"] });
    mockCalAutojoin.mockResolvedValue(CONNECTED_AUTOJOIN);
    mockCalSave.mockResolvedValue({ ...CONNECTED_AUTOJOIN, enabled: true, joinScope: "organizer" });
    renderControls();

    const toggle = await screen.findByRole("checkbox", { name: /Automatically send the visible notetaker/ });
    fireEvent.click(toggle);
    fireEvent.change(screen.getByRole("combobox", { name: "Which meetings" }), { target: { value: "organizer" } });
    fireEvent.click(screen.getByRole("button", { name: "Save auto-join" }));

    await waitFor(() => expect(mockCalSave).toHaveBeenCalled());
    expect(mockCalSave.mock.calls[0]?.[0]).toEqual({ enabled: true, joinScope: "organizer" });
    expect(await screen.findByText("Auto-join is on.")).toBeInTheDocument();
  });

  test("the scope selector is disabled until auto-join is enabled", async () => {
    mockCalConn.mockResolvedValue({ connected: true, status: "active" });
    mockCalAutojoin.mockResolvedValue(CONNECTED_AUTOJOIN);
    renderControls();
    const scope = await screen.findByRole("combobox", { name: "Which meetings" });
    expect(scope).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Automatically send the visible notetaker/ }));
    expect(scope).not.toBeDisabled();
  });

  test("connected → Disconnect calls the disconnect endpoint", async () => {
    mockCalConn.mockResolvedValue({ connected: true, status: "active" });
    mockCalAutojoin.mockResolvedValue(CONNECTED_AUTOJOIN);
    mockCalDisconnect.mockResolvedValue({ disconnected: true, revoked: true });
    renderControls();
    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    await waitFor(() => expect(mockCalDisconnect).toHaveBeenCalled());
  });

  test("a requiresReconsent status prompts a re-confirm", async () => {
    mockCalConn.mockResolvedValue({ connected: true, status: "active" });
    mockCalAutojoin.mockResolvedValue({ ...CONNECTED_AUTOJOIN, enabled: true, isCurrent: false, requiresReconsent: true });
    renderControls();
    expect(await screen.findByText("The auto-join terms changed. Re-confirm below to keep auto-join on.")).toBeInTheDocument();
  });

  test("reads the OAuth callback result from the URL and clears it", async () => {
    window.history.replaceState(null, "", "/settings?calendar=connected");
    mockCalConn.mockResolvedValue({ connected: true, status: "active" });
    mockCalAutojoin.mockResolvedValue(CONNECTED_AUTOJOIN);
    renderControls();
    expect(await screen.findByText("Google Calendar connected.")).toBeInTheDocument();
    // The param is stripped so a refresh won't replay the banner (real history API).
    expect(window.location.search).toBe("");
  });

  test("surfaces a cancelled OAuth callback distinctly", async () => {
    window.history.replaceState(null, "", "/settings?calendar=error&reason=cancelled");
    mockCalConn.mockResolvedValue({ connected: false });
    renderControls();
    expect(await screen.findByText("Calendar connection was cancelled.")).toBeInTheDocument();
  });
});

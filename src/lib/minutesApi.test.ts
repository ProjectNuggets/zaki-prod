import { backendAuthRequest } from "@/lib/api";
import {
  forgetMinutesMeeting,
  getMinutesCaptureStatus,
  getMinutesControl,
  listMinutes,
  readMinutesItem,
  requestMinutesCapture,
  saveMinutesConsent,
  searchMinutes,
  stopMinutesCapture,
} from "./minutesApi";

jest.mock("@/lib/api", () => ({ backendAuthRequest: jest.fn() }));

const request = backendAuthRequest as jest.MockedFunction<typeof backendAuthRequest>;

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe("Minutes browser API", () => {
  beforeEach(() => request.mockReset());

  it("uses only the fixed authenticated Minutes BFF routes", async () => {
    request
      .mockResolvedValueOnce(ok({ items: [], truncated: false }))
      .mockResolvedValueOnce(ok({ item: { id: "summary:41" }, truncated: false }))
      .mockResolvedValueOnce(ok({ items: [], truncated: false }));

    await listMinutes({ limit: 50 });
    await readMinutesItem("summary:41", "full");
    await searchMinutes("launch review", 20);

    expect(request.mock.calls).toEqual([
      ["/api/minutes/index?limit=50", { method: "GET", redirectOnAuthFailure: false }],
      ["/api/minutes/items/summary%3A41?variant=full", { method: "GET", redirectOnAuthFailure: false }],
      ["/api/minutes/search", { method: "POST", body: JSON.stringify({ query: "launch review", limit: 20 }), redirectOnAuthFailure: false }],
    ]);
  });

  it("keeps all control actions on the same-origin BFF without exposing an engine credential", async () => {
    request
      .mockResolvedValueOnce(ok({ available: true, policy: { capture_notice_policy_version: "minutes-capture-consent-v1", retention: { audio_days: 0, transcript_days: 30, summary_days: 30 } } }))
      .mockResolvedValueOnce(ok({ state: "ready", policyVersion: "minutes-capture-consent-v1" }))
      .mockResolvedValueOnce(ok({ captureId: "capture-01", state: "requested" }))
      .mockResolvedValueOnce(ok({ captureId: "capture-01", state: "active", capturedSecondsTotal: 60, terminal: false }))
      .mockResolvedValueOnce(ok({ captureId: "capture-01", state: "stopping", terminal: false }))
      .mockResolvedValueOnce(ok({ status: "completed", receiptId: "receipt-01", erasedAt: "2026-07-19T10:00:00.000Z", counts: {} }));

    await getMinutesControl();
    await saveMinutesConsent({
      captureEnabled: true,
      agentReadEnabled: false,
      retention: { audio_days: 0, transcript_days: 30, summary_days: 30 },
      idempotencyKey: "consent-01",
    });
    await requestMinutesCapture({
      platform: "google_meet",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      visibleBotAttested: true,
      idempotencyKey: "capture-01",
    });
    await getMinutesCaptureStatus("capture-01");
    await stopMinutesCapture("capture-01", "stop-01");
    await forgetMinutesMeeting("meeting-01", "forget-01");

    expect(request.mock.calls).toEqual([
      ["/api/minutes/control", { method: "GET", redirectOnAuthFailure: false }],
      ["/api/minutes/control/consent", {
        method: "POST",
        body: JSON.stringify({
          capture_enabled: true,
          agent_read_enabled: false,
          retention: { audio_days: 0, transcript_days: 30, summary_days: 30 },
          idempotency_key: "consent-01",
        }),
        redirectOnAuthFailure: false,
      }],
      ["/api/minutes/captures", {
        method: "POST",
        body: JSON.stringify({
          platform: "google_meet",
          meeting_url: "https://meet.google.com/abc-defg-hij",
          visible_bot_attested: true,
          idempotency_key: "capture-01",
        }),
        redirectOnAuthFailure: false,
      }],
      ["/api/minutes/captures/capture-01", { method: "GET", redirectOnAuthFailure: false }],
      ["/api/minutes/captures/capture-01/stop", {
        method: "POST",
        body: JSON.stringify({ idempotency_key: "stop-01" }),
        redirectOnAuthFailure: false,
      }],
      ["/api/minutes/meetings/meeting-01/forget", {
        method: "POST",
        body: JSON.stringify({ idempotency_key: "forget-01" }),
        redirectOnAuthFailure: false,
      }],
    ]);
    expect(JSON.stringify(request.mock.calls)).not.toContain("MINUTES_ENGINE");
    expect(JSON.stringify(request.mock.calls)).not.toContain("X-Zaki-Control-Token");
  });

  it("treats a malformed successful control response as unavailable instead of crashing the Minutes route", async () => {
    request.mockResolvedValueOnce(ok({ success: true }));

    await expect(getMinutesControl()).rejects.toMatchObject({
      status: 502,
      code: "minutes_control_invalid_response",
      retryable: true,
    });
  });
});

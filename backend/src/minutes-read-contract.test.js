import { describe, expect, test } from "@jest/globals";
import {
  MINUTES_READ_RESPONSE_MAX_BYTES,
  MinutesReadContractError,
  parseMinutesIndexResponse,
  parseMinutesItemResponse,
  readMinutesResponseJson,
} from "./minutes-read-contract.js";

const TRANSCRIPT_RETENTION = Object.freeze({
  scope: "minutes.transcript",
  expires_at: "2026-10-01T00:00:00.000Z",
});

function transcriptMetadata(overrides = {}) {
  return {
    id: "transcript:17",
    kind: "transcript",
    title: "Project Alpha transcript",
    meeting_id: "meeting:17",
    occurred_at: "2026-07-18T09:00:00.000Z",
    updated_at: "2026-07-18T10:00:00.000Z",
    sensitivity: "sensitive_pii",
    retention: TRANSCRIPT_RETENTION,
    ...overrides,
  };
}

describe("Minutes sealed read response contract", () => {
  test("accepts a strict bounded index envelope", () => {
    const payload = {
      items: [transcriptMetadata()],
      truncated: true,
      next_cursor: "opaque-page-2",
    };
    expect(parseMinutesIndexResponse(payload)).toEqual(payload);
  });

  test("rejects missing privacy labels, unknown fields, and inconsistent cursor state", () => {
    const { sensitivity: _sensitivity, ...missingSensitivity } = transcriptMetadata();
    expect(() => parseMinutesIndexResponse({ items: [missingSensitivity], truncated: false })).toThrow(MinutesReadContractError);
    expect(() => parseMinutesIndexResponse({
      items: [transcriptMetadata({ native_vexa_id: "must-not-leak" })],
      truncated: false,
    })).toThrow(MinutesReadContractError);
    expect(() => parseMinutesIndexResponse({
      items: [transcriptMetadata()],
      truncated: false,
      next_cursor: "unexpected",
    })).toThrow(MinutesReadContractError);
  });

  test("accepts transcript content and rejects semantic turn-order violations", () => {
    const payload = {
      item: {
        ...transcriptMetadata(),
        capture_notice: {
          bot_visible: true,
          tenant_attested_at: "2026-07-18T08:55:00.000Z",
          policy_version: "minutes-consent-v1",
        },
        content: {
          format: "speaker_turns",
          language: "en",
          turns: [
            {
              speaker: "Nova",
              started_at: "2026-07-18T09:00:00.000Z",
              ended_at: "2026-07-18T09:00:05.000Z",
              text: "Start with the read boundary.",
            },
            {
              speaker: "ZAKI",
              started_at: "2026-07-18T09:00:06.000Z",
              text: "The control plane remains gated.",
            },
          ],
        },
      },
      truncated: false,
    };
    expect(parseMinutesItemResponse(payload)).toEqual(payload);

    const reversed = structuredClone(payload);
    reversed.item.content.turns[1].started_at = "2026-07-18T08:59:00.000Z";
    expect(() => parseMinutesItemResponse(reversed)).toThrow(MinutesReadContractError);
  });

  test("reads JSON through the full-response byte cap", async () => {
    const response = new Response(JSON.stringify({ items: [], truncated: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(readMinutesResponseJson(response)).resolves.toEqual({ items: [], truncated: false });

    const oversized = new Response("{}", {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-length": String(MINUTES_READ_RESPONSE_MAX_BYTES + 1),
      },
    });
    await expect(readMinutesResponseJson(oversized)).rejects.toMatchObject({
      code: "minutes_upstream_response_too_large",
    });
  });

  test("rejects redirects, non-JSON success, and malformed JSON without echoing content", async () => {
    const redirected = new Response(null, {
      status: 302,
      headers: { location: "https://evil.example/transcript" },
    });
    await expect(readMinutesResponseJson(redirected)).rejects.toMatchObject({
      code: "minutes_upstream_redirect_rejected",
    });

    const text = new Response("sensitive transcript", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
    await expect(readMinutesResponseJson(text)).rejects.toMatchObject({
      code: "minutes_upstream_invalid_content_type",
    });

    const malformed = new Response("{sensitive transcript", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    await expect(readMinutesResponseJson(malformed)).rejects.toMatchObject({
      code: "minutes_upstream_invalid_json",
      message: "Minutes upstream returned invalid JSON.",
    });
  });
});

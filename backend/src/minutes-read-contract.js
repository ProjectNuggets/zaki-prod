import { z } from "zod";

export const MINUTES_READ_RESPONSE_MAX_BYTES = 270_336;

export class MinutesReadContractError extends Error {
  constructor(message, code, status = 502, options = {}) {
    super(message, { cause: options.cause });
    this.name = "MinutesReadContractError";
    this.code = code;
    this.status = status;
  }
}

const Identifier = z.string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const DateTime = z.string().datetime({ offset: true });
const Sensitivity = z.literal("sensitive_pii");

const CaptureNotice = z.object({
  bot_visible: z.literal(true),
  tenant_attested_at: DateTime,
  policy_version: z.string().min(1).max(80),
}).strict();

const TranscriptRetention = z.object({
  scope: z.literal("minutes.transcript"),
  expires_at: DateTime,
}).strict();

const SummaryRetention = z.object({
  scope: z.literal("minutes.summary"),
  expires_at: DateTime,
}).strict();

const SpeakerTurn = z.object({
  speaker: z.string().min(1).max(200),
  text: z.string().min(1).max(65_536),
  started_at: DateTime,
  ended_at: DateTime.optional(),
}).strict().superRefine((turn, context) => {
  if (turn.ended_at && Date.parse(turn.ended_at) < Date.parse(turn.started_at)) {
    context.addIssue({
      code: "custom",
      message: "ended_at precedes started_at",
      path: ["ended_at"],
    });
  }
});

const TranscriptContent = z.object({
  format: z.literal("speaker_turns"),
  language: z.string().min(2).max(35).optional(),
  turns: z.array(SpeakerTurn).min(1).max(4_096),
}).strict().superRefine((content, context) => {
  let previousStart = Number.NEGATIVE_INFINITY;
  content.turns.forEach((turn, index) => {
    const startedAt = Date.parse(turn.started_at);
    if (startedAt < previousStart) {
      context.addIssue({
        code: "custom",
        message: "transcript turns are not chronological",
        path: ["turns", index, "started_at"],
      });
    }
    previousStart = startedAt;
  });
});

const SummaryContent = z.object({
  format: z.literal("summary"),
  text: z.string().min(1).max(262_144),
}).strict();

const MeetingContent = z.object({
  platform: z.enum(["google_meet", "teams", "zoom", "jitsi"]),
  started_at: DateTime,
  ended_at: DateTime,
  attendees: z.array(z.string().min(1).max(500)).max(1_000),
}).strict().superRefine((content, context) => {
  if (Date.parse(content.ended_at) < Date.parse(content.started_at)) {
    context.addIssue({
      code: "custom",
      message: "ended_at precedes started_at",
      path: ["ended_at"],
    });
  }
});

const CommonMetadata = {
  id: Identifier,
  title: z.string().min(1).max(500),
  occurred_at: DateTime,
  updated_at: DateTime,
  sensitivity: Sensitivity,
};

const MeetingMetadata = z.object({
  ...CommonMetadata,
  kind: z.literal("meeting"),
  retention: TranscriptRetention,
}).strict();

const TranscriptMetadata = z.object({
  ...CommonMetadata,
  kind: z.literal("transcript"),
  meeting_id: Identifier,
  retention: TranscriptRetention,
}).strict();

const SummaryMetadata = z.object({
  ...CommonMetadata,
  kind: z.literal("summary"),
  meeting_id: Identifier,
  retention: SummaryRetention,
}).strict();

const MeetingItem = z.object({
  ...CommonMetadata,
  kind: z.literal("meeting"),
  capture_notice: CaptureNotice,
  retention: TranscriptRetention,
  content: MeetingContent,
}).strict();

const TranscriptItem = z.object({
  ...CommonMetadata,
  kind: z.literal("transcript"),
  meeting_id: Identifier,
  capture_notice: CaptureNotice,
  retention: TranscriptRetention,
  content: z.union([TranscriptContent, SummaryContent]),
}).strict();

const SummaryItem = z.object({
  ...CommonMetadata,
  kind: z.literal("summary"),
  meeting_id: Identifier,
  retention: SummaryRetention,
  content: SummaryContent,
}).strict();

const IndexResponse = z.object({
  items: z.array(z.union([MeetingMetadata, TranscriptMetadata, SummaryMetadata])).max(200),
  truncated: z.boolean(),
  next_cursor: z.string().min(1).max(2_048).optional(),
}).strict().superRefine((response, context) => {
  if (response.truncated !== Boolean(response.next_cursor)) {
    context.addIssue({
      code: "custom",
      message: "next_cursor must exist exactly when truncated is true",
      path: ["next_cursor"],
    });
  }
});

const ItemResponse = z.object({
  item: z.union([MeetingItem, TranscriptItem, SummaryItem]),
  truncated: z.literal(false),
}).strict();

function parseContract(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new MinutesReadContractError(
      "Minutes upstream response violated zaki-read.v1.",
      "minutes_upstream_contract_invalid",
      502,
      { cause: result.error }
    );
  }
  return result.data;
}

export function parseMinutesIndexResponse(value) {
  return parseContract(IndexResponse, value);
}

export function parseMinutesItemResponse(value) {
  return parseContract(ItemResponse, value);
}

function responseHeader(response, name) {
  if (typeof response?.headers?.get === "function") return response.headers.get(name);
  return response?.headers?.[name] ?? response?.headers?.[name.toLowerCase()] ?? null;
}

async function readBodyWithLimit(response) {
  if (!response?.body || typeof response.body.getReader !== "function") {
    throw new MinutesReadContractError(
      "Minutes upstream response body was unavailable.",
      "minutes_upstream_invalid_body"
    );
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const chunk = Buffer.from(value);
    total += chunk.byteLength;
    if (total > MINUTES_READ_RESPONSE_MAX_BYTES) {
      try {
        await reader.cancel();
      } catch {
        // The cap violation is authoritative even if stream cleanup fails.
      }
      throw new MinutesReadContractError(
        "Minutes upstream response exceeded the read cap.",
        "minutes_upstream_response_too_large"
      );
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

export async function readMinutesResponseJson(response) {
  if (response?.redirected || (response?.status >= 300 && response?.status < 400)) {
    throw new MinutesReadContractError(
      "Minutes upstream redirect was rejected.",
      "minutes_upstream_redirect_rejected"
    );
  }
  const contentType = String(responseHeader(response, "content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new MinutesReadContractError(
      "Minutes upstream response was not JSON.",
      "minutes_upstream_invalid_content_type"
    );
  }
  const rawContentLength = responseHeader(response, "content-length");
  if (rawContentLength !== null && rawContentLength !== "") {
    const contentLength = Number(rawContentLength);
    if (Number.isFinite(contentLength) && contentLength > MINUTES_READ_RESPONSE_MAX_BYTES) {
      throw new MinutesReadContractError(
        "Minutes upstream response exceeded the read cap.",
        "minutes_upstream_response_too_large"
      );
    }
  }
  const text = await readBodyWithLimit(response);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new MinutesReadContractError(
      "Minutes upstream returned invalid JSON.",
      "minutes_upstream_invalid_json",
      502,
      { cause: error }
    );
  }
}

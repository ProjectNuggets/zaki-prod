import { stripToolCallMarkup } from "./toolMarkup";
import { sanitizeAssistantScaffold } from "./scaffoldSanitizer";

export type AgentEmailDraftSegment = {
  kind: "email";
  fields: Array<{ key: string; label: string; value: string }>;
  body: string;
  attachments: string[];
};

export type AgentTableSegment = {
  kind: "table";
  caption: string | null;
  headers: string[];
  rows: string[][];
};

export type AgentReplySegment =
  | { kind: "markdown"; text: string }
  | AgentEmailDraftSegment
  | AgentTableSegment
  | { kind: "suppressed_runtime" };

type JsonCandidate = {
  start: number;
  end: number;
  raw: string;
  value: unknown;
};

const RUNTIME_TYPE_VALUES = new Set([
  "status",
  "statusresponse",
  "progress",
  "reasoningsummary",
  "toolstart",
  "toolresult",
  "toolcallresult",
  "toolcallinvocation",
  "toolonlyturn",
  "toolonlysummary",
  "approvalrequired",
  "taskupdate",
  "subagentcompletion",
  "artifactevent",
  "audioreply",
  "browserframe",
  "systemnotice",
  "replystart",
  "token",
  "done",
  "error",
  "finalizeresponsestream",
]);

const RUNTIME_KEY_RE =
  /(?:eventType|tool_result|tool_calls|toolCalls|tool_use_id|toolUseId|tool_call_id|toolCallId|approval_id|approvalId|input_preview|inputPreview|output_preview|outputPreview|content_preview|contentPreview|observation|arguments|payload|run_id|runId|original_bytes|originalBytes|shown_bytes|shownBytes|result_hash|resultHash|runtime_info|runtimeInfo|session_key|sessionKey|canonical_user_id|canonicalUserId|tenant_user_id|tenantUserId|tenant_numeric_user_id|tenantNumericUserId|same_user_truth|sameUserTruth|turn_origin|turnOrigin|session_lane|sessionLane)/i;

const APPROVED_TOOL_EXECUTION_RE =
  /(^|\n)\s*\[Approved tool execution:[^\]]+\]\s*Output:[\s\S]*?Continue your reasoning based on this tool result\.\s*Produce the next step for the user\.?/gi;
const APPROVED_TOOL_EXECUTION_TAIL_RE =
  /(^|\n)\s*\[Approved tool execution:[\s\S]*$/i;
const APPROVAL_INSTRUCTION_RE =
  /(^|\n)\s*Approval required\.\s*Use\s+\/approve\b[^\n]*/gi;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeKey(value: string) {
  return value.replace(/[_\s-]+/g, "").toLowerCase();
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => stringValue(item))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function labelForEmailKey(key: string) {
  const normalized = key.trim().toLowerCase();
  if (normalized === "cc") return "CC";
  if (normalized === "bcc") return "BCC";
  if (normalized === "replyto" || normalized === "reply-to") return "Reply-To";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function pickRecordValue(record: Record<string, unknown>, keys: string[]) {
  const normalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(record)) {
    normalized.set(normalizeKey(key), value);
  }
  for (const key of keys) {
    if (normalized.has(normalizeKey(key))) return normalized.get(normalizeKey(key));
  }
  return undefined;
}

function extractEmailDraft(value: unknown): AgentEmailDraftSegment | null {
  const record = isRecord(value) ? value : null;
  if (!record) return null;
  const nested = pickRecordValue(record, ["email", "draft", "emailDraft"]);
  if (isRecord(nested)) {
    const nestedDraft = extractEmailDraft(nested);
    if (nestedDraft) return nestedDraft;
  }

  const type = stringValue(pickRecordValue(record, ["type", "kind", "format"])).toLowerCase();
  const hasEmailType = /\b(email|email_draft|draft_email|message_draft)\b/.test(type);
  const body = stringValue(pickRecordValue(record, ["body", "content", "message", "text"]));
  const subject = stringValue(pickRecordValue(record, ["subject"]));
  const recipients = stringValue(pickRecordValue(record, ["to", "recipient", "recipients"]));
  const hasRecipient = Boolean(
    recipients ||
      stringValue(pickRecordValue(record, ["cc"])) ||
      stringValue(pickRecordValue(record, ["bcc"]))
  );
  if (!hasEmailType && (!subject || !hasRecipient || !body)) return null;

  const fieldKeys = ["to", "cc", "bcc", "replyTo", "reply-to", "from", "subject"];
  const fields: Array<{ key: string; label: string; value: string }> = [];
  const seen = new Set<string>();
  for (const key of fieldKeys) {
    const normalized = normalizeKey(key);
    if (seen.has(normalized)) continue;
    const valueText = stringValue(pickRecordValue(record, [key]));
    if (!valueText) continue;
    seen.add(normalized);
    fields.push({
      key: normalized,
      label: labelForEmailKey(key),
      value: valueText,
    });
  }

  if (!fields.some((field) => ["to", "cc", "bcc"].includes(field.key))) {
    const recipientText = recipients;
    if (recipientText) {
      fields.unshift({ key: "to", label: "To", value: recipientText });
    }
  }
  if (!fields.some((field) => field.key === "subject") && subject) {
    fields.push({ key: "subject", label: "Subject", value: subject });
  }

  if (!fields.length || !body) return null;
  const attachmentsValue = pickRecordValue(record, ["attachments", "files"]);
  const attachments = Array.isArray(attachmentsValue)
    ? attachmentsValue
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (isRecord(item)) {
            return (
              stringValue(pickRecordValue(item, ["name", "filename", "file", "path", "url"])) ||
              ""
            );
          }
          return "";
        })
        .filter(Boolean)
    : [];

  return {
    kind: "email",
    fields,
    body,
    attachments,
  };
}

function rowFromRecord(headers: string[], row: Record<string, unknown>) {
  return headers.map((header) => stringValue(pickRecordValue(row, [header])));
}

function extractTable(value: unknown): AgentTableSegment | null {
  const record = isRecord(value) ? value : null;
  if (!record) return null;
  const nested = pickRecordValue(record, ["table", "dataTable"]);
  if (nested) {
    const nestedTable = extractTable(nested);
    if (nestedTable) return nestedTable;
  }

  const type = stringValue(pickRecordValue(record, ["type", "kind", "format"])).toLowerCase();
  const hasTableType = /\b(table|data_table|datatable|tabular)\b/.test(type);
  const headersValue = pickRecordValue(record, ["headers", "columns", "fields"]);
  const rowsValue = pickRecordValue(record, ["rows", "data", "items", "records"]);
  if (!hasTableType && (!headersValue || !rowsValue)) return null;

  let headers = Array.isArray(headersValue)
    ? headersValue
        .map((header) => {
          if (typeof header === "string") return header.trim();
          if (isRecord(header)) return stringValue(pickRecordValue(header, ["label", "name", "key"]));
          return "";
        })
        .filter(Boolean)
    : [];
  const rowsSource = Array.isArray(rowsValue) ? rowsValue : [];
  if (headers.length === 0 && hasTableType && rowsSource.every(isRecord) && rowsSource.length > 0) {
    headers = Array.from(
      rowsSource.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>())
    );
  }
  if (headers.length < 2 || rowsSource.length === 0) return null;

  const rows = rowsSource
    .map((row) => {
      if (Array.isArray(row)) return row.map((cell) => stringValue(cell));
      if (isRecord(row)) return rowFromRecord(headers, row);
      return [];
    })
    .filter((row) => row.length > 0);
  if (rows.length === 0) return null;

  return {
    kind: "table",
    caption: stringValue(pickRecordValue(record, ["caption", "title", "label"])) || null,
    headers,
    rows,
  };
}

function runtimeScore(value: unknown): number {
  if (Array.isArray(value)) {
    const childScores = value.map(runtimeScore).filter((score) => score > 0);
    if (childScores.length === 0) return 0;
    const strongChildScores = childScores.filter((score) => score >= 3);
    return strongChildScores.length >= Math.max(1, Math.ceil(value.length / 2)) ? 3 : 1;
  }
  if (!isRecord(value)) return 0;
  let score = 0;
  const normalizedKeys = new Set(Object.keys(value).map(normalizeKey));
  const type = stringValue(pickRecordValue(value, ["type", "event", "eventType", "kind"])).toLowerCase();
  if (type && RUNTIME_TYPE_VALUES.has(type.replace(/[_\s-]+/g, ""))) score += 3;
  if (normalizedKeys.has("eventtype")) score += 3;
  if (normalizedKeys.has("tool") || normalizedKeys.has("name")) score += 1;
  if (normalizedKeys.has("toolresult") || normalizedKeys.has("toolresults")) score += 3;
  if (normalizedKeys.has("toolcalls") || normalizedKeys.has("toolcall") || normalizedKeys.has("toolcallid")) score += 2;
  if (normalizedKeys.has("tooluseid") || normalizedKeys.has("approvalid")) score += 2;
  if (normalizedKeys.has("inputpreview") || normalizedKeys.has("outputpreview")) score += 1;
  if (normalizedKeys.has("contentpreview") && (normalizedKeys.has("tool") || normalizedKeys.has("status"))) score += 2;
  if (
    normalizedKeys.has("tool") &&
    normalizedKeys.has("status") &&
    (normalizedKeys.has("contentpreview") ||
      normalizedKeys.has("originalbytes") ||
      normalizedKeys.has("shownbytes") ||
      normalizedKeys.has("resulthash"))
  ) {
    score += 3;
  }
  if (
    normalizedKeys.has("partial") &&
    normalizedKeys.has("tool") &&
    (normalizedKeys.has("contentpreview") || normalizedKeys.has("resulthash"))
  ) {
    score += 1;
  }
  if (normalizedKeys.has("observation")) score += 2;
  if (normalizedKeys.has("arguments") && (normalizedKeys.has("tool") || normalizedKeys.has("name"))) score += 2;
  if (normalizedKeys.has("payload")) score += runtimeScore(value.payload) >= 3 ? 2 : 1;
  if (normalizedKeys.has("runtimeinfo")) {
    const nested = pickRecordValue(value, ["runtime_info", "runtimeInfo"]);
    score += runtimeScore(nested) >= 3 ? 3 : 2;
  }
  if (
    normalizedKeys.has("result") &&
    (normalizedKeys.has("tool") ||
      normalizedKeys.has("success") ||
      normalizedKeys.has("status") ||
      normalizedKeys.has("outputpreview"))
  ) {
    score += 1;
  }
  if (normalizedKeys.has("runid") && (normalizedKeys.has("tool") || normalizedKeys.has("eventtype"))) {
    score += 1;
  }
  if (normalizedKeys.has("sessionkey")) score += 3;
  if (normalizedKeys.has("canonicaluserid") || normalizedKeys.has("tenantuserid")) score += 2;
  if (normalizedKeys.has("tenantnumericuserid") || normalizedKeys.has("sameusertruth")) score += 2;
  if (normalizedKeys.has("turnorigin") && normalizedKeys.has("sessionlane")) score += 2;
  return score;
}

export function isRuntimePayload(value: unknown): boolean {
  if (extractEmailDraft(value)) return false;
  return runtimeScore(value) >= 3;
}

function tryParseJson(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function findJsonCandidates(text: string): JsonCandidate[] {
  const candidates: JsonCandidate[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const opener = text[cursor];
    if (opener !== "{" && opener !== "[") {
      cursor += 1;
      continue;
    }
    const closer = opener === "{" ? "}" : "]";
    const stack = [closer];
    let inString = false;
    let escaped = false;
    let index = cursor + 1;
    while (index < text.length && stack.length > 0) {
      const char = text[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        index += 1;
        continue;
      }
      if (char === "\"") {
        inString = true;
      } else if (char === "{" || char === "[") {
        stack.push(char === "{" ? "}" : "]");
      } else if (char === stack[stack.length - 1]) {
        stack.pop();
      }
      index += 1;
    }
    if (stack.length > 0) break;
    const raw = text.slice(cursor, index);
    const parsed = tryParseJson(raw);
    if (parsed !== null) {
      candidates.push({ start: cursor, end: index, raw, value: parsed });
      cursor = index;
      continue;
    }
    cursor += 1;
  }
  return candidates;
}

function flushMarkdown(segments: AgentReplySegment[], text: string) {
  const cleaned = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned) segments.push({ kind: "markdown", text: cleaned });
}

function stripInternalControlMessages(
  text: string,
  options?: { streaming?: boolean }
): { text: string; suppressed: boolean } {
  let suppressed = false;
  let cleaned = text.replace(APPROVED_TOOL_EXECUTION_RE, (_match, prefix: string) => {
    suppressed = true;
    return prefix || "";
  });
  cleaned = cleaned.replace(APPROVAL_INSTRUCTION_RE, (_match, prefix: string) => {
    suppressed = true;
    return prefix || "";
  });

  if (options?.streaming) {
    const match = APPROVED_TOOL_EXECUTION_TAIL_RE.exec(cleaned);
    if (match && typeof match.index === "number") {
      suppressed = true;
      cleaned = cleaned.slice(0, match.index);
    }
  }

  return { text: cleaned, suppressed };
}

function classifyJsonValue(value: unknown): AgentReplySegment | null {
  const email = extractEmailDraft(value);
  if (email) return email;
  if (isRuntimePayload(value)) return { kind: "suppressed_runtime" };
  const table = extractTable(value);
  if (table) return table;
  return null;
}

function segmentPlainText(text: string): AgentReplySegment[] {
  const candidates = findJsonCandidates(text);
  if (candidates.length === 0) {
    return text.trim() ? [{ kind: "markdown", text }] : [];
  }
  const segments: AgentReplySegment[] = [];
  let cursor = 0;
  for (const candidate of candidates) {
    const classified = classifyJsonValue(candidate.value);
    if (!classified) continue;
    flushMarkdown(segments, text.slice(cursor, candidate.start));
    segments.push(classified);
    cursor = candidate.end;
  }
  flushMarkdown(segments, text.slice(cursor));
  return segments.length > 0 ? segments : [{ kind: "markdown", text }];
}

function segmentClosedFences(text: string): AgentReplySegment[] {
  const segments: AgentReplySegment[] = [];
  const fenceRe = /```([^\n`]*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = fenceRe.exec(text))) {
    const before = text.slice(cursor, match.index);
    segments.push(...segmentPlainText(before));
    const body = String(match[2] || "");
    const parsed = tryParseJson(body);
    const classified = parsed !== null ? classifyJsonValue(parsed) : null;
    if (classified) {
      segments.push(classified);
    } else {
      segments.push({ kind: "markdown", text: match[0] || "" });
    }
    cursor = match.index + (match[0] || "").length;
  }
  segments.push(...segmentPlainText(text.slice(cursor)));
  return segments;
}

function stripStreamingRuntimeTail(text: string): { text: string; suppressed: boolean } {
  const fenceMatches = [...text.matchAll(/```([^\n`]*)/g)];
  const lastFence = fenceMatches[fenceMatches.length - 1];
  if (lastFence && fenceMatches.length % 2 === 1 && typeof lastFence.index === "number") {
    const language = String(lastFence[1] || "").trim().toLowerCase();
    const tail = text.slice(lastFence.index + (lastFence[0] || "").length);
    if ((!language || language === "json") && RUNTIME_KEY_RE.test(tail)) {
      return { text: text.slice(0, lastFence.index), suppressed: true };
    }
  }
  const trimmed = text.trim();
  if (
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    RUNTIME_KEY_RE.test(trimmed) &&
    tryParseJson(trimmed) === null
  ) {
    return { text: "", suppressed: true };
  }
  const tailStart = findUnclosedRuntimeJsonTail(text);
  if (tailStart != null) {
    return { text: text.slice(0, tailStart), suppressed: true };
  }
  return { text, suppressed: false };
}

function findUnclosedRuntimeJsonTail(text: string): number | null {
  let cursor = 0;
  while (cursor < text.length) {
    const opener = text[cursor];
    if (opener !== "{" && opener !== "[") {
      cursor += 1;
      continue;
    }
    const stack = [opener === "{" ? "}" : "]"];
    let inString = false;
    let escaped = false;
    let index = cursor + 1;
    while (index < text.length && stack.length > 0) {
      const char = text[index];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === "\"") {
          inString = false;
        }
        index += 1;
        continue;
      }
      if (char === "\"") {
        inString = true;
      } else if (char === "{" || char === "[") {
        stack.push(char === "{" ? "}" : "]");
      } else if (char === stack[stack.length - 1]) {
        stack.pop();
      }
      index += 1;
    }
    if (stack.length > 0) {
      const tail = text.slice(cursor);
      return RUNTIME_KEY_RE.test(tail) ? cursor : null;
    }
    cursor = index;
  }
  return null;
}

export function segmentAgentReplyContent(
  content: string,
  options?: { streaming?: boolean }
): AgentReplySegment[] {
  const stripped = stripToolCallMarkup(sanitizeAssistantScaffold(String(content || "")));
  if (!stripped.trim()) return [];
  const controlMessages = stripInternalControlMessages(stripped, options);
  if (!controlMessages.text.trim()) {
    return controlMessages.suppressed ? [{ kind: "suppressed_runtime" }] : [];
  }
  const runtimeTail = options?.streaming
    ? stripStreamingRuntimeTail(controlMessages.text)
    : { text: controlMessages.text, suppressed: false };
  const segments = segmentClosedFences(runtimeTail.text);
  if (controlMessages.suppressed || runtimeTail.suppressed) {
    segments.push({ kind: "suppressed_runtime" });
  }
  return segments;
}

function tableToMarkdown(table: AgentTableSegment) {
  const header = `| ${table.headers.join(" | ")} |`;
  const divider = `| ${table.headers.map(() => "---").join(" | ")} |`;
  const rows = table.rows.map((row) => `| ${table.headers.map((_, index) => row[index] || "").join(" | ")} |`);
  return [table.caption || null, header, divider, ...rows].filter(Boolean).join("\n");
}

function emailToText(email: AgentEmailDraftSegment) {
  const fields = email.fields.map((field) => `${field.label}: ${field.value}`);
  const attachments = email.attachments.length
    ? [`Attachments: ${email.attachments.join(", ")}`]
    : [];
  return [...fields, ...attachments, "", email.body].join("\n").trim();
}

export function normalizeAssistantDisplayText(
  content: string,
  options?: { agentReply?: boolean; streaming?: boolean }
): string {
  const stripped = stripToolCallMarkup(sanitizeAssistantScaffold(String(content || "")));
  if (!options?.agentReply) return stripped.trim();
  const segments = segmentAgentReplyContent(stripped, { streaming: options.streaming });
  return segments
    .map((segment) => {
      if (segment.kind === "markdown") return segment.text;
      if (segment.kind === "email") return emailToText(segment);
      if (segment.kind === "table") return tableToMarkdown(segment);
      return "";
    })
    .filter((part) => part.trim().length > 0)
    .join("\n\n")
    .trim();
}

export function isInternalAgentReplyContent(
  content: string,
  options?: { streaming?: boolean }
): boolean {
  if (
    String(content || "").trim() &&
    !normalizeAssistantDisplayText(content, {
      agentReply: true,
      streaming: options?.streaming,
    })
  ) {
    return true;
  }
  const segments = segmentAgentReplyContent(content, options);
  return segments.length > 0 && segments.every((segment) => segment.kind === "suppressed_runtime");
}

export function displaySafeRuntimePreview(value: string | null | undefined): string | null {
  const text = sanitizeAssistantScaffold(String(value || "")).replace(/\s+/g, " ").trim();
  if (!text) return null;
  const parsed = tryParseJson(text);
  if (parsed !== null) {
    if (isRuntimePayload(parsed)) return null;
    return "structured input";
  }
  if (/^[{\[]/.test(text)) return "structured input";
  if (RUNTIME_KEY_RE.test(text) && /[{}[\]"]/.test(text)) return null;
  return text.length > 120 ? `${text.slice(0, 117).trim()}...` : text;
}

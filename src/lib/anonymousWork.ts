export const ANONYMOUS_WORK_LEDGER_KEY = "zaki:anonymous-work:v1";
export const ANONYMOUS_WORK_LEDGER_VERSION = 1;

const MAX_ITEMS = 20;
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PROMPT_LENGTH = 800;
const MAX_REPLY_PREVIEW_LENGTH = 800;
const MAX_TITLE_LENGTH = 96;
const MAX_ROUTE_LENGTH = 240;
const MAX_TASK_KIND_LENGTH = 64;

export type AnonymousWorkProductId =
  | "agent"
  | "spaces"
  | "brain"
  | "learning"
  | "hire"
  | "design";

export type AnonymousWorkStatus = "draft" | "succeeded" | "failed";

export type AnonymousWorkItem = {
  id: string;
  productId: AnonymousWorkProductId;
  taskKind: string;
  prompt: string;
  replyPreview: string;
  route: string;
  threadId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  meterRemaining: number | null;
  status?: AnonymousWorkStatus;
};

export type AnonymousWorkLedger = {
  version: typeof ANONYMOUS_WORK_LEDGER_VERSION;
  updatedAt: string;
  items: AnonymousWorkItem[];
};

type AnonymousWorkInput = Partial<
  Omit<AnonymousWorkItem, "createdAt" | "updatedAt">
> & {
  productId: AnonymousWorkProductId;
  prompt: string;
};

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `anon-work-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sanitizeText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeRoute(value: unknown) {
  const route = sanitizeText(value, MAX_ROUTE_LENGTH);
  return route.startsWith("/") ? route : "/";
}

function sanitizeMeterRemaining(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, value);
}

function normalizeProductId(value: unknown): AnonymousWorkProductId | null {
  const productId = String(value || "").trim().toLowerCase();
  if (
    productId === "agent" ||
    productId === "spaces" ||
    productId === "brain" ||
    productId === "learning" ||
    productId === "hire" ||
    productId === "design"
  ) {
    return productId;
  }
  return null;
}

export function buildAnonymousWorkTitle(prompt: string) {
  const cleaned = sanitizeText(prompt, MAX_TITLE_LENGTH);
  if (!cleaned) return "Untitled";
  return cleaned.length >= MAX_TITLE_LENGTH ? `${cleaned.slice(0, MAX_TITLE_LENGTH - 3)}...` : cleaned;
}

function normalizeItem(value: unknown, now = Date.now()): AnonymousWorkItem | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<AnonymousWorkItem>;
  const productId = normalizeProductId(raw.productId);
  const prompt = sanitizeText(raw.prompt, MAX_PROMPT_LENGTH);
  if (!productId || !prompt) return null;

  const createdAt = new Date(String(raw.createdAt || raw.updatedAt || ""));
  const updatedAt = new Date(String(raw.updatedAt || raw.createdAt || ""));
  const updatedMs = updatedAt.getTime();
  if (!Number.isFinite(updatedMs) || now - updatedMs > EXPIRY_MS) return null;

  const status =
    raw.status === "draft" || raw.status === "succeeded" || raw.status === "failed"
      ? raw.status
      : undefined;

  return {
    id: sanitizeText(raw.id, 120) || makeId(),
    productId,
    taskKind: sanitizeText(raw.taskKind, MAX_TASK_KIND_LENGTH) || "preview",
    prompt,
    replyPreview: sanitizeText(raw.replyPreview, MAX_REPLY_PREVIEW_LENGTH),
    route: sanitizeRoute(raw.route),
    threadId: sanitizeText(raw.threadId, 120) || null,
    title: sanitizeText(raw.title, MAX_TITLE_LENGTH) || buildAnonymousWorkTitle(prompt),
    createdAt: Number.isFinite(createdAt.getTime()) ? createdAt.toISOString() : nowIso(now),
    updatedAt: updatedAt.toISOString(),
    meterRemaining: sanitizeMeterRemaining(raw.meterRemaining),
    ...(status ? { status } : {}),
  };
}

export function readAnonymousWorkLedger(now = Date.now()): AnonymousWorkLedger {
  const empty: AnonymousWorkLedger = {
    version: ANONYMOUS_WORK_LEDGER_VERSION,
    updatedAt: nowIso(now),
    items: [],
  };
  const storage = getStorage();
  if (!storage) return empty;

  try {
    const parsed = JSON.parse(storage.getItem(ANONYMOUS_WORK_LEDGER_KEY) || "null") as {
      items?: unknown[];
    } | null;
    const items = (Array.isArray(parsed?.items) ? parsed.items : [])
      .map((item) => normalizeItem(item, now))
      .filter((item): item is AnonymousWorkItem => Boolean(item))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, MAX_ITEMS);
    return {
      version: ANONYMOUS_WORK_LEDGER_VERSION,
      updatedAt: nowIso(now),
      items,
    };
  } catch {
    return empty;
  }
}

export function writeAnonymousWorkLedger(items: AnonymousWorkItem[], now = Date.now()) {
  const storage = getStorage();
  if (!storage) {
    return {
      version: ANONYMOUS_WORK_LEDGER_VERSION,
      updatedAt: nowIso(now),
      items,
    } satisfies AnonymousWorkLedger;
  }
  const normalizedItems = items
    .map((item) => normalizeItem(item, now))
    .filter((item): item is AnonymousWorkItem => Boolean(item))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_ITEMS);
  const ledger: AnonymousWorkLedger = {
    version: ANONYMOUS_WORK_LEDGER_VERSION,
    updatedAt: nowIso(now),
    items: normalizedItems,
  };
  try {
    storage.setItem(ANONYMOUS_WORK_LEDGER_KEY, JSON.stringify(ledger));
    window.dispatchEvent(new CustomEvent("zaki:anonymous-work-updated"));
  } catch {
    // Treat restricted or full localStorage as an unavailable persistence layer.
  }
  return ledger;
}

export function upsertAnonymousWorkItem(input: AnonymousWorkInput, now = Date.now()) {
  const ledger = readAnonymousWorkLedger(now);
  const existing = input.id
    ? ledger.items.find((item) => item.id === input.id)
    : input.threadId
      ? ledger.items.find(
          (item) => item.threadId === input.threadId && item.productId === input.productId
        )
      : null;
  const id = sanitizeText(input.id, 120) || existing?.id || makeId();
  const prompt = sanitizeText(input.prompt, MAX_PROMPT_LENGTH);
  if (!prompt) return null;

  const item: AnonymousWorkItem = {
    id,
    productId: input.productId,
    taskKind: sanitizeText(input.taskKind, MAX_TASK_KIND_LENGTH) || existing?.taskKind || "preview",
    prompt,
    replyPreview: sanitizeText(input.replyPreview, MAX_REPLY_PREVIEW_LENGTH),
    route: sanitizeRoute(input.route || existing?.route || "/"),
    threadId: sanitizeText(input.threadId, 120) || existing?.threadId || null,
    title: sanitizeText(input.title, MAX_TITLE_LENGTH) || existing?.title || buildAnonymousWorkTitle(prompt),
    createdAt: existing?.createdAt || nowIso(now),
    updatedAt: nowIso(now),
    meterRemaining: sanitizeMeterRemaining(input.meterRemaining ?? existing?.meterRemaining),
    ...(input.status ? { status: input.status } : existing?.status ? { status: existing.status } : {}),
  };

  writeAnonymousWorkLedger(
    [item, ...ledger.items.filter((candidate) => candidate.id !== id)],
    now
  );
  return item;
}

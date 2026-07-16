import type { AnonymousWorkProductId } from "./anonymousWork";
import { sanitizeLocalReturnTo } from "./localReturnTo";
import { getProductActivationRoute } from "./productRoutes";

export const PENDING_INTENT_KEY = "zaki:pending-intent:v1";
export const PENDING_INTENT_STORAGE_FAILURE_EVENT = "zaki:pending-intent-storage-failed";
export const PENDING_INTENT_UPDATED_EVENT = "zaki:pending-intent-updated";

const MAX_PROMPT_LENGTH = 1200;
const MAX_SOURCE_LENGTH = 80;
const MAX_TASK_KIND_LENGTH = 64;
const MAX_WORK_ID_LENGTH = 120;
export const PENDING_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

export type PendingIntent = {
  productId: AnonymousWorkProductId;
  taskKind: string;
  prompt: string;
  source: string;
  returnTo: string;
  anonymousWorkId: string | null;
  replayMode: "draft" | "submit";
  createdAt: string;
};

export type PendingIntentInput = Partial<Omit<PendingIntent, "createdAt">> & {
  productId: AnonymousWorkProductId;
  prompt: string;
};

export type PendingIntentStorageFailureDetail = Pick<
  PendingIntent,
  "productId" | "prompt" | "returnTo"
>;

const WEBSITE_INTENT_PRODUCTS: Record<string, AnonymousWorkProductId> = {
  agent: "agent",
  anonymous_command: "spaces",
  chat: "spaces",
  memory: "brain",
};

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function announceStorageFailure(intent: PendingIntent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PendingIntentStorageFailureDetail>(
      PENDING_INTENT_STORAGE_FAILURE_EVENT,
      {
        detail: {
          productId: intent.productId,
          prompt: intent.prompt,
          returnTo: intent.returnTo,
        },
      }
    )
  );
}

function announcePendingIntentUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PENDING_INTENT_UPDATED_EVENT));
}

function sanitizeText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeProductId(value: unknown): AnonymousWorkProductId | null {
  const productId = String(value || "").trim().toLowerCase();
  if (
    productId === "agent" ||
    productId === "spaces" ||
    productId === "brain" ||
    productId === "design" ||
    productId === "minutes"
  ) {
    return productId;
  }
  // Legacy inbound alias: ?product=chat resolves to the canonical Spaces lane.
  if (productId === "chat") return "spaces";
  return null;
}

function sanitizeReturnTo(value: unknown, productId: AnonymousWorkProductId) {
  const fallback = getProductActivationRoute(productId) || "/";
  const route = sanitizeText(value, 240);
  return sanitizeLocalReturnTo(route, {
    fallback,
    requireLeadingSlash: true,
  });
}

function normalizeReplayMode(value: unknown): PendingIntent["replayMode"] {
  return value === "submit" ? "submit" : "draft";
}

export function buildProductReturnTo(productId: AnonymousWorkProductId) {
  return getProductActivationRoute(productId) || "/";
}

function inferProductFromRoute(pathname: string): AnonymousWorkProductId | null {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  if (normalized === "/agent") return "agent";
  if (normalized === "/spaces" || normalized.startsWith("/spaces/")) return "spaces";
  if (normalized === "/chat") return "spaces";
  if (normalized === "/brain") return "brain";
  if (normalized === "/design") return "design";
  if (normalized === "/minutes") return "minutes";
  return null;
}

export function consumeWebsiteCommandIntentFromUrl(input: {
  pathname: string;
  search: string;
}) {
  const params = new URLSearchParams(input.search || "");
  const source = sanitizeText(params.get("source"), MAX_SOURCE_LENGTH);
  const prompt = sanitizeText(params.get("prompt"), MAX_PROMPT_LENGTH);
  if (!prompt || !source.startsWith("website_")) return null;

  const intent = sanitizeText(params.get("intent"), MAX_TASK_KIND_LENGTH).toLowerCase();
  const productId =
    WEBSITE_INTENT_PRODUCTS[intent] ||
    normalizeProductId(params.get("product")) ||
    inferProductFromRoute(input.pathname);
  if (!productId) return null;

  return writePendingIntent({
    productId,
    taskKind: intent || "website_command",
    prompt,
    source,
    returnTo: buildProductReturnTo(productId),
  });
}

export function readPendingIntent(): PendingIntent | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = JSON.parse(storage.getItem(PENDING_INTENT_KEY) || "null") as
      | Partial<PendingIntent>
      | null;
    const productId = normalizeProductId(raw?.productId);
    const prompt = sanitizeText(raw?.prompt, MAX_PROMPT_LENGTH);
    if (!productId || !prompt) return null;
    const createdAt = new Date(String(raw?.createdAt || ""));
    const createdAtMs = createdAt.getTime();
    if (Number.isFinite(createdAtMs) && Date.now() - createdAtMs > PENDING_INTENT_TTL_MS) {
      try {
        storage.removeItem(PENDING_INTENT_KEY);
      } catch {
        // Best-effort stale intent cleanup only.
      }
      return null;
    }
    return {
      productId,
      taskKind: sanitizeText(raw?.taskKind, MAX_TASK_KIND_LENGTH) || "plan",
      prompt,
      source: sanitizeText(raw?.source, MAX_SOURCE_LENGTH) || "dashboard",
      returnTo: sanitizeReturnTo(raw?.returnTo, productId),
      anonymousWorkId: sanitizeText(raw?.anonymousWorkId, MAX_WORK_ID_LENGTH) || null,
      replayMode: normalizeReplayMode(raw?.replayMode),
      createdAt: Number.isFinite(createdAtMs)
        ? createdAt.toISOString()
        : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writePendingIntent(input: PendingIntentInput) {
  const prompt = sanitizeText(input.prompt, MAX_PROMPT_LENGTH);
  if (!prompt) return null;

  const intent: PendingIntent = {
    productId: input.productId,
    taskKind: sanitizeText(input.taskKind, MAX_TASK_KIND_LENGTH) || "plan",
    prompt,
    source: sanitizeText(input.source, MAX_SOURCE_LENGTH) || "dashboard",
    returnTo: sanitizeReturnTo(input.returnTo, input.productId),
    anonymousWorkId: sanitizeText(input.anonymousWorkId, MAX_WORK_ID_LENGTH) || null,
    replayMode: normalizeReplayMode(input.replayMode),
    createdAt: new Date().toISOString(),
  };
  const storage = getStorage();
  if (!storage) {
    announceStorageFailure(intent);
    return null;
  }
  try {
    storage.setItem(PENDING_INTENT_KEY, JSON.stringify(intent));
  } catch {
    announceStorageFailure(intent);
    return null;
  }
  announcePendingIntentUpdated();
  return intent;
}

export function clearPendingIntent() {
  try {
    getStorage()?.removeItem(PENDING_INTENT_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

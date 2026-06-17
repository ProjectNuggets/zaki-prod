import type { AnonymousWorkProductId } from "./anonymousWork";
import { getProductActivationRoute } from "./productRoutes";

export const PENDING_INTENT_KEY = "zaki:pending-intent:v1";

const MAX_PROMPT_LENGTH = 1200;
const MAX_SOURCE_LENGTH = 80;
const MAX_TASK_KIND_LENGTH = 64;
const MAX_WORK_ID_LENGTH = 120;
const PENDING_INTENT_TTL_MS = 30 * 60 * 1000;

export type PendingIntent = {
  productId: AnonymousWorkProductId;
  taskKind: string;
  prompt: string;
  source: string;
  returnTo: string;
  anonymousWorkId: string | null;
  createdAt: string;
};

export type PendingIntentInput = Partial<Omit<PendingIntent, "createdAt">> & {
  productId: AnonymousWorkProductId;
  prompt: string;
};

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
    productId === "learning" ||
    productId === "hire" ||
    productId === "design"
  ) {
    return productId;
  }
  return null;
}

function sanitizeReturnTo(value: unknown, productId: AnonymousWorkProductId) {
  const fallback = getProductActivationRoute(productId) || "/";
  const route = sanitizeText(value, 240);
  return route.startsWith("/") && !route.startsWith("//") ? route : fallback;
}

export function buildProductReturnTo(productId: AnonymousWorkProductId) {
  return getProductActivationRoute(productId) || "/";
}

function inferProductFromRoute(pathname: string): AnonymousWorkProductId | null {
  const normalized = String(pathname || "").replace(/\/+$/, "") || "/";
  if (normalized === "/agent") return "agent";
  if (normalized === "/spaces" || normalized.startsWith("/spaces/")) return "spaces";
  if (normalized === "/brain") return "brain";
  if (normalized === "/learn") return "learning";
  if (normalized === "/design") return "design";
  if (normalized === "/hire") return "hire";
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
      taskKind: sanitizeText(raw?.taskKind, MAX_TASK_KIND_LENGTH) || "preview",
      prompt,
      source: sanitizeText(raw?.source, MAX_SOURCE_LENGTH) || "dashboard",
      returnTo: sanitizeReturnTo(raw?.returnTo, productId),
      anonymousWorkId: sanitizeText(raw?.anonymousWorkId, MAX_WORK_ID_LENGTH) || null,
      createdAt: Number.isFinite(createdAtMs)
        ? createdAt.toISOString()
        : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writePendingIntent(input: PendingIntentInput) {
  const storage = getStorage();
  const prompt = sanitizeText(input.prompt, MAX_PROMPT_LENGTH);
  if (!storage || !prompt) return null;

  const intent: PendingIntent = {
    productId: input.productId,
    taskKind: sanitizeText(input.taskKind, MAX_TASK_KIND_LENGTH) || "preview",
    prompt,
    source: sanitizeText(input.source, MAX_SOURCE_LENGTH) || "dashboard",
    returnTo: sanitizeReturnTo(input.returnTo, input.productId),
    anonymousWorkId: sanitizeText(input.anonymousWorkId, MAX_WORK_ID_LENGTH) || null,
    createdAt: new Date().toISOString(),
  };
  try {
    storage.setItem(PENDING_INTENT_KEY, JSON.stringify(intent));
  } catch {
    return null;
  }
  return intent;
}

export function clearPendingIntent() {
  try {
    getStorage()?.removeItem(PENDING_INTENT_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

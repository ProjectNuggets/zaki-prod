// Pure unit math for Spaces (chat) metering. Reserve on the input estimate, settle on the
// input+output actual. V1 uses char-estimate units because the pinned AnythingLLM (typ) emits no
// token usage on its SSE stream; real provider tokens/cost arrive post-V1 (fork typ to emit usage)
// — at which point settle switches to true tokens via the ledger's providerCost fields.
//
// Base units mirror the legacy estimateSpacesChatMeterUnits so V1 calibration is unchanged.
import crypto from "node:crypto";

// Deterministic UUID from a string. Used to derive a stable grant_id from the idempotency key so a
// client retry (same Idempotency-Key) collides on the ledger's UNIQUE(grant_id, reserve_key) and is
// charged ONCE. A random grant_id would defeat the idempotency key and double-charge.
export function deterministicGrantId(key) {
  const h = crypto.createHash("sha256").update(String(key || "")).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function baseUnitsForAction(action) {
  const a = String(action || "");
  if (a.includes("memory_read")) return 0.25;
  if (a.includes("search")) return 1.5;
  if (a.includes("query")) return 1.25;
  if (a.includes("synthetic")) return 0.5;
  return 1; // spaces_chat_turn (default)
}

function round4(n) {
  return Math.round(Math.max(0, Number(n) || 0) * 10_000) / 10_000;
}

/** Reserve estimate from the inbound message only (output unknown at reserve time). */
export function estimateChatUnits({ inputChars = 0, action = "spaces_chat_turn" } = {}) {
  const tokenUnits = Math.max(0, Number(inputChars) / 4000);
  return round4(Math.max(baseUnitsForAction(action), tokenUnits));
}

/** Actual units at settle, from input + accumulated output (capped at the reserve by the ledger). */
export function actualChatUnits({ inputChars = 0, outputChars = 0, action = "spaces_chat_turn" } = {}) {
  const tokenUnits = Math.max(0, (Number(inputChars) + Number(outputChars)) / 4000);
  return round4(Math.max(baseUnitsForAction(action), tokenUnits));
}

export { baseUnitsForAction };

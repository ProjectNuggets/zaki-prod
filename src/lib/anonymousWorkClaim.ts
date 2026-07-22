import { claimAnonymousSpacesWork } from "./api";
import {
  readAnonymousWorkLedger,
  removeAnonymousWorkItems,
  type AnonymousWorkItem,
} from "./anonymousWork";
import { clearPendingIntent, readPendingIntent, type PendingIntent } from "./pendingIntent";

/**
 * The anonymous -> account claim, in ONE place.
 *
 * Every authenticated entry point runs this: email/password login, Google OAuth
 * return, and the dashboard's "keep this work" button. Before this existed the
 * claim was inlined in the credential-login branch only, so signing up with
 * Google silently dropped the visitor's work on the floor.
 *
 * The rules it enforces:
 *   - "Claimed" is whatever the SERVER says it imported. Never inferred from
 *     "we have a token and the ledger is non-empty" — that is an assertion, not
 *     a fact, and it is what made the product lie.
 *   - The browser ledger is cleared ONLY after the server confirms the import.
 *     It is the sole copy of the conversation (anonymous turns are never
 *     persisted server-side), so a premature clear destroys the work outright.
 *   - The pending intent is left ALONE unless the import made it redundant.
 *     If nothing was imported, the intent must survive to the destination so
 *     ChatArea can replay the prompt for real.
 */

export type AnonymousWorkClaimStatus = "idle" | "claiming" | "imported" | "nothing" | "error";

export type AnonymousWorkClaimResult = {
  status: AnonymousWorkClaimStatus;
  /** Number of message rows the server wrote. Drives all "we kept your work" copy. */
  importedCount: number;
  route: string | null;
  workId: string | null;
  error: string | null;
};

type ClaimCommitOptions = {
  /** Prevent stale async work from mutating a newer authenticated account's browser state. */
  shouldCommit?: () => boolean;
};

const NOTHING_TO_CLAIM: AnonymousWorkClaimResult = {
  status: "idle",
  importedCount: 0,
  route: null,
  workId: null,
  error: null,
};

/**
 * The lanes whose anonymous work can be carried into an account.
 *
 * Spaces was the original. WP-F adds Agent: an anonymous Agent PLAN PREVIEW is a real result
 * the visitor read and asked us to keep, so it claims through this same path rather than a
 * parallel one. Both lanes produce the same shape — a prompt and the assistant text it
 * produced — which is exactly what the import writes.
 *
 * Brain is deliberately NOT here: its anonymous story (F8) is a separate decision.
 */
const CLAIMABLE_PRODUCT_IDS = new Set<AnonymousWorkItem["productId"]>(["spaces", "agent"]);

export function isClaimableProduct(
  productId: AnonymousWorkItem["productId"] | undefined | null
): boolean {
  return Boolean(productId && CLAIMABLE_PRODUCT_IDS.has(productId));
}

/** The saved work a pending intent refers to, or the newest claimable item. */
export function findClaimableWork(
  anonymousWorkId?: string | null,
  items?: AnonymousWorkItem[]
): AnonymousWorkItem | null {
  const ledger = items ?? readAnonymousWorkLedger().items;
  const claimable = ledger.filter((item) => isClaimableProduct(item.productId));
  if (anonymousWorkId) {
    const match = claimable.find((item) => item.id === anonymousWorkId);
    if (match) return match;
  }
  return claimable[0] ?? null;
}

/**
 * Work is only worth importing if the visitor actually got an answer. A draft
 * (prompt, no reply) has nothing to keep — it gets replayed instead, which
 * produces a real answer rather than a thread containing a lone question.
 */
export function isImportableWork(item: AnonymousWorkItem | null): boolean {
  if (!item) return false;
  const hasImportableTurn = item.turns?.some(
    (turn) =>
      (turn.status === "succeeded" || turn.status === "interrupted") &&
      turn.prompt.trim() &&
      turn.reply.trim()
  );
  if (item.turns?.length) return Boolean(hasImportableTurn);
  return Boolean(item.prompt?.trim() && (item.reply?.trim() || item.replyPreview?.trim()));
}

/**
 * Claim one piece of saved work. Returns exactly what the server did with it.
 * On a confirmed import the ledger item is consumed, so the same work can never
 * be claimed into a second thread.
 */
export async function claimAnonymousWork(
  item: AnonymousWorkItem,
  { shouldCommit = () => true }: ClaimCommitOptions = {}
): Promise<AnonymousWorkClaimResult> {
  try {
    const turns = (item.turns ?? []).flatMap((turn) =>
      (turn.status === "succeeded" || turn.status === "interrupted") &&
      turn.prompt.trim() &&
      turn.reply.trim()
        ? [
            {
              id: turn.id,
              prompt: turn.prompt,
              reply: turn.reply,
              status: turn.status,
            },
          ]
        : []
    );
    const { response, data } = await claimAnonymousSpacesWork({
      workId: item.id,
      prompt: item.prompt,
      reply: item.reply || item.replyPreview || "",
      replyPreview: item.replyPreview,
      title: item.title || item.prompt,
      threadId: item.threadId,
      route: item.route,
      ...(turns.length ? { turns } : {}),
    });

    if (!response.ok || !data?.success) {
      return {
        status: "error",
        importedCount: 0,
        route: null,
        workId: item.id,
        error: data?.error || "Spaces setup is temporarily unavailable.",
      };
    }

    const importedCount = Number(data.importedCount) || 0;
    const imported = Boolean(data.imported) && importedCount > 0;

    // The work is in the account (imported now, or by an earlier claim). Only
    // now is it safe to drop the browser's copy.
    if ((imported || data.alreadyClaimed) && shouldCommit()) {
      removeAnonymousWorkItems([item.id]);
    }

    return {
      status: imported ? "imported" : "nothing",
      importedCount,
      route: data.route ?? null,
      workId: item.id,
      error: null,
    };
  } catch {
    return {
      status: "error",
      importedCount: 0,
      route: null,
      workId: item.id,
      error: "Spaces setup is temporarily unavailable.",
    };
  }
}

function isSamePendingIntent(
  current: PendingIntent | null,
  expected: PendingIntent
) {
  return Boolean(
    current &&
      current.productId === expected.productId &&
      current.taskKind === expected.taskKind &&
      current.prompt === expected.prompt &&
      current.source === expected.source &&
      current.returnTo === expected.returnTo &&
      current.anonymousWorkId === expected.anonymousWorkId &&
      current.replayMode === expected.replayMode &&
      current.createdAt === expected.createdAt
  );
}

/**
 * The post-auth claim, shared by every sign-in path.
 *
 * Returns the result plus the route the caller should land on. The pending
 * intent is consumed here ONLY when the import made a replay redundant; if
 * nothing was imported it is deliberately left in place for ChatArea to replay.
 */
export async function claimPendingAnonymousWork(
  { shouldCommit = () => true }: ClaimCommitOptions = {}
): Promise<
  AnonymousWorkClaimResult & { pendingIntent: PendingIntent | null }
> {
  const pendingIntent = readPendingIntent();
  // Spaces chats and WP-F Agent plan previews both carry importable work. Anything else
  // (a Brain handoff, a coming-soon lane) has nothing to claim.
  if (!pendingIntent || !isClaimableProduct(pendingIntent.productId)) {
    return { ...NOTHING_TO_CLAIM, pendingIntent };
  }

  const item = findClaimableWork(pendingIntent.anonymousWorkId);
  if (!isImportableWork(item) || !item) {
    // Nothing importable — the intent survives so the prompt gets replayed and
    // answered for real at the destination.
    return { ...NOTHING_TO_CLAIM, pendingIntent };
  }

  const result = await claimAnonymousWork(item, { shouldCommit });

  // The conversation is now IN the thread. Replaying the prompt on top of it
  // would duplicate the question and bill a second answer, so retire the intent.
  if (
    result.status === "imported" &&
    shouldCommit() &&
    isSamePendingIntent(readPendingIntent(), pendingIntent)
  ) {
    clearPendingIntent();
  }

  return { ...result, pendingIntent };
}

import crypto from "node:crypto";

/**
 * Anonymous -> account work claim.
 *
 * Anonymous Spaces turns are NEVER persisted server-side: the anonymous
 * stream handler generates a reply, writes it to the response socket and drops
 * it (the meter receipt path is a no-op for anonymous identities and only ever
 * stored character counts, never text). The only surviving copy of a signed-out
 * conversation is the ledger in the visitor's own browser.
 *
 * So the claim imports what genuinely exists: the transcript the visitor's
 * browser saved, carried into their account at the moment they explicitly ask
 * us to keep it. Two rules keep that honest:
 *
 *   1. We only import a COMPLETE turn (a prompt AND the assistant reply the
 *      visitor actually saw). A draft or failed turn carries no answer, so
 *      there is nothing to "keep" — it is replayed for real instead, and the
 *      response reports imported: false so the UI cannot claim otherwise.
 *   2. The response reports the row count we actually wrote. Callers derive
 *      their "we kept your work" copy from that number, never from a guess.
 *
 * Upstream (nova-typ) exposes no message-append API — the only way it writes a
 * thread message is by running the model. Imported turns therefore live in
 * ZAKI's own store and are merged into the thread history read path, the same
 * shape the upstream returns.
 */

export const ANONYMOUS_WORK_MAX_PROMPT_CHARS = 800;
export const ANONYMOUS_WORK_MAX_REPLY_CHARS = 20000;
export const ANONYMOUS_WORK_MAX_TITLE_CHARS = 96;
export const ANONYMOUS_WORK_MAX_ID_CHARS = 120;
export const ANONYMOUS_WORK_MAX_ROUTE_CHARS = 240;

/** Single-line text: collapses all whitespace. Used for prompts/titles/ids. */
export function sanitizeClaimText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Multi-line text: strips control characters but PRESERVES newlines and tabs.
 * An assistant reply is markdown — flattening its whitespace (what the
 * single-line sanitizer does) would import a mangled blob instead of the
 * answer the visitor actually read.
 */
export function sanitizeClaimRichText(value, maxLength) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalize a claim request body into exactly the fields the import needs.
 * `reply` is the full assistant text; `replyPreview` is the legacy truncated
 * single-line field kept by older browser ledgers, used only as a fallback so
 * work saved before this shipped is still importable.
 */
export function parseAnonymousWorkClaimRequest(body) {
  const source = body && typeof body === "object" ? body : {};
  const prompt = sanitizeClaimText(source.prompt, ANONYMOUS_WORK_MAX_PROMPT_CHARS);
  const replyPreview = sanitizeClaimText(source.replyPreview, ANONYMOUS_WORK_MAX_PROMPT_CHARS);
  const fullReply = sanitizeClaimRichText(source.reply, ANONYMOUS_WORK_MAX_REPLY_CHARS);
  // Prefer the full reply; fall back to the legacy preview so ledgers written
  // before the full-text field existed still import their (truncated) answer.
  const reply = fullReply || replyPreview;

  return {
    prompt,
    reply,
    replyPreview,
    workId: sanitizeClaimText(source.workId, ANONYMOUS_WORK_MAX_ID_CHARS) || null,
    title: sanitizeClaimText(source.title, ANONYMOUS_WORK_MAX_TITLE_CHARS) || null,
    sourceThreadId: sanitizeClaimText(source.threadId, ANONYMOUS_WORK_MAX_ID_CHARS) || null,
    sourceRoute: sanitizeClaimText(source.route, ANONYMOUS_WORK_MAX_ROUTE_CHARS) || null,
  };
}

/** True when the request references any saved work at all (else the caller 400s). */
export function claimRequestHasWork(request) {
  return Boolean(request?.prompt || request?.reply || request?.sourceRoute);
}

/**
 * The turns we can honestly import: a prompt the visitor sent AND the answer
 * they were shown. A prompt with no answer is a draft, not work — importing a
 * lone user turn would leave the visitor staring at their own question with no
 * reply, which is exactly the empty-thread bug this fixes. Those replay instead.
 */
export function buildClaimTurns(request) {
  const prompt = String(request?.prompt || "").trim();
  const reply = String(request?.reply || "").trim();
  if (!prompt || !reply) return [];
  return [
    { role: "user", content: prompt, position: 0 },
    { role: "assistant", content: reply, position: 1 },
  ];
}

/**
 * Idempotency key. The browser ledger id (`workId`) is the identity of a piece
 * of saved work, so a re-claim of the same item resolves to the same key and is
 * absorbed. Legacy clients that send no workId fall back to a content hash, so
 * they cannot duplicate either.
 */
export function resolveClaimKey(request) {
  const workId = sanitizeClaimText(request?.workId, ANONYMOUS_WORK_MAX_ID_CHARS);
  if (workId) return `work:${workId}`;
  const digest = crypto
    .createHash("sha256")
    .update(`${String(request?.prompt || "")}\u0000${String(request?.reply || "")}`)
    .digest("hex");
  return `content:${digest}`;
}

export function buildClaimRoute(workspaceSlug, threadSlug) {
  return threadSlug
    ? `/spaces/${workspaceSlug}/threads/${threadSlug}`
    : `/spaces/${workspaceSlug}`;
}

/**
 * Merge ZAKI-side imported turns into the upstream thread history. Imported
 * turns predate everything the thread has since accumulated upstream, so they
 * lead.
 */
export function mergeImportedThreadHistory({ upstream, importedRows }) {
  const rows = Array.isArray(importedRows) ? importedRows : [];
  const payload = upstream && typeof upstream === "object" ? upstream : {};
  if (!rows.length) return payload;

  const history = Array.isArray(payload.history) ? payload.history : [];
  const imported = rows.map((row, index) => ({
    id: `anon-import-${row.id ?? index}`,
    role: row.role === "assistant" ? "assistant" : "user",
    content: String(row.content || ""),
    createdAt: row.created_at ?? row.createdAt ?? null,
    importedFromAnonymous: true,
  }));

  return { ...payload, history: [...imported, ...history] };
}

/**
 * Workspace slugs are lowercased everywhere they are produced and consumed, but
 * the import write and the history read reach the slug by different routes.
 * Normalizing at the store boundary means a casing drift on either side can
 * never orphan a user's imported turns.
 */
function normalizeWorkspaceSlug(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * SQL-backed claim store. The db handles are injected so the orchestration
 * above stays unit-testable without a Postgres.
 */
export function createAnonymousWorkClaimStore({ dbGet, dbAll, dbQuery }) {
  return {
    async findClaim({ userId, claimKey }) {
      return dbGet(
        `SELECT id, work_id, workspace_slug, thread_slug, route, imported_count
           FROM zaki_anonymous_work_claims
          WHERE user_id = $1 AND claim_key = $2`,
        [userId, claimKey]
      );
    },

    /**
     * Reserve the claim. ON CONFLICT DO NOTHING means a concurrent double-claim
     * gets exactly one winner; the loser gets null and reads the winner's row.
     */
    async reserveClaim({ userId, claimKey, workId, workspaceSlug, threadSlug, route }) {
      return dbGet(
        `INSERT INTO zaki_anonymous_work_claims
           (user_id, claim_key, work_id, workspace_slug, thread_slug, route, imported_count)
         VALUES ($1, $2, $3, $4, $5, $6, 0)
         ON CONFLICT (user_id, claim_key) DO NOTHING
         RETURNING id`,
        [userId, claimKey, workId, normalizeWorkspaceSlug(workspaceSlug), threadSlug, route]
      );
    },

    async insertTurns({ userId, claimKey, workspaceSlug, threadSlug, turns }) {
      let inserted = 0;
      for (const turn of turns) {
        const row = await dbGet(
          `INSERT INTO zaki_anonymous_work_messages
             (user_id, claim_key, workspace_slug, thread_slug, role, content, position)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, claim_key, position) DO NOTHING
           RETURNING id`,
          [
            userId,
            claimKey,
            normalizeWorkspaceSlug(workspaceSlug),
            threadSlug,
            turn.role,
            turn.content,
            turn.position,
          ]
        );
        if (row) inserted += 1;
      }
      return inserted;
    },

    async setImportedCount({ userId, claimKey, importedCount }) {
      await dbQuery(
        `UPDATE zaki_anonymous_work_claims
            SET imported_count = $3
          WHERE user_id = $1 AND claim_key = $2`,
        [userId, claimKey, importedCount]
      );
    },

    async listThreadMessages({ userId, workspaceSlug, threadSlug }) {
      return dbAll(
        `SELECT id, role, content, created_at
           FROM zaki_anonymous_work_messages
          WHERE user_id = $1 AND workspace_slug = $2 AND thread_slug = $3
          ORDER BY id ASC`,
        [userId, normalizeWorkspaceSlug(workspaceSlug), threadSlug]
      );
    },
  };
}

/**
 * Write the saved anonymous conversation into the target thread.
 *
 * Returns the truth about what happened — `importedCount` is the number of
 * message rows that now exist for this work, and `imported` is simply whether
 * that number is above zero. Callers must not embellish it.
 */
export async function importAnonymousWorkClaim({
  request,
  claimKey,
  userId,
  workspaceSlug,
  threadSlug,
  store,
}) {
  const route = buildClaimRoute(workspaceSlug, threadSlug);
  const turns = buildClaimTurns(request);

  // A draft or failed anonymous turn has no answer to carry over. Say so
  // plainly: the caller replays the prompt instead of pretending we kept it.
  if (!turns.length || !threadSlug) {
    return {
      workspaceSlug,
      threadSlug,
      route,
      imported: false,
      importedCount: 0,
      alreadyClaimed: false,
    };
  }

  const reserved = await store.reserveClaim({
    userId,
    claimKey,
    workId: request.workId,
    workspaceSlug,
    threadSlug,
    route,
  });

  // Lost the race against a concurrent claim of the same work: adopt the
  // winner's thread rather than importing a second copy.
  if (!reserved) {
    const existing = await store.findClaim({ userId, claimKey });
    if (existing) {
      return {
        workspaceSlug: existing.workspace_slug,
        threadSlug: existing.thread_slug,
        route: existing.route,
        imported: Number(existing.imported_count) > 0,
        importedCount: Number(existing.imported_count) || 0,
        alreadyClaimed: true,
      };
    }
  }

  const inserted = await store.insertTurns({
    userId,
    claimKey,
    workspaceSlug,
    threadSlug,
    turns,
  });

  const importedCount = inserted || turns.length;
  await store.setImportedCount({ userId, claimKey, importedCount });

  return {
    workspaceSlug,
    threadSlug,
    route,
    imported: importedCount > 0,
    importedCount,
    alreadyClaimed: false,
  };
}

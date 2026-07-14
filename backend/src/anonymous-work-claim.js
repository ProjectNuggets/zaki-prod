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
export const IMPORTED_THREAD_CONTEXT_MAX_CHARS = 12000;
export const IMPORTED_THREAD_CONTEXT_INVALIDATION_CHANNEL = "zaki_imported_context";
const IMPORTED_THREAD_TURN_MAX_CHARS = 11000;
const IMPORTED_THREAD_CONTEXT_MAX_TURNS = 6;
const IMPORTED_THREAD_CONTEXT_LEASE_MS = 10 * 60 * 1000;

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
 * Render imported turns as explicit earlier conversation for the next model
 * turn. Keeping the roles visible prevents the transcript from being mistaken
 * for instructions authored by the current user message.
 */
export function buildImportedThreadTranscript(
  importedRows,
  { maxChars = IMPORTED_THREAD_CONTEXT_MAX_CHARS } = {}
) {
  return buildImportedThreadContext(importedRows, { maxChars }).transcript;
}

/**
 * Build the bounded model transcript and the exact row IDs represented by it.
 * Keeping both outputs in one selection pass prevents omitted rows from being
 * acknowledged as forwarded.
 */
export function buildImportedThreadContext(
  importedRows,
  { maxChars = IMPORTED_THREAD_CONTEXT_MAX_CHARS } = {}
) {
  const rows = Array.isArray(importedRows) ? importedRows : [];
  if (!rows.length) return { transcript: "", messageIds: [] };

  const header = "Earlier turns imported from this user's signed-out conversation:";
  const turns = rows.slice(-IMPORTED_THREAD_CONTEXT_MAX_TURNS).map((row) => {
    const role = row?.role === "assistant" ? "ASSISTANT" : "USER";
    const content = String(row?.content || "")
      .trim()
      // The transcript is nested inside the memory-context envelope. Neutralize
      // marker syntax so an old user message cannot close that envelope early.
      .replaceAll("[[", "[ [")
      .replaceAll("]]", "] ]")
      .slice(0, IMPORTED_THREAD_TURN_MAX_CHARS);
    const id = Number(row?.id);
    return {
      id: Number.isSafeInteger(id) && id > 0 ? id : null,
      text: content ? `${role}:\n${content}` : "",
    };
  });

  const selected = [];
  let used = header.length;
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    if (!turn.text) continue;
    const added = turn.text.length + 2;
    if (used + added > maxChars) break;
    selected.unshift(turn);
    used += added;
  }

  return {
    transcript: selected.length ? [header, ...selected.map((turn) => turn.text)].join("\n\n") : "",
    messageIds: selected
      .map((turn) => turn.id)
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  };
}

/**
 * Lazy, bounded lookup for model-only imported context. Empty results are
 * cached too: almost every Spaces thread has no imported rows, so the common
 * chat path pays at most one lookup per cache window instead of one per turn.
 */
export function createImportedThreadContextProvider({
  store,
  ttlMs = 30000,
  maxEntries = 1000,
  leaseMs = IMPORTED_THREAD_CONTEXT_LEASE_MS,
  now = () => Date.now(),
} = {}) {
  const cache = new Map();
  const generations = new Map();
  let cacheGeneration = 0;
  const empty = () => ({ transcript: "", messageIds: [] });
  const keyFor = ({ userId, workspaceSlug, threadSlug }) =>
    JSON.stringify([
      String(userId ?? ""),
      normalizeWorkspaceSlug(workspaceSlug),
      String(threadSlug || "").trim(),
    ]);

  function setCached(key, entry) {
    cache.delete(key);
    cache.set(key, entry);
    while (cache.size > Math.max(1, maxEntries)) {
      cache.delete(cache.keys().next().value);
    }
  }

  async function getThreadContext(target) {
    if (!target?.userId || !target?.workspaceSlug || !target?.threadSlug) return empty();
    const key = keyFor(target);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now()) {
      setCached(key, cached);
      return cached.value ?? cached.promise;
    }
    cache.delete(key);
    const generation = generations.get(key) || 0;
    const globalGeneration = cacheGeneration;

    if (typeof store.leasePendingThreadMessages === "function") {
      const leaseId = crypto.randomUUID();
      const rows = await store.leasePendingThreadMessages({
        ...target,
        leaseId,
        leaseMs: Math.max(1, leaseMs),
      });
      const value = buildImportedThreadContext(Array.isArray(rows) ? rows : []);
      if (value.messageIds.length > 0) return { ...value, leaseId };
      if (
        cacheGeneration === globalGeneration &&
        (generations.get(key) || 0) === generation
      ) {
        setCached(key, { value, expiresAt: now() + Math.max(1, ttlMs) });
      }
      return value;
    }

    const promise = Promise.resolve(store.listPendingThreadMessages(target)).then((rows) => {
      const safeRows = Array.isArray(rows) ? rows : [];
      const value = buildImportedThreadContext(safeRows);
      if (value.messageIds.length > 0) {
        // Pending context is rare and mutable across replicas. Coalesce only the
        // in-flight read; resolved positive values must be rechecked against the
        // shared delivery marker on the next turn.
        if (cache.get(key)?.promise === promise) cache.delete(key);
      } else if (
        cacheGeneration === globalGeneration &&
        (generations.get(key) || 0) === generation &&
        cache.get(key)?.promise === promise
      ) {
        setCached(key, { value, expiresAt: now() + Math.max(1, ttlMs) });
      }
      return value;
    });

    setCached(key, { promise, expiresAt: now() + Math.max(1, ttlMs) });
    try {
      return await promise;
    } catch (error) {
      if (cache.get(key)?.promise === promise) cache.delete(key);
      throw error;
    }
  }

  function invalidateThread(target) {
    const key = keyFor(target || {});
    generations.set(key, (generations.get(key) || 0) + 1);
    cache.delete(key);
  }

  function invalidateAll() {
    cacheGeneration += 1;
    cache.clear();
    generations.clear();
  }

  async function markForwarded(target) {
    const messageIds = Array.isArray(target?.messageIds)
      ? target.messageIds
          .map((id) => Number(id))
          .filter((id) => Number.isSafeInteger(id) && id > 0)
      : [];
    if (!messageIds.length) return;
    const usesLeases = typeof store.leasePendingThreadMessages === "function";
    const leaseId = String(target?.leaseId || "").trim();
    if (usesLeases && !leaseId) {
      throw new Error("Imported thread context lease is required for finalization.");
    }

    const forwardedCount = await store.markThreadMessagesForwarded(
      usesLeases ? { ...target, messageIds, leaseId } : { ...target, messageIds }
    );
    if (Number.isFinite(forwardedCount) && forwardedCount !== messageIds.length) {
      throw new Error("Imported thread context lease no longer owns every message.");
    }
    if (usesLeases) {
      // The bounded batch can leave older imported turns pending. Re-check on
      // the next turn instead of turning a successful batch into a false miss.
      invalidateThread(target);
      if (typeof store.notifyThreadContextChanged === "function") {
        const notificationTarget = {
          userId: target?.userId,
          workspaceSlug: target?.workspaceSlug,
          threadSlug: target?.threadSlug,
        };
        await store.notifyThreadContextChanged(notificationTarget).catch((error) =>
          console.warn(
            "[AnonymousSpaces] Failed to publish imported-context finalization:",
            error?.message || error
          )
        );
      }
    } else {
      setCached(keyFor(target), {
        value: empty(),
        expiresAt: now() + Math.max(1, ttlMs),
      });
    }
  }

  async function releaseLease(target) {
    const messageIds = Array.isArray(target?.messageIds)
      ? target.messageIds
          .map((id) => Number(id))
          .filter((id) => Number.isSafeInteger(id) && id > 0)
      : [];
    const leaseId = String(target?.leaseId || "").trim();
    if (!messageIds.length || !leaseId) return;

    await store.releaseThreadMessageLease({ ...target, messageIds, leaseId });
    invalidateThread(target);
    if (typeof store.notifyThreadContextChanged === "function") {
      const notificationTarget = {
        userId: target?.userId,
        workspaceSlug: target?.workspaceSlug,
        threadSlug: target?.threadSlug,
      };
      await store.notifyThreadContextChanged(notificationTarget).catch((error) =>
        console.warn(
          "[AnonymousSpaces] Failed to publish imported-context lease release:",
          error?.message || error
        )
      );
    }
  }

  return { getThreadContext, invalidateThread, invalidateAll, markForwarded, releaseLease };
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

export function createImportedThreadContextInvalidationPayload({
  userId,
  workspaceSlug,
  threadSlug,
} = {}) {
  return JSON.stringify({
    userId: String(userId ?? "").trim(),
    workspaceSlug: normalizeWorkspaceSlug(workspaceSlug),
    threadSlug: String(threadSlug || "").trim(),
  });
}

export function parseImportedThreadContextInvalidationPayload(payload) {
  try {
    const parsed = JSON.parse(String(payload || ""));
    const target = {
      userId: String(parsed?.userId ?? "").trim(),
      workspaceSlug: normalizeWorkspaceSlug(parsed?.workspaceSlug),
      threadSlug: String(parsed?.threadSlug || "").trim(),
    };
    return target.userId && target.workspaceSlug && target.threadSlug ? target : null;
  } catch {
    return null;
  }
}

export function invalidateImportedThreadContextFromNotification(provider, payload) {
  const target = parseImportedThreadContextInvalidationPayload(payload);
  if (!target || typeof provider?.invalidateThread !== "function") return false;
  provider.invalidateThread(target);
  return true;
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

    async leasePendingThreadMessages({
      userId,
      workspaceSlug,
      threadSlug,
      leaseId,
      leaseMs,
    }) {
      const rows = await dbAll(
        `WITH acquired_lease AS (
           INSERT INTO zaki_imported_context_leases (
             user_id, workspace_slug, thread_slug, lease_id, lease_expires_at
           )
           SELECT
             $1, $2, $3, $5::uuid,
             NOW() + ($6::bigint * INTERVAL '1 millisecond')
           WHERE EXISTS (
             SELECT 1
               FROM zaki_anonymous_work_messages
              WHERE user_id = $1 AND workspace_slug = $2 AND thread_slug = $3
                AND context_forwarded_at IS NULL
           )
           ON CONFLICT (user_id, workspace_slug, thread_slug) DO UPDATE
             SET lease_id = EXCLUDED.lease_id,
                 lease_expires_at = EXCLUDED.lease_expires_at
           WHERE zaki_imported_context_leases.lease_expires_at <= NOW()
           RETURNING lease_id
         )
         SELECT messages.id, messages.role, messages.content, messages.created_at
           FROM zaki_anonymous_work_messages AS messages
           CROSS JOIN acquired_lease
          WHERE messages.user_id = $1
            AND messages.workspace_slug = $2
            AND messages.thread_slug = $3
            AND messages.context_forwarded_at IS NULL
          ORDER BY messages.id DESC
          LIMIT $4`,
        [
          userId,
          normalizeWorkspaceSlug(workspaceSlug),
          threadSlug,
          IMPORTED_THREAD_CONTEXT_MAX_TURNS,
          leaseId,
          Math.max(1, Number(leaseMs) || IMPORTED_THREAD_CONTEXT_LEASE_MS),
        ]
      );
      return Array.isArray(rows)
        ? rows.slice().sort((left, right) => Number(left.id) - Number(right.id))
        : [];
    },

    async markThreadMessagesForwarded({
      userId,
      workspaceSlug,
      threadSlug,
      messageIds,
      leaseId,
    }) {
      const ids = Array.isArray(messageIds)
        ? messageIds
            .map((id) => Number(id))
            .filter((id) => Number.isSafeInteger(id) && id > 0)
        : [];
      if (!ids.length) return;
      const result = await dbQuery(
        `WITH owned_lease AS (
           DELETE FROM zaki_imported_context_leases
            WHERE user_id = $1 AND workspace_slug = $2 AND thread_slug = $3
              AND lease_id = $5::uuid
           RETURNING lease_id
         )
         UPDATE zaki_anonymous_work_messages AS messages
            SET context_forwarded_at = NOW()
           FROM owned_lease
          WHERE messages.user_id = $1
            AND messages.workspace_slug = $2
            AND messages.thread_slug = $3
            AND messages.id = ANY($4::bigint[])
            AND messages.context_forwarded_at IS NULL`,
        [userId, normalizeWorkspaceSlug(workspaceSlug), threadSlug, ids, leaseId]
      );
      return Number(result?.rowCount) || 0;
    },

    async releaseThreadMessageLease({
      userId,
      workspaceSlug,
      threadSlug,
      messageIds,
      leaseId,
    }) {
      if (!Array.isArray(messageIds) || !messageIds.length || !leaseId) return;
      await dbQuery(
        `DELETE FROM zaki_imported_context_leases
          WHERE user_id = $1 AND workspace_slug = $2 AND thread_slug = $3
            AND lease_id = $4::uuid`,
        [userId, normalizeWorkspaceSlug(workspaceSlug), threadSlug, leaseId]
      );
    },

    async notifyThreadContextChanged(target) {
      const params = [
        IMPORTED_THREAD_CONTEXT_INVALIDATION_CHANNEL,
        createImportedThreadContextInvalidationPayload(target),
      ];
      try {
        await dbQuery("SELECT pg_notify($1, $2)", params);
      } catch {
        await dbQuery("SELECT pg_notify($1, $2)", params);
      }
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
  if (importedCount > 0 && typeof store.notifyThreadContextChanged === "function") {
    await store
      .notifyThreadContextChanged({ userId, workspaceSlug, threadSlug })
      .catch((error) =>
        console.warn(
          "[AnonymousSpaces] Failed to publish imported-context invalidation:",
          error?.message || error
        )
      );
  }

  return {
    workspaceSlug,
    threadSlug,
    route,
    imported: importedCount > 0,
    importedCount,
    alreadyClaimed: false,
  };
}

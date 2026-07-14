import { describe, expect, it, beforeEach } from "@jest/globals";
import {
  ANONYMOUS_WORK_MAX_REPLY_CHARS,
  IMPORTED_THREAD_CONTEXT_MAX_CHARS,
  buildClaimTurns,
  buildImportedThreadTranscript,
  claimRequestHasWork,
  createAnonymousWorkClaimStore,
  createImportedThreadContextProvider,
  createImportedThreadContextInvalidationPayload,
  importAnonymousWorkClaim,
  invalidateImportedThreadContextFromNotification,
  mergeImportedThreadHistory,
  parseAnonymousWorkClaimRequest,
  resolveClaimKey,
  sanitizeClaimRichText,
} from "./anonymous-work-claim.js";

/**
 * In-memory stand-in for the two claim tables. It enforces the same UNIQUE
 * constraints Postgres does, so idempotency is tested against the real rule
 * (ON CONFLICT DO NOTHING) rather than a hand-waved mock.
 */
function createFakeStore() {
  const claims = new Map(); // `${userId}:${claimKey}` -> claim row
  const messages = []; // message rows, id ascending
  const contextInvalidations = [];
  let nextId = 1;

  return {
    claims,
    messages,
    contextInvalidations,
    async findClaim({ userId, claimKey }) {
      return claims.get(`${userId}:${claimKey}`) ?? null;
    },
    async reserveClaim({ userId, claimKey, workId, workspaceSlug, threadSlug, route }) {
      const key = `${userId}:${claimKey}`;
      if (claims.has(key)) return null; // ON CONFLICT (user_id, claim_key) DO NOTHING
      const row = {
        id: nextId++,
        user_id: userId,
        claim_key: claimKey,
        work_id: workId,
        workspace_slug: workspaceSlug,
        thread_slug: threadSlug,
        route,
        imported_count: 0,
      };
      claims.set(key, row);
      return { id: row.id };
    },
    async insertTurns({ userId, claimKey, workspaceSlug, threadSlug, turns }) {
      let inserted = 0;
      for (const turn of turns) {
        // UNIQUE (user_id, claim_key, position)
        const clash = messages.some(
          (row) =>
            row.user_id === userId &&
            row.claim_key === claimKey &&
            row.position === turn.position
        );
        if (clash) continue;
        messages.push({
          id: nextId++,
          user_id: userId,
          claim_key: claimKey,
          workspace_slug: workspaceSlug,
          thread_slug: threadSlug,
          role: turn.role,
          content: turn.content,
          position: turn.position,
          created_at: "2026-07-14T00:00:00.000Z",
        });
        inserted += 1;
      }
      return inserted;
    },
    async setImportedCount({ userId, claimKey, importedCount }) {
      const row = claims.get(`${userId}:${claimKey}`);
      if (row) row.imported_count = importedCount;
    },
    async notifyThreadContextChanged(target) {
      contextInvalidations.push(target);
    },
    async listThreadMessages({ userId, workspaceSlug, threadSlug }) {
      return messages
        .filter(
          (row) =>
            row.user_id === userId &&
            row.workspace_slug === workspaceSlug &&
            row.thread_slug === threadSlug
        )
        .sort((a, b) => a.id - b.id);
    },
  };
}

const COMPLETE_WORK = {
  workId: "work-abc",
  prompt: "Plan a 3-day trip to Amman",
  reply: "## Day 1\n\nOld town + citadel.\n\n## Day 2\n\nJerash day trip.",
};

describe("anonymous work claim — request parsing", () => {
  it("keeps the assistant reply's markdown structure instead of flattening it", () => {
    const parsed = parseAnonymousWorkClaimRequest(COMPLETE_WORK);
    expect(parsed.reply).toContain("## Day 1");
    // Newlines survive: the imported turn is the answer the visitor read, not a
    // whitespace-collapsed blob.
    expect(parsed.reply.split("\n").length).toBeGreaterThan(1);
  });

  it("strips control characters but preserves newlines", () => {
    const dirty = `line one${String.fromCharCode(0)}\nline two${String.fromCharCode(7)}`;
    expect(sanitizeClaimRichText(dirty, 500)).toBe("line one\nline two");
  });

  it("caps the imported reply length", () => {
    const parsed = parseAnonymousWorkClaimRequest({
      prompt: "hi",
      reply: "x".repeat(ANONYMOUS_WORK_MAX_REPLY_CHARS + 500),
    });
    expect(parsed.reply).toHaveLength(ANONYMOUS_WORK_MAX_REPLY_CHARS);
  });

  it("falls back to the legacy truncated replyPreview when no full reply is sent", () => {
    const parsed = parseAnonymousWorkClaimRequest({
      prompt: "hi",
      replyPreview: "legacy ledger answer",
    });
    expect(parsed.reply).toBe("legacy ledger answer");
  });

  it("rejects a body with no saved work at all", () => {
    expect(claimRequestHasWork(parseAnonymousWorkClaimRequest({}))).toBe(false);
    expect(claimRequestHasWork(parseAnonymousWorkClaimRequest(COMPLETE_WORK))).toBe(true);
  });
});

describe("anonymous work claim — what can honestly be imported", () => {
  it("imports both turns when the visitor got a real answer", () => {
    const turns = buildClaimTurns(parseAnonymousWorkClaimRequest(COMPLETE_WORK));
    expect(turns.map((turn) => turn.role)).toEqual(["user", "assistant"]);
  });

  it("imports NOTHING from a draft — a prompt with no answer is not work", () => {
    const turns = buildClaimTurns(
      parseAnonymousWorkClaimRequest({ workId: "w1", prompt: "unanswered question" })
    );
    expect(turns).toEqual([]);
  });
});

describe("anonymous work claim — the import is real", () => {
  let store;
  const target = { userId: 42, workspaceSlug: "space-42", threadSlug: "thread-1" };

  beforeEach(() => {
    store = createFakeStore();
  });

  async function claim(body, overrides = {}) {
    const request = parseAnonymousWorkClaimRequest(body);
    return importAnonymousWorkClaim({
      request,
      claimKey: resolveClaimKey(request),
      userId: target.userId,
      workspaceSlug: target.workspaceSlug,
      threadSlug: target.threadSlug,
      store,
      ...overrides,
    });
  }

  // (a) claim writes real message rows into the target thread
  it("writes the user turn AND the assistant reply into the target thread", async () => {
    const result = await claim(COMPLETE_WORK);

    expect(result.imported).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(result.route).toBe("/spaces/space-42/threads/thread-1");

    const rows = await store.listThreadMessages(target);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      role: "user",
      content: "Plan a 3-day trip to Amman",
      thread_slug: "thread-1",
      workspace_slug: "space-42",
      user_id: 42,
    });
    expect(rows[1]).toMatchObject({ role: "assistant", thread_slug: "thread-1" });
    expect(rows[1].content).toContain("## Day 1");
    expect(store.contextInvalidations).toEqual([target]);
  });

  // (b) re-claiming the same workId is idempotent
  it("is idempotent on workId — a re-claim adds no second copy of the messages", async () => {
    const first = await claim(COMPLETE_WORK);
    const second = await claim(COMPLETE_WORK);

    expect(second.route).toBe(first.route);
    expect(second.threadSlug).toBe(first.threadSlug);
    expect(second.alreadyClaimed).toBe(true);

    // The rows are still exactly the two we imported the first time.
    const rows = await store.listThreadMessages(target);
    expect(rows).toHaveLength(2);
    expect(store.claims.size).toBe(1);
  });

  it("keys idempotency on workId even when the text changed between claims", async () => {
    await claim(COMPLETE_WORK);
    // Same ledger item, but the client re-sends a different reply body.
    const second = await claim({ ...COMPLETE_WORK, reply: "a totally different answer" });

    expect(second.alreadyClaimed).toBe(true);
    const rows = await store.listThreadMessages(target);
    expect(rows).toHaveLength(2);
    expect(rows[1].content).not.toContain("totally different");
  });

  it("still dedupes a legacy client that sends no workId, via a content key", async () => {
    const noId = { prompt: "legacy prompt", reply: "legacy answer" };
    const first = await claim(noId);
    const second = await claim(noId);

    expect(first.importedCount).toBe(2);
    expect(second.alreadyClaimed).toBe(true);
    expect(await store.listThreadMessages(target)).toHaveLength(2);
  });

  it("two DIFFERENT pieces of work both import, into the same thread, in order", async () => {
    await claim(COMPLETE_WORK);
    await claim({ workId: "work-def", prompt: "second question", reply: "second answer" });

    const rows = await store.listThreadMessages(target);
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(rows[2].content).toBe("second question");
  });

  it("imports nothing — and admits it — when the work is a draft with no answer", async () => {
    const result = await claim({ workId: "draft-1", prompt: "never answered" });

    expect(result.imported).toBe(false);
    expect(result.importedCount).toBe(0);
    // Nothing was written, so nothing can be replayed twice later.
    expect(await store.listThreadMessages(target)).toHaveLength(0);
    expect(store.claims.size).toBe(0);
    // The visitor still gets a destination to continue in.
    expect(result.route).toBe("/spaces/space-42/threads/thread-1");
  });

  it("imports nothing when there is no thread to import into", async () => {
    const result = await claim(COMPLETE_WORK, { threadSlug: null });

    expect(result.imported).toBe(false);
    expect(result.importedCount).toBe(0);
    expect(result.route).toBe("/spaces/space-42");
  });

  it("a concurrent double-claim yields one thread and one copy of the work", async () => {
    const request = parseAnonymousWorkClaimRequest(COMPLETE_WORK);
    const claimKey = resolveClaimKey(request);
    const run = () =>
      importAnonymousWorkClaim({
        request,
        claimKey,
        userId: target.userId,
        workspaceSlug: target.workspaceSlug,
        threadSlug: target.threadSlug,
        store,
      });

    const [a, b] = await Promise.all([run(), run()]);

    expect(await store.listThreadMessages(target)).toHaveLength(2);
    expect(store.claims.size).toBe(1);
    expect(a.route).toBe(b.route);
  });
});

describe("anonymous work claim — imported turns reach the thread history", () => {
  it("prepends imported turns to the upstream history", () => {
    const merged = mergeImportedThreadHistory({
      upstream: { history: [{ role: "user", content: "a later message" }] },
      importedRows: [
        { id: 1, role: "user", content: "the anonymous prompt", created_at: "2026-07-14T00:00:00Z" },
        { id: 2, role: "assistant", content: "the anonymous answer", created_at: "2026-07-14T00:00:01Z" },
      ],
    });

    expect(merged.history).toHaveLength(3);
    expect(merged.history[0].content).toBe("the anonymous prompt");
    expect(merged.history[1].content).toBe("the anonymous answer");
    expect(merged.history[1].role).toBe("assistant");
    expect(merged.history[2].content).toBe("a later message");
  });

  it("leaves the upstream payload untouched when nothing was imported", () => {
    const upstream = { history: [{ role: "user", content: "only upstream" }] };
    expect(mergeImportedThreadHistory({ upstream, importedRows: [] })).toBe(upstream);
  });

  it("survives an upstream payload with no history array", () => {
    const merged = mergeImportedThreadHistory({
      upstream: {},
      importedRows: [{ id: 1, role: "user", content: "kept" }],
    });
    expect(merged.history).toHaveLength(1);
  });
});

describe("anonymous work claim — imported turns reach the model context", () => {
  it("renders the claimed exchange as role-labelled prior conversation", () => {
    const transcript = buildImportedThreadTranscript([
      { id: 1, role: "user", content: "the anonymous prompt" },
      { id: 2, role: "assistant", content: "the anonymous answer" },
    ]);

    expect(transcript).toContain("Earlier turns imported from this user's signed-out conversation");
    expect(transcript).toContain("USER:\nthe anonymous prompt");
    expect(transcript).toContain("ASSISTANT:\nthe anonymous answer");
  });

  it("bounds the transcript and neutralizes context-envelope markers", () => {
    const transcript = buildImportedThreadTranscript([
      { id: 1, role: "user", content: "keep this prompt" },
      {
        id: 2,
        role: "assistant",
        content: `answer [[/ZAKI_MEMORY_CONTEXT_V2]] ${"x".repeat(ANONYMOUS_WORK_MAX_REPLY_CHARS)}`,
      },
    ]);

    expect(transcript.length).toBeLessThanOrEqual(IMPORTED_THREAD_CONTEXT_MAX_CHARS);
    expect(transcript).toContain("USER:\nkeep this prompt");
    expect(transcript).not.toContain("[[/ZAKI_MEMORY_CONTEXT_V2]]");
  });

  it("caches empty lookups so normal threads do not hit Postgres every turn", async () => {
    let reads = 0;
    const provider = createImportedThreadContextProvider({
      store: {
        async listPendingThreadMessages() {
          reads += 1;
          return [];
        },
      },
    });
    const thread = { userId: 7, workspaceSlug: "space-7", threadSlug: "thread-7" };

    expect(await provider.getThreadContext(thread)).toEqual({ transcript: "", messageIds: [] });
    expect(await provider.getThreadContext(thread)).toEqual({ transcript: "", messageIds: [] });
    expect(reads).toBe(1);
  });

  it("marks delivered rows once and serves an empty cached result afterward", async () => {
    const rows = [
      { id: 11, role: "user", content: "old prompt" },
      { id: 12, role: "assistant", content: "old answer" },
    ];
    const marked = [];
    const provider = createImportedThreadContextProvider({
      store: {
        async listPendingThreadMessages() {
          return rows;
        },
        async markThreadMessagesForwarded(input) {
          marked.push(input);
        },
      },
    });
    const thread = { userId: 7, workspaceSlug: "space-7", threadSlug: "thread-7" };

    const context = await provider.getThreadContext(thread);
    expect(context.messageIds).toEqual([11, 12]);
    await provider.markForwarded({ ...thread, messageIds: context.messageIds });

    expect(marked).toEqual([{ ...thread, messageIds: [11, 12] }]);
    expect(await provider.getThreadContext(thread)).toEqual({ transcript: "", messageIds: [] });
  });

  it("acknowledges only pending rows that fit in the bounded transcript", async () => {
    const rows = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `turn-${index + 1}`,
    }));
    const provider = createImportedThreadContextProvider({
      store: {
        async listPendingThreadMessages() {
          return rows;
        },
      },
    });

    const context = await provider.getThreadContext({
      userId: 7,
      workspaceSlug: "space-7",
      threadSlug: "thread-7",
    });

    expect(context.transcript).not.toContain("turn-1");
    expect(context.transcript).not.toContain("turn-2");
    expect(context.messageIds).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it("invalidates a cached miss when another replica publishes a claim", async () => {
    let rows = [];
    let reads = 0;
    const provider = createImportedThreadContextProvider({
      store: {
        async listPendingThreadMessages() {
          reads += 1;
          return rows;
        },
      },
    });
    const thread = { userId: 7, workspaceSlug: "space-7", threadSlug: "thread-7" };

    expect(await provider.getThreadContext(thread)).toEqual({ transcript: "", messageIds: [] });
    rows = [
      { id: 11, role: "user", content: "claimed elsewhere" },
      { id: 12, role: "assistant", content: "now visible here" },
    ];
    invalidateImportedThreadContextFromNotification(
      provider,
      createImportedThreadContextInvalidationPayload(thread)
    );

    expect((await provider.getThreadContext(thread)).messageIds).toEqual([11, 12]);
    expect(reads).toBe(2);
  });

  it("does not retain positive context after the shared database state changes", async () => {
    let rows = [{ id: 11, role: "user", content: "pending once" }];
    let reads = 0;
    const provider = createImportedThreadContextProvider({
      store: {
        async listPendingThreadMessages() {
          reads += 1;
          return rows;
        },
      },
    });
    const thread = { userId: 7, workspaceSlug: "space-7", threadSlug: "thread-7" };

    expect((await provider.getThreadContext(thread)).messageIds).toEqual([11]);
    rows = [];

    expect(await provider.getThreadContext(thread)).toEqual({ transcript: "", messageIds: [] });
    expect(reads).toBe(2);
  });
});

describe("anonymous work claim — SQL store", () => {
  it("scopes the thread history read to the owning user", async () => {
    const calls = [];
    const store = createAnonymousWorkClaimStore({
      dbGet: async () => null,
      dbAll: async (text, params) => {
        calls.push({ text, params });
        return [];
      },
      dbQuery: async () => ({ rows: [] }),
    });

    await store.listThreadMessages({
      userId: 7,
      workspaceSlug: "space-7",
      threadSlug: "thread-7",
    });

    expect(calls[0].text).toContain("WHERE user_id = $1");
    expect(calls[0].params).toEqual([7, "space-7", "thread-7"]);
  });

  it("reserves a claim with ON CONFLICT DO NOTHING so a re-claim cannot duplicate", async () => {
    const statements = [];
    const store = createAnonymousWorkClaimStore({
      dbGet: async (text, params) => {
        statements.push({ text, params });
        return null;
      },
      dbAll: async () => [],
      dbQuery: async () => ({ rows: [] }),
    });

    await store.reserveClaim({
      userId: 1,
      claimKey: "work:abc",
      workId: "abc",
      workspaceSlug: "s",
      threadSlug: "t",
      route: "/spaces/s/threads/t",
    });

    expect(statements[0].text).toContain("ON CONFLICT (user_id, claim_key) DO NOTHING");
  });

  it("selects only pending context rows and marks exact user-scoped IDs forwarded", async () => {
    const calls = [];
    const store = createAnonymousWorkClaimStore({
      dbGet: async () => null,
      dbAll: async (text, params) => {
        calls.push({ kind: "all", text, params });
        return [];
      },
      dbQuery: async (text, params) => {
        calls.push({ kind: "query", text, params });
        return { rows: [] };
      },
    });
    const thread = { userId: 7, workspaceSlug: "SPACE-7", threadSlug: "thread-7" };

    await store.listPendingThreadMessages(thread);
    await store.markThreadMessagesForwarded({ ...thread, messageIds: [11, 12] });

    expect(calls[0].text).toContain("context_forwarded_at IS NULL");
    expect(calls[0].text).toContain("ORDER BY id DESC");
    expect(calls[0].text).toContain("LIMIT $4");
    expect(calls[0].params).toEqual([7, "space-7", "thread-7", 6]);
    expect(calls[1].text).toContain("SET context_forwarded_at = NOW()");
    expect(calls[1].text).toContain("user_id = $1");
    expect(calls[1].params).toEqual([7, "space-7", "thread-7", [11, 12]]);
  });

  it("publishes a Postgres invalidation for every replica after a claim", async () => {
    const calls = [];
    const store = createAnonymousWorkClaimStore({
      dbGet: async () => null,
      dbAll: async () => [],
      dbQuery: async (text, params) => {
        calls.push({ text, params });
        return { rows: [] };
      },
    });

    await store.notifyThreadContextChanged({
      userId: 7,
      workspaceSlug: "SPACE-7",
      threadSlug: "thread-7",
    });

    expect(calls[0].text).toContain("pg_notify");
    expect(JSON.parse(calls[0].params[1])).toEqual({
      userId: "7",
      workspaceSlug: "space-7",
      threadSlug: "thread-7",
    });
  });

  it("inserts turns with ON CONFLICT DO NOTHING on (user_id, claim_key, position)", async () => {
    const statements = [];
    const store = createAnonymousWorkClaimStore({
      dbGet: async (text, params) => {
        statements.push({ text, params });
        return { id: 1 };
      },
      dbAll: async () => [],
      dbQuery: async () => ({ rows: [] }),
    });

    const inserted = await store.insertTurns({
      userId: 1,
      claimKey: "work:abc",
      workspaceSlug: "s",
      threadSlug: "t",
      turns: [
        { role: "user", content: "q", position: 0 },
        { role: "assistant", content: "a", position: 1 },
      ],
    });

    expect(inserted).toBe(2);
    expect(statements[0].text).toContain(
      "ON CONFLICT (user_id, claim_key, position) DO NOTHING"
    );
  });
});

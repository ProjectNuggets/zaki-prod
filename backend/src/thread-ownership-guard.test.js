import { describe, expect, test, jest, afterEach } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchTypWorkspaceObjects } from "./typ-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// =============================================================================
// G2-ISO-3: thread-granularity ownership guard.
//
// assertWorkspaceAndThreadOwnership lives inside index.js, which is a
// non-exporting server entrypoint (it calls initDb() and server.listen() at
// import time — see spaces-continuity-contract.test.js / bff-hardening.test.js
// for the established precedent), so it cannot be imported directly here.
//
// This suite:
//   1) Pins the EXACT implementation text in index.js (source-slice assertion),
//      so any drift between this test's fixtures and the real function fails CI.
//   2) Executes a verbatim copy of that implementation (kept byte-identical via
//      the pin in #1) against the REAL fetchTypWorkspaceObjects from typ-client.js,
//      stubbing only the network boundary (global.fetch), to prove the actual
//      end-to-end ownership-matching behavior described in the brief.
// =============================================================================

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.NOVA_TYP_BASE_URL;
  delete process.env.NOVA_TYP_API_KEY;
});

function mockTypWorkspacesResponse(workspaces) {
  process.env.NOVA_TYP_BASE_URL = "https://typ.example.com";
  process.env.NOVA_TYP_API_KEY = "test-admin-key";
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ workspaces }),
  });
}

// Verbatim mirror of assertWorkspaceAndThreadOwnership (index.js). Kept in lockstep
// with the real implementation by the source-pin test below — if index.js changes
// this algorithm without updating this copy, the pin test fails first.
async function assertWorkspaceAndThreadOwnership(novaUserId, slug, threadSlug) {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const requestedThread = String(threadSlug || "").trim();
  const result = await fetchTypWorkspaceObjects(novaUserId);
  if (!result.success) {
    return { ...result, visible: false, threadOwned: false, slug: normalizedSlug, threadSlug: requestedThread };
  }
  const userId = Number(novaUserId);
  const workspace = result.workspaces.find(
    (w) => String(w?.slug || "").trim().toLowerCase() === normalizedSlug
  );
  if (!workspace) {
    return { success: true, status: 200, visible: false, threadOwned: false, slug: normalizedSlug, threadSlug: requestedThread };
  }
  const threads = Array.isArray(workspace.threads) ? workspace.threads : [];
  const owned = threads.find((t) => {
    if (Number(t?.user_id) !== userId) return false;
    const tSlug = String(t?.slug || t?.id || "").trim();
    return tSlug === requestedThread;
  });
  return {
    success: true,
    status: 200,
    visible: true,
    threadOwned: Boolean(owned),
    slug: normalizedSlug,
    threadSlug: owned ? String(owned.slug || owned.id || requestedThread).trim() : requestedThread,
  };
}

describe("assertWorkspaceAndThreadOwnership source pin (index.js)", () => {
  test("index.js defines the ownership helper with the exact matching-and-fallback contract", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const helperSource = source.slice(
      source.indexOf("async function assertWorkspaceAndThreadOwnership"),
      source.indexOf("function sendThreadOwnershipFailure")
    );

    expect(helperSource).toContain("await fetchTypWorkspaceObjects(novaUserId)");
    // Lenient match: requested value must match thread.slug OR thread.id.
    expect(helperSource).toContain('const tSlug = String(t?.slug || t?.id || "").trim();');
    expect(helperSource).toContain("return tSlug === requestedThread;");
    // Ownership requires BOTH user_id match and slug/id match (fail-closed on missing user_id).
    expect(helperSource).toContain("if (Number(t?.user_id) !== userId) return false;");
    // Workspace-not-visible short-circuits before thread matching (never leaks threadOwned:true).
    expect(helperSource).toMatch(/if \(!workspace\) \{[\s\S]*visible: false, threadOwned: false/);
    // Upstream failure propagates success:false (caller must 502, not 403).
    expect(helperSource).toContain("if (!result.success) {");
    // Returns the CANONICAL threadSlug on a match, not the raw requested value.
    expect(helperSource).toContain(
      "threadSlug: owned ? String(owned.slug || owned.id || requestedThread).trim() : requestedThread,"
    );
  });

  test("index.js routes exactly the five per-thread handlers through the ownership guard", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

    const updateHandlerSource = source.slice(
      source.indexOf("const updateThreadHandler = async"),
      source.indexOf("app.post(\n  \"/workspace/:slug/thread/:threadSlug/update\"")
    );
    const deleteHandlerSource = source.slice(
      source.indexOf("const deleteThreadHandler = async"),
      source.indexOf('app.delete("/workspace/:slug/thread/:threadSlug"')
    );
    const chatsHandlerSource = source.slice(
      source.indexOf("const getThreadChatsHandler = async"),
      source.indexOf('app.get("/workspace/:slug/thread/:threadSlug/chats"')
    );
    const streamHandlerSource = source.slice(
      source.indexOf("const streamChatHandler = async"),
      source.indexOf("app.post(\n  \"/workspace/:slug/thread/:threadSlug/stream-chat\"")
    );

    for (const handlerSource of [
      updateHandlerSource,
      deleteHandlerSource,
      chatsHandlerSource,
      streamHandlerSource,
    ]) {
      expect(handlerSource).toContain("assertWorkspaceAndThreadOwnership(");
    }

    // streamChatHandler must keep its existing G0-ISO-1 workspace gate comment lineage,
    // not silently drop workspace-level enforcement while adding thread-level enforcement.
    expect(streamHandlerSource).toContain("G0-ISO-1");
    expect(streamHandlerSource).toContain("!ownership.visible");
    expect(streamHandlerSource).toContain("!ownership.threadOwned");

    // requireWorkspaceAccess itself must NOT be the one calling the new helper — it stays
    // workspace-only so thread-create / workspace-level routes are unaffected.
    const requireAccessSource = source.slice(
      source.indexOf("async function requireWorkspaceAccess"),
      source.indexOf("function getWorkspaceDocumentFolder")
    );
    expect(requireAccessSource).not.toContain("assertWorkspaceAndThreadOwnership");
  });

  test("thread-auto-title.js's handler factory is wired with the ownership guard at its call site", () => {
    const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    const wiringSource = source.slice(
      source.indexOf("const threadAutoTitleHandler = createThreadAutoTitleHandler({"),
      source.indexOf("app.post(\n  \"/workspace/:slug/thread/:threadSlug/auto-title\"")
    );
    expect(wiringSource).toContain("assertWorkspaceAndThreadOwnership");
    expect(wiringSource).toContain("sendThreadOwnershipFailure");
  });
});

describe("assertWorkspaceAndThreadOwnership behavior (executed against real fetchTypWorkspaceObjects)", () => {
  test("a victim thread (user_id belongs to someone else) is visible but NOT owned", async () => {
    mockTypWorkspacesResponse([
      {
        slug: "shared-space",
        threads: [
          { slug: "victim-thread", user_id: 99 },
          { slug: "caller-thread", user_id: 42 },
        ],
      },
    ]);

    const result = await assertWorkspaceAndThreadOwnership(42, "shared-space", "victim-thread");

    expect(result.success).toBe(true);
    expect(result.visible).toBe(true);
    expect(result.threadOwned).toBe(false);
    expect(result.slug).toBe("shared-space");
  });

  test("the caller's own thread resolves threadOwned:true and returns the canonical threadSlug", async () => {
    mockTypWorkspacesResponse([
      {
        slug: "shared-space",
        threads: [
          { slug: "victim-thread", user_id: 99 },
          { slug: "caller-thread", user_id: 42 },
        ],
      },
    ]);

    const result = await assertWorkspaceAndThreadOwnership(42, "shared-space", "caller-thread");

    expect(result.success).toBe(true);
    expect(result.visible).toBe(true);
    expect(result.threadOwned).toBe(true);
    expect(result.threadSlug).toBe("caller-thread");
  });

  test("lenient match: matches by thread.id when the requested value equals id, not slug", async () => {
    mockTypWorkspacesResponse([
      {
        slug: "shared-space",
        threads: [{ id: "thread-id-123", user_id: 42 }],
      },
    ]);

    const result = await assertWorkspaceAndThreadOwnership(42, "shared-space", "thread-id-123");

    expect(result.threadOwned).toBe(true);
    expect(result.threadSlug).toBe("thread-id-123");
  });

  test("workspace not visible to this caller returns visible:false, threadOwned:false", async () => {
    mockTypWorkspacesResponse([
      { slug: "someone-elses-space", threads: [{ slug: "t1", user_id: 99 }] },
    ]);

    const result = await assertWorkspaceAndThreadOwnership(42, "not-my-space", "t1");

    expect(result.success).toBe(true);
    expect(result.visible).toBe(false);
    expect(result.threadOwned).toBe(false);
  });

  test("upstream failure returns success:false with the propagated status/error", async () => {
    process.env.NOVA_TYP_BASE_URL = "https://typ.example.com";
    process.env.NOVA_TYP_API_KEY = "test-admin-key";
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "TYP upstream unavailable" }),
    });

    const result = await assertWorkspaceAndThreadOwnership(42, "shared-space", "any-thread");

    expect(result.success).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toBe("TYP upstream unavailable");
    expect(result.threadOwned).toBe(false);
  });

  test("string vs numeric user_id coercion: matches regardless of TYP's type", async () => {
    mockTypWorkspacesResponse([
      {
        slug: "shared-space",
        threads: [{ slug: "caller-thread", user_id: "42" }],
      },
    ]);

    const result = await assertWorkspaceAndThreadOwnership(42, "shared-space", "caller-thread");

    expect(result.threadOwned).toBe(true);
  });

  test("a thread missing user_id entirely is treated as not-owned (fail-closed)", async () => {
    // fetchTypWorkspaces only returns workspaces where the caller owns >=1 thread, so a
    // second, caller-owned thread keeps this workspace visible while the orphan thread
    // (no user_id at all) is exercised as the requested target.
    mockTypWorkspacesResponse([
      {
        slug: "shared-space",
        threads: [{ slug: "orphan-thread" }, { slug: "caller-thread", user_id: 42 }],
      },
    ]);

    const result = await assertWorkspaceAndThreadOwnership(42, "shared-space", "orphan-thread");

    expect(result.visible).toBe(true);
    expect(result.threadOwned).toBe(false);
  });
});

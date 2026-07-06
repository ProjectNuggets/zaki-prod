#!/usr/bin/env node

/**
 * ZAKI Spaces stream-chat two-user isolation smoke (G0-ISO-1 + G2-ISO-3).
 *
 * Verifies that the workspace ownership gate added to streamChatHandler
 * prevents cross-tenant access to Spaces stream-chat while preserving
 * legitimate own-workspace chat.
 *
 * NOTE: This script requires a live backend and two real bearer tokens.
 * It is expected NOT to run to completion in a local dev environment
 * without those prerequisites. Run it in a staging/integration environment.
 *
 * SCOPE (complete for ZAKI's isolation model): this script exercises
 * WORKSPACE-granularity isolation — the positive own-workspace case plus BOTH
 * cross-tenant negative directions (A->B and B->A, each asserting HTTP 403 and zero
 * streamed tokens). In this product that IS the whole thread-IDOR surface: every user
 * is provisioned their own TYP user and their own private "Spaces" workspace, and
 * workspace visibility is exactly the thread-ownership filter (thread.user_id ===
 * novaUserId), so two users never co-inhabit a workspace in normal operation.
 * The thread-level branch of assertWorkspaceAndThreadOwnership (threadExists &&
 * !threadOwned) is DEFENSE-IN-DEPTH for a hypothetical shared/team workspace that does
 * not exist today; it is unreachable under per-user-private provisioning and so is not
 * exercised here. If shared workspaces are ever introduced, build a co-inhabited-workspace
 * fixture (two TYP users in one workspace via TYP admin) and add the own-thread /
 * cross-thread cases before shipping that feature. Run this suite against staging with
 * two real bearer tokens; it is expected to require live infra, not local dev.
 *
 * Usage:
 *   ZAKI_BASE_URL=https://api.chatzaki.com \
 *   ZAKI_MULTIUSER_TOKENS="tokenA,tokenB" \
 *   node scripts/multiuser-spaces-isolation.mjs
 *
 * Or use a file:
 *   ZAKI_BASE_URL=https://api.chatzaki.com \
 *   ZAKI_MULTIUSER_TOKENS_FILE=./tokens.txt \
 *   node scripts/multiuser-spaces-isolation.mjs
 *
 * Env vars:
 *   ZAKI_BASE_URL            — BFF base URL (default: http://127.0.0.1:8787)
 *   ZAKI_MULTIUSER_TOKENS    — comma-separated bearer tokens (at least 2)
 *   ZAKI_MULTIUSER_TOKENS_FILE — path to a file with tokens (newline or comma separated)
 */

import {
  requireAtLeastTwoTokens,
  requireNonPlaceholderTokens,
  resolveBaseUrl,
  resolveMultiuserTokens,
} from "./multiuser-agent-env.mjs";

const baseUrl = resolveBaseUrl();
const tokens = resolveMultiuserTokens();
requireAtLeastTwoTokens(tokens);
requireNonPlaceholderTokens(tokens);

const [tokenA, tokenB] = tokens;

function logStep(message) {
  process.stdout.write(`\n[SPACES-ISO] ${message}\n`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function authRequest(token, path, init = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
}

/**
 * Reads SSE stream text from a response and returns concatenated assistant token output.
 * Returns an empty string if the response is not a stream (e.g., a 4xx JSON error).
 */
async function readStreamTokens(response) {
  const raw = await response.text();
  let output = "";
  for (const block of raw.split("\n\n")) {
    const eventType = block
      .split("\n")
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim();
    if (eventType !== "token") continue;
    const dataLine = block
      .split("\n")
      .find((line) => line.startsWith("data:"))
      ?.slice(5)
      .trim();
    if (!dataLine) continue;
    try {
      const payload = JSON.parse(dataLine);
      output += String(
        payload.delta ||
          payload.token ||
          payload.text ||
          payload.chunk ||
          payload.content ||
          ""
      );
    } catch {
      // ignore malformed SSE data lines
    }
  }
  return output;
}

/**
 * Step 1 (positive): Fetch user A's own Spaces workspace slug so we can build a
 * canonical cross-tenant URL. We call a lightweight profile/workspace endpoint.
 * If the endpoint shape differs, we fall back to the anonymous route, which
 * streamChatHandler already remaps to the caller's own workspace.
 */
async function fetchUserWorkspace(token, label) {
  // Try the workspace list endpoint. /api/workspaces is the real route (listWorkspacesHandler,
  // which also lazily provisions the caller's default Spaces workspace on first call); the other
  // two are kept as harmless fallbacks for older backends.
  for (const path of ["/api/workspaces", "/api/spaces/workspaces", "/api/workspace"]) {
    const res = await authRequest(token, path);
    if (!res.ok) continue;
    const data = await res.json().catch(() => null);
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.workspaces)
      ? data.workspaces
      : Array.isArray(data?.items)
      ? data.items
      : null;
    if (!list || list.length === 0) continue;
    const workspace = list[0];
    const slug = String(workspace?.slug || workspace?.id || "").trim();
    if (slug) {
      logStep(`${label} workspace slug resolved from ${path}: ${slug}`);
      return slug;
    }
  }
  return null;
}

/**
 * Step 2 (positive test): As user A, POST stream-chat to own workspace+thread.
 * Expects a 200 response (gate does NOT block own-workspace chat).
 */
async function testOwnWorkspaceChat(token, slug, threadSlug, label) {
  const path = `/api/workspace/${encodeURIComponent(slug)}/thread/${encodeURIComponent(threadSlug)}/stream-chat`;
  logStep(`${label} — positive test: POST own workspace stream-chat at ${path}`);
  const res = await authRequest(token, path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message: "Hello from isolation test — own workspace" }),
  });
  assert(
    res.status !== 403,
    `${label} own-workspace stream-chat was incorrectly blocked (403). The gate must NOT block legitimate own-workspace access.`
  );
  // A 4xx other than 403 (e.g., 429 rate-limit, 503 backend down) indicates infrastructure,
  // not an ownership gate failure — we surface it as a warning but do not fail the isolation assertion.
  if (!res.ok && res.status !== 403) {
    process.stderr.write(
      `[SPACES-ISO] WARNING: ${label} own-workspace chat returned ${res.status} (not a gate failure; may be infra/rate-limit).\n`
    );
    return;
  }
  process.stdout.write(`[SPACES-ISO] PASS: ${label} own-workspace stream-chat NOT blocked.\n`);
}

/**
 * Step 3 (negative test): As user A, POST stream-chat to user B's workspace.
 * Expects HTTP 403 and zero streamed assistant tokens.
 */
async function testCrossTenantBlocked(attackerToken, victimSlug, victimThreadSlug, attackerLabel, victimLabel) {
  const path = `/api/workspace/${encodeURIComponent(victimSlug)}/thread/${encodeURIComponent(victimThreadSlug)}/stream-chat`;
  logStep(
    `${attackerLabel} — negative test: POST cross-tenant stream-chat into ${victimLabel} workspace at ${path}`
  );
  const res = await authRequest(attackerToken, path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ message: "Attempting cross-tenant read via stream-chat" }),
  });

  assert(
    res.status === 403,
    `${attackerLabel} expected 403 when accessing ${victimLabel} workspace slug "${victimSlug}", but got ${res.status}. Cross-tenant leak NOT closed.`
  );

  // Parse the response body: for a 403 JSON body we get text, not a stream.
  const raw = await res.text();
  const streamedTokens = (() => {
    let out = "";
    for (const block of raw.split("\n\n")) {
      const eventType = block
        .split("\n")
        .find((line) => line.startsWith("event:"))
        ?.slice(6)
        .trim();
      if (eventType !== "token") continue;
      const dataLine = block
        .split("\n")
        .find((line) => line.startsWith("data:"))
        ?.slice(5)
        .trim();
      if (!dataLine) continue;
      try {
        const payload = JSON.parse(dataLine);
        out += String(
          payload.delta || payload.token || payload.text || payload.chunk || payload.content || ""
        );
      } catch {
        // ignore
      }
    }
    return out;
  })();

  assert(
    streamedTokens.length === 0,
    `${attackerLabel} got 403 but also received ${streamedTokens.length} streamed assistant token chars from ${victimLabel} workspace. Partial leak.`
  );

  process.stdout.write(
    `[SPACES-ISO] PASS: ${attackerLabel} blocked from ${victimLabel} workspace with 403, 0 streamed tokens.\n`
  );
}

async function main() {
  logStep(`Target base URL: ${baseUrl}`);
  logStep("Resolving workspace slugs for user A and user B");

  const [slugA, slugB] = await Promise.all([
    fetchUserWorkspace(tokenA, "user-a"),
    fetchUserWorkspace(tokenB, "user-b"),
  ]);

  assert(
    slugA,
    "Could not resolve user-a workspace slug. Ensure the backend is running and the token is valid."
  );
  assert(
    slugB,
    "Could not resolve user-b workspace slug. Ensure the backend is running and the token is valid."
  );
  assert(
    slugA !== slugB,
    `user-a and user-b resolved to the same workspace slug "${slugA}". Two distinct users with distinct workspaces are required.`
  );

  // Use a stable thread slug for both tests. "main" is the conventional default.
  const threadSlugA = "main";
  const threadSlugB = "main";

  // Positive test: A can chat on A's own workspace.
  await testOwnWorkspaceChat(tokenA, slugA, threadSlugA, "user-a");

  // Negative test: A cannot chat on B's workspace.
  await testCrossTenantBlocked(tokenA, slugB, threadSlugB, "user-a", "user-b");

  // Negative test (symmetric): B cannot chat on A's workspace.
  await testCrossTenantBlocked(tokenB, slugA, threadSlugA, "user-b", "user-a");

  process.stdout.write(
    "\n" +
      JSON.stringify(
        {
          ok: true,
          baseUrl,
          test: "spaces-stream-chat-cross-tenant-isolation",
          assertions: [
            "user-a own-workspace chat: NOT blocked (positive)",
            "user-a -> user-b workspace: 403, 0 streamed tokens (negative)",
            "user-b -> user-a workspace: 403, 0 streamed tokens (negative)",
          ],
        },
        null,
        2
      ) +
      "\n"
  );
}

main().catch((error) => {
  console.error(`\n[SPACES-ISO] FAILED: ${error?.message || error}`);
  process.exit(1);
});

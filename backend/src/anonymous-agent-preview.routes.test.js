import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * WP-F validation (e) — no tool/side-effect execution is reachable unauthenticated.
 *
 * The unit tests in anonymous-agent-preview.test.js prove the PREVIEW handler cannot execute
 * (it holds no executor and declares no tools). This file proves the other half: that opening
 * /agent to anonymous visitors did not open anything else with it.
 *
 * The executable Agent surface is the /api/agent/* family — those routes proxy to the agent
 * engine, where the tools, the browser, the shell and memory live. Every single one of them
 * must sit behind an auth gate. This is a source-level invariant test on purpose: it fails CI
 * the moment someone adds an unguarded agent route, which is exactly the mistake that would
 * quietly hand an anonymous visitor a tool loop.
 */

const INDEX = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "index.js"),
  "utf8"
);

/**
 * Every app.<verb>("/path", ...middleware, handler) registration in the BFF.
 *
 * The middleware chain is extracted by BALANCING PARENTHESES, not by a lazy regex. A regex like
 * /app\.post\("..."([\s\S]*?)\n\);/ looks fine and is quietly wrong: it runs past the end of a
 * registration into the NEXT one, so an unguarded route can inherit a `requireAgentContext` that
 * belongs to a later route and the invariant below passes when it should fail. An assertion that
 * can false-pass is worse than no assertion, so the chain is delimited exactly.
 */
function collectRoutes() {
  const routes = [];
  const opener = /app\.(get|post|put|patch|delete|options)\(/g;
  let match;

  while ((match = opener.exec(INDEX))) {
    const verb = match[1];
    const start = opener.lastIndex; // first char inside the opening paren
    let depth = 1;
    let i = start;
    // Walk forward to the paren that closes THIS call.
    for (; i < INDEX.length && depth > 0; i += 1) {
      const ch = INDEX[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
    }
    const body = INDEX.slice(start, i - 1);
    const routeMatch = body.match(/^\s*["']([^"']+)["']/);
    if (!routeMatch) continue; // not a literal-path registration

    routes.push({
      verb: verb.toUpperCase(),
      route: routeMatch[1],
      // Everything after the path literal: the middleware chain + handler for THIS route only.
      chain: body.slice(routeMatch[0].length),
    });
  }
  return routes;
}

// Every gate in the BFF that establishes an authenticated principal before the handler runs.
// requireLearningContext is included because the Learning spoke's `/api/learning/tutor-agents/*`
// routes are agent-SHAPED by name but are a different, separately-gated surface.
const AUTH_GATE =
  /requireAgentContext|requireAuthUser|requireAdmin|requireLearningContext|requireHireContext/;

/**
 * The Agent-surface routes that are deliberately reachable without an account.
 *
 * This is an allowlist, not a filter: the invariant below is deny-by-default, so a NEW
 * unauthenticated agent route fails CI until someone adds it here and justifies it. That is the
 * point — the decision to expose something to anonymous traffic should be a conscious edit to
 * this list, never a silent side effect of a route registration.
 *
 *   /api/anonymous/agent/preview   WP-F. The plan preview. Declares no tools, holds no executor,
 *                                  writes nothing, and is metered on the anon daily counter.
 *   /api/agent/share/{artifact,trace}/:shareCode
 *                                  Pre-existing public SHARE links. Read-only by construction:
 *                                  proxyNullclawPublicRequest is hardcoded to method "GET" and
 *                                  fetches one artifact by unguessable code. Reading a shared
 *                                  artifact is not running an agent.
 */
const INTENTIONALLY_ANONYMOUS = [
  "/api/anonymous/agent/preview",
  "/api/agent/share/artifact/:shareCode",
  "/api/agent/share/trace/:shareCode",
];

describe("WP-F — the executable Agent surface stays authenticated", () => {
  const routes = collectRoutes();

  it("finds the agent routes at all (the scan is not silently matching nothing)", () => {
    const agentRoutes = routes.filter((r) => r.route.startsWith("/api/agent"));
    // Sanity floor: if this scan ever collapses to zero, the invariant below is vacuous.
    expect(agentRoutes.length).toBeGreaterThan(50);
  });

  // The Agent surface proper: /api/agent/* (the engine) and /api/anonymous/agent/* (the preview).
  // Deliberately NOT a loose /agent/i match — that also catches Learning's `tutor-agents` routes,
  // which are a different spoke behind their own gate.
  const isAgentSurface = (route) =>
    route.startsWith("/api/agent") || route.startsWith("/api/anonymous/agent");

  it("EVERY executable /api/agent/* route requires auth — none is anonymously reachable", () => {
    const unguarded = routes
      // CORS preflight carries no credentials and executes nothing.
      .filter((r) => r.verb !== "OPTIONS")
      .filter((r) => isAgentSurface(r.route))
      .filter((r) => !AUTH_GATE.test(r.chain))
      .filter((r) => !INTENTIONALLY_ANONYMOUS.includes(r.route))
      .map((r) => `${r.verb} ${r.route}`);

    // Deny by default: anything unauthenticated on the agent surface that is not on the
    // justified allowlist is a hole, and this is where it gets caught.
    expect(unguarded).toEqual([]);
  });

  it("the ONLY unauthenticated agent-surface routes are the justified ones", () => {
    const unauthenticated = routes
      .filter((r) => r.verb !== "OPTIONS")
      .filter((r) => isAgentSurface(r.route))
      .filter((r) => !AUTH_GATE.test(r.chain))
      .map((r) => r.route)
      .sort();

    expect(unauthenticated).toEqual([...INTENTIONALLY_ANONYMOUS].sort());
  });

  // WP-F added exactly ONE anonymous route. The public share links predate it and are read-only.
  it("WP-F's preview is the only anonymous route that reaches a model at all", () => {
    const shareRoutes = INTENTIONALLY_ANONYMOUS.filter((r) => r.includes("/share/"));
    // The share routes proxy read-only GETs; they never run a model or a tool.
    expect(shareRoutes).toHaveLength(2);
    expect(INTENTIONALLY_ANONYMOUS).toContain("/api/anonymous/agent/preview");
  });

  it("the anonymous preview route is wired to the preview handler, not the agent engine", () => {
    const registration = INDEX.match(
      /app\.post\(\s*\n?\s*["']\/api\/anonymous\/agent\/preview["']([\s\S]*?)\n\);/
    );
    expect(registration).toBeTruthy();
    const chain = registration[1];

    // It runs the bounded preview handler...
    expect(chain).toMatch(/anonymousAgentPreviewHandler/);
    // ...behind the anonymous turn rate limiter...
    expect(chain).toMatch(/anonymousTurnRateLimiter/);
    // ...and it is NOT the agent chat stream handler (the one that reaches the engine).
    expect(chain).not.toMatch(/agentChatStreamHandler/);
    expect(chain).not.toMatch(/requireAgentContext/);
  });

  it("the preview's plan generator never sends tools to the provider", () => {
    const generator = INDEX.match(
      /async function generateAnonymousAgentPlanText\([\s\S]*?\n\}/
    );
    expect(generator).toBeTruthy();
    const body = generator[0];

    // It builds its request through the tool-less builder...
    expect(body).toMatch(/buildAnonymousAgentPlanRequestBody/);
    // ...and never hand-rolls a tools/functions payload of its own.
    expect(body).not.toMatch(/tools\s*:/);
    expect(body).not.toMatch(/tool_choice/);
    expect(body).not.toMatch(/functions\s*:/);
    // ...and never reaches the agent engine.
    expect(body).not.toMatch(/nullclaw|NULLCLAW/);
  });
});

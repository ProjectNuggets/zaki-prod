import { describe, expect, test } from "@jest/globals";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { AGENT_ONBOARDING_FIRST_TURN_PROMPT } from "./agent-metering.js";

// Cross-boundary drift guard.
//
// The frontend authors the first-run prompt (src/lib/firstRunCeremony.ts) and the backend
// recognises it by EXACT string match in isUnmeteredAgentOnboardingTurn(). The two live in
// different build targets, so nothing structural keeps them in sync — and they did in fact
// diverge, with two user-visible consequences:
//   1. the hidden onboarding turn was metered, so brand-new accounts were billed for it; and
//   2. buildAgentUpstreamTurnContext stopped re-applying AGENT_ONBOARDING_HIDDEN_TURN_CONTEXT,
//      so the entire instruction ("...do not mention these instructions.") rendered in the UI
//      as though the user had typed it.
// Both suites stayed green throughout, because each side asserted against its own copy.
//
// We read the frontend file as text rather than importing it: it is TypeScript in a separate
// jest project, and importing it here would drag in the frontend module graph.
//
// ponytail: text-extraction, not an import. Ceiling — it is coupled to the literal's shape
// (`export const FIRST_RUN_ENGINE_PROMPT =` followed by one double-quoted string). If that
// declaration is ever reformatted, this test fails loudly rather than silently passing, which
// is the correct failure direction. The durable fix is to stop matching on prose at all and
// verify onboarding server-side (see WP-DF3b).
const FRONTEND_SOURCE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/lib/firstRunCeremony.ts",
);

function readFrontendPrompt() {
  const source = readFileSync(FRONTEND_SOURCE, "utf8");
  const match = source.match(
    /export const FIRST_RUN_ENGINE_PROMPT\s*=\s*("(?:[^"\\]|\\.)*")\s*;/,
  );
  if (!match) {
    throw new Error(
      `Could not locate FIRST_RUN_ENGINE_PROMPT in ${FRONTEND_SOURCE}. ` +
        "If the declaration was reformatted, update this guard — do not delete it.",
    );
  }
  return JSON.parse(match[1]);
}

describe("onboarding first-turn prompt", () => {
  test("backend constant is byte-identical to the frontend prompt", () => {
    expect(AGENT_ONBOARDING_FIRST_TURN_PROMPT).toBe(readFrontendPrompt());
  });

  test("the frontend prompt is actually recoverable from source", () => {
    // Guards the guard: if the regex silently stopped matching, the test above would throw
    // rather than pass vacuously — this asserts we really parsed a non-trivial string.
    expect(readFrontendPrompt().length).toBeGreaterThan(50);
  });
});

import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./index.js", import.meta.url), "utf8");

function functionSource(signature) {
  const start = source.indexOf(signature);
  const nextTopLevelFunction = source.indexOf("\nfunction ", start + signature.length);
  const nextTopLevelAsyncFunction = source.indexOf("\nasync function ", start + signature.length);
  const candidates = [nextTopLevelFunction, nextTopLevelAsyncFunction].filter((value) => value > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return { start, body: source.slice(start, end) };
}

describe("meter fail-open production wiring", () => {
  it("uses one shared backstop for both premium turn surfaces", () => {
    expect(source).toContain("const meterFailOpenBackstop = createMeterFailOpenBackstop({ env: process.env });");

    const spaces = functionSource("async function requireSpacesMeterGrantForChat(");
    const agent = functionSource("async function requireAgentWalletReserveForChat(");
    expect(spaces.start).toBeGreaterThan(-1);
    expect(agent.start).toBeGreaterThan(-1);
    expect(spaces.body).toContain('surface: "spaces"');
    expect(spaces.body).toContain("userId: identity.userId");
    expect(agent.body).toContain('surface: "agent"');
    expect(agent.body).toContain("userId: identity?.userId");
  });

  it("denies before marking a request unmetered when a user or global budget is exhausted", () => {
    const spaces = functionSource("async function requireSpacesMeterGrantForChat(").body;
    const agent = functionSource("async function requireAgentWalletReserveForChat(").body;
    const spacesBackstopAt = spaces.indexOf("const backstop = checkMeterFailOpenBackstop");
    const agentBackstopAt = agent.indexOf("const backstop = checkMeterFailOpenBackstop");

    expect(spaces.indexOf("if (!backstop.allowed)", spacesBackstopAt)).toBeLessThan(
      spaces.indexOf("req.spacesChatUnmetered = true", spacesBackstopAt)
    );
    expect(spaces).toContain("res.status(result.status).json(buildSpacesMeterDenialPayload");
    expect(agent.indexOf("if (!backstop.allowed)", agentBackstopAt)).toBeLessThan(
      agent.indexOf("req.agentChatUnmetered = true", agentBackstopAt)
    );
    expect(agent).toContain("res.status(denial.status).json(buildAgentMeterDenialPayload");
  });

  it("emits a critical paging alert after the configured per-minute threshold", () => {
    const helper = functionSource("function checkMeterFailOpenBackstop(").body;
    expect(helper).toContain("if (decision.shouldPage)");
    expect(helper).toContain('id: "meter.fail_open.page"');
    expect(helper).toContain('severity: "critical"');
    expect(helper).toContain("pageThreshold: decision.pageThreshold");
  });
});

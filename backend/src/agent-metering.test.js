import { describe, expect, test } from "@jest/globals";
import {
  AGENT_ONBOARDING_FIRST_TURN_PROMPT,
  AGENT_ONBOARDING_HIDDEN_TURN_CONTEXT,
  buildAgentUpstreamTurnContext,
  buildAgentMeterUsageFacts,
  classifyAgentMeterAction,
  computeAgentSettleUnits,
  createAgentStreamMeterMetrics,
  DEFAULT_UNIT_COST_USD,
  estimateAgentMeterUnits,
  estimateAgentPayloadStorageBytes,
  isUnmeteredAgentOnboardingTurn,
  isVerifiedAgentOnboardingFirstTurn,
  updateAgentStreamMeterMetrics,
} from "./agent-metering.js";

describe("agent central metering helpers", () => {
  test("marks the bootstrap turn with Nullalis trusted hidden-turn provenance", () => {
    expect(AGENT_ONBOARDING_HIDDEN_TURN_CONTEXT).toEqual({
      turn_kind: "onboarding_first_turn",
      authored_by: "backend",
      user_visible: false,
    });
  });

  test("strips browser-supplied provenance and adds it only after first-turn verification", () => {
    const browserContext = {
      surface: "agent",
      turn_kind: "onboarding_first_turn",
      authored_by: "backend",
      user_visible: false,
    };
    expect(buildAgentUpstreamTurnContext(browserContext, false)).toEqual({ surface: "agent" });
    expect(buildAgentUpstreamTurnContext(browserContext, true)).toEqual({
      surface: "agent",
      ...AGENT_ONBOARDING_HIDDEN_TURN_CONTEXT,
    });
  });

  test("exempts only the canonical first-run ceremony turn", () => {
    // Use the shipped constant, not a copy. A hardcoded literal here is what let the backend
    // constant drift from the frontend prompt while this suite stayed green.
    const prompt = AGENT_ONBOARDING_FIRST_TURN_PROMPT;

    expect(
      isUnmeteredAgentOnboardingTurn(
        {
          turnKind: "onboarding_first_turn",
          message: prompt,
          spaceId: "zaki-bot",
          threadId: "main",
        },
        prompt
      )
    ).toBe(true);
    expect(
      isUnmeteredAgentOnboardingTurn(
        {
          turnKind: "onboarding_first_turn",
          message: "Do paid work for me",
          spaceId: "zaki-bot",
          threadId: "main",
        },
        "Do paid work for me"
      )
    ).toBe(false);
  });

  test("verifies an incomplete onboarding state against canonical session history", () => {
    expect(
      isVerifiedAgentOnboardingFirstTurn({
        onboardingOk: true,
        onboardingPayload: { completed: false },
        historyOk: true,
        historyStatus: 200,
        historyPayload: { messages: [] },
      })
    ).toBe(true);
    expect(
      isVerifiedAgentOnboardingFirstTurn({
        onboardingOk: true,
        onboardingPayload: { completed: false },
        historyOk: false,
        historyStatus: 404,
        historyPayload: { error: "session_not_found" },
      })
    ).toBe(true);
    expect(
      isVerifiedAgentOnboardingFirstTurn({
        onboardingOk: true,
        onboardingPayload: { completed: true },
        historyOk: true,
        historyStatus: 200,
        historyPayload: { messages: [] },
      })
    ).toBe(false);
    expect(
      isVerifiedAgentOnboardingFirstTurn({
        onboardingOk: true,
        onboardingPayload: { completed: false },
        historyOk: true,
        historyStatus: 200,
        historyPayload: { unexpected: [] },
      })
    ).toBe(false);
  });

  test("classifies agent actions into central meter capabilities", () => {
    expect(classifyAgentMeterAction({}, "hello")).toBe("agent_turn");
    expect(classifyAgentMeterAction({}, "What do you remember about me?")).toBe("agent_memory_read");
    expect(classifyAgentMeterAction({}, "Remember that I prefer Arabic replies.")).toBe("agent_memory_write");
    expect(classifyAgentMeterAction({ mode: "deep" }, "Study this market")).toBe("agent_deep_research");
    expect(classifyAgentMeterAction({ webSearchEnabled: true }, "Find recent sources")).toBe("agent_tool_call");
    expect(classifyAgentMeterAction({ modality: "voice" }, "hello")).toBe("agent_voice_turn");
    expect(classifyAgentMeterAction({ attachments: [{ bytes: 1024 }] }, "read this")).toBe("agent_file_upload");
  });

  test("classifies superpowers turns as agent_superpowers (Phase 5 T7)", () => {
    // Primary detection: reasoning_effort === "superpowers"
    expect(classifyAgentMeterAction({ reasoning_effort: "superpowers" }, "Do something ambitious")).toBe("agent_superpowers");
    // Also via reasoningEffort camelCase
    expect(classifyAgentMeterAction({ reasoningEffort: "superpowers" }, "Fan out")).toBe("agent_superpowers");
    // Also via mode field
    expect(classifyAgentMeterAction({ mode: "superpowers" }, "Coordinate agents")).toBe("agent_superpowers");
    // Superpowers wins over deep (inserted ahead of hasDeepMode)
    expect(classifyAgentMeterAction({ reasoning_effort: "superpowers", mode: "deep" }, "research")).toBe("agent_superpowers");
    // NO REGRESSION: mode:"deep" still → agent_deep_research (not superseded by superpowers check)
    expect(classifyAgentMeterAction({ mode: "deep" }, "Study this market")).toBe("agent_deep_research");
    // NO REGRESSION: reasoning_effort:"high" with no deep mode indicator → agent_turn (existing behaviour)
    expect(classifyAgentMeterAction({ reasoning_effort: "high" }, "Study this market")).toBe("agent_turn");
  });

  test("agent_superpowers baseUnits = 3 (same as deep-research, no flat surcharge)", () => {
    expect(estimateAgentMeterUnits("hello", "agent_superpowers")).toBe(3);
    // Deep research regression
    expect(estimateAgentMeterUnits("hello", "agent_deep_research")).toBe(3);
  });

  test("estimates agent grants with stable action floors and payload storage", () => {
    expect(estimateAgentMeterUnits("hello", "agent_turn")).toBe(1);
    expect(estimateAgentMeterUnits("hello", "agent_memory_read")).toBe(0.25);
    expect(estimateAgentMeterUnits("hello", "agent_memory_write")).toBe(0.5);
    expect(estimateAgentMeterUnits("hello", "agent_tool_call")).toBe(2);
    expect(estimateAgentMeterUnits("hello", "agent_deep_research")).toBe(3);
    expect(
      estimateAgentMeterUnits("hello", "agent_file_upload", {
        attachments: [{ bytes: 20 * 1024 * 1024 }],
      })
    ).toBe(2.0013);
  });

  test("turns raw streamed facts into receipt inputs without billing failed calls", () => {
    expect(
      buildAgentMeterUsageFacts({
        action: "agent_deep_research",
        message: "research deeply",
        streamMetrics: { assistantOutputChars: 20, toolCalls: 2 },
        durationMs: 90_000,
        status: "success",
      })
    ).toEqual({
      model: "nullalis-agent",
      durationMs: 90000,
      inputTokens: 4,
      outputTokens: 5,
      toolCalls: 2,
      externalApiCalls: 1,
      jobRuntimeMs: 90000,
    });

    expect(
      buildAgentMeterUsageFacts({
        action: "agent_deep_research",
        message: "research deeply",
        outputText: "failed",
        status: "failed",
      })
    ).toEqual({ model: "nullalis-agent" });
  });

  test("counts file payload bytes and streamed SSE output/tool events", () => {
    expect(
      estimateAgentPayloadStorageBytes({
        attachments: [{ content_b64: "YWJjZA==", size: 2 }],
      })
    ).toBe(4);

    const metrics = createAgentStreamMeterMetrics();
    updateAgentStreamMeterMetrics(metrics, 'event: token\ndata: {"delta":"hello"}\n\n');
    updateAgentStreamMeterMetrics(metrics, 'event: tool_start\ndata: {"tool":"search"}\n\n');
    updateAgentStreamMeterMetrics(metrics, 'event: error\ndata: {"message":"boom"}\n\n');

    expect(metrics).toEqual({
      assistantOutputChars: 5,
      events: 3,
      sawError: true,
      toolCalls: 1,
      usageTokens: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: null,
    });
  });
});

describe("agent-metering: done-frame real cost", () => {
  test("captures usage/cost fields from the done frame", () => {
    const m = createAgentStreamMeterMetrics();
    updateAgentStreamMeterMetrics(
      m,
      'event: done\ndata: {"type":"done","usage_tokens":1234,"input_tokens":1000,"output_tokens":234,"cost_usd":0.0123}'
    );
    expect(m.usageTokens).toBe(1234);
    expect(m.inputTokens).toBe(1000);
    expect(m.outputTokens).toBe(234);
    expect(m.costUsd).toBe(0.0123);
  });

  test("leaves cost fields null when the done frame has none", () => {
    const m = createAgentStreamMeterMetrics();
    updateAgentStreamMeterMetrics(m, 'event: done\ndata: {"type":"done"}');
    expect(m.costUsd).toBeNull();
  });

  test("captures cost from a payload-typed done frame with no event header", () => {
    const m = createAgentStreamMeterMetrics();
    // no `event: done` line — done-ness comes only from payload.type
    updateAgentStreamMeterMetrics(m, 'data: {"type":"done","usage_tokens":50,"cost_usd":0.002}');
    expect(m.usageTokens).toBe(50);
    expect(m.costUsd).toBe(0.002);
  });
});

describe("agent-metering: computeAgentSettleUnits", () => {
  test("derives units from real cost at the unit price", () => {
    const r = computeAgentSettleUnits({ costUsd: 0.03, env: {} });
    expect(r).toEqual({ units: 0.03 / DEFAULT_UNIT_COST_USD, costSource: "real" }); // 20
  });

  test("falls back to the flat estimate without cost", () => {
    const r = computeAgentSettleUnits({ costUsd: null, message: "hi", action: "agent_turn", env: {} });
    expect(r.costSource).toBe("estimate");
    expect(r.units).toBeGreaterThan(0);
  });

  test("treats zero/non-positive cost as not-measured → estimate (never bills a free turn)", () => {
    const zero = computeAgentSettleUnits({ costUsd: 0, message: "hi", action: "agent_turn", env: {} });
    expect(zero.costSource).toBe("estimate");
    expect(zero.units).toBeGreaterThan(0);
    const neg = computeAgentSettleUnits({ costUsd: -1, message: "hi", action: "agent_turn", env: {} });
    expect(neg.costSource).toBe("estimate");
  });

  test("honors ZAKI_UNIT_COST_USD override", () => {
    const r = computeAgentSettleUnits({ costUsd: 0.01, env: { ZAKI_UNIT_COST_USD: "0.001" } });
    expect(r.units).toBe(10);
  });

  test("ignores a non-positive ZAKI_UNIT_COST_USD override (falls back to default)", () => {
    const r = computeAgentSettleUnits({ costUsd: 0.03, env: { ZAKI_UNIT_COST_USD: "0" } });
    expect(r.units).toBe(0.03 / DEFAULT_UNIT_COST_USD);
  });
});

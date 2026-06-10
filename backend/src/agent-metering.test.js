import { describe, expect, test } from "@jest/globals";
import {
  buildAgentMeterUsageFacts,
  classifyAgentMeterAction,
  computeAgentSettleUnits,
  createAgentStreamMeterMetrics,
  estimateAgentMeterUnits,
  estimateAgentPayloadStorageBytes,
  updateAgentStreamMeterMetrics,
} from "./agent-metering.js";

describe("agent central metering helpers", () => {
  test("classifies agent actions into central meter capabilities", () => {
    expect(classifyAgentMeterAction({}, "hello")).toBe("agent_turn");
    expect(classifyAgentMeterAction({}, "What do you remember about me?")).toBe("agent_memory_read");
    expect(classifyAgentMeterAction({}, "Remember that I prefer Arabic replies.")).toBe("agent_memory_write");
    expect(classifyAgentMeterAction({ mode: "deep" }, "Study this market")).toBe("agent_deep_research");
    expect(classifyAgentMeterAction({ webSearchEnabled: true }, "Find recent sources")).toBe("agent_tool_call");
    expect(classifyAgentMeterAction({ modality: "voice" }, "hello")).toBe("agent_voice_turn");
    expect(classifyAgentMeterAction({ attachments: [{ bytes: 1024 }] }, "read this")).toBe("agent_file_upload");
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
});

describe("agent-metering: computeAgentSettleUnits", () => {
  test("derives units from real cost at the unit price", () => {
    const r = computeAgentSettleUnits({ costUsd: 0.03, env: {} });
    expect(r).toEqual({ units: 40, costSource: "real" }); // 0.03 / 0.00075
  });

  test("falls back to the flat estimate without cost", () => {
    const r = computeAgentSettleUnits({ costUsd: null, message: "hi", action: "agent_turn", env: {} });
    expect(r.costSource).toBe("estimate");
    expect(r.units).toBeGreaterThan(0);
  });

  test("honors ZAKI_UNIT_COST_USD override", () => {
    const r = computeAgentSettleUnits({ costUsd: 0.01, env: { ZAKI_UNIT_COST_USD: "0.001" } });
    expect(r.units).toBe(10);
  });
});

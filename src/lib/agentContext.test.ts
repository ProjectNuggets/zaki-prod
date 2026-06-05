import { describe, expect, it } from "@jest/globals";
import {
  buildAgentContextGauge,
  resolveRuntimeContextPressurePercent,
} from "./agentContext";

describe("agentContext", () => {
  it("uses explicit backend pressure and surfaces provider diagnostics", () => {
    const gauge = buildAgentContextGauge({
      active: true,
      live: true,
      pressure_percent: 21.25,
      token_estimate: 55_706,
      context_window_tokens: 262_144,
      pressure_token_source: "provider_last_usage",
      local_token_estimate: 48_000,
      provider_prompt_tokens: 55_706,
      provider_cached_prompt_tokens: 53_248,
    });

    expect(gauge).toMatchObject({
      pressurePercent: 21.25,
      tokenCount: 55_706,
      contextMax: 262_144,
      pressureTokenSource: "provider_last_usage",
      localTokenEstimate: 48_000,
      providerPromptTokens: 55_706,
      providerCachedPromptTokens: 53_248,
    });
  });

  it("does not calculate pressure from provider or local token counts", () => {
    const payload = {
      active: true,
      live: true,
      token_estimate: 55_706,
      context_window_tokens: 262_144,
      local_token_estimate: 48_000,
      provider_prompt_tokens: 55_706,
      provider_cached_prompt_tokens: 53_248,
      pressure_token_source: "provider_last_usage",
    };

    const gauge = buildAgentContextGauge(payload);

    expect(gauge).toMatchObject({
      pressurePercent: null,
      providerPromptTokens: 55_706,
      providerCachedPromptTokens: 53_248,
    });
    expect(resolveRuntimeContextPressurePercent(payload)).toBeNull();
  });

  it("rejects unavailable context even when diagnostics are present", () => {
    expect(
      buildAgentContextGauge({
        active: false,
        live: false,
        code: "session_manager_unavailable",
        pressure_percent: 42,
        provider_prompt_tokens: 55_706,
      })
    ).toBeNull();
  });

  it("lets nested reports override top-level legacy values", () => {
    const gauge = buildAgentContextGauge({
      pressure_percent: 99,
      token_estimate: 999_999,
      report: {
        pressure_percent: 8,
        token_estimate: 8_000,
        context_window_tokens: 100_000,
        pressure_token_source: "provider_preflight",
        provider_prompt_tokens: 8_000,
      },
    });

    expect(gauge).toMatchObject({
      pressurePercent: 8,
      tokenCount: 8_000,
      pressureTokenSource: "provider_preflight",
      providerPromptTokens: 8_000,
    });
  });
});

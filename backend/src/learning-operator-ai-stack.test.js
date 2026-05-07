import { describe, expect, test } from "@jest/globals";
import {
  normalizeLearningOperatorTestResult,
  redactLearningOperatorPayload,
} from "./learning-operator-ai-stack.js";

describe("learning operator AI stack", () => {
  test("redacts secret-looking fields and strings from operator payloads", () => {
    expect(
      redactLearningOperatorPayload({
        message: "failed with Authorization: Bearer sk-secret123456789",
        api_key: "tog-secret123456789",
        nested: {
          url: "https://example.test?q=1&api_key=secret-value",
          keep: "visible",
        },
      })
    ).toEqual({
      message: "failed with Authorization: [redacted]",
      api_key: "[redacted]",
      nested: {
        url: "https://example.test?q=1&api_key=[redacted]",
        keep: "visible",
      },
    });
  });

  test("normalizes upstream service test responses", () => {
    expect(
      normalizeLearningOperatorTestResult({
        service: "llm",
        upstreamStatus: 200,
        payload: {
          success: true,
          message: "LLM connection successful",
          model: "moonshotai/Kimi-K2.5",
          response_time_ms: 123.45,
        },
      })
    ).toEqual({
      service: "llm",
      ok: true,
      upstreamStatus: 200,
      success: true,
      message: "LLM connection successful",
      model: "moonshotai/Kimi-K2.5",
      responseTimeMs: 123.45,
      error: null,
    });
  });
});

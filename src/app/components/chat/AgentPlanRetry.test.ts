import { describe, expect, it } from "@jest/globals";
import type { TFunction } from "i18next";
import { buildAgentPlanRetryPrompt } from "./AgentPlanRetry";

describe("buildAgentPlanRetryPrompt", () => {
  it("identifies the selected step and treats its title as untrusted display text", () => {
    const t = ((key: string, options?: Record<string, unknown>) => {
      if (key === "zakiAgent.planPanel.retryPromptTool") {
        return ` using tool ${String(options?.tool)}`;
      }
      if (key === "zakiAgent.planPanel.retryPrompt") {
        return [
          `step=${String(options?.index)}`,
          `tool=${String(options?.toolContext)}`,
          `label=${String(options?.titleLiteral)}`,
        ].join(" | ");
      }
      return key;
    }) as TFunction;

    const prompt = buildAgentPlanRetryPrompt(t, {
      id: "backend-step-2",
      index: 2,
      title: "Run checks \"carefully\"",
      state: "failed",
      tool: "shell",
      summary: null,
      retryable: true,
    });

    expect(prompt).toBe(
      'step=2 | tool= using tool shell | label="Run checks \\"carefully\\""'
    );
  });
});

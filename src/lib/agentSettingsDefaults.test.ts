import { describe, expect, it } from "@jest/globals";
import {
  assistantModeToReasoningEffort,
  reasoningEffortToAssistantMode,
} from "./agentSettingsDefaults";

describe("agent settings defaults", () => {
  it("maps saved assistant_mode values to composer reasoning defaults", () => {
    expect(assistantModeToReasoningEffort("fast")).toBe("low");
    expect(assistantModeToReasoningEffort("balanced")).toBe("medium");
    expect(assistantModeToReasoningEffort("deep")).toBe("high");
    expect(assistantModeToReasoningEffort(undefined)).toBe("medium");
  });

  it("maps Settings reasoning defaults back to the Nullalis assistant_mode wire", () => {
    expect(reasoningEffortToAssistantMode("low")).toBe("fast");
    expect(reasoningEffortToAssistantMode("medium")).toBe("balanced");
    expect(reasoningEffortToAssistantMode("high")).toBe("deep");
  });
});


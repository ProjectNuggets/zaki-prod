import { describe, expect, it } from "@jest/globals";

import {
  buildMemoryCapturePolicyConfig,
  normalizeMemoryPolicy,
} from "./policy.js";

describe("memory policy off", () => {
  it("normalizes 'off' to 'off'", () => {
    expect(normalizeMemoryPolicy("off")).toBe("off");
  });

  it("builds a disabled capture-policy config for 'off'", () => {
    expect(buildMemoryCapturePolicyConfig("off")).toEqual({
      id: "off",
      disabled: true,
    });
  });
});

import { describe, expect, it } from "@jest/globals";
import { brainHealth } from "./brainHealth";

describe("Brain health classification", () => {
  it("keeps an unavailable request distinct from semantic degradation", () => {
    expect(brainHealth({ requestFailed: true, semanticDegraded: true })).toBe("unavailable");
    expect(brainHealth({ requestFailed: false, semanticDegraded: true })).toBe("degraded");
    expect(brainHealth({ requestFailed: false, semanticDegraded: false })).toBe("ready");
  });
});

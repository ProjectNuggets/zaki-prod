import { describe, expect, it } from "@jest/globals";
import { brainHealth } from "./brainHealth";

describe("Brain health classification", () => {
  it("keeps an unavailable request distinct from semantic degradation", () => {
    expect(
      brainHealth({ requestFailed: true, hasUsableData: false, semanticDegraded: true }),
    ).toBe("unavailable");
    expect(
      brainHealth({ requestFailed: false, hasUsableData: true, semanticDegraded: true }),
    ).toBe("degraded");
    expect(
      brainHealth({ requestFailed: false, hasUsableData: true, semanticDegraded: false }),
    ).toBe("ready");
  });

  it("marks cached data as stale when its background refresh fails", () => {
    expect(
      brainHealth({ requestFailed: true, hasUsableData: true, semanticDegraded: false }),
    ).toBe("stale");
  });
});

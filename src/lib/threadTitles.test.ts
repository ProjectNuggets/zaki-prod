import { describe, expect, it } from "@jest/globals";
import { DEFAULT_THREAD_LABEL, isDefaultThreadLabel } from "./threadTitles";

describe("threadTitles", () => {
  it("treats product placeholders as default thread labels", () => {
    expect(isDefaultThreadLabel("")).toBe(true);
    expect(isDefaultThreadLabel(DEFAULT_THREAD_LABEL)).toBe(true);
    expect(isDefaultThreadLabel("Thread")).toBe(true);
    expect(isDefaultThreadLabel("Trip planning")).toBe(false);
  });
});

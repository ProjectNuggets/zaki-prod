import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_THREAD_LABEL,
  isDefaultThreadLabel,
  stripThreadDisplayName,
} from "./threadTitles";

describe("threadTitles", () => {
  it("treats product placeholders as default thread labels", () => {
    expect(isDefaultThreadLabel("")).toBe(true);
    expect(isDefaultThreadLabel(DEFAULT_THREAD_LABEL)).toBe(true);
    expect(isDefaultThreadLabel("Thread")).toBe(true);
    expect(isDefaultThreadLabel("Trip planning")).toBe(false);
  });
});

describe("stripThreadDisplayName", () => {
  it("returns a plain title unchanged", () => {
    expect(stripThreadDisplayName("Weekend trip plan")).toBe("Weekend trip plan");
  });

  it("strips a full memory-context envelope and keeps the trailing title", () => {
    const leaked =
      "[[ZAKI_MEMORY_CONTEXT_V2]] Assistant identity rules… [[/ZAKI_MEMORY_CONTEXT_V2]] Trip to Rome";
    expect(stripThreadDisplayName(leaked)).toBe("Trip to Rome");
  });

  it("strips a truncated / leading-only marker (no closing tag)", () => {
    // The real leak: an auto-title generated from the enriched first message,
    // truncated mid-envelope so the close marker never appears.
    const leaked = "[[ZAKI_MEMORY_CONTEXT_V2]] Assistant identity ru…";
    expect(stripThreadDisplayName(leaked)).toBe("");
  });

  it("keeps real title text that precedes a leading-only marker", () => {
    expect(stripThreadDisplayName("Rome [[ZAKI_MEMORY_CONTEXT_V2]] guardrail")).toBe(
      "Rome"
    );
  });

  it("collapses whitespace around a stripped full envelope", () => {
    const leaked =
      "[[ZAKI_MEMORY_CONTEXT_V2]]\nAbout this person:\n- likes tea\n[[/ZAKI_MEMORY_CONTEXT_V2]]\n\nPlan my day";
    expect(stripThreadDisplayName(leaked)).toBe("Plan my day");
  });

  it("handles null / undefined / empty", () => {
    expect(stripThreadDisplayName(null)).toBe("");
    expect(stripThreadDisplayName(undefined)).toBe("");
    expect(stripThreadDisplayName("")).toBe("");
  });

  it("a leaked title that is nothing but envelope reduces to a default label", () => {
    const cleaned = stripThreadDisplayName(
      "[[ZAKI_MEMORY_CONTEXT_V2]] Assistant identity ru…"
    );
    const display = isDefaultThreadLabel(cleaned) ? DEFAULT_THREAD_LABEL : cleaned;
    expect(display).toBe(DEFAULT_THREAD_LABEL);
  });
});

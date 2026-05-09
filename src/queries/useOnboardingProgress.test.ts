import { describe, expect, it, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import {
  useOnboardingProgress,
  ONBOARDING_STAGES,
} from "./useOnboardingProgress";

const STORAGE_KEY_PREFIX = "zaki:onboarding-progress:v2:";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useOnboardingProgress", () => {
  it("defaults every stage to pending when storage is empty", () => {
    const { result } = renderHook(() => useOnboardingProgress("alice@test"));
    for (const id of ONBOARDING_STAGES) {
      expect(result.current.progress[id]).toBe("pending");
    }
  });

  it("returns null nextStage only when every stage is resolved", () => {
    const { result } = renderHook(() => useOnboardingProgress("alice@test"));
    expect(result.current.nextStage).toBe("welcome");

    act(() => result.current.setStage("welcome", "done"));
    expect(result.current.nextStage).toBe("plus_menu");

    for (const id of ONBOARDING_STAGES) {
      act(() => result.current.setStage(id, "done"));
    }
    expect(result.current.nextStage).toBeNull();
  });

  it("persists set stages to localStorage under the lowercased user key", () => {
    const { result } = renderHook(() => useOnboardingProgress("Alice@TEST"));
    act(() => result.current.setStage("welcome", "done"));
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}alice@test`);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toMatchObject({ welcome: "done" });
  });

  it("hydrates from localStorage on mount", () => {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}bob@test`,
      JSON.stringify({ welcome: "skipped", plus_menu: "done" }),
    );
    const { result } = renderHook(() => useOnboardingProgress("bob@test"));
    expect(result.current.progress.welcome).toBe("skipped");
    expect(result.current.progress.plus_menu).toBe("done");
    expect(result.current.progress.compaction).toBe("pending");
  });

  it("ignores garbage values in storage and defaults pending", () => {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}eve@test`,
      JSON.stringify({ welcome: "garbage", plus_menu: 42 }),
    );
    const { result } = renderHook(() => useOnboardingProgress("eve@test"));
    expect(result.current.progress.welcome).toBe("pending");
    expect(result.current.progress.plus_menu).toBe("pending");
  });

  it("ignores entirely malformed storage", () => {
    window.localStorage.setItem(
      `${STORAGE_KEY_PREFIX}eve@test`,
      "not-json",
    );
    const { result } = renderHook(() => useOnboardingProgress("eve@test"));
    for (const id of ONBOARDING_STAGES) {
      expect(result.current.progress[id]).toBe("pending");
    }
  });

  it("reset clears all stages back to pending and updates storage", () => {
    const { result } = renderHook(() => useOnboardingProgress("alice@test"));
    act(() => result.current.setStage("welcome", "done"));
    act(() => result.current.setStage("plus_menu", "skipped"));
    act(() => result.current.reset());
    for (const id of ONBOARDING_STAGES) {
      expect(result.current.progress[id]).toBe("pending");
    }
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}alice@test`);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    for (const id of ONBOARDING_STAGES) {
      expect(parsed[id]).toBe("pending");
    }
  });

  it("returns default progress and a no-op set when userId is null", () => {
    const { result } = renderHook(() => useOnboardingProgress(null));
    for (const id of ONBOARDING_STAGES) {
      expect(result.current.progress[id]).toBe("pending");
    }
    act(() => result.current.setStage("welcome", "done"));
    // Storage should remain untouched because no key resolves.
    const matching = Object.keys(window.localStorage).filter((k) =>
      k.startsWith(STORAGE_KEY_PREFIX),
    );
    expect(matching).toHaveLength(0);
  });

  it("nextStage returns the highest-priority pending stage", () => {
    const { result } = renderHook(() => useOnboardingProgress("alice@test"));
    expect(result.current.nextStage).toBe("welcome");

    act(() => result.current.setStage("welcome", "skipped"));
    expect(result.current.nextStage).toBe("plus_menu");

    act(() => result.current.setStage("plus_menu", "done"));
    act(() => result.current.setStage("compaction", "done"));
    expect(result.current.nextStage).toBe("brain_panel");
  });
});

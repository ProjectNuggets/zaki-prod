import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  getContextPressureState,
  useZakiSessionUiStore,
} from "./zakiSessionUiStore";

describe("zakiSessionUiStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useZakiSessionUiStore.persist?.clearStorage?.();
    useZakiSessionUiStore.setState({ sessions: {}, sandbox: null });
  });

  it("creates a default session and persists local mode changes", () => {
    const store = useZakiSessionUiStore.getState();
    store.ensureSession("agent:zaki-bot:user:1:thread:main");
    store.setMode("agent:zaki-bot:user:1:thread:main", "review");

    const session =
      useZakiSessionUiStore.getState().sessions["agent:zaki-bot:user:1:thread:main"];

    expect(session).toBeDefined();
    expect(session?.mode).toBe("review");
    expect(session?.approvalCount).toBe(0);
    expect(session?.lastChannel).toBeNull();
  });

  it("tracks approval and context pressure state per session", () => {
    const store = useZakiSessionUiStore.getState();
    store.incrementApprovalCount("agent:zaki-bot:user:1:thread:main", {
      id: "approval-1",
      tool: "send_email",
      reason: "Needs approval",
      riskLevel: "high",
      timestamp: 1,
    });
    store.setContextPressure("agent:zaki-bot:user:1:thread:main", 76);

    const session =
      useZakiSessionUiStore.getState().sessions["agent:zaki-bot:user:1:thread:main"];

    expect(session?.approvalCount).toBe(1);
    expect(session?.pendingApprovals).toHaveLength(1);
    expect(session?.contextPressurePercent).toBe(76);
    expect(session?.contextPressureState).toBe("near_limit");
  });

  it("buckets context pressure with the agreed thresholds", () => {
    expect(getContextPressureState(null)).toBeNull();
    expect(getContextPressureState(50)).toBe("normal");
    expect(getContextPressureState(51)).toBe("warning");
    expect(getContextPressureState(75)).toBe("warning");
    expect(getContextPressureState(76)).toBe("near_limit");
  });
});

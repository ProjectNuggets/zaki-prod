import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  getContextPressureState,
  mapAgentSessionToZakiSessionUi,
  useZakiSessionUiStore,
} from "./zakiSessionUiStore";

describe("zakiSessionUiStore", () => {
  beforeEach(() => {
    useZakiSessionUiStore.setState({ sessions: {}, sandbox: null });
  });

  it("creates a default session and applies local mode changes", () => {
    const store = useZakiSessionUiStore.getState();
    store.ensureSession("agent:zaki-bot:user:1:thread:main");
    store.setMode("agent:zaki-bot:user:1:thread:main", "review");

    const session =
      useZakiSessionUiStore.getState().sessions["agent:zaki-bot:user:1:thread:main"];

    expect(session).toBeDefined();
    expect(session?.mode).toBe("review");
    expect(session?.approvalCount).toBe(0);
    expect(session?.lastChannel).toBeNull();
    expect(session?.live).toBeNull();
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
    store.setContextPressure("agent:zaki-bot:user:1:thread:main", 92);

    const session =
      useZakiSessionUiStore.getState().sessions["agent:zaki-bot:user:1:thread:main"];

    expect(session?.approvalCount).toBe(1);
    expect(session?.pendingApprovals).toHaveLength(1);
    expect(session?.contextPressurePercent).toBe(92);
    expect(session?.contextPressureState).toBe("near_limit");
  });

  it("maps backend session truth into UI state", () => {
    const mapped = mapAgentSessionToZakiSessionUi({
      mode: "plan",
      pending_approval_count: 1,
      last_channel: "telegram",
      context_pressure_percent: 75,
      live: true,
      pending_approvals: [{ id: "a1", tool: "send_email", reason: "ok", risk_level: "high" }],
    });

    expect(mapped.mode).toBe("plan");
    expect(mapped.approvalCount).toBe(1);
    expect(mapped.lastChannel).toBe("telegram");
    expect(mapped.contextPressurePercent).toBe(75);
    expect(mapped.contextPressureState).toBe("warning");
    expect(mapped.pendingApprovals).toHaveLength(1);
    expect(mapped.live).toBe(true);
  });

  it("omits context pressure fields when the session response has no value", () => {
    const mapped = mapAgentSessionToZakiSessionUi({
      mode: "execute",
      pending_approval_count: 0,
    });

    // List-endpoint responses without pressure must not clobber the live
    // value already in the store. mapAgentSessionToZakiSessionUi must
    // omit both keys when the source is silent.
    expect("contextPressurePercent" in mapped).toBe(false);
    expect("contextPressureState" in mapped).toBe(false);
  });

  it("buckets context pressure with the agreed thresholds", () => {
    expect(getContextPressureState(null)).toBeNull();
    expect(getContextPressureState(69)).toBe("normal");
    expect(getContextPressureState(70)).toBe("warning");
    expect(getContextPressureState(89)).toBe("warning");
    expect(getContextPressureState(90)).toBe("near_limit");
  });
});

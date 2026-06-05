import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it } from "@jest/globals";
import {
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

  it("tracks approvals and context pressure per session", () => {
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
  });

  it("maps backend session posture into UI state without owning context pressure", () => {
    const mapped = mapAgentSessionToZakiSessionUi({
      mode: "plan",
      pending_approval_count: 1,
      last_channel: "telegram",
      context_pressure_percent: 75,
      live: true,
      pending_approvals: [{
        approval_id: "apr-7",
        id: 7,
        tool_call_id: "call_abc",
        tool: "send_email",
        reason: "ok",
        risk_level: "high",
        created_at: 1770000000,
        expires_at: null,
      }],
    });

    expect(mapped.mode).toBe("plan");
    expect(mapped.approvalCount).toBe(1);
    expect(mapped.lastChannel).toBe("telegram");
    expect("contextPressurePercent" in mapped).toBe(false);
    expect(mapped.pendingApprovals).toHaveLength(1);
    expect(mapped.pendingApprovals?.[0]).toMatchObject({
      id: "apr-7",
      approvalId: "apr-7",
      numericId: 7,
      toolCallId: "call_abc",
      timestamp: 1770000000 * 1000,
    });
    expect(mapped.live).toBe(true);
  });

  it("omits pressure + approvals when the session response has no value", () => {
    const mapped = mapAgentSessionToZakiSessionUi({
      mode: "execute",
    });

    // List-endpoint responses without these fields must not clobber
    // live values already in the store. mapAgentSessionToZakiSessionUi
    // must omit them entirely so spreading the patch leaves prior
    // store entries intact.
    expect("contextPressurePercent" in mapped).toBe(false);
    expect("approvalCount" in mapped).toBe(false);
    expect("pendingApprovals" in mapped).toBe(false);
  });

  it("hydrateSession preserves a prior pressure value when the patch omits it", () => {
    const store = useZakiSessionUiStore.getState();
    store.setContextPressure("agent:zaki-bot:user:1:thread:main", 41);
    store.hydrateSession(
      "agent:zaki-bot:user:1:thread:main",
      mapAgentSessionToZakiSessionUi({ mode: "execute" })
    );
    const session =
      useZakiSessionUiStore.getState().sessions["agent:zaki-bot:user:1:thread:main"];
    // Prior 41 must survive — the list tick patch did not include
    // context_pressure_percent so the store keeps what /context wrote.
    expect(session?.contextPressurePercent).toBe(41);
    expect(session?.mode).toBe("execute");
  });

  it("hydrateSession preserves approval timestamps across re-hydration", () => {
    const store = useZakiSessionUiStore.getState();
    // First hydration creates the approval
    store.hydrateSession(
      "agent:zaki-bot:user:1:thread:main",
      mapAgentSessionToZakiSessionUi({
        pending_approvals: [{ id: "a1", tool: "x", reason: "y", risk_level: "low" }],
      })
    );
    const before =
      useZakiSessionUiStore.getState().sessions["agent:zaki-bot:user:1:thread:main"];
    const firstStamp = before?.pendingApprovals[0]?.timestamp ?? 0;
    expect(firstStamp).toBeGreaterThan(0);

    // Wait a tick, then re-hydrate the same approval
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        store.hydrateSession(
          "agent:zaki-bot:user:1:thread:main",
          mapAgentSessionToZakiSessionUi({
            pending_approvals: [{ id: "a1", tool: "x", reason: "y", risk_level: "low" }],
          })
        );
        const after =
          useZakiSessionUiStore.getState().sessions["agent:zaki-bot:user:1:thread:main"];
        expect(after?.pendingApprovals[0]?.timestamp).toBe(firstStamp);
        resolve();
      }, 5);
    });
  });
});

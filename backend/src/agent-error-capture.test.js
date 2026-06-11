import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { makeAgentErrorCapture } from "./agent-error-capture.js";

/**
 * Build a mock Sentry SDK that records the last captured exception/message
 * and exposes it for assertions, while faithfully running `withScope` callbacks.
 */
function makeMockSentry() {
  const mock = {
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    withScope: jest.fn((cb) => {
      // Create a minimal scope mock so the callback can call scope methods safely.
      const scope = {
        tags: {},
        user: null,
        extras: {},
        setTag: jest.fn(function (key, val) { this.tags[key] = val; }),
        setUser: jest.fn(function (u) { this.user = u; }),
        setExtra: jest.fn(function (key, val) { this.extras[key] = val; }),
      };
      cb(scope);
      // Stash the scope used in the last call so tests can inspect it.
      mock._lastScope = scope;
    }),
    _lastScope: null,
  };
  return mock;
}

function makeReq({ requestId = "req-1", agentUserId = "user-42" } = {}) {
  return { requestId, agentUserId };
}

describe("makeAgentErrorCapture", () => {
  let sentry;
  let captureAgentError;

  beforeEach(() => {
    sentry = makeMockSentry();
    ({ captureAgentError } = makeAgentErrorCapture({ sentry }));
  });

  it("calls captureException with an Error and sets BFF context tags", () => {
    const err = new Error("upstream timed out");
    captureAgentError(err, { req: makeReq(), phase: "readiness_probe_throw", upstreamStatus: null });

    expect(sentry.withScope).toHaveBeenCalledTimes(1);
    expect(sentry.captureException).toHaveBeenCalledWith(err);
    expect(sentry.captureMessage).not.toHaveBeenCalled();

    const scope = sentry._lastScope;
    expect(scope.tags["component"]).toBe("agent_bff");
    expect(scope.tags["agent_phase"]).toBe("readiness_probe_throw");
    expect(scope.extras["agentContext"]).toEqual({ phase: "readiness_probe_throw", requestId: "req-1" });
  });

  it("calls captureMessage when given a plain string", () => {
    captureAgentError("readiness probe non-ok", {
      req: makeReq({ agentUserId: "user-99" }),
      phase: "readiness_probe",
      upstreamStatus: 503,
    });

    expect(sentry.withScope).toHaveBeenCalledTimes(1);
    expect(sentry.captureMessage).toHaveBeenCalledWith("readiness probe non-ok", "error");
    expect(sentry.captureException).not.toHaveBeenCalled();

    const scope = sentry._lastScope;
    expect(scope.tags["upstream_status"]).toBe("503");
    expect(scope.user).toEqual({ id: "user-99" });
    expect(scope.extras["agentContext"]).toMatchObject({ phase: "readiness_probe", upstreamStatus: 503 });
  });

  it("includes upstreamStatus in context and scope tags when provided", () => {
    captureAgentError(new Error("no body"), {
      req: makeReq(),
      phase: "upstream_no_body",
      upstreamStatus: 502,
    });

    const scope = sentry._lastScope;
    expect(scope.tags["upstream_status"]).toBe("502");
    expect(scope.extras["agentContext"]).toMatchObject({ upstreamStatus: 502, requestId: "req-1" });
  });

  it("omits upstreamStatus tag when null", () => {
    captureAgentError(new Error("outer catch"), { req: makeReq(), phase: "outer_catch" });

    const scope = sentry._lastScope;
    expect(scope.tags["upstream_status"]).toBeUndefined();
  });

  it("sets userId from req.agentUserId", () => {
    captureAgentError(new Error("sse error"), {
      req: makeReq({ agentUserId: "user-7" }),
      phase: "sse_stream",
      upstreamStatus: 200,
    });

    expect(sentry._lastScope.user).toEqual({ id: "user-7" });
  });

  it("omits setUser when agentUserId is absent", () => {
    captureAgentError(new Error("outer catch"), {
      req: { requestId: "req-x" },
      phase: "outer_catch",
    });

    expect(sentry._lastScope.user).toBeNull();
  });

  it("is safe when req is undefined", () => {
    expect(() => captureAgentError(new Error("no req"), { phase: "outer_catch" })).not.toThrow();
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
  });

  // ---
  // Phase coverage: each named phase from agentChatStreamHandler is exercised.
  // ---

  it.each([
    ["readiness_probe", 503, "Agent readiness probe failed"],
    ["readiness_probe_throw", null, "timeout error"],
    ["upstream_non2xx_json", 500, "Agent upstream non-2xx JSON"],
    ["upstream_no_body", 502, "Agent upstream no body"],
    ["non_sse_stream", 503, "Agent non-SSE stream failure"],
    ["sse_stream", 200, "Agent SSE stream contained an error frame"],
    ["outer_catch", null, "uncaught error"],
  ])("phase=%s upstreamStatus=%s emits captureException", (phase, upstreamStatus, msg) => {
    captureAgentError(new Error(msg), { req: makeReq(), phase, upstreamStatus });
    expect(sentry.captureException).toHaveBeenCalledTimes(1);
    expect(sentry._lastScope.tags["agent_phase"]).toBe(phase);
  });
});

/**
 * Agent backend error capture — routes genuine agent failures to GlitchTip/Sentry.
 *
 * The factory pattern enables dependency injection in tests: pass { sentry } to
 * supply a mock.  In production, `index.js` calls `makeAgentErrorCapture({ sentry: Sentry })`.
 *
 * Do NOT call the returned `captureAgentError` on:
 *   - Normal 429 meter-denials       (not a malfunction)
 *   - User-cancel / client abort      (not a malfunction)
 *   - Session-key validation failures (user/payload error, not infra)
 *
 * @param {{ sentry: import("@sentry/node") }} deps
 * @returns {{ captureAgentError: (errOrMsg: Error|string, ctx: AgentErrorCtx) => void }}
 *
 * @typedef {{ req?: object, phase: string, upstreamStatus?: number|null }} AgentErrorCtx
 */
export function makeAgentErrorCapture({ sentry }) {
  /**
   * Capture a genuine agent backend failure with structured BFF context.
   *
   * @param {Error|string} errOrMsg  - Error instance or plain message string.
   * @param {AgentErrorCtx} ctx
   */
  function captureAgentError(errOrMsg, { req, phase, upstreamStatus = null } = {}) {
    const requestId = String(req?.requestId || "").trim() || undefined;
    const userId = String(req?.agentUserId || "").trim() || undefined;
    const extra = {
      phase,
      ...(upstreamStatus != null ? { upstreamStatus } : {}),
      ...(requestId ? { requestId } : {}),
    };
    sentry.withScope((scope) => {
      scope.setTag("component", "agent_bff");
      scope.setTag("agent_phase", phase);
      if (userId) scope.setUser({ id: userId });
      if (upstreamStatus != null) scope.setTag("upstream_status", String(upstreamStatus));
      scope.setExtra("agentContext", extra);
      if (errOrMsg instanceof Error) {
        sentry.captureException(errOrMsg);
      } else {
        sentry.captureMessage(String(errOrMsg), "error");
      }
    });
  }

  return { captureAgentError };
}

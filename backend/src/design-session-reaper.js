// Idle Design session reaper (B0b) — the auto-descale half of the design
// autoscaling story. Finds sessions whose client stopped polling (updated_at past
// the idle TTL) and drives the controller stop path, which best-effort checkpoints
// then FORCE-DELETES the pod (B0a) — so the single design-sessions namespace slot is
// freed for the next user instead of a lingering pod blocking everyone.
//
// Safety notes:
//   - Does NOT speculatively write DRAINING (that is the D4.0 stop-latch trap). A throw
//     from controller.stop leaves the row untouched; B0a has already force-deleted the
//     pod, so the next status poll reconciles the row to STOPPED on its own.
//   - Multi-replica safe: the controller de-dups in-flight stops per session, and the
//     observed-state write is a generation CAS.
//   - ponytail: reuses `updated_at` as the abandonment signal — status polling bumps it
//     and stops when the tab closes, so a stale updated_at IS "the user left". No new
//     activity column for v1. (A dedicated last-interaction bump on the proxy route is a
//     later refinement if idle detection needs to be finer than the poll cadence.)

// Non-terminal states worth reaping (STOPPED/FAILED are already terminal). Includes the
// transient/stuck states so a session wedged mid-STARTING/RESTORING/DRAINING is also freed.
export const REAPABLE_SESSION_STATES = [
  "REQUESTED",
  "STARTING",
  "RESTORING",
  "READY",
  "ACTIVE",
  "IDLE",
  "DRAINING",
  "CHECKPOINTING",
];

export async function reapIdleDesignSessions({
  dbQuery,
  controller,
  updateSessionState,
  idleTtlMs,
  maxPerSweep = 25,
  logStructured = () => {},
  now = () => Date.now(),
}) {
  if (!Number.isFinite(idleTtlMs) || idleTtlMs <= 0) {
    throw new Error("reapIdleDesignSessions requires a positive idleTtlMs");
  }
  const cutoffIso = new Date(now() - idleTtlMs).toISOString();
  const { rows } = await dbQuery(
    `SELECT session_id, project_id, owner_user_id, tenant_id, checkpoint_generation
       FROM zaki_design_sessions
      WHERE state = ANY($1::text[])
        AND updated_at < $2
      ORDER BY updated_at ASC
      LIMIT $3`,
    [REAPABLE_SESSION_STATES, cutoffIso, maxPerSweep]
  );

  let reaped = 0;
  let failed = 0;
  for (const row of rows) {
    const requestId = `design-reaper-${row.session_id}`;
    try {
      const result = await controller.stop({
        sessionId: row.session_id,
        projectId: row.project_id,
        userId: String(row.owner_user_id),
        tenantId: row.tenant_id,
        expectedGeneration: Number(row.checkpoint_generation),
        requestId,
      });
      try {
        await updateSessionState({
          dbQuery,
          sessionId: row.session_id,
          projectId: row.project_id,
          userId: String(row.owner_user_id),
          tenantId: row.tenant_id,
          state: result.session.state,
          generation: result.session.generation,
          requestId,
        });
      } catch {
        // Recording the observed state is best-effort; a later status poll (or the
        // pod already being gone) reconciles the row. Don't fail the sweep over it.
      }
      reaped += 1;
    } catch (err) {
      // controller.stop threw (e.g. 503 CHECKPOINT_FAILED). B0a force-deleted the pod
      // regardless, so the slot IS freed — the row reconciles to STOPPED on the next
      // status poll. Count it, log it, keep sweeping the rest.
      failed += 1;
      logStructured("warn", "design.reaper.stop_failed", {
        sessionId: row.session_id,
        message: err?.message || String(err),
      });
    }
  }

  return { scanned: rows.length, reaped, failed };
}

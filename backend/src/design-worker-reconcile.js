// The worker's project DB lives on an ephemeral (emptyDir) volume and is reconstructed only
// from a checkpoint at restore time. A restart that restores a checkpoint older than the user's
// latest project — or a fresh pod with no checkpoint — leaves the worker missing projects the
// hub registry (zaki_design_projects) still knows about. Project-scoped reads then 404 and
// mutations throw an unhandled 500 in the vendored open-design server, which is the flood of
// "Could not create a conversation" / "daemon 500" the user hits after any reschedule.
//
// This reconciles the worker against the authoritative registry: list what the worker has, then
// re-create only the missing projects with their registry id + name (the open-design create
// honors a client-supplied id, so the restored ids match the FE's references). It runs through
// controller.proxy directly, so it never re-enters the hub proxy route (no metering, no registry
// mirror, no recursion). Best-effort: if the worker list can't be read we skip rather than blindly
// re-create (a duplicate create would error), so a bad read never makes things worse.

// ponytail: cap the seed set. A user with more owned projects than this is not the failure mode
// we are protecting; raise the LIMIT if that ever becomes real.
const MAX_SEED = 200;

export async function reconcileWorkerProjects({ controller, dbQuery, session, requestId, log }) {
  const emit = typeof log === "function" ? log : () => {};

  const registry = await dbQuery(
    `SELECT project_id, name
       FROM zaki_design_projects
      WHERE owner_user_id = $1
        AND status <> 'deleted'
      ORDER BY updated_at DESC
      LIMIT ${MAX_SEED}`,
    [session.userId],
  );
  const wanted = (registry?.rows || []).filter((row) => row?.project_id);
  if (!wanted.length) return { seeded: 0, present: 0, skipped: false };

  const listed = await workerProjects(controller, session, requestId);
  if (listed === null) {
    // Could not read the worker's project set. Seeding blind risks a duplicate-id create that
    // errors, so treat this generation as unreconciled and let a later request retry.
    return { seeded: 0, present: 0, skipped: true };
  }
  const have = new Set(listed);

  let seeded = 0;
  for (const row of wanted) {
    const id = String(row.project_id);
    if (have.has(id)) continue;
    const response = await controller.proxy({
      sessionId: session.sessionId,
      projectId: session.projectId,
      userId: session.userId,
      tenantId: session.tenantId,
      expectedGeneration: session.generation,
      targetPath: "/api/projects",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, name: row.name || "Untitled design workspace" }),
      requestId,
    });
    await response.body?.cancel?.().catch(() => undefined);
    if (response.status >= 200 && response.status < 300) {
      seeded += 1;
    } else {
      emit({ event: "design.worker.reconcile_create_failed", projectId: id, status: response.status, requestId });
    }
  }
  if (seeded) emit({ event: "design.worker.reconcile_seeded", sessionId: session.sessionId, generation: session.generation, seeded, requestId });
  return { seeded, present: have.size, skipped: false };
}

async function workerProjects(controller, session, requestId) {
  let response;
  try {
    response = await controller.proxy({
      sessionId: session.sessionId,
      projectId: session.projectId,
      userId: session.userId,
      tenantId: session.tenantId,
      expectedGeneration: session.generation,
      targetPath: "/api/projects",
      method: "GET",
      headers: {},
      requestId,
    });
  } catch {
    return null;
  }
  if (!response || response.status < 200 || response.status >= 300) {
    await response?.body?.cancel?.().catch(() => undefined);
    return null;
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    return null;
  }
  if (!payload || !Array.isArray(payload.projects)) return null;
  return payload.projects.map((project) => String(project?.id || "")).filter(Boolean);
}

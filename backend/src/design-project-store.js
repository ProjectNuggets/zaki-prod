const DESIGN_PROJECT_ROLES = new Set(["owner", "editor", "viewer"]);
const DESIGN_AUDIT_STATUSES = new Set(["success", "failed"]);

function normalizeUserId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return DESIGN_PROJECT_ROLES.has(role) ? role : "viewer";
}

function normalizeAuditStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return DESIGN_AUDIT_STATUSES.has(status) ? status : "success";
}

function metadataJson(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "{}";
  return JSON.stringify(value);
}

function normalizeProjectRow(row) {
  if (!row?.project_id) return null;
  return {
    id: String(row.project_id),
    name: normalizeText(row.name, "Untitled design workspace"),
    status: { value: normalizeText(row.status, "active") },
    metadata:
      row.metadata_json && typeof row.metadata_json === "object" && !Array.isArray(row.metadata_json)
        ? row.metadata_json
        : {},
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export async function listDesignProjects({ dbQuery, userId }) {
  const ownerUserId = normalizeUserId(userId);
  if (!ownerUserId) throw new Error("invalid_design_project_owner");
  const result = await dbQuery(
    `
      SELECT project_id, name, status, metadata_json, created_at, updated_at
        FROM zaki_design_projects
       WHERE owner_user_id = $1
         AND status <> 'deleted'
       ORDER BY updated_at DESC, project_id ASC
    `,
    [ownerUserId]
  );
  return (result?.rows || []).map(normalizeProjectRow).filter(Boolean);
}

export async function createDesignProject({
  dbQuery,
  userId,
  projectId,
  name,
  metadata = {},
  requestId,
}) {
  const ownerUserId = normalizeUserId(userId);
  const normalizedProjectId = normalizeText(projectId);
  if (!ownerUserId || !normalizedProjectId) {
    throw new Error("invalid_design_project_owner");
  }
  const result = await dbQuery(
    `
      INSERT INTO zaki_design_projects
        (project_id, owner_user_id, name, status, metadata_json, last_request_id, created_at, updated_at)
      VALUES ($1, $2, $3, 'active', $4::jsonb, $5, NOW(), NOW())
      RETURNING project_id, name, status, metadata_json, created_at, updated_at
    `,
    [
      normalizedProjectId,
      ownerUserId,
      normalizeText(name, "Untitled design workspace"),
      metadataJson(metadata),
      normalizeText(requestId, null),
    ]
  );
  await upsertDesignProjectRole({
    dbQuery,
    projectId: normalizedProjectId,
    userId: ownerUserId,
    role: "owner",
  });
  const project = normalizeProjectRow(result?.rows?.[0]);
  if (!project) throw new Error("design_project_create_failed");
  return project;
}

export function extractDesignProjectFromPayload(payload) {
  const project = payload?.project && typeof payload.project === "object" ? payload.project : null;
  if (!project || typeof project.id !== "string" || !project.id.trim()) return null;
  return {
    projectId: project.id.trim(),
    name: normalizeText(project.name, "Untitled design workspace"),
    metadata: project.metadata && typeof project.metadata === "object" ? project.metadata : {},
  };
}

export async function upsertDesignProjectProvisioning({
  dbQuery,
  userId,
  projectId,
  name,
  metadata = {},
  requestId,
}) {
  const ownerUserId = normalizeUserId(userId);
  const normalizedProjectId = normalizeText(projectId);
  if (!ownerUserId || !normalizedProjectId) {
    throw new Error("invalid_design_project_owner");
  }
  const projectName = normalizeText(name, "Untitled design workspace");
  await dbQuery(
    `
      INSERT INTO zaki_design_projects
        (project_id, owner_user_id, name, status, metadata_json, last_request_id, created_at, updated_at)
      VALUES ($1, $2, $3, 'provisioning', $4::jsonb, $5, NOW(), NOW())
      ON CONFLICT (project_id)
      DO UPDATE SET
        owner_user_id = EXCLUDED.owner_user_id,
        name = EXCLUDED.name,
        status = CASE
          WHEN zaki_design_projects.status = 'deleted' THEN 'provisioning'
          ELSE zaki_design_projects.status
        END,
        metadata_json = EXCLUDED.metadata_json,
        last_request_id = EXCLUDED.last_request_id,
        updated_at = NOW(),
        deleted_at = NULL
    `,
    [normalizedProjectId, ownerUserId, projectName, metadataJson(metadata), normalizeText(requestId, null)]
  );
  await upsertDesignProjectRole({ dbQuery, projectId: normalizedProjectId, userId: ownerUserId, role: "owner" });
}

export async function markDesignProjectActive({
  dbQuery,
  userId,
  project,
  requestId,
}) {
  const ownerUserId = normalizeUserId(userId);
  const normalized = extractDesignProjectFromPayload({ project });
  if (!ownerUserId || !normalized) return;
  await dbQuery(
    `
      INSERT INTO zaki_design_projects
        (project_id, owner_user_id, name, status, metadata_json, last_request_id, created_at, updated_at)
      VALUES ($1, $2, $3, 'active', $4::jsonb, $5, NOW(), NOW())
      ON CONFLICT (project_id)
      DO UPDATE SET
        owner_user_id = EXCLUDED.owner_user_id,
        name = EXCLUDED.name,
        status = 'active',
        metadata_json = EXCLUDED.metadata_json,
        last_request_id = EXCLUDED.last_request_id,
        updated_at = NOW(),
        deleted_at = NULL
    `,
    [normalized.projectId, ownerUserId, normalized.name, metadataJson(normalized.metadata), normalizeText(requestId, null)]
  );
  await upsertDesignProjectRole({ dbQuery, projectId: normalized.projectId, userId: ownerUserId, role: "owner" });
}

export async function markDesignProjectDeleted({ dbQuery, userId, projectId, requestId }) {
  const ownerUserId = normalizeUserId(userId);
  const normalizedProjectId = normalizeText(projectId);
  if (!ownerUserId || !normalizedProjectId) return;
  await dbQuery(
    `
      UPDATE zaki_design_projects
         SET status = 'deleted',
             deleted_at = NOW(),
             updated_at = NOW(),
             last_request_id = $3
       WHERE project_id = $1
         AND owner_user_id = $2
    `,
    [normalizedProjectId, ownerUserId, normalizeText(requestId, null)]
  );
}

export async function markDesignProjectFailed({ dbQuery, userId, projectId, requestId }) {
  const ownerUserId = normalizeUserId(userId);
  const normalizedProjectId = normalizeText(projectId);
  if (!ownerUserId || !normalizedProjectId) return;
  await dbQuery(
    `
      UPDATE zaki_design_projects
         SET status = 'failed',
             updated_at = NOW(),
             last_request_id = $3
       WHERE project_id = $1
         AND owner_user_id = $2
         AND status = 'provisioning'
    `,
    [normalizedProjectId, ownerUserId, normalizeText(requestId, null)]
  );
}

export async function upsertDesignProjectRole({ dbQuery, projectId, userId, role }) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedProjectId = normalizeText(projectId);
  if (!normalizedUserId || !normalizedProjectId) return;
  await dbQuery(
    `
      INSERT INTO zaki_design_project_roles
        (project_id, user_id, role, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (project_id, user_id)
      DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
    `,
    [normalizedProjectId, normalizedUserId, normalizeRole(role)]
  );
}

export async function recordDesignProjectAuditEvent({
  dbQuery,
  userId,
  projectId,
  action,
  status = "success",
  requestId,
  details = {},
}) {
  await dbQuery(
    `
      INSERT INTO zaki_design_project_audit_events
        (user_id, project_id, action, status, request_id, details_json, created_at)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
    `,
    [
      normalizeUserId(userId),
      normalizeText(projectId, null),
      normalizeText(action, "unknown"),
      normalizeAuditStatus(status),
      normalizeText(requestId, null),
      metadataJson(details),
    ]
  );
}

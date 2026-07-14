import express from "express";

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function buildDesignProjectRouter({
  enabled,
  controllerMode,
  resolveUser,
  listProjects,
  createProject,
  createProjectId,
  getRequestId,
}) {
  const router = express.Router();
  const projectJson = express.json({ limit: "32kb", strict: true });

  router.use((req, res, next) => {
    if (!controllerMode) return next("router");
    if (!enabled) {
      return res.status(404).json({
        code: "design_disabled",
        message: "Design is not enabled for this environment.",
        requestId: getRequestId(req),
      });
    }
    return next();
  });

  router.get("/", async (req, res) => {
    const auth = await resolveUser(req, res);
    if (!auth?.zakiUser?.id) return;
    const requestId = getRequestId(req);
    try {
      const projects = await listProjects({ userId: auth.zakiUser.id });
      return res.json({ projects });
    } catch {
      return projectFailure(res, requestId);
    }
  });

  router.post("/", projectJson, async (req, res) => {
    const input = parseProjectCreate(req.body);
    if (!input) return invalidProject(res, getRequestId(req));
    const auth = await resolveUser(req, res);
    if (!auth?.zakiUser?.id) return;
    const requestId = getRequestId(req);
    const projectId = createProjectId();
    if (!OPAQUE_ID.test(String(projectId || ""))) return projectFailure(res, requestId);
    try {
      const project = await createProject({
        userId: auth.zakiUser.id,
        projectId,
        name: input.name,
        metadata: input.metadata,
        requestId,
      });
      return res.status(201).json({ project });
    } catch (error) {
      if (String(error?.code || "") === "23505") {
        return res.status(409).json({
          code: "design_project_conflict",
          message: "Design project could not be created. Try again.",
          retryable: true,
          requestId,
        });
      }
      return projectFailure(res, requestId);
    }
  });

  return router;
}

function parseProjectCreate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const name = String(value.name || "").trim();
  if (!name || name.length > 160) return null;
  const metadata = value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
    ? value.metadata
    : {};
  return { name, metadata };
}

function invalidProject(res, requestId) {
  return res.status(400).json({
    code: "invalid_design_project_request",
    message: "Design project name must contain 1 to 160 characters.",
    requestId,
  });
}

function projectFailure(res, requestId) {
  return res.status(503).json({
    code: "design_project_registry_unavailable",
    message: "Design project registry is temporarily unavailable.",
    retryable: true,
    requestId,
  });
}

export const SPACES_PROVISIONING_ERROR_CODES = {
  UNAVAILABLE: "spaces_provisioning_unavailable",
  FAILED: "spaces_provisioning_failed",
  UPSTREAM_UNAVAILABLE: "spaces_upstream_unavailable",
};

export const DEFAULT_SPACES_WORKSPACE_NAME = "Spaces";
export const DEFAULT_SPACES_THREAD_NAME = "New chat";

const SAFE_PUBLIC_MESSAGES = {
  [SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE]:
    "Spaces setup is temporarily unavailable. Please try again.",
  [SPACES_PROVISIONING_ERROR_CODES.FAILED]:
    "Spaces setup could not be completed. Please try again.",
  [SPACES_PROVISIONING_ERROR_CODES.UPSTREAM_UNAVAILABLE]:
    "Spaces is temporarily unavailable. Please try again.",
};

export class SpacesProvisioningError extends Error {
  constructor(code, message, options = {}) {
    super(message || SAFE_PUBLIC_MESSAGES[code] || SAFE_PUBLIC_MESSAGES[SPACES_PROVISIONING_ERROR_CODES.FAILED]);
    this.name = "SpacesProvisioningError";
    this.code = code || SPACES_PROVISIONING_ERROR_CODES.FAILED;
    this.status = Number.isInteger(options.status) ? options.status : 503;
    this.retryable = options.retryable !== false;
    this.publicMessage = options.publicMessage || SAFE_PUBLIC_MESSAGES[this.code] || SAFE_PUBLIC_MESSAGES[SPACES_PROVISIONING_ERROR_CODES.FAILED];
    if (options.cause) this.cause = options.cause;
  }
}

export function normalizeNovaUserId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function buildStableTypUsername(zakiUser) {
  const id = normalizeNovaUserId(zakiUser?.id);
  if (!id) {
    throw new SpacesProvisioningError(
      SPACES_PROVISIONING_ERROR_CODES.FAILED,
      "Cannot provision Spaces without a valid ZAKI user id.",
      { status: 500, retryable: false }
    );
  }
  return `u${id}`;
}

export function isAnonymousSpacesRouteTarget(slug, threadSlug = "") {
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  const normalizedThread = String(threadSlug || "").trim().toLowerCase();
  return normalizedThread.startsWith("anon-") || normalizedSlug === "zaky";
}

export function buildSpacesProvisioningErrorPayload(error) {
  const normalized = normalizeSpacesProvisioningError(error);
  return {
    success: false,
    error: normalized.publicMessage,
    code: normalized.code,
    retryable: normalized.retryable,
    status: normalized.status,
  };
}

export function normalizeSpacesProvisioningError(error, fallbackCode = SPACES_PROVISIONING_ERROR_CODES.FAILED) {
  if (error instanceof SpacesProvisioningError) return error;
  const message = String(error?.message || error || "");
  if (/NOVA_TYP_BASE_URL|NOVA_TYP_API_KEY|not configured/i.test(message)) {
    return new SpacesProvisioningError(
      SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE,
      message,
      { status: 503, retryable: true, cause: error }
    );
  }
  return new SpacesProvisioningError(fallbackCode, message, {
    status:
      fallbackCode === SPACES_PROVISIONING_ERROR_CODES.UPSTREAM_UNAVAILABLE
        ? 502
        : fallbackCode === SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE
          ? 503
          : 500,
    retryable: true,
    cause: error,
  });
}

function normalizeSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function sanitizeThreadName(value, fallback = DEFAULT_SPACES_THREAD_NAME) {
  return String(value || fallback)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || fallback;
}

function normalizeThreadSlug(value) {
  return String(value || "").trim() || null;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function shouldUseUpstreamError(status) {
  return !Number.isInteger(status) || status >= 500 || status === 0;
}

function toUpstreamError(response, data, fallback) {
  const status = response?.status || 502;
  const code = shouldUseUpstreamError(status)
    ? SPACES_PROVISIONING_ERROR_CODES.UPSTREAM_UNAVAILABLE
    : SPACES_PROVISIONING_ERROR_CODES.FAILED;
  return new SpacesProvisioningError(
    code,
    data?.error || data?.message || fallback,
    {
      status: shouldUseUpstreamError(status) ? 502 : status,
      retryable: shouldUseUpstreamError(status),
    }
  );
}

function extractThreadTarget(workspace) {
  const slug = normalizeSlug(workspace?.slug);
  if (!slug) return null;
  const threads = Array.isArray(workspace?.threads) ? workspace.threads : [];
  const thread = threads.find((candidate) => candidate && (candidate.slug || candidate.id));
  const threadSlug = String(thread?.slug || thread?.id || "").trim();
  return {
    workspaceSlug: slug,
    threadSlug: threadSlug || null,
  };
}

export function createSpacesTypProvisioner({
  dbQuery,
  novaAdminRequest,
  fetchNovaUserIdByUsername,
  fetchTypWorkspaces,
  randomPassword,
  now = () => new Date().toISOString(),
  log = console,
}) {
  if (typeof dbQuery !== "function") throw new Error("dbQuery is required.");
  if (typeof novaAdminRequest !== "function") throw new Error("novaAdminRequest is required.");
  if (typeof fetchNovaUserIdByUsername !== "function") throw new Error("fetchNovaUserIdByUsername is required.");
  if (typeof fetchTypWorkspaces !== "function") throw new Error("fetchTypWorkspaces is required.");

  const makePassword =
    typeof randomPassword === "function"
      ? randomPassword
      : () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  async function persistNovaUserId(zakiUser, novaUserId) {
    const id = normalizeNovaUserId(novaUserId);
    if (!id || !zakiUser?.id || Number(zakiUser.nova_user_id || 0) === id) return id;
    await dbQuery(
      `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
      [id, now(), zakiUser.id]
    );
    zakiUser.nova_user_id = id;
    return id;
  }

  async function readDefaultSpacesTarget(zakiUser, novaUserId) {
    const zakiUserId = normalizeNovaUserId(zakiUser?.id);
    if (!zakiUserId) return null;
    const result = await dbQuery(
      `SELECT workspace_slug, thread_slug, nova_user_id
       FROM zaki_spaces_defaults
       WHERE zaki_user_id = $1`,
      [zakiUserId]
    );
    const row = result?.rows?.[0];
    const workspaceSlug = normalizeSlug(row?.workspace_slug);
    if (!workspaceSlug) return null;
    const rowNovaUserId = normalizeNovaUserId(row?.nova_user_id);
    if (rowNovaUserId && Number(rowNovaUserId) !== Number(novaUserId)) return null;
    return {
      novaUserId: rowNovaUserId || normalizeNovaUserId(novaUserId),
      workspaceSlug,
      threadSlug: normalizeThreadSlug(row?.thread_slug),
    };
  }

  async function persistDefaultSpacesTarget({ zakiUser, novaUserId, workspaceSlug, threadSlug = null }) {
    const zakiUserId = normalizeNovaUserId(zakiUser?.id);
    const normalizedWorkspaceSlug = normalizeSlug(workspaceSlug);
    const normalizedNovaUserId = normalizeNovaUserId(novaUserId);
    if (!zakiUserId || !normalizedWorkspaceSlug) return null;
    const normalizedThreadSlug = normalizeThreadSlug(threadSlug);
    await dbQuery(
      `INSERT INTO zaki_spaces_defaults (
         zaki_user_id,
         nova_user_id,
         workspace_slug,
         thread_slug,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (zaki_user_id) DO UPDATE
       SET nova_user_id = EXCLUDED.nova_user_id,
           workspace_slug = EXCLUDED.workspace_slug,
           thread_slug = CASE
             WHEN zaki_spaces_defaults.workspace_slug = EXCLUDED.workspace_slug
             THEN COALESCE(EXCLUDED.thread_slug, zaki_spaces_defaults.thread_slug)
             ELSE EXCLUDED.thread_slug
           END,
           updated_at = NOW()`,
      [zakiUserId, normalizedNovaUserId, normalizedWorkspaceSlug, normalizedThreadSlug]
    );
    return {
      novaUserId: normalizedNovaUserId,
      workspaceSlug: normalizedWorkspaceSlug,
      threadSlug: normalizedThreadSlug,
    };
  }

  async function retireDefaultSpacesTarget(zakiUser, workspaceSlug = null) {
    const zakiUserId = normalizeNovaUserId(zakiUser?.id);
    if (!zakiUserId) return;
    const normalizedWorkspaceSlug = normalizeSlug(workspaceSlug);
    if (normalizedWorkspaceSlug) {
      await dbQuery(
        `DELETE FROM zaki_spaces_defaults
         WHERE zaki_user_id = $1 AND workspace_slug = $2`,
        [zakiUserId, normalizedWorkspaceSlug]
      );
      return;
    }
    await dbQuery(
      `DELETE FROM zaki_spaces_defaults
       WHERE zaki_user_id = $1`,
      [zakiUserId]
    );
  }

  async function lookupTypUserId(username) {
    const normalized = String(username || "").trim();
    if (!normalized) return null;
    try {
      return normalizeNovaUserId(await fetchNovaUserIdByUsername(normalized));
    } catch (error) {
      throw normalizeSpacesProvisioningError(error, SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE);
    }
  }

  async function createTypUser(handle) {
    let response;
    try {
      response = await novaAdminRequest("/v1/admin/users/new", {
        method: "POST",
        body: JSON.stringify({
          username: handle,
          password: makePassword(),
          role: "default",
        }),
      });
    } catch (error) {
      throw normalizeSpacesProvisioningError(error, SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE);
    }
    const data = await readJson(response);
    const createdId = normalizeNovaUserId(data?.user?.id);
    if (response.ok && createdId) return createdId;
    const existsMessage = String(data?.error || data?.message || "").toLowerCase();
    if (existsMessage.includes("exists")) {
      return lookupTypUserId(handle);
    }
    throw toUpstreamError(response, data, "Unable to create Spaces user.");
  }

  async function ensureTypUserForZakiUser(zakiUser, email, options = {}) {
    const storedId = normalizeNovaUserId(zakiUser?.nova_user_id);
    if (storedId && !options.forceRefresh && !options.validateStored) {
      return storedId;
    }

    const handle = buildStableTypUsername(zakiUser);
    const lookupCandidates = [
      handle,
      String(email || zakiUser?.email || "").trim().toLowerCase(),
    ].filter((value, index, values) => value && values.indexOf(value) === index);

    for (const candidate of lookupCandidates) {
      const matchedId = await lookupTypUserId(candidate);
      if (matchedId) {
        return persistNovaUserId(zakiUser, matchedId);
      }
    }

    if (storedId && !options.forceRefresh && !options.validateStored) {
      return storedId;
    }

    const createdId = await createTypUser(handle);
    if (!createdId) {
      throw new SpacesProvisioningError(
        SPACES_PROVISIONING_ERROR_CODES.FAILED,
        "TYP user creation did not return a user id.",
        { status: 502, retryable: true }
      );
    }
    return persistNovaUserId(zakiUser, createdId);
  }

  async function fetchVisibleWorkspaces(novaUserId) {
    let response;
    try {
      response = await fetchTypWorkspaces(novaUserId);
    } catch (error) {
      throw normalizeSpacesProvisioningError(error, SPACES_PROVISIONING_ERROR_CODES.UPSTREAM_UNAVAILABLE);
    }
    const data = await readJson(response);
    if (!response.ok || !Array.isArray(data?.workspaces)) {
      throw toUpstreamError(response, data, "Unable to fetch Spaces workspaces.");
    }
    return data.workspaces;
  }

  async function assignWorkspaceUser(workspaceSlug, novaUserId) {
    const response = await novaAdminRequest(`/v1/admin/workspaces/${workspaceSlug}/manage-users`, {
      method: "POST",
      body: JSON.stringify({ userIds: [Number(novaUserId)], reset: false }),
    });
    const data = await readJson(response);
    if (!response.ok || data?.success === false) {
      throw toUpstreamError(response, data, "Unable to assign Spaces workspace.");
    }
    return data;
  }

  async function createThreadInWorkspace({ workspaceSlug, novaUserId, name = DEFAULT_SPACES_THREAD_NAME }) {
    const response = await novaAdminRequest(`/v1/workspace/${workspaceSlug}/thread/new`, {
      method: "POST",
      body: JSON.stringify({
        userId: Number(novaUserId),
        name: sanitizeThreadName(name),
      }),
    });
    const data = await readJson(response);
    const threadSlug = String(data?.thread?.slug || data?.thread?.id || "").trim();
    if (!response.ok || !threadSlug) {
      throw toUpstreamError(response, data, "Unable to create Spaces thread.");
    }
    return {
      threadSlug,
      thread: data.thread,
    };
  }

  async function ensureThreadForDefaultTarget({ zakiUser, email, target, novaUserId, title }) {
    const workspaceSlug = normalizeSlug(target?.workspaceSlug);
    if (!workspaceSlug) return null;
    let effectiveNovaUserId = novaUserId;
    try {
      await assignWorkspaceUser(workspaceSlug, effectiveNovaUserId);
    } catch (error) {
      const refreshedId = await ensureTypUserForZakiUser(zakiUser, email, {
        forceRefresh: true,
        reason: "default_workspace_assignment_retry",
      });
      if (!refreshedId || Number(refreshedId) === Number(effectiveNovaUserId)) throw error;
      effectiveNovaUserId = refreshedId;
      await assignWorkspaceUser(workspaceSlug, effectiveNovaUserId);
    }

    const { threadSlug, thread } = await createThreadInWorkspace({
      workspaceSlug,
      novaUserId: effectiveNovaUserId,
      name: title || DEFAULT_SPACES_THREAD_NAME,
    });
    await persistDefaultSpacesTarget({
      zakiUser,
      novaUserId: effectiveNovaUserId,
      workspaceSlug,
      threadSlug,
    });
    return {
      novaUserId: Number(effectiveNovaUserId),
      workspaceSlug,
      threadSlug,
      thread,
      created: false,
      repaired: true,
    };
  }

  async function createDefaultWorkspaceForUser({ zakiUser, email, novaUserId }) {
    const response = await novaAdminRequest("/v1/workspace/new", {
      method: "POST",
      body: JSON.stringify({
        name: DEFAULT_SPACES_WORKSPACE_NAME,
        chatMode: "chat",
      }),
    });
    const data = await readJson(response);
    const workspaceSlug = normalizeSlug(data?.workspace?.slug);
    if (!response.ok || !workspaceSlug) {
      throw toUpstreamError(response, data, "Unable to create default Spaces workspace.");
    }

    let effectiveNovaUserId = novaUserId;
    try {
      await assignWorkspaceUser(workspaceSlug, effectiveNovaUserId);
    } catch (error) {
      const refreshedId = await ensureTypUserForZakiUser(zakiUser, email, {
        forceRefresh: true,
        reason: "default_workspace_assignment_retry",
      });
      if (!refreshedId || Number(refreshedId) === Number(effectiveNovaUserId)) throw error;
      effectiveNovaUserId = refreshedId;
      await assignWorkspaceUser(workspaceSlug, effectiveNovaUserId);
    }
    await persistDefaultSpacesTarget({
      zakiUser,
      novaUserId: effectiveNovaUserId,
      workspaceSlug,
      threadSlug: null,
    });

    const { threadSlug, thread } = await createThreadInWorkspace({
      workspaceSlug,
      novaUserId: effectiveNovaUserId,
      name: DEFAULT_SPACES_THREAD_NAME,
    });
    await persistDefaultSpacesTarget({
      zakiUser,
      novaUserId: effectiveNovaUserId,
      workspaceSlug,
      threadSlug,
    });

    return {
      novaUserId: Number(effectiveNovaUserId),
      workspaceSlug,
      threadSlug,
      workspace: data.workspace,
      thread,
      created: true,
    };
  }

  async function ensureDefaultSpacesWorkspace({ zakiUser, email, title } = {}) {
    const novaUserId = await ensureTypUserForZakiUser(zakiUser, email, {
      validateStored: true,
      reason: "default_workspace",
    });
    const workspaces = await fetchVisibleWorkspaces(novaUserId);
    const target = workspaces.map(extractThreadTarget).find(Boolean);
    if (target?.workspaceSlug) {
      await persistDefaultSpacesTarget({
        zakiUser,
        novaUserId,
        workspaceSlug: target.workspaceSlug,
        threadSlug: target.threadSlug,
      });
      return {
        novaUserId,
        workspaceSlug: target.workspaceSlug,
        threadSlug: target.threadSlug,
        created: false,
      };
    }
    const recordedTarget = await readDefaultSpacesTarget(zakiUser, novaUserId);
    if (recordedTarget?.workspaceSlug) {
      try {
        return await ensureThreadForDefaultTarget({
          zakiUser,
          email,
          target: recordedTarget,
          novaUserId,
          title,
        });
      } catch (error) {
        if (Number(error?.status) === 404) {
          await retireDefaultSpacesTarget(zakiUser, recordedTarget.workspaceSlug);
        } else {
          throw error;
        }
      }
    }
    try {
      return await createDefaultWorkspaceForUser({ zakiUser, email, novaUserId, title });
    } catch (error) {
      log?.warn?.("[SpacesProvisioning] default workspace bootstrap failed:", error?.message || error);
      throw normalizeSpacesProvisioningError(error, SPACES_PROVISIONING_ERROR_CODES.UPSTREAM_UNAVAILABLE);
    }
  }

  return {
    ensureTypUserForZakiUser,
    ensureDefaultSpacesWorkspace,
    fetchVisibleWorkspaces,
    createThreadInWorkspace,
  };
}

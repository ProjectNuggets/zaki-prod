import { describe, expect, test, jest } from "@jest/globals";
import {
  SPACES_PROVISIONING_ERROR_CODES,
  buildSpacesProvisioningErrorPayload,
  createSpacesTypProvisioner,
  isAnonymousSpacesRouteTarget,
  normalizeSpacesProvisioningError,
} from "./spaces-typ-provisioning.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeProvisioner(overrides = {}) {
  const dbQuery = overrides.dbQuery || jest.fn().mockResolvedValue({ rows: [] });
  const novaAdminRequest = overrides.novaAdminRequest || jest.fn();
  const fetchNovaUserIdByUsername =
    overrides.fetchNovaUserIdByUsername || jest.fn().mockResolvedValue(null);
  const fetchTypWorkspaces =
    overrides.fetchTypWorkspaces || jest.fn().mockResolvedValue(jsonResponse({ workspaces: [] }));

  return {
    dbQuery,
    novaAdminRequest,
    fetchNovaUserIdByUsername,
    fetchTypWorkspaces,
    provisioner: createSpacesTypProvisioner({
      dbQuery,
      novaAdminRequest,
      fetchNovaUserIdByUsername,
      fetchTypWorkspaces,
      randomPassword: () => "typ-only-random-password",
      now: () => "2026-06-18T00:00:00.000Z",
      log: { warn: jest.fn() },
    }),
  };
}

describe("spaces TYP provisioning", () => {
  test("maps unavailable adapter failures to 503", () => {
    const normalized = normalizeSpacesProvisioningError(
      new Error("fetch failed"),
      SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE
    );

    expect(normalized.code).toBe(SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE);
    expect(normalized.status).toBe(503);
    expect(buildSpacesProvisioningErrorPayload(normalized)).toMatchObject({
      code: SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE,
      status: 503,
      retryable: true,
    });
  });

  test("creates and persists a stable TYP user for a signed-in ZAKI user with no nova_user_id", async () => {
    const { provisioner, novaAdminRequest, fetchNovaUserIdByUsername, dbQuery } = makeProvisioner({
      novaAdminRequest: jest.fn().mockResolvedValue(
        jsonResponse({ user: { id: 77, username: "u42" } })
      ),
    });
    const zakiUser = { id: 42, email: "new@example.com", nova_user_id: null };

    const id = await provisioner.ensureTypUserForZakiUser(zakiUser, zakiUser.email, {
      validateStored: true,
    });

    expect(id).toBe(77);
    expect(fetchNovaUserIdByUsername).toHaveBeenCalledWith("u42");
    expect(fetchNovaUserIdByUsername).toHaveBeenCalledWith("new@example.com");
    expect(novaAdminRequest).toHaveBeenCalledWith(
      "/v1/admin/users/new",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "u42",
          password: "typ-only-random-password",
          role: "default",
        }),
      })
    );
    expect(dbQuery).toHaveBeenCalledWith(
      `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
      [77, "2026-06-18T00:00:00.000Z", 42]
    );
    expect(zakiUser.nova_user_id).toBe(77);
  });

  test("corrects a stale stored nova_user_id through the stable handle lookup", async () => {
    const fetchNovaUserIdByUsername = jest.fn(async (username) =>
      username === "u42" ? 91 : null
    );
    const { provisioner, dbQuery, novaAdminRequest } = makeProvisioner({
      fetchNovaUserIdByUsername,
    });
    const zakiUser = { id: 42, email: "old@example.com", nova_user_id: 12 };

    const id = await provisioner.ensureTypUserForZakiUser(zakiUser, zakiUser.email, {
      validateStored: true,
    });

    expect(id).toBe(91);
    expect(novaAdminRequest).not.toHaveBeenCalled();
    expect(dbQuery).toHaveBeenCalledWith(
      `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
      [91, "2026-06-18T00:00:00.000Z", 42]
    );
  });

  test("replaces a stale stored nova_user_id when stable handle and email lookups miss", async () => {
    const { provisioner, dbQuery, novaAdminRequest } = makeProvisioner({
      fetchNovaUserIdByUsername: jest.fn().mockResolvedValue(null),
      novaAdminRequest: jest.fn().mockResolvedValue(
        jsonResponse({ user: { id: 123, username: "u42" } })
      ),
    });
    const zakiUser = { id: 42, email: "stale@example.com", nova_user_id: 12 };

    const id = await provisioner.ensureTypUserForZakiUser(zakiUser, zakiUser.email, {
      validateStored: true,
    });

    expect(id).toBe(123);
    expect(novaAdminRequest).toHaveBeenCalledWith(
      "/v1/admin/users/new",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "u42",
          password: "typ-only-random-password",
          role: "default",
        }),
      })
    );
    expect(dbQuery).toHaveBeenCalledWith(
      `UPDATE zaki_users SET nova_user_id = $1, updated_at = $2 WHERE id = $3`,
      [123, "2026-06-18T00:00:00.000Z", 42]
    );
    expect(zakiUser.nova_user_id).toBe(123);
  });

  test("keeps an existing stored id when no validation is requested", async () => {
    const { provisioner, fetchNovaUserIdByUsername, novaAdminRequest } = makeProvisioner();

    const id = await provisioner.ensureTypUserForZakiUser(
      { id: 42, email: "kept@example.com", nova_user_id: 55 },
      "kept@example.com"
    );

    expect(id).toBe(55);
    expect(fetchNovaUserIdByUsername).not.toHaveBeenCalled();
    expect(novaAdminRequest).not.toHaveBeenCalled();
  });

  test("bootstraps a default workspace and seed thread when the user has no visible workspaces", async () => {
    const novaAdminRequest = jest.fn(async (path) => {
      if (path === "/v1/workspace/new") {
        return jsonResponse({ workspace: { slug: "spaces-42", name: "Spaces" } });
      }
      if (path === "/v1/admin/workspaces/spaces-42/manage-users") {
        return jsonResponse({ success: true });
      }
      if (path === "/v1/workspace/spaces-42/thread/new") {
        return jsonResponse({ thread: { slug: "thread-1", name: "New chat" } });
      }
      throw new Error(`unexpected path ${path}`);
    });
    const { provisioner } = makeProvisioner({
      fetchNovaUserIdByUsername: jest.fn().mockResolvedValue(77),
      novaAdminRequest,
      fetchTypWorkspaces: jest.fn().mockResolvedValue(jsonResponse({ workspaces: [] })),
    });

    const target = await provisioner.ensureDefaultSpacesWorkspace({
      zakiUser: { id: 42, email: "new@example.com", nova_user_id: null },
      email: "new@example.com",
    });

    expect(target).toMatchObject({
      novaUserId: 77,
      workspaceSlug: "spaces-42",
      threadSlug: "thread-1",
      created: true,
    });
    expect(novaAdminRequest).toHaveBeenCalledWith(
      "/v1/admin/workspaces/spaces-42/manage-users",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userIds: [77], reset: false }),
      })
    );
  });

  test("records a partial default workspace before seed-thread failure", async () => {
    const novaAdminRequest = jest.fn(async (path) => {
      if (path === "/v1/workspace/new") {
        return jsonResponse({ workspace: { slug: "spaces-42", name: "Spaces" } });
      }
      if (path === "/v1/admin/workspaces/spaces-42/manage-users") {
        return jsonResponse({ success: true });
      }
      if (path === "/v1/workspace/spaces-42/thread/new") {
        return jsonResponse({ error: "temporary upstream failure" }, 503);
      }
      throw new Error(`unexpected path ${path}`);
    });
    const { provisioner, dbQuery } = makeProvisioner({
      fetchNovaUserIdByUsername: jest.fn().mockResolvedValue(77),
      novaAdminRequest,
      fetchTypWorkspaces: jest.fn().mockResolvedValue(jsonResponse({ workspaces: [] })),
    });

    await expect(
      provisioner.ensureDefaultSpacesWorkspace({
        zakiUser: { id: 42, email: "new@example.com", nova_user_id: null },
        email: "new@example.com",
      })
    ).rejects.toMatchObject({
      code: SPACES_PROVISIONING_ERROR_CODES.UPSTREAM_UNAVAILABLE,
    });

    expect(dbQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO zaki_spaces_defaults"),
      [42, 77, "spaces-42", null]
    );
  });

  test("retries a recorded partial default workspace instead of creating a duplicate workspace", async () => {
    const dbQuery = jest.fn(async (sql) => {
      if (String(sql).includes("SELECT workspace_slug, thread_slug, nova_user_id")) {
        return {
          rows: [{ workspace_slug: "spaces-42", thread_slug: null, nova_user_id: 77 }],
        };
      }
      return { rows: [] };
    });
    const novaAdminRequest = jest.fn(async (path) => {
      if (path === "/v1/admin/workspaces/spaces-42/manage-users") {
        return jsonResponse({ success: true });
      }
      if (path === "/v1/workspace/spaces-42/thread/new") {
        return jsonResponse({ thread: { slug: "thread-2", name: "New chat" } });
      }
      throw new Error(`unexpected path ${path}`);
    });
    const { provisioner } = makeProvisioner({
      dbQuery,
      fetchNovaUserIdByUsername: jest.fn().mockResolvedValue(77),
      novaAdminRequest,
      fetchTypWorkspaces: jest.fn().mockResolvedValue(jsonResponse({ workspaces: [] })),
    });

    const target = await provisioner.ensureDefaultSpacesWorkspace({
      zakiUser: { id: 42, email: "new@example.com", nova_user_id: 77 },
      email: "new@example.com",
    });

    expect(target).toMatchObject({
      workspaceSlug: "spaces-42",
      threadSlug: "thread-2",
      repaired: true,
    });
    expect(novaAdminRequest).not.toHaveBeenCalledWith(
      "/v1/workspace/new",
      expect.anything()
    );
    expect(novaAdminRequest).toHaveBeenCalledWith(
      "/v1/workspace/spaces-42/thread/new",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: 77, name: "New chat" }),
      })
    );
  });

  test("uses an existing visible workspace/thread without creating a duplicate default", async () => {
    const { provisioner, novaAdminRequest } = makeProvisioner({
      fetchNovaUserIdByUsername: jest.fn().mockResolvedValue(77),
      fetchTypWorkspaces: jest.fn().mockResolvedValue(
        jsonResponse({
          workspaces: [
            {
              slug: "existing-space",
              threads: [{ slug: "thread-a", user_id: 77, name: "Thread A" }],
            },
          ],
        })
      ),
    });

    const target = await provisioner.ensureDefaultSpacesWorkspace({
      zakiUser: { id: 42, email: "new@example.com", nova_user_id: null },
      email: "new@example.com",
    });

    expect(target).toMatchObject({
      workspaceSlug: "existing-space",
      threadSlug: "thread-a",
      created: false,
    });
    expect(novaAdminRequest).not.toHaveBeenCalled();
  });

  test("normalizes missing TYP config to a retryable safe provisioning error", async () => {
    const { provisioner } = makeProvisioner({
      fetchNovaUserIdByUsername: jest
        .fn()
        .mockRejectedValue(new Error("NOVA_TYP_API_KEY is not configured.")),
    });

    await expect(
      provisioner.ensureTypUserForZakiUser(
        { id: 42, email: "new@example.com", nova_user_id: null },
        "new@example.com",
        { validateStored: true }
      )
    ).rejects.toMatchObject({
      code: SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE,
      retryable: true,
      status: 503,
    });
  });

  test("builds user-safe failure payloads and recognizes anonymous spaces routes", () => {
    const payload = buildSpacesProvisioningErrorPayload(
      new Error("NOVA_TYP_BASE_URL is not configured.")
    );

    expect(payload).toMatchObject({
      success: false,
      code: SPACES_PROVISIONING_ERROR_CODES.UNAVAILABLE,
      retryable: true,
    });
    expect(payload.error).not.toMatch(/TYP|NOVA/i);
    expect(isAnonymousSpacesRouteTarget("zaky", "anon-abc")).toBe(true);
    expect(isAnonymousSpacesRouteTarget("team-space", "thread-1")).toBe(false);
  });
});

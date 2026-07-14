import { describe, expect, jest, test } from "@jest/globals";
import {
  createDesignProject,
  extractDesignProjectFromPayload,
  listDesignProjects,
  markDesignProjectActive,
  markDesignProjectDeleted,
  markDesignProjectFailed,
  upsertDesignProjectProvisioning,
} from "./design-project-store.js";

describe("design project store", () => {
  test("lists only active projects owned by the authenticated user", async () => {
    const dbQuery = jest.fn().mockResolvedValue({
      rows: [{
        project_id: "design-1",
        name: "Brand board",
        status: "active",
        metadata_json: { kind: "responsive-web" },
        created_at: "2026-07-14T10:00:00.000Z",
        updated_at: "2026-07-14T11:00:00.000Z",
      }],
    });

    await expect(listDesignProjects({ dbQuery, userId: "42" })).resolves.toEqual([{
      id: "design-1",
      name: "Brand board",
      status: { value: "active" },
      metadata: { kind: "responsive-web" },
      createdAt: "2026-07-14T10:00:00.000Z",
      updatedAt: "2026-07-14T11:00:00.000Z",
    }]);
    expect(dbQuery.mock.calls[0][0]).toContain("owner_user_id = $1");
    expect(dbQuery.mock.calls[0][0]).toContain("status <> 'deleted'");
    expect(dbQuery.mock.calls[0][1]).toEqual([42]);
  });

  test("creates the central project and its owner role without contacting a worker", async () => {
    const transactionQuery = jest.fn()
      .mockResolvedValueOnce({
        rows: [{
          project_id: "design-2",
          name: "Launch system",
          status: "active",
          metadata_json: { source: "zaki-design" },
          created_at: "2026-07-14T10:00:00.000Z",
          updated_at: "2026-07-14T10:00:00.000Z",
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    const runInTransaction = jest.fn((run) => run({ query: transactionQuery }));

    await expect(createDesignProject({
      runInTransaction,
      userId: 42,
      projectId: "design-2",
      name: "Launch system",
      metadata: { source: "zaki-design" },
      requestId: "req-create",
    })).resolves.toMatchObject({
      id: "design-2",
      name: "Launch system",
      status: { value: "active" },
    });
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(transactionQuery).toHaveBeenCalledTimes(2);
    expect(transactionQuery.mock.calls[0][0]).toContain("INSERT INTO zaki_design_projects");
    expect(transactionQuery.mock.calls[0][1]).toEqual([
      "design-2",
      42,
      "Launch system",
      JSON.stringify({ source: "zaki-design" }),
      "req-create",
    ]);
    expect(transactionQuery.mock.calls[1][1]).toEqual(["design-2", 42, "owner"]);
  });

  test("requires a transaction boundary for central project creation", async () => {
    await expect(createDesignProject({
      userId: 42,
      projectId: "design-2",
      name: "Launch system",
      requestId: "req-create",
    })).rejects.toThrow("transaction");
  });

  test("extracts upstream project payloads", () => {
    expect(
      extractDesignProjectFromPayload({
        project: {
          id: "design-1",
          name: "Brand board",
          metadata: { zakiTenantId: "7" },
        },
      })
    ).toEqual({
      projectId: "design-1",
      name: "Brand board",
      metadata: { zakiTenantId: "7" },
    });
    expect(extractDesignProjectFromPayload({ project: { name: "No id" } })).toBeNull();
  });

  test("records provisioning ownership and owner role", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await upsertDesignProjectProvisioning({
      dbQuery,
      userId: "42",
      projectId: "design-1",
      name: "Workspace",
      metadata: { zakiTenantId: "42" },
      requestId: "req-1",
    });

    expect(dbQuery).toHaveBeenCalledTimes(2);
    expect(dbQuery.mock.calls[0][1]).toEqual([
      "design-1",
      42,
      "Workspace",
      JSON.stringify({ zakiTenantId: "42" }),
      "req-1",
    ]);
    expect(dbQuery.mock.calls[1][1]).toEqual(["design-1", 42, "owner"]);
  });

  test("marks active and deleted projects", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await markDesignProjectActive({
      dbQuery,
      userId: 42,
      project: { id: "design-1", name: "Active", metadata: {} },
      requestId: "req-2",
    });
    await markDesignProjectDeleted({
      dbQuery,
      userId: 42,
      projectId: "design-1",
      requestId: "req-3",
    });

    expect(dbQuery).toHaveBeenCalledTimes(3);
    expect(dbQuery.mock.calls[0][1]).toEqual([
      "design-1",
      42,
      "Active",
      "{}",
      "req-2",
    ]);
    expect(dbQuery.mock.calls[2][1]).toEqual(["design-1", 42, "req-3"]);
  });

  test("marks failed provisioning projects", async () => {
    const dbQuery = jest.fn().mockResolvedValue({ rows: [] });
    await markDesignProjectFailed({
      dbQuery,
      userId: 42,
      projectId: "design-1",
      requestId: "req-4",
    });

    expect(dbQuery).toHaveBeenCalledTimes(1);
    expect(dbQuery.mock.calls[0][0]).toContain("status = 'failed'");
    expect(dbQuery.mock.calls[0][1]).toEqual(["design-1", 42, "req-4"]);
  });
});
